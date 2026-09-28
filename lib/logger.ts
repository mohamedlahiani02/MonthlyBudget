import "server-only";
import pino from "pino";

export const logger = pino({
  level: process.env.LOG_LEVEL ?? (process.env.NODE_ENV === "production" ? "info" : "debug"),
  base: { service: "monthly-budget" },
  timestamp: pino.stdTimeFunctions.isoTime,
  formatters: { level: (label) => ({ level: label }) },
  redact: {
    paths: [
      "token",
      "accessToken",
      "refreshToken",
      "code",
      "codeVerifier",
      "authorization",
      "*.token",
      "*.code",
      "*.authorization",
    ],
    censor: "[redacted]",
  },
});
