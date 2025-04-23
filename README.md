This project is a fork of [zaidmukaddam/scira-mcp-chat: A minimalistic MCP client with a good feature set.](https://github.com/zaidmukaddam/scira-mcp-chat)

<a href="https://mcp.scira.ai">
  <h1 align="center">Scira MCP Chat</h1>
</a>

<p align="center">
  An open-source AI chatbot app powered by Model Context Protocol (MCP), built with Next.js and the AI SDK by Vercel.
</p>

<p align="center">
  <a href="#features"><strong>Features</strong></a> •
  <a href="#mcp-server-configuration"><strong>MCP Configuration</strong></a> •
  <a href="#custom-api-keys-and-models"><strong>Custom Keys & Models</strong></a> •
  <a href="#license"><strong>License</strong></a>
</p>
<br/>

## Features

- Streaming text responses powered by the [AI SDK by Vercel](https://sdk.vercel.ai/docs), allowing multiple AI providers to be used interchangeably with just a few lines of code.
- Full integration with [Model Context Protocol (MCP)](https://modelcontextprotocol.io) servers to expand available tools and capabilities.
- Multiple MCP transport types (SSE and stdio) for connecting to various tool providers.
- Built-in tool integration for extending AI capabilities.
- Reasoning model support.
- [shadcn/ui](https://ui.shadcn.com/) components for a modern, responsive UI powered by [Tailwind CSS](https://tailwindcss.com).
- Built with the latest [Next.js](https://nextjs.org) App Router.

## MCP Server Configuration

This application supports connecting to Model Context Protocol (MCP) servers to access their tools. You can add and manage MCP servers through the settings icon in the chat interface.

### Adding an MCP Server

1. Click the settings icon (⚙️) next to the model selector in the chat interface.
2. Enter a name for your MCP server.
3. Select the transport type:
   - **SSE (Server-Sent Events)**: For HTTP-based remote servers
   - **stdio (Standard I/O)**: For local servers running on the same machine

#### SSE Configuration

If you select SSE transport:
1. Enter the server URL (e.g., `https://mcp.example.com/token/sse`)
2. Click "Add Server"

#### stdio Configuration

If you select stdio transport:
1. Enter the command to execute (e.g., `npx`)
2. Enter the command arguments (e.g., `-y @modelcontextprotocol/server-google-maps`)
   - You can enter space-separated arguments or paste a JSON array
3. Click "Add Server"

4. Click "Use" to activate the server for the current chat session.

### Available MCP Servers

You can use any MCP-compatible server with this application. Here are some examples:

- [Composio](https://composio.dev/mcp) - Provides search, code interpreter, and other tools
- [Zapier MCP](https://zapier.com/mcp) - Provides access to Zapier tools
- Any MCP server using stdio transport with npx and python3

## Custom API Keys and Models

This application supports using custom API keys for various AI providers and configuring different models.

### Adding Custom API Keys

1. Click the settings icon (⚙️) in the chat interface.
2. Navigate to the "API Keys" section.
3. Enter your API keys for supported providers (OpenAI, Anthropic, etc.).
4. Click "Save" to store your keys securely.

### Configuring Custom Models

1. Access the model selection dropdown in the chat interface.
2. Select from available models based on your configured API keys.
3. The application will use your custom API key when interacting with the selected model.

### API Key Security Warning

**⚠️ IMPORTANT SECURITY NOTICE ⚠️**

- Your API keys grant access to paid services and should be kept confidential.
- When using custom API keys, you are responsible for any charges incurred through their use.
- This application stores your API keys locally in your browser's local storage only.
- **This project does not store your API keys on any server.** Your keys never leave your device except when making direct API calls to the respective providers.
- This application does not transmit your keys to any third parties except the respective AI providers.
- Never share your API keys or screenshots showing your keys with others.
- Regularly check your usage on your AI provider's dashboard to monitor for unauthorized use.
- Consider using keys with usage limits or rotating them periodically for enhanced security.

## License

This project is licensed under the Apache License 2.0 - see the [LICENSE](LICENSE) file for details.