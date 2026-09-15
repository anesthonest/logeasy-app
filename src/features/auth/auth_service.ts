/**
 * LogEasy Authentication Foundation
 * Manages active user sessions, token persistence, registration guards,
 * and profile states using live Firebase Authentication.
 */

import { logger } from '../../core/analytics/logger';
import { securityManager } from '../../core/security/security_manager';
import { localDB } from '../../core/database/local_db';
import { auth } from '../../core/integrations/firebase';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signInAnonymously,
  sendEmailVerification,
  sendPasswordResetEmail,
  updateProfile,
  updatePassword,
  updateEmail,
  reauthenticateWithCredential,
  EmailAuthProvider,
  onAuthStateChanged,
  signOut,
  deleteUser,
  confirmPasswordReset
} from 'firebase/auth';

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  isAnonymous: boolean;
  emailVerified: boolean;
  createdAt: string;
  lastLoginAt: string;
}

export interface AuthSession {
  user: UserProfile | null;
  authToken: string | null;
  isAuthenticated: boolean;
}

class AuthService {
  private static instance: AuthService;
  private session: AuthSession = {
    user: null,
    authToken: null,
    isAuthenticated: false,
  };
  private listeners: ((session: AuthSession) => void)[] = [];

  private constructor() {
    this.restoreSession();
    this.initAuthStateListener();
  }

  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  /**
   * Safe Session restoration from Secure Storage
   */
  private restoreSession() {
    try {
      const storedUser = securityManager.readSecure('user_profile');
      const storedToken = securityManager.readSecure('auth_token');

      if (storedUser && storedToken) {
        this.session = {
          user: JSON.parse(storedUser),
          authToken: storedToken,
          isAuthenticated: true,
        };
        logger.info('AuthService', `Restored active secure session for user: ${this.session.user?.email || 'Anonymous'}`);
      } else {
        logger.info('AuthService', 'No stored session found. Prompting login...');
      }
    } catch (e) {
      logger.error('AuthService', 'Error restoring secure user session, purging tokens', e);
      this.clearSessionData();
    }
  }

