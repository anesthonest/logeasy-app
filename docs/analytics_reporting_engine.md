# LogEasy Personal Intelligence, Analytics, Visualization & Reporting Engine

This document provides a technical overview of the LogEasy Analytics and Reporting Engine. It covers the architecture, the offline-first calculation paradigms, visualization configurations, report synthesis pipelines, caching configurations, and export engines.

---

## 1. Analytics Architecture
The architecture is designed with **Privacy-First, Local-First Principles**. It reads from encrypted IndexedDB data stores (`journal_entries`, `goals`, `habits`, `ai_entities`, `ai_insights`, `ai_summaries`) and executes analytical aggregations entirely client-side. This ensures zero data leaks when offline.

```
       [Voice Log / Transcript Editor]
                      │
                      ▼
               [IndexedDB Stores]
                      │
         ┌────────────┴────────────┐
         ▼                         ▼
 [Heuristic Engine]       [Analytics Pipeline]
         │                         │
         ▼                         ▼
 [Graph Node Merging]     [Interactive UI Metrics]
```

---

## 2. Interactive Visualization Engine
All charts are implemented using the **Recharts** library to maintain high interactivity, touch-friendly responsive handles, and responsive stage calculations:
- **Daily Mood AreaChart**: Visualizes mood scores (1-10) with interactive gradient shadows and stress trends.
- **Distribution PieChart**: Renders emotional balance with inner-donut labels.
- **Growth BarChart**: Tracks total word count of voice logs and active journal growth month-by-month.
- **Reflections RadarChart**: Computes reflection frequency across career, travel, health, finance, learning, and family sectors to show life balance.
- **Node-Link Graph mock-up**: Maps entities and context-based relationships.

---

## 3. Hybrid Report Generation Pipeline
Reports are compiled using a hybrid approach depending on connectivity:
1. **Online Synthesis**: Proxies through the secure server-side `/api/ai/process` route to use Gemini 2.5 (Flash). This compiles empathetic executive reviews, clinical suggestions, and structured citations.
2. **Offline Fallback Heuristic**: Employs client-side calculations using rule-based metrics, local habit streaks, and goal completions.

All reports display traceable evidence citations, preventing AI hallucinations.

---

## 4. Caching & Performance Optimizations
- **Large Datasets**: Chart dimensions are dynamically queried via `ResponsiveContainer` instead of expensive window-resize listeners.
- **Incremental Calculations**: State subscriptions are updated iteratively on DB modifications to minimize layout-thrashing.
- **Vault Control Caching**: Search histories and preferences are kept locally via standard client-side `localStorage` keys.

---

## 5. Export Subsystem
Supports fully secure, printable formatted templates:
- **PDF**: Emulates high-contrast clean document styles.
- **CSV**: Generates table-structured, quoted field files.
- **JSON**: Produces high-fidelity full-database archives.
- **Markdown**: Formats neat display summaries, quote blocks, and itemized lists.
- **ZIP Archive**: Packages multiple file outputs into an archive-friendly representation.

---

## 6. Extension Points
- **Coaching Style Bindings**: Integrate newer custom personalities by appending styles to `COACHING_STYLES` in `coach_types.ts`.
- **Additional Exporters**: Register alternative encoders within `/src/components/voice/PersonalIntelligenceEngine.tsx`.
