"use client";

import { useState } from "react";
import { Clock, Eye, Video, Sliders, ChevronRight } from "lucide-react";
import { EventItem, EvidenceItem } from "@/lib/api";

interface TimelineViewerProps {
  events: EventItem[];
  evidenceItems: EvidenceItem[];
  onSelectEvent: (event: EventItem, evidence?: EvidenceItem) => void;
}

export default function TimelineViewer({
  events,
  evidenceItems,
  onSelectEvent
}: TimelineViewerProps) {
  const [showNormalized, setShowNormalized] = useState(true);
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);

  // Group events by evidence_id
  const eventsByEvidence: Record<number, EventItem[]> = {};
  evidenceItems.forEach((ev) => {
    eventsByEvidence[ev.id] = events.filter((e) => e.evidence_id === ev.id);
  });

  // Calculate maximum timeline duration
  const maxTime = Math.max(
    30,
    ...events.map((e) => (showNormalized ? e.timestamp_normalized : e.timestamp_raw))
  );

  const handleMarkerClick = (event: EventItem) => {
    setSelectedEventId(event.id);
    const ev = evidenceItems.find((e) => e.id === event.evidence_id);
    onSelectEvent(event, ev);
  };

  return (
    <div className="glass-panel p-5 rounded-xl border border-slate-800 space-y-4">
      {/* Header & View Mode Switch */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <Clock className="w-5 h-5 text-blue-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Unified Multi-Camera Timeline
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Correlates detection events across mismatched camera clocks into an aligned forensic timeline.
          </p>
        </div>

        {/* Toggle Raw vs Normalized */}
        <div className="flex items-center bg-slate-900 p-1 rounded-lg border border-slate-800">
          <button
            onClick={() => setShowNormalized(false)}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
              !showNormalized
                ? "bg-slate-800 text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Raw Timestamps
          </button>
          <button
            onClick={() => setShowNormalized(true)}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
              showNormalized
                ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Normalized Timestamps
          </button>
        </div>
      </div>

      {/* Time Scale Axis */}
      <div className="relative h-6 bg-slate-950/60 rounded border border-slate-800/60 flex items-center px-4 font-mono text-[10px] text-slate-400 justify-between">
        <span>0.00s</span>
        <span>{(maxTime * 0.25).toFixed(1)}s</span>
        <span>{(maxTime * 0.5).toFixed(1)}s</span>
        <span>{(maxTime * 0.75).toFixed(1)}s</span>
        <span>{maxTime.toFixed(1)}s</span>
      </div>

      {/* Swimlanes Per Camera */}
      <div className="space-y-3">
        {evidenceItems.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-500">
            No evidence files uploaded yet. Upload footage to render timeline swimlanes.
          </div>
        ) : (
          evidenceItems.map((ev) => {
            const evEvents = eventsByEvidence[ev.id] || [];
            return (
              <div
                key={ev.id}
                className="bg-slate-900/50 rounded-lg p-3 border border-slate-800/60 space-y-2 hover:border-slate-700 transition-all"
              >
                {/* Swimlane Label */}
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-2">
                    <Video className="w-3.5 h-3.5 text-blue-400" />
                    <span className="font-bold text-slate-200">{ev.filename}</span>
                    <span className="px-2 py-0.5 rounded bg-blue-950 text-blue-300 text-[10px] border border-blue-800/40 font-mono">
                      {ev.vendor_label}
                    </span>
                  </div>
                  <div className="font-mono text-[11px] text-slate-400">
                    Drift Offset:{" "}
                    <strong className={ev.offset_seconds !== 0 ? "text-amber-400" : "text-emerald-400"}>
                      {ev.offset_seconds >= 0 ? `+${ev.offset_seconds}` : ev.offset_seconds}s
                    </strong>
                  </div>
                </div>

                {/* Swimlane Bar */}
                <div className="relative h-10 bg-slate-950/80 rounded border border-slate-800 overflow-hidden flex items-center px-2">
                  {/* Subtle Grid ticks */}
                  <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px)] bg-[size:10%_100%] opacity-30 pointer-events-none"></div>

                  {evEvents.map((evt) => {
                    const timeVal = showNormalized ? evt.timestamp_normalized : evt.timestamp_raw;
                    const percent = Math.min(95, Math.max(5, (timeVal / maxTime) * 100));
                    const isSelected = selectedEventId === evt.id;

                    return (
                      <button
                        key={evt.id}
                        onClick={() => handleMarkerClick(evt)}
                        style={{ left: `${percent}%` }}
                        className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 px-2 py-1 rounded text-[10px] font-bold font-mono transition-all transform hover:scale-110 cursor-pointer shadow-lg flex items-center space-x-1 ${
                          isSelected
                            ? "bg-blue-500 text-white ring-2 ring-blue-300 z-20 scale-110"
                            : "bg-emerald-600 hover:bg-emerald-500 text-white z-10"
                        }`}
                        title={`${evt.event_type} @ ${timeVal}s (${(evt.confidence * 100).toFixed(0)}% conf)`}
                      >
                        <Eye className="w-3 h-3" />
                        <span>{timeVal.toFixed(1)}s</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Legend & Help Footer */}
      <div className="pt-2 flex items-center justify-between text-[11px] font-mono text-slate-400">
        <div className="flex items-center space-x-3">
          <span className="flex items-center space-x-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
            <span>Detected Event Marker</span>
          </span>
          <span className="flex items-center space-x-1">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block"></span>
            <span>Selected Event (Active)</span>
          </span>
        </div>
        <span>Showing {events.length} total correlated events</span>
      </div>
    </div>
  );
}
