import { handle } from 'hono/vercel';
import { createApp } from './app';

const app = createApp('/api');

export default handle(app);

