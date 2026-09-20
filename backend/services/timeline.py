from typing import List, Dict, Any
from sqlalchemy.orm import Session
from models import Event, Evidence

def normalize_event_timestamps(db: Session, evidence_id: int, offset_seconds: float) -> int:
    """Updates timestamp_normalized for all events associated with evidence_id."""
    events = db.query(Event).filter(Event.evidence_id == evidence_id).all()
    for event in events:
        event.timestamp_normalized = round(event.timestamp_raw + offset_seconds, 2)
    db.commit()
    return len(events)

def get_unified_timeline(db: Session, case_id: int) -> List[Dict[str, Any]]:
    """Retrieves all events for a case, merged and sorted by timestamp_normalized."""
    evidence_items = db.query(Evidence).filter(Evidence.case_id == case_id).all()
    evidence_ids = [e.id for e in evidence_items]
    evidence_map = {e.id: e for e in evidence_items}
    
    events = (
        db.query(Event)
        .filter(Event.evidence_id.in_(evidence_ids))
        .order_by(Event.timestamp_normalized.asc())
        .all()
    )
    
    result = []
    for event in events:
        ev = evidence_map.get(event.evidence_id)
        result.append({
            "id": event.id,
            "evidence_id": event.evidence_id,
            "filename": ev.filename if ev else "Unknown",
            "vendor_label": ev.vendor_label if ev else "Generic",
            "timestamp_raw": event.timestamp_raw,
            "timestamp_normalized": event.timestamp_normalized,
            "offset_seconds": ev.offset_seconds if ev else 0.0,
            "event_type": event.event_type,
            "confidence": event.confidence,
            "frame_number": event.frame_number,
            "bbox_json": event.bbox_json
        })
    return result
