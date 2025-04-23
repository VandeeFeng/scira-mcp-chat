"use client";

import { useLocalStorage } from "@/lib/hooks/use-local-storage";
import { STORAGE_KEYS } from "@/lib/constants";
import { useEffect } from "react";

// Define the storage keys
export const API_KEY_STORAGE_KEY = "user-api-key";
export const MODEL_NAME_STORAGE_KEY = "user-model-name";

export interface ApiKeyData {
  key: string | null;
  modelName: string | null;
}

export function useApiKey() {
  const [apiKey, setApiKeyRaw] = useLocalStorage<string | null>(
    API_KEY_STORAGE_KEY, 
    null
  );

  const [customModelName, setCustomModelNameRaw] = useLocalStorage<string | null>(
    MODEL_NAME_STORAGE_KEY,
    null
  );

  // Clear API key when window is closed/refreshed
  useEffect(() => {
    const handleBeforeUnload = () => {
      window.localStorage.removeItem(API_KEY_STORAGE_KEY);
      window.localStorage.removeItem(MODEL_NAME_STORAGE_KEY);
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  // Function to set both API key and model name
  const setApiKey = (data: ApiKeyData) => {
    setApiKeyRaw(data.key);
    setCustomModelNameRaw(data.modelName);
  };

  // Function to explicitly clear the API key and model name
  const clearApiKey = () => {
    setApiKeyRaw(null);
    setCustomModelNameRaw(null);
    window.localStorage.removeItem(API_KEY_STORAGE_KEY);
    window.localStorage.removeItem(MODEL_NAME_STORAGE_KEY);
  };

  return { 
    apiKey, 
    customModelName, 
    setApiKey, 
    clearApiKey 
  };
} 