import { createApp } from './app';

const app = createApp('/api');

export default {
    fetch(request: Request) {
        return app.fetch(request);
    },
};