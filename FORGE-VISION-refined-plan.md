# FORGE-VISION — Refined 1-Day Hackathon Plan

*Revision of the original build-out. Same core idea, tightened, de-risked, and stripped of padding.*

---

## 0. What I changed and why

The original plan was directionally right (adapter architecture, evidence preservation, normalized timeline, integrity, report) but had real problems as an execution plan:

| Problem in original | Fix applied here |
|---|---|
| Content was pasted twice in full (duplicate 62-section doc) | Collapsed into one document, no repetition |
| 12-hour schedule packed backend + frontend + YOLO + FFmpeg + audit chain + PDF report + recovery simulation + "beautiful UI" + integration + demo prep, with **zero buffer** | Added explicit buffer blocks, cut two features, resequenced so a demoable product exists by hour 6, not hour 11 |
| No pre-hackathon prep step — but installing PyTorch/YOLO/FFmpeg cold on venue wifi can burn 1–2 hours alone | Added a **Pre-Hackathon Checklist** to do the night before |
| No fallback if live demo breaks (video corruption, laptop crash, wifi-dependent model download) | Added a fallback plan: recorded demo video + seeded database snapshot |
| AI section listed YOLO + PyTorch + face detection + NL search + AI summary + event graph + "follow subject across cameras" as things to *consider* — too many flashy stretch features diluted focus | Cut to one AI feature (object/person detection) as core; everything else demoted to "if time remains" or removed |
| Security section proposed 4 roles and a permissions matrix for a 1-day prototype | Cut to a single hardcoded "Investigator" role with a cosmetic role label — real RBAC isn't worth the hours |
| No mention of how the 3 "vendor" demo videos with mismatched clocks actually get created | Added a concrete, scriptable way to generate them with ffmpeg |
| Blockchain section spent significant space explaining what to avoid, without ever being load-bearing for the MVP | Cut to two sentences: don't build it, mention it as roadmap only |
| No connection between features and what judges are likely scoring | Added a short rubric-alignment note |
| Diagrams were ASCII-art heavy and slowed reading without adding information | Replaced most with plain lists/tables; kept only the one diagram that matters (data flow) |

Net effect: the scope is smaller, the schedule has slack, and there's a defined fallback if the live system misbehaves — which is the single most common way hackathon demos actually fail.

---

## 1. One-line pitch

> **FORGE-VISION is an offline, vendor-agnostic platform that turns raw multi-camera surveillance footage into a hashed, timeline-normalized, reportable investigation case.**

Core story: **Raw Evidence → Preserve → Normalize → Correlate → Verify → Report.**

---

## 2. Revised scope

### Must-have (build this, in this order — this is the whole demo)
1. Create case
2. Upload evidence (video files) → SHA-256 hash + basic metadata (ffprobe: duration, codec, resolution)
3. Mock vendor/source identification (rule-based, not real reverse engineering)
4. Per-camera clock offset input + timeline normalization
5. Object/person detection on short clips → timestamped events
6. Unified timeline view, clickable, jumps to the right point in the right video
7. Append-only audit log (hash-chained)
8. Integrity re-check button (recompute hash, compare to stored hash)
9. One-click PDF/HTML report export

### If time remains (only after all of the above works end-to-end)
- Evidence Explorer search bar (filter events by keyword/time)
- "Recovered footage" simulation screen (fake file-carving progress bar + fabricated fragment list, clearly labeled simulated)
- One-paragraph AI-generated plain-language summary of the timeline

### Cut entirely — do not attempt in one day
- Real proprietary DVR/NVR parsing for any vendor
- Real deleted-file recovery / file carving
- Face recognition or identity matching of any kind
- Blockchain anchoring (mention only as roadmap slide)
- Role-based access control / multi-user auth
- Person-tracking across cameras ("follow subject")
- Natural-language query parsing
- Event correlation graph UI
- Multi-camera synchronized video playback

Rationale: every cut item is either a legal/ethical trap (face recognition), a multi-week engineering problem disguised as a checkbox (real DVR parsing, file carving), or a nice-to-have UI flourish that doesn't change whether the judges believe the core workflow (adapters → hashing → normalization → integrity → report). If you have unexpected extra hours, pull from the "if time remains" list, not this one.

---

## 3. Demo scenario (concrete, buildable)

**Case #FV-2026-001 — Warehouse Security Incident**

- CAM-01 (Main Gate), CAM-02 (Storage Area), CAM-03 (Loading Bay)
- Labeled in the UI as "Dahua-compatible," "Hikvision-compatible," "CP Plus-compatible" — this is a label only, not real vendor parsing
- True incident time: 21:42:13
- Injected clock drift: CAM-01 = +00:00, CAM-02 = +00:47, CAM-03 = −00:23

### How to actually generate the 3 demo clips (do this the night before)

