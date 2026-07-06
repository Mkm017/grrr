import { serve } from '@hono/node-server';
import { createApp } from './app';
import { env } from './env';

const app = createApp();
const port = env.PORT;

console.log(`Server is running on port ${port}`);

serve({
    fetch: app.fetch,
    port,
});
