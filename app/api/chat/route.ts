import { model, type modelID } from "@/ai/providers";
import { streamText, type UIMessage } from "ai";
import { appendResponseMessages } from 'ai';
import { saveChat, saveMessages, convertToDBMessages } from '@/lib/chat-store';
import { nanoid } from 'nanoid';
import { db } from '@/lib/db';
import { chats } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { checkRateLimit, getClientIP, RateLimitError } from '@/lib/rate-limit';

import { experimental_createMCPClient as createMCPClient, MCPTransport } from 'ai';
import { Experimental_StdioMCPTransport as StdioMCPTransport } from 'ai/mcp-stdio';
import { spawn } from "child_process";

const MAX_REQUESTS_PER_DAY = 10;

// Allow streaming responses up to 30 seconds
export const maxDuration = 60;

interface KeyValuePair {
  key: string;
  value: string;
}

interface MCPServerConfig {
  url: string;
  type: 'sse' | 'stdio';
  command?: string;
  args?: string[];
  env?: KeyValuePair[];
  headers?: KeyValuePair[];
}

export async function POST(req: Request) {
  const ip = getClientIP(req);
  if (!ip) {
    return new Response(
      JSON.stringify({ error: "Could not determine client IP address" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }
  
  const {
    messages,
    chatId,
    selectedModel,
    userId,
    mcpServers = [],
    userApiKey = null,
    userModelName = null,
  }: {
    messages: UIMessage[];
    chatId?: string;
    selectedModel: modelID;
    userId: string;
    mcpServers?: MCPServerConfig[];
    userApiKey?: string | null;
    userModelName?: string | null;
  } = await req.json();

  if (!userId) {
    return new Response(
      JSON.stringify({ error: "User ID is required" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const id = chatId || nanoid();

  // Check if chat already exists for the given ID
  // If not, we'll create it in onFinish
  let isNewChat = false;
  if (chatId) {
    try {
      const existingChat = await db.query.chats.findFirst({
        where: and(
          eq(chats.id, chatId),
          eq(chats.userId, userId)
        )
      });
      isNewChat = !existingChat;
    } catch (error) {
      console.error("Error checking for existing chat:", error);
      // Continue anyway, we'll create the chat in onFinish
      isNewChat = true;
    }
  } else {
    // No ID provided, definitely new
    isNewChat = true;
  }

  // Initialize tools
  let tools = {};
  const mcpClients: any[] = [];

  // Process each MCP server configuration
  for (const mcpServer of mcpServers) {
    try {
      // Create appropriate transport based on type
      let transport: MCPTransport | { type: 'sse', url: string, headers?: Record<string, string> };

      if (mcpServer.type === 'sse') {
        // Convert headers array to object for SSE transport
        const headers: Record<string, string> = {};
        if (mcpServer.headers && mcpServer.headers.length > 0) {
          mcpServer.headers.forEach(header => {
            if (header.key) headers[header.key] = header.value || '';
          });
        }

        transport = {
          type: 'sse' as const,
          url: mcpServer.url,
          headers: Object.keys(headers).length > 0 ? headers : undefined
        };
      } else if (mcpServer.type === 'stdio') {
        // For stdio transport, we need command and args
        if (!mcpServer.command || !mcpServer.args || mcpServer.args.length === 0) {
          console.warn("Skipping stdio MCP server due to missing command or args");
          continue;
        }

        // Convert env array to object for stdio transport
        const env: Record<string, string> = {};
        if (mcpServer.env && mcpServer.env.length > 0) {
          mcpServer.env.forEach(envVar => {
            if (envVar.key) env[envVar.key] = envVar.value || '';
          });
        }

        // if python is passed in the command, install the python package mentioned in args after -m with subprocess or use regex to find the package name
        if (mcpServer.command.includes('python3')) {
          const packageName = mcpServer.args[mcpServer.args.indexOf('-m') + 1];
          console.log("installing python package", packageName);
          const subprocess = spawn('pip3', ['install', packageName]);
          subprocess.on('close', (code: number) => {
            if (code !== 0) {
              console.error(`Failed to install python package: ${code}`);
            }
          });
          // wait for the subprocess to finish
          await new Promise((resolve) => {
            subprocess.on('close', resolve);
            console.log("installed python package", packageName);
          });
        }

        transport = new StdioMCPTransport({
          command: mcpServer.command,
          args: mcpServer.args,
          env: Object.keys(env).length > 0 ? env : undefined
        });
      } else {
        console.warn(`Skipping MCP server with unsupported transport type: ${mcpServer.type}`);
        continue;
      }

      const mcpClient = await createMCPClient({ transport });
      mcpClients.push(mcpClient);

      const mcptools = await mcpClient.tools();

      console.log(`MCP tools from ${mcpServer.type} transport:`, Object.keys(mcptools));

      // Add MCP tools to tools object
      tools = { ...tools, ...mcptools };
    } catch (error) {
      console.error("Failed to initialize MCP client:", error);
      // Continue with other servers instead of failing the entire request
    }
  }

  // Register cleanup for all clients
  if (mcpClients.length > 0) {
    req.signal.addEventListener('abort', async () => {
      for (const client of mcpClients) {
        try {
          await client.close();
        } catch (error) {
          console.error("Error closing MCP client:", error);
        }
      }
    });
  }

  console.log("messages", messages);
  console.log("parts", messages.map(m => m.parts.map(p => p)));

  // Skip rate limit check if user provides their own API key
  let rateLimit;
  if (!userApiKey) {
    // Only check rate limit if user is not providing their own API key
    rateLimit = await checkRateLimit(ip).catch((error) => {
      console.error('Redis error:', error);
      
      // Check if it's a rate limit error
      if (error instanceof RateLimitError) {
        // If we have resetTime, use it
        if (error.resetTime) {
          const timeUntilReset = Math.ceil((error.resetTime.getTime() - Date.now()) / 1000 / 60 / 60);
          const message = `You've reached the daily limit of ${MAX_REQUESTS_PER_DAY} requests. Please try again in ${timeUntilReset} hours.`;
          return new Response(
            message,
            {
              status: 429,
              headers: { "Content-Type": "text/plain" }
            }
          );
        }
        // Otherwise, use a generic message
        const genericMessage = `You've reached the daily limit of ${MAX_REQUESTS_PER_DAY} requests. Please try again later.`;
        return new Response(
          genericMessage,
          {
            status: 429,
            headers: { "Content-Type": "text/plain" }
          }
        );
      }
      
      // Check if it's a Redis connection error
      if (error instanceof Error && (
        error.message.includes('ECONNREFUSED') ||
        error.message.includes('Connection refused') ||
        error.message.includes('Redis connection error') ||
        error.message.includes('Redis server') ||
        error.message.includes('timeout')
      )) {
        return new Response(
          JSON.stringify({ 
            error: 'Service is temporarily unavailable. Please try again in a few moments.',
            type: 'REDIS_ERROR'
          }),
          { 
            status: 503,
            headers: { "Content-Type": "application/json" }
          }
        );
      }
      
      // For other Redis errors, return a more specific error message
      return new Response(
        JSON.stringify({ 
          error: error instanceof Error ? error.message : 'An unexpected error occurred',
          type: 'REDIS_ERROR'
        }),
        { 
          status: 500,
          headers: { "Content-Type": "application/json" }
        }
      );
    });

    if (rateLimit instanceof Response) {
      return rateLimit;
    }

    if (!rateLimit.allowed) {
      const timeUntilReset = Math.ceil((rateLimit.resetTime.getTime() - Date.now()) / 1000 / 60 / 60);
      const message = `You've reached the daily limit of ${MAX_REQUESTS_PER_DAY} requests. Please try again in ${timeUntilReset} hours.`;
      return new Response(
        message,
        {
          status: 429,
          headers: {
            "Content-Type": "text/plain",
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": rateLimit.resetTime.toISOString()
          }
        }
      );
    }
  } else {
    // User is providing their own API key, no rate limiting
    // But still set dummy rateLimit for the headers
    rateLimit = {
      allowed: true,
      remaining: MAX_REQUESTS_PER_DAY,
      resetTime: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours from now
    };
  }

  // If there was an error setting up MCP clients but we at least have composio tools, continue
  const result = streamText({
    model: userApiKey 
      ? model.configureLanguageModel(selectedModel, { 
          apiKey: userApiKey,
          ...(userModelName ? { modelName: userModelName } : {})
        })
      : model.languageModel(selectedModel),
    system: `You are a helpful assistant with access to a variety of tools.

    The tools are very powerful, and you can use them to answer the user's question.
    So choose the tool that is most relevant to the user's question.

    You can use multiple tools in a single response.
    Always respond after using the tools for better user experience.
    You can run multiple steps using all the tools!!!!
    Make sure to use the right tool to respond to the user's question.

    Multiple tools can be used in a single response and multiple steps can be used to answer the user's question.

    ## Response Format
    - Markdown is supported.
    - Respond according to tool's response.
    - Use the tools to answer the user's question.
    - If you don't know the answer, use the tools to find the answer or say you don't know.
    `,
    messages,
    tools,
    maxSteps: 20,
    onError: (error: unknown) => {
      // Don't log API key missing errors
      if (error && typeof error === 'object' && 'message' in error && 
          typeof error.message === 'string' && (
        error.message.includes('API key') || 
        error.message.includes('API_KEY') ||
        error.message.includes('api key')
      )) {
        return;
      }
      console.error(JSON.stringify(error, null, 2));
    },
    async onFinish({ response }) {
      const allMessages = appendResponseMessages({
        messages,
        responseMessages: response.messages,
      });

      await saveChat({
        id,
        userId,
        messages: allMessages,
      });

      const dbMessages = convertToDBMessages(allMessages, id);
      await saveMessages({ messages: dbMessages });
    }
  });

  result.consumeStream()
  return result.toDataStreamResponse({
    sendReasoning: true,
    getErrorMessage: (error) => {
      if (error instanceof Error) {
        if (error.message.includes("Rate limit")) {
          return "Rate limit exceeded. Please try again later.";
        }
        // Don't show API key related errors to users
        if (error.message.includes('API key') || 
            error.message.includes('API_KEY') ||
            error.message.includes('api key')) {
          return "This model is currently unavailable. Please try another model.";
        }
      }
      console.error(error);
      return "An error occurred.";
    },
    headers: {
      "X-RateLimit-Remaining": rateLimit.remaining.toString(),
      "X-RateLimit-Reset": rateLimit.resetTime.toISOString()
    }
  });
}