1. Take any single 60–90 second stock clip of a person walking (royalty-free), or film one yourself with a phone.
2. Use `ffmpeg` to cut 3 overlapping ~20-second segments and re-encode with different resolutions/framerates so they look like different cameras:
   ```bash
   ffmpeg -i source.mp4 -ss 00:00:00 -t 20 -vf scale=1280:720 -r 15 cam01.mp4
   ffmpeg -i source.mp4 -ss 00:00:15 -t 20 -vf scale=960:540 -r 10 cam02.mp4
   ffmpeg -i source.mp4 -ss 00:00:08 -t 20 -vf scale=1920:1080 -r 25 cam03.mp4
   ```
3. Hardcode the "source_time" and "offset" values per camera in a seed script — don't try to derive drift from real file metadata. The normalization logic just needs to *apply* an offset correctly; where the offset number comes from is irrelevant to the demo.
4. Pre-run detection on these exact files before the demo and cache the results. Live inference during the demo is a bonus, not a dependency — if the model is slow or flaky live, load from cache.

This removes the single biggest source of live-demo risk: depending on a model to produce the right detections in front of judges.

---

## 4. Architecture (simplified)

```
Frontend (Next.js) → REST API (FastAPI) → SQLite
                          │
                          ├── hashing.py     (SHA-256, real)
                          ├── metadata.py    (ffprobe, real)
                          ├── timeline.py    (offset math, real)
                          ├── detect.py      (YOLOv8n, real but pre-cached)
                          ├── audit.py       (hash-chained log, real)
                          └── adapters/      (identify() rule stubs per "vendor")
```

Design rule that must not be violated: **the uploaded original file is never written to by any later step.** Every derived artifact (extracted frames, detections, normalized timestamps, report) is a separate row/file that references the original by ID and hash. This single rule is what makes the "evidence preservation" story credible — it's cheap to implement and worth stating explicitly in the demo.

---

## 5. Data model (SQLite, 5 tables — don't add more)

- **cases**: id, case_number, name, investigator, created_at
- **evidence**: id, case_id, filename, sha256, duration, codec, resolution, vendor_label, source_time, offset_seconds, status
- **events**: id, evidence_id, timestamp_normalized, event_type, confidence, frame_number
- **audit_log**: id, case_id, actor, action, timestamp, prev_hash, entry_hash
- **reports**: id, case_id, generated_at, file_path

---

## 6. API surface (minimum viable)

```
POST /cases                      create case
POST /cases/{id}/evidence         upload file → hash, metadata, adapter label
POST /evidence/{id}/detect        run/read cached detections → events
POST /evidence/{id}/normalize     apply offset → normalized timestamps
GET  /cases/{id}/timeline         merged, sorted events across all evidence
POST /cases/{id}/verify           recompute hash, compare, log result
GET  /cases/{id}/audit            audit trail
POST /cases/{id}/report           generate PDF/HTML
```

Nine endpoints. That's enough for the whole demo — resist adding more.

---

## 7. Tech stack (locked, with rationale)

| Layer | Choice | Why |
|---|---|---|
| Frontend | Next.js + Tailwind | fast to scaffold, good defaults, team likely already knows it |
| Backend | FastAPI (Python) | fast to write, auto docs, pairs naturally with ffmpeg/YOLO |
| DB | SQLite | zero setup, file-based, fine for a single-machine demo |
| Video metadata | ffprobe (part of ffmpeg) | real, fast, no ML needed |
| Detection | YOLOv8n (Ultralytics), **CPU inference, pre-cached** | smallest/fastest YOLO variant; CPU is fine since results are cached before the demo |
| Report | Simple HTML → print-to-PDF, or `weasyprint` | avoids fighting a PDF library under time pressure |
| Hashing | Python `hashlib` | trivial, and it's the one thing that must be 100% real |

Dropped from the original stack: PostgreSQL (unnecessary setup cost), ReportLab (weasyprint/HTML is faster to get right), shadcn/ui + Recharts (nice but not worth the setup time — plain Tailwind components are enough).

---

## 8. Pre-hackathon checklist (do this before the event starts)

- [ ] Scaffold both repos (Next.js + FastAPI) and confirm they run and talk to each other
- [ ] `pip install` and test-run YOLOv8n locally at least once — download the weights file in advance
- [ ] Confirm ffmpeg is installed and `ffprobe` works on a sample file
- [ ] Generate and pre-cache detections for the 3 demo clips (see §3)
- [ ] Write and test the seed script that loads the case, evidence rows, and cached detections in one command
- [ ] Record a 2-minute screen-capture video of the full working demo flow as a **fallback** in case live software breaks
- [ ] Export a full JSON/SQLite snapshot of the seeded case as a second fallback (reload instantly if the DB gets corrupted)
- [ ] Confirm the whole stack runs with **no internet connection** — this is a selling point (offline forensics), so it needs to actually be true

Skipping this step is the most common reason polished-looking hackathon plans fail in the room.

---

## 9. Revised hour-by-hour plan (assumes 3 people, includes buffer)

