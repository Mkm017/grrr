import { z } from 'zod';

const envSchema = z.object({
    DATABASE_URL: z
        .string()
        .url('DATABASE_URL must be a valid connection URL'),
});

const result = envSchema.safeParse(process.env);

if (!result.success) {
    console.error(
        'Database configuration error:',
        result.error.format()
    );

    throw new Error('Invalid database environment variables');
}

export const env = result.data;