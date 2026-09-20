# FORGE-VISION — Execution Checklist

> Decisions locked in:
> - Demo clips → FFmpeg test patterns (swap real footage in later)
> - PDF → Browser print-to-PDF (no WeasyPrint / GTK headache)
> - Build type → Team (stretch features in scope after core is done)

---

## Phase 0 — Project Scaffold

- [ ] Create root folder `forge-vision/` with `backend/` and `frontend/` subdirectories
- [ ] **Backend**: scaffold FastAPI project
  - [ ] Create `backend/requirements.txt` (fastapi, uvicorn, sqlalchemy, python-multipart, ultralytics, jinja2, python-dotenv, aiofiles)
  - [ ] Install dependencies via `pip install -r requirements.txt`
  - [ ] Create `backend/main.py` (app entrypoint, CORS for localhost:3000, router includes, startup table creation)
  - [ ] Confirm `uvicorn main:app --reload` starts without errors and `/docs` loads
- [ ] **Frontend**: scaffold Next.js 14 project
  - [ ] Run `npx create-next-app@latest frontend --ts --tailwind --app --no-src-dir` (or equivalent)
  - [ ] Install additional deps: `axios` (or native fetch wrapper)
  - [ ] Add Inter font via `next/font/google`
  - [ ] Set up global CSS design tokens (background, surface, accent colors — see plan)
  - [ ] Confirm `npm run dev` starts on port 3000 without errors
- [ ] Verify frontend can reach backend (a `GET /` health check route + fetch from the browser)

---

## Phase 1 — Database Layer

- [ ] Create `backend/database.py`
  - [ ] SQLAlchemy engine pointing to `forge_vision.db`
  - [ ] `SessionLocal` + `Base` + `get_db()` dependency
- [ ] Create `backend/models.py` — all 5 ORM models:
  - [ ] `Case` (id, case_number, name, investigator, description, created_at)
  - [ ] `Evidence` (id, case_id, filename, file_path, sha256, duration, codec, resolution, fps, vendor_label, source_time, offset_seconds, status)
  - [ ] `Event` (id, evidence_id, timestamp_raw, timestamp_normalized, event_type, confidence, frame_number, bbox_json)
  - [ ] `AuditLog` (id, case_id, actor, action, detail, timestamp, prev_hash, entry_hash)
  - [ ] `Report` (id, case_id, generated_at, file_path, format)
- [ ] Wire `Base.metadata.create_all()` into FastAPI startup event
- [ ] Confirm `forge_vision.db` is created on first run with all 5 tables

---

## Phase 2 — Backend Services

- [ ] **`backend/services/hashing.py`**
  - [ ] `compute_sha256(path: str) → str` — streams in 64 KB chunks, returns hex digest
  - [ ] Unit-check: hash a known file, compare against `certutil -hashfile <file> SHA256`

- [ ] **`backend/services/metadata.py`**
  - [ ] `extract_metadata(path: str) → dict` — calls `ffprobe -v quiet -print_format json -show_streams`
  - [ ] Returns `{duration, codec, resolution, fps}`
  - [ ] Confirm ffprobe is on PATH and works on a test file

- [ ] **`backend/services/audit.py`**
  - [ ] `get_last_entry_hash(db, case_id) → str` — fetches latest row's `entry_hash`, or genesis zeros
  - [ ] `append_audit(db, case_id, actor, action, detail) → AuditLog` — computes `entry_hash = SHA256(prev_hash + timestamp + action + detail)`, inserts row
  - [ ] Verify chain: row N's `prev_hash` equals row N-1's `entry_hash`

- [ ] **`backend/services/timeline.py`**
  - [ ] `apply_offset(events: list, offset_seconds: float) → list` — adds offset to `timestamp_raw` → `timestamp_normalized`
  - [ ] `merge_timeline(all_events: list) → list` — sorts by `timestamp_normalized` across all evidence

- [ ] **`backend/services/detect.py`**
  - [ ] `load_cache(cache_path) → dict` — reads `detections_cache.json`
  - [ ] `run_detection(file_path, evidence_id, db, cache_path) → list[Event]` — checks cache first; if miss, runs YOLOv8n, writes cache; either way inserts events to DB
  - [ ] Download YOLOv8n weights (`yolov8n.pt`) in advance and confirm CPU inference works

- [ ] **`backend/services/report_gen.py`**
  - [ ] Create `backend/templates/report.html.jinja2` — case header, evidence table, events table, audit log, integrity status
  - [ ] `generate_report(case_id, db) → str` — renders template, saves HTML file, returns file path
  - [ ] Confirm rendered HTML opens correctly in a browser and is print-friendly (CSS `@media print`)

