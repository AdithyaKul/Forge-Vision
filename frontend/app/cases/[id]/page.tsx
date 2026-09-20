"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import IntegrityChecker from "@/components/IntegrityChecker";
import TimelineViewer from "@/components/TimelineViewer";
import VideoPlayer from "@/components/VideoPlayer";
import AuditLogViewer from "@/components/AuditLogViewer";
import {
  fetchCaseById,
  fetchCaseEvidence,
  fetchTimeline,
  fetchAuditTrail,
  uploadEvidence,
  normalizeOffset,
  runDetection,
  getReportUrl,
  CaseItem,
  EvidenceItem,
  EventItem,
  AuditLogItem
} from "@/lib/api";
import {
  Shield,
  HardDrive,
  Clock,
  Link2,
  FileText,
  Upload,
  RefreshCw,
  CheckCircle2,
  Eye,
  Sliders,
  Sparkles,
  ArrowLeft,
  Printer
} from "lucide-react";

export default function CaseWorkspacePage() {
  const params = useParams();
  const router = useRouter();
  const caseId = Number(params.id);

  const [activeTab, setActiveTab] = useState<"evidence" | "timeline" | "audit" | "report">("timeline");
  const [caseData, setCaseData] = useState<CaseItem | null>(null);
  const [evidenceList, setEvidenceList] = useState<EvidenceItem[]>([]);
  const [eventsList, setEventsList] = useState<EventItem[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [chainValid, setChainValid] = useState<boolean>(true);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Selected video event state
  const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(null);
  const [selectedEvidence, setSelectedEvidence] = useState<EvidenceItem | null>(null);

  // Uploading state
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Offset editing map
  const [offsetInputs, setOffsetInputs] = useState<Record<number, number>>({});

  useEffect(() => {
    if (caseId) {
      loadWorkspaceData();
    }
  }, [caseId]);

  const loadWorkspaceData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [c, evs, tm, aud] = await Promise.all([
        fetchCaseById(caseId),
        fetchCaseEvidence(caseId),
        fetchTimeline(caseId),
        fetchAuditTrail(caseId)
      ]);

      setCaseData(c);
      setEvidenceList(evs);
      setEventsList(tm);
      setAuditLogs(aud.logs);
      setChainValid(aud.chain_valid);

      // Populate offset inputs
      const offsets: Record<number, number> = {};
      evs.forEach((e) => {
        offsets[e.id] = e.offset_seconds;
      });
      setOffsetInputs(offsets);

      // Default video selection to first event/evidence if available
      if (evs.length > 0) {
        setSelectedEvidence(evs[0]);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load case workspace");
    } finally {
      setLoading(false);
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;
    setUploading(true);
    try {
      await uploadEvidence(caseId, selectedFile);
      setSelectedFile(null);
      await loadWorkspaceData();
    } catch (err: any) {
      alert("Upload failed: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleSaveOffset = async (evidenceId: number) => {
    const val = offsetInputs[evidenceId] ?? 0;
    try {
      await normalizeOffset(evidenceId, val);
      await loadWorkspaceData();
    } catch (err: any) {
      alert("Failed to save offset: " + err.message);
    }
  };

  const handleRunDetection = async (evidenceId: number) => {
    try {
      await runDetection(evidenceId);
      await loadWorkspaceData();
    } catch (err: any) {
      alert("Failed to run detection: " + err.message);
    }
  };

  const handleSelectTimelineEvent = (event: EventItem, evidence?: EvidenceItem) => {
    setSelectedEvent(event);
    if (evidence) {
      setSelectedEvidence(evidence);
    } else {
      const ev = evidenceList.find((e) => e.id === event.evidence_id);
      if (ev) setSelectedEvidence(ev);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
          Loading forensic case workspace...
        </div>
      </div>
    );
  }

  if (error || !caseData) {
    return (
      <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center text-rose-400 text-sm">
          {error || "Case workspace not found."}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Workspace Top Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 glass-panel p-5 rounded-xl border border-slate-800">
          <div className="space-y-1">
            <button
              onClick={() => router.push("/")}
              className="inline-flex items-center space-x-1.5 text-xs text-slate-400 hover:text-white transition-colors cursor-pointer mb-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Dashboard</span>
            </button>
            <div className="flex items-center space-x-3">
              <span className="px-2.5 py-0.5 rounded bg-blue-500/20 text-blue-400 font-mono font-bold text-xs border border-blue-500/30">
                {caseData.case_number}
              </span>
              <h1 className="text-xl font-bold text-white">{caseData.name}</h1>
            </div>
            <p className="text-xs text-slate-400">
              Investigator: <strong className="text-slate-200">{caseData.investigator}</strong> • Created: {new Date(caseData.created_at).toLocaleDateString()}
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-xs font-mono text-slate-400 bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800">
              {evidenceList.length} Footage Files Ingested
            </span>
          </div>
        </div>

        {/* Integrity Checker Widget */}
        <IntegrityChecker caseId={caseId} onVerified={loadWorkspaceData} />

        {/* Tab Navigation */}
        <div className="flex items-center space-x-2 border-b border-slate-800 overflow-x-auto pb-1">
          <button
            onClick={() => setActiveTab("timeline")}
            className={`flex items-center space-x-2 px-4 py-2 rounded-t-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === "timeline"
                ? "bg-slate-900 text-blue-400 border-t-2 border-blue-500 shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Unified Timeline ({eventsList.length} Events)</span>
          </button>

          <button
            onClick={() => setActiveTab("evidence")}
            className={`flex items-center space-x-2 px-4 py-2 rounded-t-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === "evidence"
                ? "bg-slate-900 text-blue-400 border-t-2 border-blue-500 shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <HardDrive className="w-4 h-4" />
            <span>Evidence Intake & Specs ({evidenceList.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("audit")}
            className={`flex items-center space-x-2 px-4 py-2 rounded-t-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === "audit"
                ? "bg-slate-900 text-blue-400 border-t-2 border-blue-500 shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Link2 className="w-4 h-4" />
            <span>Audit Chain ({auditLogs.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("report")}
            className={`flex items-center space-x-2 px-4 py-2 rounded-t-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === "report"
                ? "bg-slate-900 text-blue-400 border-t-2 border-blue-500 shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Forensic Report</span>
          </button>
        </div>

        {/* Tab 1: Unified Timeline & Video Player */}
        {activeTab === "timeline" && (
          <div className="space-y-6">
            <TimelineViewer
              events={eventsList}
              evidenceItems={evidenceList}
              onSelectEvent={handleSelectTimelineEvent}
            />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* CCTV Synchronized Video Player */}
              <div className="lg:col-span-2">
                <VideoPlayer
                  filePath={selectedEvidence?.file_path}
                  filename={selectedEvidence?.filename}
                  vendorLabel={selectedEvidence?.vendor_label}
                  seekTimestamp={selectedEvent?.timestamp_raw}
                  offsetSeconds={selectedEvidence?.offset_seconds}
                />
              </div>

              {/* Event Inspector Panel */}
              <div className="glass-panel p-5 rounded-xl border border-slate-800 space-y-4">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-2">
                  <Eye className="w-4 h-4 text-blue-400" />
                  <span>Event Metadata Inspector</span>
                </h3>

                {selectedEvent ? (
                  <div className="space-y-3 text-xs">
                    <div className="p-3 bg-blue-950/30 border border-blue-800/40 rounded-lg space-y-1">
                      <div className="font-bold text-blue-300 text-sm">{selectedEvent.event_type}</div>
                      <div className="text-slate-400 font-mono">
                        Confidence: <strong className="text-emerald-400">{(selectedEvent.confidence * 100).toFixed(1)}%</strong>
                      </div>
                    </div>

                    <div className="space-y-2 font-mono bg-slate-950 p-3 rounded-lg border border-slate-800 text-[11px]">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Normalized Time:</span>
                        <strong className="text-blue-400">{selectedEvent.timestamp_normalized}s</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Raw Camera Clock:</span>
                        <strong className="text-slate-200">{selectedEvent.timestamp_raw}s</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Frame Number:</span>
                        <strong className="text-slate-200">#{selectedEvent.frame_number}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Camera Source:</span>
                        <strong className="text-slate-200">{selectedEvidence?.filename}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Vendor Spec:</span>
                        <strong className="text-slate-200">{selectedEvidence?.vendor_label}</strong>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 py-6 text-center">
                    Click any marker on the timeline swimlanes above to inspect detection coordinates and jump video playback.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Evidence Intake & Clock Offsets */}
        {activeTab === "evidence" && (
          <div className="space-y-6">
            {/* Upload Box */}
            <div className="glass-panel p-6 rounded-xl border border-slate-800">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-3 flex items-center space-x-2">
                <Upload className="w-4 h-4 text-blue-400" />
                <span>Upload CCTV Evidence Footage</span>
              </h3>

              <form onSubmit={handleUploadSubmit} className="flex flex-col sm:flex-row items-center gap-3">
                <input
                  type="file"
                  accept="video/*"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  className="block w-full text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-600/20 file:text-blue-400 hover:file:bg-blue-600/30 file:cursor-pointer cursor-pointer"
                />
                <button
                  type="submit"
                  disabled={!selectedFile || uploading}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold text-xs rounded-lg shadow-lg shadow-blue-600/20 transition-all shrink-0 cursor-pointer"
                >
                  {uploading ? "Ingesting & Hashing..." : "Ingest Footage"}
                </button>
              </form>
            </div>

            {/* Evidence Cards */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Ingested Footage Files</h3>
              {evidenceList.map((ev) => (
                <div key={ev.id} className="glass-panel p-5 rounded-xl border border-slate-800 space-y-4">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-white text-base">{ev.filename}</span>
                        <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 text-[10px] font-mono font-bold border border-blue-500/30">
                          {ev.vendor_label}
                        </span>
                      </div>
                      <div className="text-xs font-mono text-emerald-400 mt-1">
                        SHA-256: <span className="text-slate-300">{ev.sha256}</span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleRunDetection(ev.id)}
                        className="px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 rounded-md text-xs font-semibold flex items-center space-x-1.5 transition-all cursor-pointer"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                        <span>Run YOLO Detection</span>
                      </button>
                    </div>
                  </div>

                  {/* Metadata Specs Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono bg-slate-950/60 p-3 rounded-lg border border-slate-800/60">
                    <div>
                      <span className="text-slate-500 block text-[10px]">DURATION</span>
                      <strong className="text-white">{ev.duration}s</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">RESOLUTION</span>
                      <strong className="text-white">{ev.resolution}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">FRAME RATE</span>
                      <strong className="text-white">{ev.fps} FPS</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">VIDEO CODEC</span>
                      <strong className="text-white">{ev.codec}</strong>
                    </div>
                  </div>

                  {/* Clock Drift Offset Input */}
                  <div className="flex items-center space-x-3 text-xs">
                    <label className="text-slate-400 font-mono">Camera Clock Drift Offset (Seconds):</label>
                    <input
                      type="number"
                      step="0.1"
                      value={offsetInputs[ev.id] ?? ev.offset_seconds}
                      onChange={(e) =>
                        setOffsetInputs({
                          ...offsetInputs,
                          [ev.id]: parseFloat(e.target.value) || 0
                        })
                      }
                      className="w-28 bg-slate-900 border border-slate-800 rounded px-2.5 py-1 text-white font-mono text-xs focus:outline-none focus:border-blue-500"
                    />
                    <button
                      onClick={() => handleSaveOffset(ev.id)}
                      className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded font-semibold text-xs transition-all cursor-pointer"
                    >
                      Save Offset & Re-index
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 3: Cryptographic Audit Chain Log */}
        {activeTab === "audit" && (
          <AuditLogViewer logs={auditLogs} chainValid={chainValid} />
        )}

        {/* Tab 4: Forensic Report Export */}
        {activeTab === "report" && (
          <div className="glass-panel p-6 rounded-xl border border-slate-800 space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center space-x-2">
                  <FileText className="w-5 h-5 text-blue-400" />
                  <span>Court-Ready Forensic HTML/PDF Report</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Includes case metadata, SHA-256 evidence digests, normalized multi-camera timeline, and unbroken audit log.
                </p>
              </div>

              <a
                href={getReportUrl(caseId)}
                target="_blank"
                rel="noreferrer"
                className="flex items-center space-x-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-lg shadow-lg shadow-blue-600/20 transition-all shrink-0 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Open & Print HTML / PDF Report</span>
              </a>
            </div>

            {/* Embedded Live Report Preview iframe */}
            <div className="border border-slate-800 rounded-xl overflow-hidden h-[600px] bg-slate-950">
              <iframe
                src={getReportUrl(caseId)}
                className="w-full h-full border-0"
                title="Forensic Report Preview"
              />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
