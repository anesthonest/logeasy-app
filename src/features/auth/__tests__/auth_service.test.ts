import 'fake-indexeddb/auto';
import { vi, describe, test, expect, beforeEach } from 'vitest';

// Safely initialize global mock auth state only if not already defined (avoids wiping out listener during hoisted module import)
if (!(globalThis as any).__mockAuth) {
  (globalThis as any).__mockAuth = {
    currentUser: null,
    authStateListener: null,
  };
}

// Create a mock of firebase config
vi.mock('../../../firebase-applet-config.json', () => ({
  default: {
    projectId: 'studio-mock-id',
    appId: '1:1234:web:mock',
    apiKey: 'mock-key',
    authDomain: 'mock-domain.firebaseapp.com',
    firestoreDatabaseId: 'mock-db-id'
  }
}));

// Mock firebase/auth using the global state to avoid hoisting ReferenceError
vi.mock('firebase/auth', () => {
  return {
    getAuth: vi.fn(() => ({
      get currentUser() {
        return (globalThis as any).__mockAuth?.currentUser || null;
      }
    })),
    onAuthStateChanged: vi.fn((auth, cb) => {
      if (!(globalThis as any).__mockAuth) {
        (globalThis as any).__mockAuth = { currentUser: null, authStateListener: null };
      }
      (globalThis as any).__mockAuth.authStateListener = cb;
      cb((globalThis as any).__mockAuth.currentUser || null);
      return () => {
        if ((globalThis as any).__mockAuth) {
          (globalThis as any).__mockAuth.authStateListener = null;
        }
      };
    }),
    createUserWithEmailAndPassword: vi.fn(async (auth, email, password) => {
      const newUser = {
        uid: 'firebase_user_new',
        email,
        displayName: null,
        photoURL: null,
        isAnonymous: false,
        emailVerified: false,
        metadata: {
          creationTime: new Date().toISOString(),
          lastSignInTime: new Date().toISOString()
        },
        getIdToken: async () => 'mock_token_new'
      };
      (globalThis as any).__mockAuth.currentUser = newUser;
      if ((globalThis as any).__mockAuth.authStateListener) {
        (globalThis as any).__mockAuth.authStateListener(newUser);
      }
      return { user: newUser };
    }),
    signInWithEmailAndPassword: vi.fn(async (auth, email, password) => {
      const loggedUser = {
        uid: 'firebase_user_123',
        email,
        displayName: 'Firebase User',
        photoURL: null,
        isAnonymous: false,
        emailVerified: true,
        metadata: {
          creationTime: new Date().toISOString(),
          lastSignInTime: new Date().toISOString()
        },
        getIdToken: async () => 'mock_token_123'
      };
      (globalThis as any).__mockAuth.currentUser = loggedUser;
      if ((globalThis as any).__mockAuth.authStateListener) {
        (globalThis as any).__mockAuth.authStateListener(loggedUser);
      }
      return { user: loggedUser };
    }),
    signInAnonymously: vi.fn(async (auth) => {
      const anonUser = {
        uid: 'firebase_anon_123',
        email: null,
        displayName: 'Guest Journaler',
        photoURL: null,
        isAnonymous: true,
        emailVerified: false,
        metadata: {
          creationTime: new Date().toISOString(),
          lastSignInTime: new Date().toISOString()
        },
        getIdToken: async () => 'mock_token_anon'
      };
      (globalThis as any).__mockAuth.currentUser = anonUser;
      if ((globalThis as any).__mockAuth.authStateListener) {
        (globalThis as any).__mockAuth.authStateListener(anonUser);
      }
      return { user: anonUser };
    }),
    signInWithPopup: vi.fn(async (auth, provider) => {
      const googleUser = {
        uid: 'firebase_google_123',
        email: 'google.user@gmail.com',
        displayName: 'Google User',
        photoURL: 'mock_photo_url',
        isAnonymous: false,
        emailVerified: true,
        metadata: {
          creationTime: new Date().toISOString(),
          lastSignInTime: new Date().toISOString()
        },
        getIdToken: async () => 'mock_token_google'
      };
      (globalThis as any).__mockAuth.currentUser = googleUser;
      if ((globalThis as any).__mockAuth.authStateListener) {
        (globalThis as any).__mockAuth.authStateListener(googleUser);
      }
      return { user: googleUser };
    }),
    GoogleAuthProvider: class {},
    sendEmailVerification: vi.fn(async (user) => {
      if (user) user.emailVerified = true;
    }),
    sendPasswordResetEmail: vi.fn(async (auth, email) => true),
    confirmPasswordReset: vi.fn(async (auth, token, password) => true),
    updateProfile: vi.fn(async (user, data) => {
      if (user) {
        user.displayName = data.displayName || user.displayName;
        user.photoURL = data.photoURL || user.photoURL;
      }
    }),
    updatePassword: vi.fn(async (user, pwd) => true),
    updateEmail: vi.fn(async (user, email) => {
      if (user) user.email = email;
    }),
    reauthenticateWithCredential: vi.fn(async (user, cred) => true),
    EmailAuthProvider: {
      credential: vi.fn(() => ({ providerId: 'password' }))
    },
    signOut: vi.fn(async (auth) => {
      (globalThis as any).__mockAuth.currentUser = null;
      if ((globalThis as any).__mockAuth.authStateListener) {
        (globalThis as any).__mockAuth.authStateListener(null);
      }
    }),
    deleteUser: vi.fn(async (user) => {
      (globalThis as any).__mockAuth.currentUser = null;
      if ((globalThis as any).__mockAuth.authStateListener) {
        (globalThis as any).__mockAuth.authStateListener(null);
      }
    })
  };
});

