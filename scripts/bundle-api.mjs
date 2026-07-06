import * as esbuild from 'esbuild';
import { mkdirSync } from 'fs';

mkdirSync('api', { recursive: true });

await esbuild.build({
    entryPoints: ['apps/api/src/vercel.ts'],
    bundle: true,
    platform: 'node',
    target: 'node20',
    format: 'cjs',
    outfile: 'api/index.js',
    external: ['firebase-admin', '@google/genai'],
    logLevel: 'info',
});

console.log('API bundled to api/index.js');
