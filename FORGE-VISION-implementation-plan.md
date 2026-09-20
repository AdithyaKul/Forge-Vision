# FORGE-VISION — Prototype Implementation Plan

## Overview

FORGE-VISION is an offline, vendor-agnostic surveillance evidence management platform. It ingests raw multi-camera footage, hashes and preserves it, normalizes mismatched camera clocks to a single timeline, runs object detection, maintains a hash-chained audit log, verifies evidence integrity, and generates a one-click forensic report.

**Core story:** Raw Evidence → Preserve → Normalize → Correlate → Verify → Report

---

## Project Structure

```
forge-vision/
├── backend/               # FastAPI Python backend
│   ├── main.py
│   ├── database.py
│   ├── models.py
│   ├── routers/
│   │   ├── cases.py
│   │   ├── evidence.py
│   │   └── reports.py
│   ├── services/
│   │   ├── hashing.py
│   │   ├── metadata.py
│   │   ├── timeline.py
│   │   ├── detect.py
│   │   ├── audit.py
│   │   └── report_gen.py
│   ├── adapters/
│   │   ├── base.py
│   │   ├── dahua.py
│   │   ├── hikvision.py
│   │   └── cpplus.py
│   ├── demo_assets/
│   │   ├── seed.py            # seeds DB with demo case + cached detections
│   │   └── detections_cache.json
│   └── requirements.txt
│
└── frontend/              # Next.js frontend
    ├── src/
    │   ├── app/
    │   │   ├── page.tsx           # Dashboard / case list
    │   │   ├── cases/
    │   │   │   ├── new/page.tsx   # Create case form
    │   │   │   └── [id]/
    │   │   │       ├── page.tsx       # Case overview
    │   │   │       ├── evidence/page.tsx  # Upload + evidence list
    │   │   │       ├── timeline/page.tsx  # Unified timeline view
    │   │   │       ├── audit/page.tsx     # Audit log
    │   │   │       └── report/page.tsx    # Report generation
    │   ├── components/
    │   │   ├── ui/                # Reusable primitive components
    │   │   ├── CaseCard.tsx
    │   │   ├── EvidenceUploader.tsx
    │   │   ├── TimelineViewer.tsx
    │   │   ├── VideoPlayer.tsx
    │   │   ├── AuditLog.tsx
    │   │   ├── IntegrityChecker.tsx
    │   │   └── ReportPanel.tsx
    │   └── lib/
    │       └── api.ts             # typed API client
    ├── tailwind.config.ts
    └── package.json
```

---

## Tech Stack

| Layer | Choice | Rationale |
|---|---|---|
| Frontend | Next.js 14 (App Router) + Tailwind CSS | Fast to scaffold, familiar, great component model |
| Backend | FastAPI (Python 3.11+) | Fast to write, auto-docs via /docs, native async |
| Database | SQLite via SQLAlchemy | Zero setup, file-based, perfect for single-machine demo |
| Video metadata | ffprobe (bundled in ffmpeg) | Real, fast, no ML |
| Detection | YOLOv8n (Ultralytics), CPU, pre-cached | Smallest/fastest YOLO; results cached before demo |
| Report | Jinja2 HTML template → browser print-to-PDF | Simplest approach, no extra libs needed on Windows |
| Hashing | Python `hashlib` SHA-256 | Real, mandatory, trivial |

---

## Data Model (SQLite — 5 tables)

```sql
-- cases
id, case_number, name, investigator, description, created_at

-- evidence
id, case_id, filename, file_path, sha256,
duration, codec, resolution, fps,
vendor_label, source_time, offset_seconds, status

-- events
id, evidence_id, timestamp_raw, timestamp_normalized,
event_type, confidence, frame_number, bbox_json

-- audit_log
id, case_id, actor, action, detail, timestamp,
prev_hash, entry_hash

-- reports
id, case_id, generated_at, file_path, format
```

---

## API Endpoints (9 total)

