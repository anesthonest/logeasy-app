# LogEasy — Personal Human Intelligence Operating System

**Developed by VINEXSAH TECHNOLOGIES. All rights reserved.**

LogEasy is an offline-first, client-side encrypted Personal Human Intelligence Operating System designed to help individuals reflect, capture spoken moments, understand longitudinal emotional cycles, and build a lasting Personal Life Model — with absolute privacy and zero advertising profiling.

---

## Architecture & Engineering Principles

### 1. IRREPLACEABLE LIFE DATA INTEGRITY
- **Capture First, Persist First:** Spoken thoughts and journals are committed to IndexedDB immediately before initiating non-blocking background enrichment or indexing.
- **Durable Write Protocol:** Multi-phase write guarantees prevent partial state anomalies or orphaned audio streams.
- **Crash Recovery & Reconciliation:** On system initialization, unfinished background queues and transcription operations are reconciled automatically.

### 2. CLIENT-SIDE CRYPTOGRAPHIC PRIVACY
- **AES-256-GCM Encryption:** Authenticated symmetric encryption executed natively via Web Crypto API with 12-byte initialization vectors (IV).
- **PBKDF2 Key Derivation:** 100,000 iterations using SHA-256 with cryptographically random 16-byte salts.
- **Tamper Detection:** Tampered ciphertexts trigger deterministic authentication tag validation failures.
- **Sanctuary Trust & Zero Ad Surveillance:** 100% free of third-party advertising trackers, marketing SDKs, and commercial profiling pipelines.

### 3. DISASTER RECOVERY & DATA SOVEREIGNTY
- **Pre-Restore Safety Snapshots:** Automatic capture of system state prior to backup restorations to prevent destructive rollbacks.
- **Personal Life Model Archive Reconstruction:** Dynamic rebuild of the entire semantic connection graph, memories, and entity links from raw journals.
- **Sovereign Export:** Full portable user export covering journals, life chapters, people profiles, goals, habits, devices, and audit traces.
- **Forensic Right-to-be-Forgotten Purge:** Deep scrub of IndexedDB object stores, synchronization queues, cryptographic keys, and credential caches.

---

## Attribution & Intellectual Property

```
LogEasy — Developed by VINEXSAH TECHNOLOGIES. All rights reserved.
```

Product ownership, design, and software implementation are maintained by **VINEXSAH TECHNOLOGIES**.
