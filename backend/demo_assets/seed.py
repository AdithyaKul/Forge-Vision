import os
import sys

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from database import engine, SessionLocal, Base
from models import Case, Evidence, Event
from services.hashing import compute_sha256
from services.metadata import extract_metadata
from adapters import identify_vendor
from services.audit import append_audit
from services.detect import run_detection_service
from services.timeline import normalize_event_timestamps

def run_seed():
    # Recreate tables
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()

    # 1. Create Case
    case = Case(
        case_number="FV-2026-001",
        name="Warehouse Security Incident",
        investigator="Det. A. Vance",
        description="Multi-camera timeline correlation & evidence hashing for unauthorized entry at Warehouse B."
    )
    db.add(case)
    db.commit()
    db.refresh(case)

    append_audit(
        db=db,
        case_id=case.id,
        action="Case Created",
        detail=f"Opened initial case file {case.case_number} ({case.name}).",
        actor=case.investigator
    )

    # 2. Check/Generate Demo Videos
    videos_dir = os.path.join(os.path.dirname(__file__), "videos")
    cam01_path = os.path.join(videos_dir, "cam01.mp4")
    
    if not os.path.exists(cam01_path):
        from demo_assets.generate_demo_videos import generate_video
        generate_video("cam01.mp4", 1280, 720, 15, 20, "CAM-01 [MAIN GATE - Dahua-Spec]", (20, 25, 35))
        generate_video("cam02.mp4", 960, 540, 10, 20, "CAM-02 [STORAGE AREA - Hikvision-Spec]", (25, 20, 30))
        generate_video("cam03.mp4", 1920, 1080, 25, 20, "CAM-03 [LOADING BAY - CP Plus-Spec]", (15, 30, 25))

    # Also copy demo videos into backend uploads directory so static file server serves them
    uploads_dir = os.path.join(os.path.dirname(__file__), "..", "uploads")
    os.makedirs(uploads_dir, exist_ok=True)

    evidence_configs = [
        {"file": "cam01.mp4", "offset": 0.0, "time": "2026-09-20T21:42:13"},
        {"file": "cam02.mp4", "offset": 47.0, "time": "2026-09-20T21:41:26"},
        {"file": "cam03.mp4", "offset": -23.0, "time": "2026-09-20T21:42:36"}
    ]

    for cfg in evidence_configs:
        fname = cfg["file"]
        src = os.path.join(videos_dir, fname)
        dest = os.path.join(uploads_dir, f"case_{case.id}_{fname}")
        
        import shutil
        shutil.copy(src, dest)

        sha = compute_sha256(dest)
        meta = extract_metadata(dest)
        vendor = identify_vendor(fname, meta)

        ev = Evidence(
            case_id=case.id,
            filename=fname,
            file_path=dest,
            sha256=sha,
            duration=meta["duration"],
            codec=meta["codec"],
            resolution=meta["resolution"],
            fps=meta["fps"],
            vendor_label=vendor,
            source_time=cfg["time"],
            offset_seconds=cfg["offset"],
            status="ingested"
        )
        db.add(ev)
        db.commit()
        db.refresh(ev)

        append_audit(
            db=db,
            case_id=case.id,
            action="Evidence Ingested",
            detail=f"Uploaded '{fname}' (SHA256: {sha[:12]}..., Spec: {vendor}, Clock Offset: {cfg['offset']:+.1f}s)",
            actor=case.investigator
        )

        # Run detections & apply offsets
        run_detection_service(db, ev.id)
        normalize_event_timestamps(db, ev.id, cfg["offset"])

    print(f"Seed completed successfully! Case #{case.case_number} created with 3 evidence files.")

if __name__ == "__main__":
    run_seed()
