import { xai, createXai } from "@ai-sdk/xai";
import { openai, createOpenAI } from "@ai-sdk/openai";
import { google, createGoogleGenerativeAI } from "@ai-sdk/google";
import { groq, createGroq } from "@ai-sdk/groq";
import { customProvider, wrapLanguageModel, extractReasoningMiddleware } from "ai";
import { cohere, createCohere } from "@ai-sdk/cohere";

export interface ModelInfo {
  provider: string;
  name: string;
  description: string;
  apiVersion: string;
  capabilities: string[];
}

const middleware = extractReasoningMiddleware({
  tagName: 'think',
  separator: '\n',
});

export interface ModelOptions {
  apiKey?: string;
  modelName?: string;
}

// Basic language model instances
const baseLMs = {
  "gpt-4.1-mini": (options?: ModelOptions) => {
    const modelName = options?.modelName || "gpt-4.1-mini";
    if (options?.apiKey) {
      const customOpenAI = createOpenAI({ apiKey: options.apiKey });
      return customOpenAI(modelName);
    }
    return openai(modelName);
  },
  "gemini-2-flash": (options?: ModelOptions) => {
    const modelName = options?.modelName || "gemini-2.0-flash-001";
    if (options?.apiKey) {
      const customGoogle = createGoogleGenerativeAI({ apiKey: options.apiKey });
      return customGoogle(modelName);
    }
    return google(modelName);
  },
  "qwen-qwq": (options?: ModelOptions) => {
    const modelName = options?.modelName || "qwen-qwq-32b";
    let model;
    if (options?.apiKey) {
      const customGroq = createGroq({ apiKey: options.apiKey });
      model = customGroq(modelName);
    } else {
      model = groq(modelName);
    }
    
    return wrapLanguageModel({
      model,
      middleware
    });
  },
  "command-a": (options?: ModelOptions) => {
    const modelName = options?.modelName || "command-a-03-2025";
    if (options?.apiKey) {
      const customCohere = createCohere({ apiKey: options.apiKey });
      return customCohere(modelName);
    }
    return cohere(modelName);
  },
  "grok-3-mini-beta": (options?: ModelOptions) => {
    const modelName = options?.modelName || "grok-3-mini-beta";
    if (options?.apiKey) {
      const customXai = createXai({ apiKey: options.apiKey });
      return customXai(modelName);
    }
    return xai(modelName);
  }
};

// Pre-configured language models with default settings
const languageModels = {
  "gpt-4.1-mini": baseLMs["gpt-4.1-mini"](),
  "gemini-2-flash": baseLMs["gemini-2-flash"](),
  "qwen-qwq": baseLMs["qwen-qwq"](),
  "command-a": baseLMs["command-a"](),
  "grok-3-mini-beta": baseLMs["grok-3-mini-beta"]()
};

export const modelDetails: Record<keyof typeof languageModels, ModelInfo> = {
  "gpt-4.1-mini": {
    provider: "OpenAI",
    name: "GPT-4.1 Mini",
    description: "Compact version of OpenAI's GPT-4.1 with good balance of capabilities, including vision.",
    apiVersion: "gpt-4.1-mini",
    capabilities: [ "Balance", "Creative", "Vision"]
  },
  "gemini-2-flash": {
    provider: "Google",
    name: "Gemini 2 Flash",
    description: "Latest version of Google's Gemini 2 with strong reasoning and coding capabilities.",
    apiVersion: "gemini-2-flash",
    capabilities: ["Balance", "Efficient", "Agentic"]
  },
  "grok-3-mini-beta": {
    provider: "XAI",
    name: "Grok 3 Mini",
    description: "Latest version of Grok 3 with strong reasoning and coding capabilities.",
    apiVersion: "grok-3-mini-beta",
    capabilities: ["Reasoning", "Efficient", "Agentic"]
  },
  "qwen-qwq": {
    provider: "Groq",
    name: "Qwen QWQ",
    description: "Latest version of Alibaba's Qwen QWQ with strong reasoning and coding capabilities.",
    apiVersion: "qwen-qwq",
    capabilities: ["Reasoning", "Efficient", "Agentic"]
  },
  "command-a": {
    provider: "Cohere",
    name: "Command A",
    description: "Latest version of Cohere's Command A with strong reasoning and coding capabilities.",
    apiVersion: "command-a-03-2025",
    capabilities: ["Smart", "Fast", "Reasoning"]
  }
};

export const model = {
  // Standard language model with default configurations
  languageModel: (modelId: keyof typeof languageModels) => languageModels[modelId],
  
  // Configure language model with custom options
  configureLanguageModel: (modelId: keyof typeof languageModels, options: ModelOptions) => {
    if (modelId in baseLMs) {
      return baseLMs[modelId](options);
    }
    return languageModels[modelId]; // Fallback to default if model not found
  }
};

export type modelID = keyof typeof languageModels;

export const MODELS = Object.keys(languageModels);

export const defaultModel: modelID = "gemini-2-flash";
