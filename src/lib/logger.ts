const isDev = process.env.ENVIRONMENT === "dev" || process.env.ENVIRONMENT === "memory";
const isTest = process.env.ENVIRONMENT === "test";

export const logger = {
  debug: (...args: unknown[]) => {
    if (isDev) {
      console.log("[DEBUG]", ...args);
    }
  },
  info: (...args: unknown[]) => {
    if (!isTest) {
      console.log("[INFO]", ...args);
    }
  },
  warn: (...args: unknown[]) => {
    console.warn("[WARN]", ...args);
  },
  error: (...args: unknown[]) => {
    console.error("[ERROR]", ...args);
  },
};
