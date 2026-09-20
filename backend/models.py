import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from database import Base

class Case(Base):
    __tablename__ = "cases"

    id = Column(Integer, primary_key=True, index=True)
    case_number = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    investigator = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    evidence_items = relationship("Evidence", back_populates="case", cascade="all, delete-orphan")
    audit_entries = relationship("AuditLog", back_populates="case", cascade="all, delete-orphan")
    reports = relationship("Report", back_populates="case", cascade="all, delete-orphan")


class Evidence(Base):
    __tablename__ = "evidence"

    id = Column(Integer, primary_key=True, index=True)
    case_id = Column(Integer, ForeignKey("cases.id"), nullable=False)
    filename = Column(String, nullable=False)
    file_path = Column(String, nullable=False)
    sha256 = Column(String, nullable=False)
    duration = Column(Float, default=0.0)
    codec = Column(String, default="h264")
    resolution = Column(String, default="1920x1080")
    fps = Column(Float, default=30.0)
    vendor_label = Column(String, default="Generic-MP4")
    source_time = Column(String, default="2026-09-20T21:42:00")
    offset_seconds = Column(Float, default=0.0)
    status = Column(String, default="ingested")

    case = relationship("Case", back_populates="evidence_items")
    events = relationship("Event", back_populates="evidence", cascade="all, delete-orphan")


class Event(Base):
    __tablename__ = "events"

    id = Column(Integer, primary_key=True, index=True)
    evidence_id = Column(Integer, ForeignKey("evidence.id"), nullable=False)
    timestamp_raw = Column(Float, nullable=False)
    timestamp_normalized = Column(Float, nullable=False)
    event_type = Column(String, nullable=False)
    confidence = Column(Float, default=0.0)
    frame_number = Column(Integer, default=0)
    bbox_json = Column(Text, nullable=True)

    evidence = relationship("Evidence", back_populates="events")


class AuditLog(Base):
    __tablename__ = "audit_log"

    id = Column(Integer, primary_key=True, index=True)
    case_id = Column(Integer, ForeignKey("cases.id"), nullable=False)
    actor = Column(String, default="Investigator")
    action = Column(String, nullable=False)
    detail = Column(Text, nullable=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    prev_hash = Column(String, nullable=False)
    entry_hash = Column(String, nullable=False)

    case = relationship("Case", back_populates="audit_entries")


class Report(Base):
    __tablename__ = "reports"

    id = Column(Integer, primary_key=True, index=True)
    case_id = Column(Integer, ForeignKey("cases.id"), nullable=False)
    generated_at = Column(DateTime, default=datetime.datetime.utcnow)
    file_path = Column(String, nullable=False)
    format = Column(String, default="html")

    case = relationship("Case", back_populates="reports")