- [ ] **`backend/adapters/`**
  - [ ] `base.py` — `BaseAdapter` with `identify(filename, metadata) → str`
  - [ ] `dahua.py` — matches filenames/resolution patterns → returns `"Dahua-compatible"`
  - [ ] `hikvision.py` → returns `"Hikvision-compatible"`
  - [ ] `cpplus.py` → returns `"CP Plus-compatible"`
  - [ ] `__init__.py` with `identify_vendor(filename, metadata)` dispatcher

---

## Phase 3 — API Routers

- [ ] **`backend/routers/cases.py`**
  - [ ] `POST /cases` — create case, call `append_audit("Case created")`, return case JSON
  - [ ] `GET /cases` — list all cases with evidence count
  - [ ] `GET /cases/{id}` — single case detail + stats
  - [ ] `POST /cases/{id}/verify` — recompute SHA-256 for each evidence file, compare to stored, log result to audit, return per-evidence pass/fail
  - [ ] `GET /cases/{id}/audit` — return full audit log ordered by timestamp
  - [ ] `POST /cases/{id}/report` — call `report_gen`, return HTML file path + serve file

- [ ] **`backend/routers/evidence.py`**
  - [ ] `POST /cases/{id}/evidence` — save uploaded file, `compute_sha256`, `extract_metadata`, `identify_vendor`, insert Evidence row, `append_audit("Evidence ingested")`, return evidence JSON
  - [ ] `POST /evidence/{id}/detect` — call `run_detection`, `append_audit("Detection run")`, return events
  - [ ] `POST /evidence/{id}/normalize` — accept `{offset_seconds}`, update Evidence row, call `apply_offset` on all events, `append_audit("Timeline normalized")`, return updated events
  - [ ] `GET /cases/{id}/timeline` — call `merge_timeline` across all evidence events, return sorted list

- [ ] Include both routers in `main.py`
- [ ] Smoke-test all 9 endpoints via `/docs` with the demo files

---

## Phase 4 — Demo Assets

- [ ] **Generate demo video clips** using FFmpeg test patterns:
  - [ ] `cam01.mp4` — 1280×720, 15fps, 20s, `testsrc` pattern
  - [ ] `cam02.mp4` — 960×540, 10fps, 20s, `testsrc2` pattern
  - [ ] `cam03.mp4` — 1920×1080, 25fps, 20s, `color` pattern
  - [ ] *(Swap these out with real footage once available — seed script is agnostic)*

- [ ] **`backend/demo_assets/detections_cache.json`** — hand-write or pre-run detection on the 3 clips:
  - [ ] cam01: 2 events ("person detected", confidence 0.87, 0.91)
  - [ ] cam02: 3 events ("person detected", confidence 0.78, 0.83, 0.89)
  - [ ] cam03: 2 events ("person detected", confidence 0.92, 0.85)

- [ ] **`backend/demo_assets/seed.py`**
  - [ ] Creates Case: `FV-2026-001 — Warehouse Security Incident`
  - [ ] Inserts 3 Evidence rows (cam01/02/03), hashes them, sets `vendor_label`, `source_time`, `offset_seconds`
  - [ ] Loads cached detections → inserts Events
  - [ ] Writes 5 seed audit entries (case created, 3× evidence ingested, detection run)
  - [ ] Confirm: `python seed.py` runs clean and DB has correct rows

---

## Phase 5 — Frontend Pages & Components

### Design System
- [ ] `tailwind.config.ts` — extend with custom colors (background, surface, accent, verified, tampered, warning)
- [ ] `globals.css` — base styles, scrollbar styling, animation keyframes (fade-in, pulse, slide-in)
- [ ] `src/lib/api.ts` — typed fetch wrappers for all 9 endpoints

### Primitive UI Components (`src/components/ui/`)
- [ ] `Button.tsx` (variants: primary, secondary, danger, ghost)
- [ ] `Card.tsx` (glass surface with border)
- [ ] `Badge.tsx` (variants: success/verified, error/tampered, warning, muted)
- [ ] `Input.tsx` + `Textarea.tsx`
- [ ] `Spinner.tsx` (loading state)
- [ ] `Tabs.tsx` (for case sub-pages)
- [ ] `Modal.tsx` (for confirmations)

### Pages
- [ ] **Dashboard** `src/app/page.tsx`
  - [ ] Fetch + display all cases as `CaseCard` components
  - [ ] "New Case" button → navigates to `/cases/new`
  - [ ] Empty state when no cases exist
  - [ ] Case count, last activity stats in header

- [ ] **Create Case** `src/app/cases/new/page.tsx`
  - [ ] Form: auto-generate case number, name input, investigator input, description textarea
  - [ ] Submit → `POST /cases` → redirect to `/cases/{id}`

- [ ] **Case Overview** `src/app/cases/[id]/page.tsx`
  - [ ] Stat cards: evidence count, event count, audit entries, integrity status
  - [ ] Tab navigation: Evidence | Timeline | Audit | Report
  - [ ] `IntegrityChecker` component with "Re-verify Integrity" button