// Mock firestore wrapper using lazy getter to avoid hoisting ReferenceError
vi.mock('../../core/integrations/firebase', () => {
  return {
    auth: {
      get currentUser() {
        return (globalThis as any).__mockAuth?.currentUser || null;
      }
    },
    db: {}
  };
});

// Import tested modules AFTER defining mocks
import { authService, UserProfile } from '../auth_service';
import { securityManager } from '../../../core/security/security_manager';
import { localDB } from '../../../core/database/local_db';

describe('LogEasy Firebase Authentication Migration Tests', () => {
  beforeEach(() => {
    localStorage.clear();
    if ((globalThis as any).__mockAuth) {
      (globalThis as any).__mockAuth.currentUser = null;
    }
    (authService as any).clearSessionData();
  });

  test('TASK 1 & 2: Registration triggers live Firebase Authentication SDK', async () => {
    const user = await authService.signUpWithEmail('newuser@example.com', 'New User', 'SecurePass123!');
    expect(user.uid).toBe('firebase_user_new');
    expect(user.email).toBe('newuser@example.com');
    expect(user.displayName).toBe('New User');
  });

  test('TASK 1 & 2: Login establishes persistence and token caching', async () => {
    const user = await authService.signInWithEmail('user@example.com', 'SomePassword1!');
    expect(user.uid).toBe('firebase_user_123');
    expect(user.email).toBe('user@example.com');
    expect(authService.getSession().isAuthenticated).toBe(true);
    expect(authService.getSession().authToken).toBe('mock_token_123');
  });

  test('TASK 1 & 2: Logout purges credentials and triggers state listener', async () => {
    await authService.signInWithEmail('user@example.com', 'SomePassword1!');
    expect(authService.getSession().isAuthenticated).toBe(true);

    await authService.logout();
    expect(authService.getSession().isAuthenticated).toBe(false);
    expect(authService.getSession().user).toBeNull();
  });

  test('TASK 1 & 8: Google Sign-In triggers Firebase signInWithPopup', async () => {
    const user = await authService.signInWithGoogle();
    expect(user.uid).toBe('firebase_google_123');
    expect(user.email).toBe('google.user@gmail.com');
    expect(authService.getSession().isAuthenticated).toBe(true);
  });

  test('TASK 1 & 8: Anonymous Sign-In establishes guest credentials', async () => {
    const user = await authService.signInAnonymously();
    expect(user.uid).toBe('firebase_anon_123');
    expect(user.isAnonymous).toBe(true);
    expect(authService.getSession().isAuthenticated).toBe(true);
  });

  test('TASK 1 & 7: Password Reset and Verification workflow', async () => {
    const successReset = await authService.sendPasswordResetEmail('user@example.com');
    expect(successReset).toBe(true);

    const successVerify = await authService.verifyAndResetPassword('some-token', 'NewSecurePass123!');
    expect(successVerify).toBe(true);
  });

  test('TASK 1 & 7: Email verification flows smoothly', async () => {
    await authService.signInWithEmail('user@example.com', 'SomePassword1!');
    const success = await authService.triggerEmailVerification();
    expect(success).toBe(true);
  });

  test('TASK 2 & 4: Session Restore and Offline Persistence works out-of-the-box', async () => {
    // Write mocked cached user to secure storage
    const cachedProfile: UserProfile = {
      uid: 'firebase_cached_123',
      email: 'cached@example.com',
      displayName: 'Cached User',
      photoURL: null,
      isAnonymous: false,
      emailVerified: true,
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString()
    };
    securityManager.writeSecure('user_profile', JSON.stringify(cachedProfile));
    securityManager.writeSecure('auth_token', 'cached_token_123');

    // Manually trigger restoreSession to test its logic
    (authService as any).restoreSession();

    expect(authService.getSession().isAuthenticated).toBe(true);
    expect(authService.getSession().user?.uid).toBe('firebase_cached_123');
  });

  test('TASK 3: Multi-device login returns identical user profile and UID', async () => {
    const firstLogin = await authService.signInWithEmail('user@example.com', 'Password123!');
    expect(firstLogin.uid).toBe('firebase_user_123');

    // Simulating a second device login with the same email
    const secondLogin = await authService.signInWithEmail('user@example.com', 'Password123!');
    expect(secondLogin.uid).toBe('firebase_user_123');
    expect(firstLogin.uid).toBe(secondLogin.uid);
  });

  test('TASK 6: Existing legacy local accounts migrate successfully to live Firebase UID', async () => {
    const legacyUid = 'user_legacy123';
    
    // Write legacy mock user data in secure storage
    const legacyProfile: UserProfile = {
      uid: legacyUid,
      email: 'legacy@example.com',
      displayName: 'Legacy User',
      photoURL: null,
      isAnonymous: false,
      emailVerified: false,
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString()
    };
    securityManager.writeSecure('user_profile', JSON.stringify(legacyProfile));

    // Save a mock journal entry for the legacy user
    const mockJournal = {
      id: 'journal_legacy_1',
      userId: legacyUid,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      transcript: 'Legacy voice transcript to be migrated',
      audioDuration: 15,
      moodScore: 8,
      moodLabel: 'Happy',
      categories: ['personal'],
      syncStatus: 'synced' as const
    };
    await localDB.saveJournalEntry(mockJournal);

    const checkSaved = await localDB.getJournalEntry('journal_legacy_1');
    console.log('SAVED JOURNAL BEFORE MIGRATION:', checkSaved);

    const storedUser = securityManager.readSecure('user_profile');
    console.log('STORED USER BEFORE MIGRATION:', storedUser);

    // Act: Authenticate with Firebase Auth state changed (triggering the listener)
    const newFirebaseUser = {
      uid: 'firebase_migrated_uid_123',
      email: 'legacy@example.com',
      displayName: 'Legacy User',
      photoURL: null,
      isAnonymous: false,
      emailVerified: true,
      metadata: {
        creationTime: new Date().toISOString(),
        lastSignInTime: new Date().toISOString()
      },
      getIdToken: async () => 'migrated_token_123'
    };

    (globalThis as any).__mockAuth.currentUser = newFirebaseUser;

    const listener = (globalThis as any).__mockAuth.authStateListener;
    if (listener) {
      console.log('TRIGGERING AUTH STATE LISTENER FOR MIGRATION...');
      await listener(newFirebaseUser);
    } else {
      console.log('ERROR: authStateListener is null!');
    }

    const checkSavedAfter = await localDB.getJournalEntry('journal_legacy_1');
    console.log('SAVED JOURNAL AFTER MIGRATION:', checkSavedAfter);

    // Assert: The legacy journal entry is migrated to the new firebase UID and sync is queued
    const migratedJournal = await localDB.getJournalEntry('journal_legacy_1');
    expect(migratedJournal).not.toBeNull();
    expect(migratedJournal?.userId).toBe('firebase_migrated_uid_123');
    expect(migratedJournal?.syncStatus).toBe('pending_create');

    const queue = await localDB.getSyncQueue();
    expect(queue.some(q => q.entryId === 'journal_legacy_1')).toBe(true);
  });
});
