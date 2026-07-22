// Liga/desliga a tela de manutenção do site (public_status/maintenance no Firestore).
// Uso: node scripts/toggle-maintenance.mjs on|off
//
// Precisa de uma conta com role "admin" já aprovada no app. As credenciais
// ficam em .env (MAINT_ADMIN_EMAIL / MAINT_ADMIN_PASSWORD), que já é
// ignorado pelo git — nunca commitar esse arquivo.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { getFirestore, doc, setDoc } from 'firebase/firestore';

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadEnv(path) {
  const content = readFileSync(path, 'utf8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!(key in process.env)) process.env[key] = value;
  }
}

loadEnv(join(__dirname, '..', '.env'));

const mode = process.argv[2];
if (!['on', 'off'].includes(mode)) {
  console.error('Uso: node scripts/toggle-maintenance.mjs <on|off>');
  process.exit(1);
}

const email = process.env.MAINT_ADMIN_EMAIL;
const password = process.env.MAINT_ADMIN_PASSWORD;
if (!email || !password) {
  console.error('Defina MAINT_ADMIN_EMAIL e MAINT_ADMIN_PASSWORD no .env (conta com role admin aprovada).');
  process.exit(1);
}

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

await signInWithEmailAndPassword(auth, email, password);
await setDoc(doc(db, 'public_status', 'maintenance'), {
  enabled: mode === 'on',
  updatedAt: new Date().toISOString(),
});
await signOut(auth);

console.log(`Modo manutenção ${mode === 'on' ? 'ATIVADO ✅' : 'DESATIVADO ✅'}.`);
process.exit(0);