| Hours | Focus | Output |
|---|---|---|
| 0–1.5 | Backend skeleton: cases + evidence endpoints, SHA-256, ffprobe metadata | Can create a case and upload a file with a real hash |
| 1.5–3 | Frontend: dashboard, create-case form, upload screen wired to backend | End-to-end upload works in the browser |
| 3–4.5 | Timeline: offset storage + normalization logic + timeline UI | Three cameras' events shown on one aligned timeline |
| 4.5–6 | Detection: load cached YOLO results into events table, render on timeline | Clicking a timeline event jumps to that point in that video |
| 6–6.5 | **Buffer / integration checkpoint** | Confirm the full happy path works before adding anything else |
| 6.5–8 | Audit log (hash-chained) + integrity verify button | "Recompute hash" demo moment works |
| 8–9 | Report generation (HTML → PDF) | One-click report with case, evidence, timeline, integrity status |
| 9–10 | UI polish pass only — no new features | Consistent styling, loading states, no broken buttons |
| 10–11 | Full run-through + fix whatever breaks | Rehearsed, working demo |
| 11–12 | **Buffer** — record fallback video, prep slides, sleep-deprived-brain check | Fallback assets ready |

If the team is smaller than 3, cut from the "if time remains" list first, then consider dropping detection caching complexity and hand-labeling 4–5 events instead of running YOLO at all — the timeline/normalization/audit/report story survives without it.

---

## 10. Real vs. simulated (put this slide in the pitch — it builds credibility, not doubt)

| Component | Status |
|---|---|
| File hashing (SHA-256) | Real |
| Metadata extraction (ffprobe) | Real |
| Timeline normalization | Real |
| Audit log (hash-chained) | Real |
| Integrity verification | Real |
| Object/person detection | Real, cached for demo reliability |
| Report generation | Real |
| Vendor adapter architecture | Real pattern, stub logic |
| "Vendor" identification (Dahua/Hikvision/CP Plus labels) | Labeled, rule-based — not real proprietary parsing |
| Deleted-file recovery | Not built (roadmap only, or a clearly-labeled simulation if time remains) |
| Blockchain anchoring | Not built (roadmap only) |
| Face recognition | Not built (deliberately out of scope) |

---

## 11. Demo script (tightened to ~4 minutes)

1. **Problem (30s):** Surveillance evidence today is fragmented across vendor formats, mismatched camera clocks, and manual cross-referencing.
2. **Create case (20s):** New case, name it, done.
3. **Upload evidence (30s):** Drop 3 clips, show hash + metadata + vendor label appear immediately.
4. **Timeline before/after normalization (40s):** Show the misaligned raw timestamps, click "Normalize," show them align around 21:42:13.
5. **Detection on timeline (30s):** Click a "person detected" marker, video jumps to that frame.
6. **Integrity check (40s):** Recompute hash → match. Then show a mismatch case (swap in an altered file) → clear fail state. This is the strongest moment — don't cut it.
7. **Audit trail (20s):** Scroll the hash-chained log.
8. **Generate report (20s):** One click, PDF appears with everything above summarized.
9. **Close (20s):** "One case, one normalized timeline, one verifiable chain of custody, one standardized report."

Total: ~4 minutes, leaves room for Q&A.

---

## 12. Anticipated questions (short, defensible answers)

- **"Does this work with real DVRs?"** — The architecture is vendor-independent; each proprietary format needs a validated adapter. This build demonstrates the adapter pattern and validates it against a generic format first.
- **"Is this court-admissible?"** — No claim of that. It's built around forensic *principles* (preservation, hashing, auditability); actual admissibility depends on jurisdiction and institutional procedure.
- **"What if the AI is wrong?"** — Detections carry a confidence score and are explicitly marked as analytical output requiring human review — they're never treated as ground truth.
- **"Why not the cloud?"** — Surveillance evidence is sensitive; offline/on-premise processing means nothing leaves the investigator's machine.
- **"What does hashing actually prove?"** — That the bytes being checked now match the bytes hashed at intake. Nothing more — it doesn't prove who created the footage or that the source camera wasn't compromised. Worth saying this unprompted; it shows the team understands the limits of their own tool.

---

## 13. Risk register

| Risk | Mitigation |
|---|---|
| Live model inference fails/slow in front of judges | Pre-cache all detections; live inference is optional bonus only |
| Venue wifi is bad, can't pip/npm install on the day | Everything installed and tested the night before |
| A demo file gets corrupted or the DB breaks mid-demo | Pre-recorded fallback video + a restorable DB snapshot |
| Team spends too long polishing UI before core flow works | Hour 6 buffer checkpoint forces the happy path to exist before styling |
| Scope creep toward face recognition / blockchain / person-tracking | Explicitly listed as cut in §2 — treat as out of bounds, not "nice to have" |

---

## 14. Roadmap beyond the hackathon (one slide, not a plan)

V1 (this build) → V2: validated adapters for 1–2 real DVR formats → V3: real file-carving/recovery → V4: multi-camera correlation and richer analytics → V5: institutional deployment, optional external integrity anchoring.

Keep this to a single slide. The hackathon prototype's job is to prove the workflow, not to preview every future feature.
