import { defineConfig } from 'drizzle-kit';
import * as dotenv from 'dotenv';
import path from 'path';

// Tell Drizzle to look in the API app for the database URL
dotenv.config({ path: path.resolve(__dirname, '../../apps/api/.env') });

if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is missing! Check your .env file path.");
}

export default defineConfig({
    schema: './src/schema.ts',
    out: './drizzle',
    dialect: 'postgresql',
    dbCredentials: {
        url: process.env.DATABASE_URL,
    },
});