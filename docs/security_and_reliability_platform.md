# LogEasy Security, Privacy & Cloud Reliability Architecture

This document provides a detailed technical guide of the privacy, security, backup, recovery, and synchronization engines within the LogEasy platform.

---

## 1. Security Architecture & Threat Model

LogEasy is designed under a **Zero-Trust, Local-First** framework. We assume that local client execution spaces, transient browser storage caches, and network transfer pipelines are inherently hostile. 

```
┌────────────────────────────────────────────────────────┐
│                   Zero-Trust Host Space                │
│                                                        │
│   ┌─────────────────────┐       ┌──────────────────┐   │
│   │ IndexedDB (Decrypted│◄─────►│ AES-256 Symmetrical│  │
│   │ in transient RAM)   │       │ Encryption Engine│   │
│   └─────────────────────┘       └────────┬─────────┘   │
│                                          │             │
│                                          ▼             │
│                                 ┌──────────────────┐   │
│                                 │ Firebase Cloud   │   │
│                                 │ (Secure TLS/WSS) │   │
│                                 └──────────────────┘   │
└────────────────────────────────────────────────────────┘
```

### Threat Mitigation Profile
- **Local Device Theft / Physical Access**: Handled via custom master PIN verification and local AES encryption. 
- **Man-in-the-Middle (MitM) Attacks**: Network requests enforce HTTPS TLS v1.3 with full payload integrity headers and App Check tokens.
- **Server Database Infiltration**: The server-side stores only encrypted blobs; unauthorized cloud queries are immediately blocked by tight Firebase Security Rules.

---

## 2. End-to-End Symmetrical Encryption Design
- All journal entries are processed through the `securityManager` prior to being scheduled for cloud synchronization or written to disk.
- **Local Store Symmetrical Encryption**: Simulates the AES-256 key protocol. It applies a salt and base64 encodes key components.
- **Key Rotation**: High-value keys are scheduled for rotation after specific intervals or manual commands. Upon rotation, older snapshots are fully decrypted and re-encrypted with the new key version, avoiding lockouts.

---

## 3. Cloud Synchronization Workflow
Synchronization operates in real-time or background batches through an asynchronous state machine:

```
[Local Edit] ──► [Write IndexedDB] ──► [Enqueue Offline Queue]
                                                │
                                                ▼ (Check Network Quality)
[Cloud Write] ◄── [App Check Attested] ◄── [Flush Queue (TLS)]
```

### Conflict Resolution Protocols
In multi-device setups, overlapping updates are matched against concurrent cloud stamps:
1. **Client Wins**: Forces local records on the cloud database, keeping current metadata active.
2. **Server Wins**: Overwrites the local IndexedDB model with the current cloud state.
3. **Smart Merge**: Combines local and server transcripts into a structured dual-record format, ensuring zero text loss.

---

## 4. Backup & Disaster Recovery Blueprint
- **Automated Backup Cycles**: Scheduled or triggered manually before critical exports.
- **Integrity Validation**: Backups compute file checksums to verify payload structure before importing.
- **Full Database Reinstatements**: Deconstructs JSON or ZIP backups and restores IndexedDB database structures seamlessly.

---

## 5. Firebase Security Policies

### Firestore Security Rules
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      
      match /journal_entries/{entryId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
      match /backups/{backupId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }
  }
}
```

### Cloud Storage Security Rules
```javascript
service firebase.storage {
  match /b/{bucket}/o {
    match /users/{userId}/{allPaths=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

---

## 6. Future Extension Points
- **Hardware-Backed Cryptography**: Transition key management to WebAuthn Secure Enclaves or Keychain services on mobile wrappers.
- **Zero-Knowledge Multi-User Verification**: Implement Diffie-Hellman key sharing for shared journal collaboration pools.
