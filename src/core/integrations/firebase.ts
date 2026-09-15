import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, setDoc, deleteDoc, getDoc, getDocFromServer } from 'firebase/firestore';
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from 'firebase/app-check';
import firebaseConfigFallback from '../../../firebase-applet-config.json';
import { logger } from '../analytics/logger';

// Load config from environment variables with fallbacks
const firebaseConfig = {
  apiKey: ((import.meta as any).env.VITE_FIREBASE_API_KEY as string) || firebaseConfigFallback.apiKey,
  authDomain: ((import.meta as any).env.VITE_FIREBASE_AUTH_DOMAIN as string) || firebaseConfigFallback.authDomain,
  projectId: ((import.meta as any).env.VITE_FIREBASE_PROJECT_ID as string) || firebaseConfigFallback.projectId,
  storageBucket: ((import.meta as any).env.VITE_FIREBASE_STORAGE_BUCKET as string) || firebaseConfigFallback.storageBucket,
  messagingSenderId: ((import.meta as any).env.VITE_FIREBASE_MESSAGING_SENDER_ID as string) || firebaseConfigFallback.messagingSenderId,
  appId: ((import.meta as any).env.VITE_FIREBASE_APP_ID as string) || firebaseConfigFallback.appId,
  measurementId: ((import.meta as any).env.VITE_FIREBASE_MEASUREMENT_ID as string) || firebaseConfigFallback.measurementId || '',
  firestoreDatabaseId: ((import.meta as any).env.VITE_FIREBASE_FIRESTORE_DATABASE_ID as string) || firebaseConfigFallback.firestoreDatabaseId || '(default)'
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId); /* CRITICAL: The app will break without this line */
export const auth = getAuth(app);

// Export app instance
export { app };

// Initialize App Check (Web: reCAPTCHA Enterprise, with local debugging fallback in DEV)
export let appCheck: any = null;

const appCheckKey = (import.meta as any).env.VITE_FIREBASE_APP_CHECK_RECAPTCHA_KEY as string;
if (appCheckKey) {
  try {
    appCheck = initializeAppCheck(app, {
      provider: new ReCaptchaEnterpriseProvider(appCheckKey),
      isTokenAutoRefreshEnabled: true,
    });
    logger.info('FirebaseIntegration', 'Firebase App Check initialized successfully (reCAPTCHA Enterprise).');
  } catch (err) {
    logger.error('FirebaseIntegration', 'Failed to initialize App Check:', err);
  }
} else if ((import.meta as any).env.DEV) {
  const debugToken = ((import.meta as any).env.VITE_FIREBASE_APP_CHECK_DEBUG_TOKEN as string) || (typeof window !== 'undefined' ? (window as any).FIREBASE_APPCHECK_DEBUG_TOKEN : undefined);
  if (debugToken) {
    if (typeof window !== 'undefined') {
      (window as any).FIREBASE_APPCHECK_DEBUG_TOKEN = debugToken;
    }
    try {
      appCheck = initializeAppCheck(app, {
        provider: new ReCaptchaEnterpriseProvider('placeholder-for-debug'),
        isTokenAutoRefreshEnabled: true,
      });
      logger.info('FirebaseIntegration', 'Firebase App Check initialized with Local Debug Token.');
    } catch (err) {
      logger.error('FirebaseIntegration', 'Failed to initialize App Check in debug mode:', err);
    }
  } else {
    logger.info('FirebaseIntegration', 'App Check not initialized: VITE_FIREBASE_APP_CHECK_RECAPTCHA_KEY is not defined.');
  }
} else {
  logger.info('FirebaseIntegration', 'App Check skipped: VITE_FIREBASE_APP_CHECK_RECAPTCHA_KEY is not defined.');
}


// Error handler specified by the firebase-integration skill guidelines
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  logger.error('FirebaseIntegration', `Firestore Error: ${JSON.stringify(errInfo)}`);
  throw new Error(JSON.stringify(errInfo));
}

// Validate connection to Firestore as per SKILL.md critical constraints
export async function validateFirestoreConnection() {
  try {
    const testDocRef = doc(db, 'test', 'connection');
    await getDocFromServer(testDocRef);
    logger.info('FirebaseIntegration', 'Connection to Firestore verified successfully.');
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      logger.error('FirebaseIntegration', 'Please check your Firebase configuration: client is offline.');
    } else {
      logger.warn('FirebaseIntegration', 'Firestore connection validation note (expected if unauthenticated):', error);
    }
    return false;
  }
}

// Execute initial validation in background
validateFirestoreConnection();
