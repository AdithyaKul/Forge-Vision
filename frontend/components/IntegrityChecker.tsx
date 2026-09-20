"use client";

import { useState } from "react";
import { ShieldCheck, ShieldAlert, RefreshCw, CheckCircle2, AlertOctagon, XCircle } from "lucide-react";
import { verifyIntegrity, IntegrityResult } from "@/lib/api";

interface IntegrityCheckerProps {
  caseId: number;
  onVerified?: () => void;
}

export default function IntegrityChecker({ caseId, onVerified }: IntegrityCheckerProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<IntegrityResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleVerify = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await verifyIntegrity(caseId);
      setResult(res);
      if (onVerified) onVerified();
    } catch (err: any) {
      setError(err.message || "Failed to verify integrity");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-panel p-5 rounded-xl border border-slate-800">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Evidence Integrity Verification</h3>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Recomputes SHA-256 byte hashes of all uploaded evidence files and compares them against intake hashes.
          </p>
        </div>

        <button
          onClick={handleVerify}
          disabled={loading}
          className="flex items-center space-x-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold text-xs rounded-lg shadow-lg shadow-emerald-600/20 transition-all shrink-0 cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>{loading ? "Recomputing Hashes..." : "Re-Verify Integrity"}</span>
        </button>
      </div>

      {error && (
        <div className="mt-3 p-3 bg-rose-950/40 border border-rose-800/60 rounded-lg text-rose-300 text-xs flex items-center space-x-2">
          <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {result && (
        <div className="mt-4 border-t border-slate-800/80 pt-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Verification Summary</span>
            {result.all_passed ? (
              <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>INTEGRITY VERIFIED PASS (100% MATCH)</span>
              </span>
            ) : (
              <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-500/10 text-rose-400 border border-rose-500/30 animate-pulse">
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>INTEGRITY FAIL — FILE TAMPERED DETECTED</span>
              </span>
            )}
          </div>

          <div className="space-y-2">
            {result.items.map((item) => (
              <div
                key={item.evidence_id}
                className={`p-3 rounded-lg border text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 ${
                  item.passed
                    ? "bg-slate-900/60 border-slate-800"
                    : "bg-rose-950/30 border-rose-800/60"
                }`}
              >
                <div className="space-y-0.5">
                  <div className="flex items-center space-x-2">
                    <span className="font-semibold text-white">{item.filename}</span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        item.passed ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400"
                      }`}
                    >
                      {item.passed ? "PASSED" : "TAMPERED"}
                    </span>
                  </div>
                  <div className="font-mono text-[11px] text-slate-400 flex items-center space-x-2">
                    <span>Stored: <span className="text-emerald-400">{item.stored_hash.substring(0, 16)}...</span></span>
                    <span>Current: <span className={item.passed ? "text-emerald-400" : "text-rose-400 font-bold"}>{item.current_hash.substring(0, 16)}...</span></span>
                  </div>
                </div>

                {!item.passed && (
                  <div className="text-[11px] text-rose-300 font-mono bg-rose-950/60 px-2.5 py-1 rounded border border-rose-800/40">
                    Mismatch: SHA-256 byte digest altered!
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
