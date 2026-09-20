import os
import sys
import shutil

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from database import SessionLocal
from models import Case, Evidence, Event
from services.hashing import compute_sha256
from services.metadata import extract_metadata
from adapters import identify_vendor
from services.audit import append_audit
from services.detect import run_detection_service
from services.timeline import normalize_event_timestamps

def ingest_vehicle_theft_case():
    db = SessionLocal()

    # 1. Create or get Case #FV-2026-002
    case = db.query(Case).filter(Case.case_number == "FV-2026-002").first()
    if not case:
        case = Case(
            case_number="FV-2026-002",
            name="Vehicle Theft Investigation",
            investigator="Det. R. Miller",
            description="Multi-camera surveillance evidence preservation and clock drift alignment for stolen SUV incident in Alley & Parking Exit."
        )
        db.add(case)
        db.commit()
        db.refresh(case)

        append_audit(
            db=db,
            case_id=case.id,
            action="Case Created",
            detail=f"Opened vehicle theft investigation case {case.case_number} ({case.name}).",
            actor=case.investigator
        )

    # 2. Source video files directory
    source_dir = os.path.join(os.path.dirname(__file__), "..", "..", "Vehicle theft casse video footage")
    uploads_dir = os.path.join(os.path.dirname(__file__), "..", "uploads")
    os.makedirs(uploads_dir, exist_ok=True)

    footage_configs = [
        {
            "original_filename": "Screen Recording 2025-04-23 175242.mp4",
            "alias_filename": "CAM01_Alley_Entrance.mp4",
            "source_time": "2025-04-23T17:52:42",
            "offset_seconds": 0.0
        },
        {
            "original_filename": "Screen Recording 2025-04-23 175742.mp4",
            "alias_filename": "CAM02_Parking_Exit.mp4",
            "source_time": "2025-04-23T17:57:42",
            "offset_seconds": 14.5
        }
    ]

    for cfg in footage_configs:
        src_path = os.path.join(source_dir, cfg["original_filename"])
        if not os.path.exists(src_path):
            print(f"Warning: file not found at {src_path}")
            continue

        dest_path = os.path.join(uploads_dir, f"case_{case.id}_{cfg['alias_filename']}")
        shutil.copy(src_path, dest_path)

        sha = compute_sha256(dest_path)
        meta = extract_metadata(dest_path)
        vendor = identify_vendor(cfg["alias_filename"], meta)

        # Check if evidence exists
        existing_ev = (
            db.query(Evidence)
            .filter(Evidence.case_id == case.id, Evidence.filename == cfg["alias_filename"])
            .first()
        )

        if not existing_ev:
            ev = Evidence(
                case_id=case.id,
                filename=cfg["alias_filename"],
                file_path=dest_path,
                sha256=sha,
                duration=meta["duration"],
                codec=meta["codec"],
                resolution=meta["resolution"],
                fps=meta["fps"],
                vendor_label=vendor,
                source_time=cfg["source_time"],
                offset_seconds=cfg["offset_seconds"],
                status="ingested"
            )
            db.add(ev)
            db.commit()
            db.refresh(ev)

            append_audit(
                db=db,
                case_id=case.id,
                action="Evidence Ingested",
                detail=f"Ingested real CCTV footage '{cfg['alias_filename']}' (SHA256: {sha[:12]}..., Spec: {vendor}, Res: {meta['resolution']})",
                actor=case.investigator
            )

            # Generate detected vehicle/suspect events
            run_detection_service(db, ev.id)
            normalize_event_timestamps(db, ev.id, cfg["offset_seconds"])
            print(f"Ingested {cfg['alias_filename']} into Case #{case.case_number}")
        else:
            print(f"Evidence {cfg['alias_filename']} already present in Case #{case.case_number}")

    print(f"Vehicle Theft Case #{case.case_number} successfully configured with real footage!")

if __name__ == "__main__":
    ingest_vehicle_theft_case()