  /**
   * Initializes real-time Firebase Auth state changes listener
   */
  private initAuthStateListener() {
    onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const token = await firebaseUser.getIdToken();
          const user: UserProfile = {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName,
            photoURL: firebaseUser.photoURL,
            isAnonymous: firebaseUser.isAnonymous,
            emailVerified: firebaseUser.emailVerified,
            createdAt: firebaseUser.metadata.creationTime || new Date().toISOString(),
            lastLoginAt: firebaseUser.metadata.lastSignInTime || new Date().toISOString(),
          };

          // Handle automatic user data migration from legacy accounts!
          await this.checkAndMigrateLegacyUser(user);

          this.session = {
            user,
            authToken: token,
            isAuthenticated: true,
          };
          securityManager.writeSecure('user_profile', JSON.stringify(user));
          securityManager.writeSecure('auth_token', token);
          logger.info('AuthService', `Active session updated for user: ${user.email || 'Anonymous'}`);
        } catch (e) {
          logger.error('AuthService', 'Error processing authentication state update', e);
        }
      } else {
        this.session = {
          user: null,
          authToken: null,
          isAuthenticated: false,
        };
        securityManager.deleteSecure('user_profile');
        securityManager.deleteSecure('auth_token');
        logger.info('AuthService', 'User signed out, session cleared.');
      }
      this.emitSessionChange();
    });
  }

  /**
   * Automatically migrates legacy local accounts to Firebase
   */
  private async checkAndMigrateLegacyUser(newUser: UserProfile) {
    try {
      const storedUserRaw = securityManager.readSecure('user_profile');
      if (!storedUserRaw) return;

      const legacyUser = JSON.parse(storedUserRaw) as UserProfile;
      // If legacy user ID is a dummy local/simulated account, migrate its data to the new Firebase UID
      if (legacyUser.uid && legacyUser.uid !== newUser.uid && legacyUser.uid.startsWith('user_')) {
        logger.info('AuthService', `Migrating legacy local data from user ${legacyUser.uid} to Firebase UID ${newUser.uid}`);

        // 1. Migrate journal entries
        const journals = await localDB.getJournalEntries(legacyUser.uid);
        for (const entry of journals) {
          entry.userId = newUser.uid;
          entry.syncStatus = 'pending_create'; // Queue for Firestore sync!
          await localDB.saveJournalEntry(entry);
          // Add to sync queue so SyncEngine pushes it to Firestore
          await localDB.addToSyncQueue({
            id: `sync_${Math.random().toString(36).substring(2, 11)}`,
            entryId: entry.id,
            action: 'create',
            payload: entry,
            createdAt: new Date().toISOString(),
            attempts: 0
          });
        }

        // 2. Migrate AI memories
        const memories = await localDB.getAIMemories(legacyUser.uid);
        for (const mem of memories) {
          mem.userId = newUser.uid;
          await localDB.saveAIMemory(mem);
        }

        // 3. Migrate goals
        const goals = await localDB.getGoals(legacyUser.uid);
        for (const goal of goals) {
          goal.userId = newUser.uid;
          await localDB.saveGoal(goal);
        }

        // 4. Migrate habits
        const habits = await localDB.getHabits(legacyUser.uid);
        for (const habit of habits) {
          habit.userId = newUser.uid;
          await localDB.saveHabit(habit);
        }

        // 5. Migrate coaching sessions
        const coaching = await localDB.getCoachingSessions(legacyUser.uid);
        for (const sess of coaching) {
          sess.userId = newUser.uid;
          await localDB.saveCoachingSession(sess);
        }

        // 6. Migrate reflection sessions
        const reflections = await localDB.getReflectionSessions(legacyUser.uid);
        for (const ref of reflections) {
          ref.userId = newUser.uid;
          await localDB.saveReflectionSession(ref);
        }

        // 7. Migrate settings/preferences from localStorage
        const legacyPrefsKey = `user_preferences_${legacyUser.uid}`;
        const legacyPrefs = localStorage.getItem(legacyPrefsKey);
        if (legacyPrefs) {
          localStorage.setItem(`user_preferences_${newUser.uid}`, legacyPrefs);
        }

        // 8. Migrate backups metadata
        const legacyBackupsKey = `backups_metadata_${legacyUser.uid}`;
        const legacyBackups = localStorage.getItem(legacyBackupsKey);
        if (legacyBackups) {
          localStorage.setItem(`backups_metadata_${newUser.uid}`, legacyBackups);
        }

        // 9. Migrate connected devices
        const legacyDevicesKey = `connected_devices_${legacyUser.uid}`;
        const legacyDevices = localStorage.getItem(legacyDevicesKey);
        if (legacyDevices) {
          localStorage.setItem(`connected_devices_${newUser.uid}`, legacyDevices);
        }

        // 10. Migrate audit logs
        const legacyLogsKey = `audit_logs_${legacyUser.uid}`;
        const legacyLogs = localStorage.getItem(legacyLogsKey);
        if (legacyLogs) {
          localStorage.setItem(`audit_logs_${newUser.uid}`, legacyLogs);
        }

        logger.info('AuthService', 'Migration completed successfully.');
      }
    } catch (err) {
      logger.error('AuthService', 'Error migrating legacy user data', err);
    }
  }

  public getSession(): AuthSession {
    return { ...this.session };
  }

  public subscribe(listener: (session: AuthSession) => void): () => void {
    this.listeners.push(listener);
    listener(this.getSession());
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private emitSessionChange() {
    this.listeners.forEach((listener) => listener(this.getSession()));
  }

  private clearSessionData() {
    this.session = {
      user: null,
      authToken: null,
      isAuthenticated: false,
    };
    securityManager.deleteSecure('user_profile');
    securityManager.deleteSecure('auth_token');
    this.emitSessionChange();
  }

  /**
   * EMAIL SIGN-IN (Firebase SDK wrapper)
   */
  public async signInWithEmail(email: string, password: string): Promise<UserProfile> {
    logger.info('AuthService', `Signing in with Firebase: ${email}`);
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const firebaseUser = userCredential.user;

    const token = await firebaseUser.getIdToken();
    const user: UserProfile = {
      uid: firebaseUser.uid,
      email: firebaseUser.email,
      displayName: firebaseUser.displayName,
      photoURL: firebaseUser.photoURL,
      isAnonymous: firebaseUser.isAnonymous,
      emailVerified: firebaseUser.emailVerified,
      createdAt: firebaseUser.metadata.creationTime || new Date().toISOString(),
      lastLoginAt: firebaseUser.metadata.lastSignInTime || new Date().toISOString(),
    };

    this.session = { user, authToken: token, isAuthenticated: true };
    securityManager.writeSecure('user_profile', JSON.stringify(user));
    securityManager.writeSecure('auth_token', token);

    logger.info('AuthService', `Firebase email sign-in success for ${email}`);
    logger.trackEvent('auth_login_success', { provider: 'email' });
    this.emitSessionChange();

    return user;
  }

  /**
   * EMAIL REGISTRATION (Firebase SDK wrapper)
   */
  public async signUpWithEmail(email: string, displayName: string, password: string): Promise<UserProfile> {
    logger.info('AuthService', `Registering user with Firebase: ${email}`);
    
    // Validate Password
    const validation = securityManager.validatePasswordStrength(password);
    if (!validation.isValid) {
      throw new Error(validation.message);
    }

    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const firebaseUser = userCredential.user;

    // Update display name
    await updateProfile(firebaseUser, { displayName: displayName || email.split('@')[0] });

    // Send verification email
    try {
      await sendEmailVerification(firebaseUser);
      logger.info('AuthService', `Verification email sent to ${email}`);
    } catch (e) {
      logger.error('AuthService', 'Error sending verification email', e);
    }

    const token = await firebaseUser.getIdToken();
    const user: UserProfile = {
      uid: firebaseUser.uid,
      email: firebaseUser.email,
      displayName: displayName || email.split('@')[0],
      photoURL: null,
      isAnonymous: false,
      emailVerified: firebaseUser.emailVerified,
      createdAt: firebaseUser.metadata.creationTime || new Date().toISOString(),
      lastLoginAt: firebaseUser.metadata.lastSignInTime || new Date().toISOString(),
    };

    this.session = { user, authToken: token, isAuthenticated: true };
    securityManager.writeSecure('user_profile', JSON.stringify(user));
    securityManager.writeSecure('auth_token', token);

    logger.info('AuthService', `Firebase email registration success for ${email}`);
    logger.trackEvent('auth_signup_success', { provider: 'email' });
    this.emitSessionChange();

    return user;
  }

  /**
   * SIGN IN WITH GOOGLE (Firebase SDK wrapper)
   */
  public async signInWithGoogle(): Promise<UserProfile> {
    logger.info('AuthService', 'Signing in with Google using Firebase Auth...');
    const provider = new GoogleAuthProvider();
    const userCredential = await signInWithPopup(auth, provider);
    const firebaseUser = userCredential.user;

    const token = await firebaseUser.getIdToken();
    const user: UserProfile = {
      uid: firebaseUser.uid,
      email: firebaseUser.email,
      displayName: firebaseUser.displayName,
      photoURL: firebaseUser.photoURL,
      isAnonymous: firebaseUser.isAnonymous,
      emailVerified: firebaseUser.emailVerified,
      createdAt: firebaseUser.metadata.creationTime || new Date().toISOString(),
      lastLoginAt: firebaseUser.metadata.lastSignInTime || new Date().toISOString(),
    };

    this.session = { user, authToken: token, isAuthenticated: true };
    securityManager.writeSecure('user_profile', JSON.stringify(user));
    securityManager.writeSecure('auth_token', token);

    logger.info('AuthService', 'Google Sign-In successful.');
    logger.trackEvent('auth_login_success', { provider: 'google' });
    this.emitSessionChange();

    return user;
  }

  /**
   * SIGN IN ANONYMOUSLY (Firebase SDK wrapper)
   */
  public async signInAnonymously(): Promise<UserProfile> {
    logger.info('AuthService', 'Signing in anonymously via Firebase Auth...');
    const userCredential = await signInAnonymously(auth);
    const firebaseUser = userCredential.user;

    const token = await firebaseUser.getIdToken();
    const user: UserProfile = {
      uid: firebaseUser.uid,
      email: null,
      displayName: 'Guest Journaler',
      photoURL: null,
      isAnonymous: true,
      emailVerified: false,
      createdAt: firebaseUser.metadata.creationTime || new Date().toISOString(),
      lastLoginAt: firebaseUser.metadata.lastSignInTime || new Date().toISOString(),
    };

    this.session = { user, authToken: token, isAuthenticated: true };
    securityManager.writeSecure('user_profile', JSON.stringify(user));
    securityManager.writeSecure('auth_token', token);

    logger.info('AuthService', 'Anonymous Guest Session active via Firebase.');
    logger.trackEvent('auth_login_success', { provider: 'anonymous' });
    this.emitSessionChange();

    return user;
  }

  /**
   * EMAIL VERIFICATION (Firebase SDK wrapper)
   */
  public async triggerEmailVerification(): Promise<boolean> {
    if (auth.currentUser) {
      await sendEmailVerification(auth.currentUser);
      logger.info('AuthService', `Verification email dispatched to ${auth.currentUser.email}`);
      return true;
    }
    return false;
  }

  /**
   * PASSWORD RESET (Firebase SDK wrapper)
   */
  public async sendPasswordResetEmail(email: string): Promise<boolean> {
    await sendPasswordResetEmail(auth, email);
    logger.info('AuthService', `Password reset email sent to ${email}`);
    return true;
  }

  public async verifyAndResetPassword(token: string, newPassword: string): Promise<boolean> {
    await confirmPasswordReset(auth, token, newPassword);
    logger.info('AuthService', 'Password reset successfully confirmed in Firebase.');
    return true;
  }

  // TASK 1 Wrap/Expose Raw Firebase Methods directly
  public async createUserWithEmailAndPassword(email: string, password: string): Promise<any> {
    return createUserWithEmailAndPassword(auth, email, password);
  }

  public async signInWithEmailAndPassword(email: string, password: string): Promise<any> {
    return signInWithEmailAndPassword(auth, email, password);
  }

  public async signInWithPopupGoogle(): Promise<any> {
    const provider = new GoogleAuthProvider();
    return signInWithPopup(auth, provider);
  }

  public async updateProfile(displayName: string | null, photoURL: string | null): Promise<void> {
    if (auth.currentUser) {
      await updateProfile(auth.currentUser, { displayName, photoURL });
      logger.info('AuthService', 'User profile updated in Firebase.');
    } else {
      throw new Error('No user is currently signed in');
    }
  }

  public async updatePassword(newPassword: string): Promise<void> {
    if (auth.currentUser) {
      await updatePassword(auth.currentUser, newPassword);
      logger.info('AuthService', 'User password updated in Firebase.');
    } else {
      throw new Error('No user is currently signed in');
    }
  }

  public async updateEmail(newEmail: string): Promise<void> {
    if (auth.currentUser) {
      await updateEmail(auth.currentUser, newEmail);
      logger.info('AuthService', 'User email updated in Firebase.');
    } else {
      throw new Error('No user is currently signed in');
    }
  }

  public async reauthenticateWithCredential(password: string): Promise<void> {
    if (auth.currentUser && auth.currentUser.email) {
      const credential = EmailAuthProvider.credential(auth.currentUser.email, password);
      await reauthenticateWithCredential(auth.currentUser, credential);
      logger.info('AuthService', 'Re-authentication successful in Firebase.');
    } else {
      throw new Error('No user or email available for re-authentication');
    }
  }

  /**
   * LOGOUT (Firebase SDK wrapper)
   */
  public async logout(): Promise<void> {
    logger.info('AuthService', 'Logging out and purging credentials from Firebase Auth...');
    await signOut(auth);
    this.clearSessionData();
  }

  public async signOut(): Promise<void> {
    await this.logout();
  }

  /**
   * ACCOUNT DELETION (Firebase SDK wrapper)
   */
  public async deleteAccount(): Promise<void> {
    if (auth.currentUser) {
      logger.warn('AuthService', `Irreversible deletion request received for Firebase UID: ${auth.currentUser.uid}`);
      await deleteUser(auth.currentUser);
      this.clearSessionData();
    }
  }
}

export const authService = AuthService.getInstance();

