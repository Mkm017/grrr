import { Context } from 'hono';
import { HTTPException } from 'hono/http-exception';

export const errorHandler = (err: Error, c: Context) => {
    console.error('❌ Unhandled Exception:', err);

    if (err instanceof HTTPException) {
        return c.json(
            { error: err.message || 'HTTP error occurred' },
            err.status
        );
    }

    // Default server error
    return c.json(
        { error: 'An unexpected internal server error occurred.' },
        500
    );
};
