import os
import shutil
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from pydantic import BaseModel
from database import get_db
from models import Case, Evidence, Event
from services.hashing import compute_sha256
from services.metadata import extract_metadata
from adapters import identify_vendor
from services.audit import append_audit
from services.timeline import normalize_event_timestamps, get_unified_timeline
from services.detect import run_detection_service

router = APIRouter(prefix="", tags=["evidence"])

UPLOADS_DIR = os.path.join(os.path.dirname(__file__), "..", "uploads")
os.makedirs(UPLOADS_DIR, exist_ok=True)

class NormalizePayload(BaseModel):
    offset_seconds: float

@router.post("/cases/{case_id}/evidence")
async def upload_evidence(
    case_id: int,
    file: UploadFile = File(...),
    source_time: str = Form("2026-09-20T21:42:13"),
    db: Session = Depends(get_db)
):
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    dest_path = os.path.join(UPLOADS_DIR, f"case_{case_id}_{file.filename}")
    with open(dest_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    sha256 = compute_sha256(dest_path)
    metadata = extract_metadata(dest_path)
    vendor_label = identify_vendor(file.filename, metadata)

    evidence = Evidence(
        case_id=case_id,
        filename=file.filename,
        file_path=dest_path,
        sha256=sha256,
        duration=metadata["duration"],
        codec=metadata["codec"],
        resolution=metadata["resolution"],
        fps=metadata["fps"],
        vendor_label=vendor_label,
        source_time=source_time,
        offset_seconds=0.0,
        status="ingested"
    )
    db.add(evidence)
    db.commit()
    db.refresh(evidence)

    append_audit(
        db=db,
        case_id=case_id,
        action="Evidence Ingested",
        detail=f"Uploaded '{file.filename}' (SHA256: {sha256[:12]}..., Spec: {vendor_label}, Res: {metadata['resolution']})",
        actor=case.investigator
    )

    return evidence

@router.get("/cases/{case_id}/evidence")
def list_case_evidence(case_id: int, db: Session = Depends(get_db)):
    return db.query(Evidence).filter(Evidence.case_id == case_id).all()

@router.post("/evidence/{evidence_id}/normalize")
def normalize_evidence_offset(
    evidence_id: int,
    payload: NormalizePayload,
    db: Session = Depends(get_db)
):
    evidence = db.query(Evidence).filter(Evidence.id == evidence_id).first()
    if not evidence:
        raise HTTPException(status_code=404, detail="Evidence not found")

    evidence.offset_seconds = payload.offset_seconds
    db.commit()

    updated_count = normalize_event_timestamps(db, evidence_id, payload.offset_seconds)

    case = db.query(Case).filter(Case.id == evidence.case_id).first()
    append_audit(
        db=db,
        case_id=evidence.case_id,
        action="Timeline Offset Applied",
        detail=f"Set camera '{evidence.filename}' clock drift offset to {payload.offset_seconds:+.2f}s ({updated_count} events re-indexed).",
        actor=case.investigator if case else "Investigator"
    )

    return {"evidence_id": evidence_id, "offset_seconds": payload.offset_seconds, "events_updated": updated_count}

@router.post("/evidence/{evidence_id}/detect")
def detect_events_for_evidence(evidence_id: int, db: Session = Depends(get_db)):
    evidence = db.query(Evidence).filter(Evidence.id == evidence_id).first()
    if not evidence:
        raise HTTPException(status_code=404, detail="Evidence not found")

    events = run_detection_service(db, evidence_id)

    case = db.query(Case).filter(Case.id == evidence.case_id).first()
    append_audit(
        db=db,
        case_id=evidence.case_id,
        action="Analytical Detection Run",
        detail=f"Ran object detection on '{evidence.filename}': {len(events)} bounding-box events tagged.",
        actor=case.investigator if case else "Investigator"
    )

    return events

@router.get("/cases/{case_id}/timeline")
def get_case_timeline(case_id: int, db: Session = Depends(get_db)):
    return get_unified_timeline(db, case_id)
