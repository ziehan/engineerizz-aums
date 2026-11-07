// LLM configuration skeleton
import dotenv from 'dotenv';
dotenv.config();

export const llmConfig = {
  PORT: process.env.PORT || 3001,
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  OLLAMA_BASE_URL: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
  AI_INTERNAL_SECRET: process.env.AI_INTERNAL_SECRET,
};