- [ ] **Evidence Page** `src/app/cases/[id]/evidence/page.tsx`
  - [ ] Drag-and-drop file uploader (or file input) → `POST /cases/{id}/evidence`
  - [ ] Evidence cards (filename, hash truncated with copy button, duration, codec, res, vendor label badge)
  - [ ] Per-card: clock offset input + "Normalize" button → `POST /evidence/{id}/normalize`
  - [ ] Per-card: "Run Detection" button → `POST /evidence/{id}/detect`
  - [ ] Upload progress indicator

- [ ] **Timeline Page** `src/app/cases/[id]/timeline/page.tsx`
  - [ ] `TimelineViewer` — horizontal swimlane per camera, time axis, event markers
  - [ ] Toggle: "Raw timestamps" vs "Normalized timestamps"
  - [ ] Click event marker → `VideoPlayer` seeks to that timestamp
  - [ ] `VideoPlayer` — HTML5 `<video>`, seekTo(), metadata overlay (camera name, vendor)
  - [ ] Event detail panel (type, confidence, frame number, both timestamps)

- [ ] **Audit Log** `src/app/cases/[id]/audit/page.tsx`
  - [ ] Scrollable table: timestamp, actor, action, detail
  - [ ] Hash chain display: `[prev_hash truncated] → [entry_hash truncated]` per row
  - [ ] Visual indicator: chain icon linking rows

- [ ] **Report Page** `src/app/cases/[id]/report/page.tsx`
  - [ ] Report preview panel (rendered HTML from backend)
  - [ ] "Generate Report" button → `POST /cases/{id}/report`
  - [ ] "Print / Save as PDF" button → `window.print()` (browser native)
  - [ ] Previously generated reports listed with timestamps

### Feature Components
- [ ] **`IntegrityChecker.tsx`** — calls `POST /cases/{id}/verify`, shows per-evidence PASS (green) / FAIL (red) badge, on FAIL shows stored hash vs computed hash diff
- [ ] **`TimelineViewer.tsx`** — SVG/canvas timeline, swimlanes, markers, zoom/pan, selected event highlight
- [ ] **`VideoPlayer.tsx`** — `<video>` with ref, `seekTo(seconds)` method exposed via `useImperativeHandle` or callback
- [ ] **`AuditLog.tsx`** — hash-chain table with chain link visualization
- [ ] **`EvidenceUploader.tsx`** — drag-and-drop zone with upload progress

---

## Phase 6 — Integration & End-to-End Test

- [ ] Full happy path run (manual):
  1. Open dashboard → create new case
  2. Upload cam01, cam02, cam03
  3. Enter clock offsets, click Normalize per camera
  4. Run Detection on each clip
  5. Open Timeline → click an event → video seeks correctly
  6. Toggle raw vs normalized timestamps — confirm alignment
  7. Click "Re-verify Integrity" → all PASS (green)
  8. Open Audit page → verify hash chain is unbroken
  9. Generate Report → open in browser → Print → Save as PDF

- [ ] **Integrity tamper demo** (critical for demo moment):
  - [ ] Copy a demo clip, edit one byte (e.g., via hex editor or `python -c "open(...,'r+b').write(b'\x00')"`)
  - [ ] Replace the evidence file path with the corrupted copy
  - [ ] Click "Re-verify" → confirm red FAIL state with hash diff displayed

- [ ] Run seed script, confirm demo loads instantly from DB

---

## Phase 7 — UI Polish

- [ ] Consistent spacing and typography across all pages
- [ ] Loading states on all async buttons (spinner, disabled state)
- [ ] Error states — toast or inline error messages for failed API calls
- [ ] Smooth page transitions (Next.js `<Transition>` or simple CSS fade)
- [ ] Audit log entry slide-in animation on new entries
- [ ] Integrity badge flip animation (green ↔ red)
- [ ] Timeline markers pulse animation on load
- [ ] Mobile layout check (not priority, but shouldn't look broken)
- [ ] Final pass: no broken buttons, no missing states

---

## Phase 8 — Demo Prep

- [ ] Run full demo script from §11 of the MD end-to-end, timed (~4 min)
- [ ] Pre-seed the DB with Case FV-2026-001 so it's ready to open instantly
- [ ] Record 2-minute screen capture as fallback
- [ ] Export DB snapshot (`cp forge_vision.db forge_vision_backup.db`) as second fallback
- [ ] Confirm entire stack runs with **no internet connection** (offline mode)
- [ ] Prepare restore-from-backup command ready to paste if DB breaks live

---

## Phase 9 — Stretch Features (only after Phase 6 is solid)

- [ ] **Evidence Explorer search bar** — filter events by keyword/time range on the Timeline page
- [ ] **Recovery simulation screen** — fake file-carving progress bar + fabricated fragment list, clearly labeled "Simulated"
- [ ] **AI summary** — one-paragraph plain-language summary of the normalized timeline (local LLM call or hand-written template for demo)
