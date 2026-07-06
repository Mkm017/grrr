import { z } from 'zod';

const envSchema = z.object({
    PORT: z.string().optional().transform(val => val ? parseInt(val, 10) : 3002),
    DATABASE_URL: z.string().url("DATABASE_URL must be a valid connection URL"),
    FIREBASE_SERVICE_ACCOUNT_PATH: z.string().min(1, "FIREBASE_SERVICE_ACCOUNT_PATH is required"),
    GEMINI_API_KEY: z.string().min(1, "GEMINI_API_KEY is required"),
});

const result = envSchema.safeParse(process.env);

if (!result.success) {
    console.error("❌ API configuration error:", result.error.format());
    throw new Error("Invalid API environment variables");
}

export const env = result.data;
