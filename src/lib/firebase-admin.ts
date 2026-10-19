import { initializeApp, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import fs from 'fs';

const firebaseConfigPath = new URL('../../firebase-applet-config.json', import.meta.url);
const firebaseConfig = JSON.parse(fs.readFileSync(firebaseConfigPath, 'utf-8')) as {
  projectId: string;
};

if (!getApps().length) {
  initializeApp({
    projectId: firebaseConfig.projectId,
  });
}

export const adminAuth = getAuth();