```
POST   /cases                      → create case, seed audit log
POST   /cases/{id}/evidence         → upload file; hash + ffprobe + adapter label + audit entry
POST   /evidence/{id}/detect        → run YOLOv8n or read from cache → insert events
POST   /evidence/{id}/normalize     → store offset, recompute timestamp_normalized for all events
GET    /cases/{id}/timeline         → merged, sorted events across all evidence pieces
POST   /cases/{id}/verify           → recompute SHA-256 of every evidence file, compare, log
GET    /cases/{id}/audit            → full hash-chained audit trail
POST   /cases/{id}/report           → render HTML report, export via browser print-to-PDF
GET    /cases                       → list all cases (dashboard)
```

---

## Proposed Changes (File-by-File)

### Backend

#### [NEW] `backend/requirements.txt`
FastAPI, uvicorn, sqlalchemy, python-multipart, ultralytics, jinja2, python-dotenv, aiofiles.

#### [NEW] `backend/database.py`
SQLAlchemy engine + `Base`, `get_db()` dependency, table creation on startup.

#### [NEW] `backend/models.py`
SQLAlchemy ORM models for all 5 tables.

#### [NEW] `backend/services/hashing.py`
`compute_sha256(path)` — streams file in 64 KB chunks, returns hex digest. Critical: original file is never modified.

#### [NEW] `backend/services/metadata.py`
`extract_metadata(path)` — calls `ffprobe -v quiet -print_format json -show_streams`, parses JSON output → returns `{duration, codec, resolution, fps}`.

#### [NEW] `backend/services/timeline.py`
`normalize_timestamps(events, offset_seconds)` — applies offset to `timestamp_raw` to produce `timestamp_normalized`. Pure arithmetic, no ML.

#### [NEW] `backend/services/detect.py`
`run_detection(file_path, evidence_id, cache_path)` — checks cache first; if miss, runs YOLOv8n on extracted frames, writes results to cache JSON and to `events` table.

#### [NEW] `backend/services/audit.py`
`append_audit(db, case_id, actor, action, detail)` — computes `entry_hash = SHA256(prev_hash + timestamp + action + detail)`, inserts row. First entry uses a genesis hash (zeros).

#### [NEW] `backend/services/report_gen.py`
Renders a Jinja2 HTML template with case metadata, evidence table, timeline events, and audit log. Saved as HTML; exported to PDF via browser `window.print()`.

#### [NEW] `backend/adapters/` (4 files)
`base.py` defines `BaseAdapter.identify(filename, metadata) → vendor_label: str`. `dahua.py`, `hikvision.py`, `cpplus.py` each implement rule-based identification (filename pattern + resolution heuristics — not real proprietary parsing).

#### [NEW] `backend/routers/cases.py`
Implements `POST /cases`, `GET /cases`, `POST /cases/{id}/verify`, `GET /cases/{id}/audit`, `POST /cases/{id}/report`.

#### [NEW] `backend/routers/evidence.py`
Implements `POST /cases/{id}/evidence`, `POST /evidence/{id}/detect`, `POST /evidence/{id}/normalize`, `GET /cases/{id}/timeline`.

#### [NEW] `backend/main.py`
FastAPI app entrypoint: includes routers, CORS config (allow localhost:3000), startup event to create tables.

#### [NEW] `backend/demo_assets/seed.py`
CLI script: creates Case #FV-2026-001, inserts 3 evidence rows pointing to pre-generated demo clips, loads cached detections, sets clock offsets. Runnable with `python seed.py`.

---

### Frontend

#### [NEW] `frontend/src/lib/api.ts`
Typed fetch wrappers for all 9 backend endpoints. Single source of truth for API URLs.

#### [NEW] `frontend/src/app/page.tsx` — Dashboard
Lists all cases as cards (case number, name, investigator, creation date, status badge). "New Case" button. Dark glassmorphism design.

#### [NEW] `frontend/src/app/cases/new/page.tsx` — Create Case
Form: case number (auto-generated), name, investigator, description. Submits to `POST /cases`.

#### [NEW] `frontend/src/app/cases/[id]/page.tsx` — Case Overview
Summary stats: evidence count, event count, integrity status, last audit entry. Navigation tabs to sub-pages.

#### [NEW] `frontend/src/app/cases/[id]/evidence/page.tsx` — Evidence Upload
Drag-and-drop uploader. Per-file cards showing: filename, hash (truncated), duration, codec, resolution, vendor label, status. Clock offset input field + "Normalize" button per camera.

