import dotenv from "dotenv";
dotenv.config();

function optional(name: string, fallback = ""): string {
  return process.env[name] ?? fallback;
}

function required(name: string): string {
  const v = process.env[name];
  if (!v) {
    // eslint-disable-next-line no-console
    console.warn(`[env] Missing required env var: ${name}. The app will start but calls that need it will fail.`);
    return "";
  }
  return v;
}

export const env = {
  PORT: Number(optional("PORT", "8787")),
  DATABASE_URL: optional("DATABASE_URL"),
  SEMANTIC_SCHOLAR_API_KEY: optional("SEMANTIC_SCHOLAR_API_KEY"),
  AI_PROVIDER: optional("AI_PROVIDER", "gemini"),
  AI_API_KEY: required("AI_API_KEY"),
  AI_MODEL: optional("AI_MODEL", "gemini-2.0-flash"),
};
