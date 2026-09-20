"use client";

import { Shield, Link2, CheckCircle2, AlertTriangle, User, Calendar } from "lucide-react";
import { AuditLogItem } from "@/lib/api";

interface AuditLogViewerProps {
  logs: AuditLogItem[];
  chainValid: boolean;
}

export default function AuditLogViewer({ logs, chainValid }: AuditLogViewerProps) {
  return (
    <div className="glass-panel p-5 rounded-xl border border-slate-800 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <Link2 className="w-5 h-5 text-blue-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Cryptographic Audit Chain Log
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Every investigation action is chained sequentially via SHA-256 hashes to guarantee anti-tampering.
          </p>
        </div>

        <div>
          {chainValid ? (
            <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>CHAIN UNBROKEN & VERIFIED</span>
            </span>
          ) : (
            <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-500/10 text-rose-400 border border-rose-500/30 animate-pulse">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>CHAIN CORRUPTED OR TAMPERED</span>
            </span>
          )}
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="bg-slate-900/80 text-slate-400 uppercase font-mono text-[10px] tracking-wider border-b border-slate-800">
            <tr>
              <th className="p-3">#</th>
              <th className="p-3">Timestamp</th>
              <th className="p-3">Actor</th>
              <th className="p-3">Action</th>
              <th className="p-3">Details</th>
              <th className="p-3 font-mono">Previous Hash</th>
              <th className="p-3 font-mono">Entry Hash (SHA-256)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {logs.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-6 text-center text-slate-500">
                  No audit entries recorded yet.
                </td>
              </tr>
            ) : (
              logs.map((log, index) => (
                <tr key={log.id} className="hover:bg-slate-900/40 transition-colors">
                  <td className="p-3 font-mono text-slate-500">{index + 1}</td>
                  <td className="p-3 font-mono text-slate-400 text-[11px]">
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                  <td className="p-3">
                    <span className="inline-flex items-center space-x-1 text-slate-300">
                      <User className="w-3 h-3 text-slate-500" />
                      <span>{log.actor}</span>
                    </span>
                  </td>
                  <td className="p-3 font-bold text-white">{log.action}</td>
                  <td className="p-3 text-slate-400">{log.detail}</td>
                  <td className="p-3 font-mono text-[10px] text-slate-500">
                    {log.prev_hash.substring(0, 10)}...
                  </td>
                  <td className="p-3 font-mono text-[10px] text-emerald-400 font-semibold">
                    {log.entry_hash.substring(0, 14)}...
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
