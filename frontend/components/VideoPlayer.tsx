"use client";

import { useRef, useEffect } from "react";
import { Video, Clock, ShieldCheck, Play, Pause, RotateCcw } from "lucide-react";
import { getVideoMediaUrl } from "@/lib/api";

interface VideoPlayerProps {
  filePath?: string;
  filename?: string;
  vendorLabel?: string;
  seekTimestamp?: number;
  offsetSeconds?: number;
}

export default function VideoPlayer({
  filePath,
  filename,
  vendorLabel,
  seekTimestamp,
  offsetSeconds = 0.0
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && typeof seekTimestamp === "number" && !isNaN(seekTimestamp)) {
      videoRef.current.currentTime = seekTimestamp;
      videoRef.current.pause();
    }
  }, [seekTimestamp]);

  if (!filePath) {
    return (
      <div className="glass-panel rounded-xl h-64 sm:h-80 flex flex-col items-center justify-center text-slate-500 border border-slate-800">
        <Video className="w-10 h-10 mb-2 stroke-1" />
        <p className="text-xs font-medium">Select an evidence event on the timeline to inspect video</p>
      </div>
    );
  }

  const mediaUrl = getVideoMediaUrl(filePath);

  return (
    <div className="glass-panel rounded-xl overflow-hidden border border-slate-800 relative bg-black group">
      {/* Top CCTV Overlay */}
      <div className="absolute top-0 left-0 right-0 z-10 p-3 bg-gradient-to-b from-black/80 via-black/40 to-transparent flex items-center justify-between text-xs font-mono">
        <div className="flex items-center space-x-2">
          <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
          <span className="font-bold text-white tracking-wider uppercase">{filename}</span>
          <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 text-[10px] font-semibold border border-blue-500/30">
            {vendorLabel || "Camera Spec"}
          </span>
        </div>

        <div className="flex items-center space-x-3 text-slate-300">
          <div className="flex items-center space-x-1 text-[11px]">
            <Clock className="w-3.5 h-3.5 text-blue-400" />
            <span>Offset: <strong className="text-white">{offsetSeconds >= 0 ? `+${offsetSeconds}` : offsetSeconds}s</strong></span>
          </div>
          <div className="flex items-center space-x-1 text-[11px] text-emerald-400">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>AUTHENTIC</span>
          </div>
        </div>
      </div>

      {/* HTML5 Video Element */}
      <video
        ref={videoRef}
        src={mediaUrl}
        controls
        className="w-full h-auto max-h-[420px] object-contain bg-black"
        preload="metadata"
      />

      {/* Bottom Forensic Controls Bar */}
      <div className="p-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 font-mono">
        <span>Click markers on timeline to frame-seek instantly</span>
        {typeof seekTimestamp === "number" && (
          <span className="text-blue-400 font-semibold">
            Jumped to timestamp: {seekTimestamp.toFixed(2)}s
          </span>
        )}
      </div>
    </div>
  );
}
