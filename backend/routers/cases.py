import os
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
from database import get_db
from models import Case, Evidence, AuditLog, Report
from services.audit import append_audit, verify_audit_chain
from services.hashing import compute_sha256
from services.report_gen import generate_case_report

router = APIRouter(prefix="/cases", tags=["cases"])

class CaseCreateSchema(BaseModel):
    name: str
    investigator: str
    description: Optional[str] = ""

@router.post("")
def create_case(payload: CaseCreateSchema, db: Session = Depends(get_db)):
    # Auto-generate case number
    count = db.query(Case).count() + 1
    case_number = f"FV-2026-{count:03d}"
    
    case = Case(
        case_number=case_number,
        name=payload.name,
        investigator=payload.investigator,
        description=payload.description
    )
    db.add(case)
    db.commit()
    db.refresh(case)
    
    # Initialize genesis audit log entry
    append_audit(
        db=db,
        case_id=case.id,
        action="Case Created",
        detail=f"Case {case.case_number} ('{case.name}') opened by {case.investigator}.",
        actor=case.investigator
    )
    
    return case

@router.get("")
def list_cases(db: Session = Depends(get_db)):
    cases = db.query(Case).order_by(Case.created_at.desc()).all()
    result = []
    for c in cases:
        ev_count = db.query(Evidence).filter(Evidence.case_id == c.id).count()
        result.append({
            "id": c.id,
            "case_number": c.case_number,
            "name": c.name,
            "investigator": c.investigator,
            "description": c.description,
            "created_at": c.created_at.isoformat(),
            "evidence_count": ev_count
        })
    return result

@router.get("/{case_id}")
def get_case(case_id: int, db: Session = Depends(get_db)):
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    
    ev_count = db.query(Evidence).filter(Evidence.case_id == case.id).count()
    audit_chain = verify_audit_chain(db, case_id)
    
    return {
        "id": case.id,
        "case_number": case.case_number,
        "name": case.name,
        "investigator": case.investigator,
        "description": case.description,
        "created_at": case.created_at.isoformat(),
        "evidence_count": ev_count,
        "audit_chain": audit_chain
    }

@router.post("/{case_id}/verify")
def verify_case_integrity(case_id: int, db: Session = Depends(get_db)):
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    evidence_items = db.query(Evidence).filter(Evidence.case_id == case_id).all()
    verification_results = []
    all_passed = True

    for ev in evidence_items:
        stored_hash = ev.sha256
        if os.path.exists(ev.file_path):
            current_hash = compute_sha256(ev.file_path)
            passed = (current_hash == stored_hash)
        else:
            current_hash = "FILE_NOT_FOUND"
            passed = False
        
        if not passed:
            all_passed = False

        verification_results.append({
            "evidence_id": ev.id,
            "filename": ev.filename,
            "stored_hash": stored_hash,
            "current_hash": current_hash,
            "passed": passed
        })

    status_str = "PASS — All Evidence Hashes Verified Intact" if all_passed else "FAIL — Hash Discrepancy Detected!"
    append_audit(
        db=db,
        case_id=case_id,
        action="Integrity Verification Run",
        detail=f"Integrity Re-Check Status: {status_str}",
        actor=case.investigator
    )

    return {
        "case_id": case_id,
        "all_passed": all_passed,
        "items": verification_results
    }

@router.get("/{case_id}/audit")
def get_audit_trail(case_id: int, db: Session = Depends(get_db)):
    logs = db.query(AuditLog).filter(AuditLog.case_id == case_id).order_by(AuditLog.id.asc()).all()
    chain_info = verify_audit_chain(db, case_id)
    return {
        "case_id": case_id,
        "chain_valid": chain_info["valid"],
        "logs": [
            {
                "id": l.id,
                "actor": l.actor,
                "action": l.action,
                "detail": l.detail,
                "timestamp": l.timestamp.isoformat(),
                "prev_hash": l.prev_hash,
                "entry_hash": l.entry_hash
            }
            for l in logs
        ]
    }

@router.post("/{case_id}/report")
def generate_report_endpoint(case_id: int, db: Session = Depends(get_db)):
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    file_path = generate_case_report(db, case_id)
    
    append_audit(
        db=db,
        case_id=case_id,
        action="Report Generated",
        detail=f"Generated forensic HTML report at {os.path.basename(file_path)}",
        actor=case.investigator
    )

    return FileResponse(
        path=file_path,
        media_type="text/html",
        filename=os.path.basename(file_path)
    )
