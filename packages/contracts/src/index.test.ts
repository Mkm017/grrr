import { describe, expect, it } from 'vitest';
import { PingResponseSchema } from './index';

describe('PingResponseSchema', () => {
    it('should validate a correct ping response object', () => {
        const mockObj = {
            status: 'ok',
            timestamp: new Date().toISOString()
        };
        const result = PingResponseSchema.safeParse(mockObj);
        expect(result.success).toBe(true);
    });

    it('should fail validation on invalid properties', () => {
        const mockObj = {
            status: 123, // Should be a string
            timestamp: new Date().toISOString()
        };
        const result = PingResponseSchema.safeParse(mockObj);
        expect(result.success).toBe(false);
    });
});
