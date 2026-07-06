import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import * as fs from 'fs';

function loadServiceAccount(): Record<string, unknown> {
    const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    if (json) {
        try {
            return JSON.parse(json);
        } catch (error) {
            throw new Error(`Failed to parse FIREBASE_SERVICE_ACCOUNT_JSON: ${error}`);
        }
    }

    const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
    if (serviceAccountPath) {
        try {
            return JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
        } catch (error) {
            throw new Error(`Failed to read Firebase service account from ${serviceAccountPath}: ${error}`);
        }
    }

    throw new Error(
        'Set FIREBASE_SERVICE_ACCOUNT_JSON (Vercel) or FIREBASE_SERVICE_ACCOUNT_PATH (local dev)'
    );
}

let app;
if (getApps().length === 0) {
    app = initializeApp({
        credential: cert(loadServiceAccount() as Parameters<typeof cert>[0]),
    });
} else {
    app = getApps()[0];
}

export const adminAuth = getAuth(app);
