import hashlib
import datetime
from sqlalchemy.orm import Session
from models import AuditLog

GENESIS_HASH = "0000000000000000000000000000000000000000000000000000000000000000"

def get_last_entry_hash(db: Session, case_id: int) -> str:
    """Returns entry_hash of the latest audit log entry for case_id, or genesis hash if none."""
    last_log = (
        db.query(AuditLog)
        .filter(AuditLog.case_id == case_id)
        .order_by(AuditLog.id.desc())
        .first()
    )
    return last_log.entry_hash if last_log else GENESIS_HASH

def append_audit(
    db: Session,
    case_id: int,
    action: str,
    detail: str = "",
    actor: str = "Investigator"
) -> AuditLog:
    """Computes entry_hash = SHA256(prev_hash + timestamp + action + detail) and appends to audit log."""
    prev_hash = get_last_entry_hash(db, case_id)
    now = datetime.datetime.utcnow()
    timestamp_str = now.isoformat()
    
    payload = f"{prev_hash}|{timestamp_str}|{actor}|{action}|{detail}"
    entry_hash = hashlib.sha256(payload.encode("utf-8")).hexdigest()
    
    log_entry = AuditLog(
        case_id=case_id,
        actor=actor,
        action=action,
        detail=detail,
        timestamp=now,
        prev_hash=prev_hash,
        entry_hash=entry_hash
    )
    db.add(log_entry)
    db.commit()
    db.refresh(log_entry)
    return log_entry

def verify_audit_chain(db: Session, case_id: int) -> dict:
    """Validates the entire audit log hash chain for integrity."""
    logs = (
        db.query(AuditLog)
        .filter(AuditLog.case_id == case_id)
        .order_by(AuditLog.id.asc())
        .all()
    )
    
    if not logs:
        return {"valid": True, "count": 0, "broken_at_id": None}

    expected_prev = GENESIS_HASH
    for log in logs:
        if log.prev_hash != expected_prev:
            return {"valid": False, "count": len(logs), "broken_at_id": log.id}
        
        timestamp_str = log.timestamp.isoformat()
        payload = f"{log.prev_hash}|{timestamp_str}|{log.actor}|{log.action}|{log.detail or ''}"
        recalculated_hash = hashlib.sha256(payload.encode("utf-8")).hexdigest()
        
        # Verify entry hash matches recalculated hash
        if recalculated_hash != log.entry_hash:
            return {"valid": False, "count": len(logs), "broken_at_id": log.id}
            
        expected_prev = log.entry_hash

    return {"valid": True, "count": len(logs), "broken_at_id": None}
