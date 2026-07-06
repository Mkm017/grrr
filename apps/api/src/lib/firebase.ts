import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import * as fs from 'fs';

const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;

if (!serviceAccountPath) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_PATH is not set in environment variables');
}

let app;
if (getApps().length === 0) {
    let serviceAccount;
    try {
        const rawData = fs.readFileSync(serviceAccountPath, 'utf8');
        serviceAccount = JSON.parse(rawData);
    } catch (error) {
        throw new Error(`Failed to read or parse Firebase service account from path ${serviceAccountPath}: ${error}`);
    }

    app = initializeApp({
        credential: cert(serviceAccount)
    });
} else {
    app = getApps()[0];
}

export const adminAuth = getAuth(app);