#### [NEW] `frontend/src/app/cases/[id]/timeline/page.tsx` — Timeline View
Horizontal timeline with swimlanes per camera. Events rendered as clickable markers. Clicking an event: sets video player to correct file + timestamp. Shows both raw and normalized timestamps with a toggle. "Run Detection" button per evidence item.

#### [NEW] `frontend/src/app/cases/[id]/audit/page.tsx` — Audit Log
Scrollable table: timestamp, actor, action, detail, entry hash (truncated). Each row shows `prev_hash → entry_hash` chain visually.

#### [NEW] `frontend/src/app/cases/[id]/report/page.tsx` — Report Generation
Preview panel showing report content. "Generate Report" button → calls `POST /cases/{id}/report`. "Print / Save as PDF" button → `window.print()` (browser native).

#### [NEW] `frontend/src/components/ui/` — Design System
Button, Card, Badge, Modal, Input, Spinner, Tabs. Dark theme (`#0a0f1a` background, electric blue `#3b82f6` accent, emerald `#10b981` success/verified, rose `#f43f5e` failure/tampered).

#### [NEW] `frontend/src/components/TimelineViewer.tsx`
SVG/Canvas-based timeline with time-axis, swimlanes, event markers, zoom/pan. Highlights the selected event.

#### [NEW] `frontend/src/components/VideoPlayer.tsx`
HTML5 `<video>` element. Exposes `seekTo(seconds)` to parent. Shows evidence metadata overlay.

#### [NEW] `frontend/src/components/IntegrityChecker.tsx`
"Re-verify Integrity" button → calls `POST /cases/{id}/verify` → shows per-evidence PASS/FAIL badge with computed vs stored hash diff on failure.

---

## Design System

**Theme:** Dark forensic dashboard — authoritative, trustworthy, high-information density.

| Token | Value |
|---|---|
| Background | `#0a0f1a` (near-black navy) |
| Surface | `#111827` (elevated cards) |
| Border | `#1f2937` |
| Accent Blue | `#3b82f6` |
| Verified Green | `#10b981` |
| Tampered Red | `#f43f5e` |
| Warning Amber | `#f59e0b` |
| Text Primary | `#f9fafb` |
| Text Muted | `#6b7280` |
| Font | Inter (Google Fonts) |

Micro-animations: fade-in on route transitions, pulse on hashing progress, slide-in on audit entries, color-coded integrity badge flip (green→red).

---

## Demo Data Setup

The seed script will create:
- **Case:** FV-2026-001 — Warehouse Security Incident
- **Evidence:**
  - `cam01.mp4` → Dahua-compatible, offset: +0s
  - `cam02.mp4` → Hikvision-compatible, offset: +47s
  - `cam03.mp4` → CP Plus-compatible, offset: −23s
- **Cached Events:** 4–6 "person detected" events per camera with confidence scores and frame numbers
- **Pre-set audit log** with intake, normalization, and verify entries

> **Note:** Demo clips are generated via FFmpeg test patterns (`testsrc`, `testsrc2`, `color`). Swap in real footage later — the seed script is agnostic to clip content.

---

## Verification Plan

### Automated / Self-Verified
- Backend: start FastAPI, hit `/docs` — confirm all 9 endpoints listed
- Upload a test file via `/docs` — confirm hash matches `certutil -hashfile <file> SHA256` output
- Audit log: verify `entry_hash` of row N equals `SHA256(row[N-1].entry_hash + row[N].timestamp + row[N].action + row[N].detail)`
- Integrity verify: manually edit a byte in a copied evidence file → confirm the `/verify` endpoint returns a mismatch

### UI / Manual
- Full happy path: Create case → Upload 3 clips → Normalize → Detect → Timeline → Verify → Audit → Report
- Integrity tamper demo: swap in a modified file, click Verify, confirm red FAIL state with hash diff shown
- Report: open generated HTML, use browser Print → Save as PDF, confirm case number, evidence, events, integrity status all present

---

## Decisions Locked In

| Decision | Choice |
|---|---|
| Demo video clips | FFmpeg test patterns (`testsrc`) — swap real footage in later |
| PDF generation | Browser `window.print()` — no WeasyPrint / GTK needed |
| Build type | Team build — stretch features in scope after core is done |
| Running environment | Windows, local (`uvicorn` + `npm run dev`) |
