"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { Shield, PlusCircle, HardDrive, FileText, CheckCircle2, ChevronRight, Clock, User, ArrowRight } from "lucide-react";
import { fetchCases, CaseItem } from "@/lib/api";

export default function DashboardPage() {
  const [cases, setCases] = useState<CaseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadCases();
  }, []);

  const loadCases = async () => {
    try {
      const data = await fetchCases();
      setCases(data);
    } catch (err: any) {
      setError(err.message || "Failed to load cases");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Banner */}
        <div className="glass-panel p-6 sm:p-8 rounded-2xl border border-slate-800 relative overflow-hidden">
          <div className="absolute -right-12 -bottom-12 w-64 h-64 bg-blue-600/10 rounded-full blur-3xl pointer-events-none"></div>
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
            <div className="space-y-2 max-w-2xl">
              <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs font-mono font-semibold">
                <Shield className="w-3.5 h-3.5" />
                <span>FORENSIC EVIDENCE MANAGEMENT</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                Surveillance Evidence Preservation & Timeline Platform
              </h1>
              <p className="text-sm text-slate-400">
                Ingest multi-camera video footage, compute immutable SHA-256 byte hashes, normalize mismatched camera clocks, and generate court-ready forensic reports.
              </p>
            </div>

            <Link
              href="/cases/new"
              className="inline-flex items-center justify-center space-x-2 px-5 py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm rounded-xl shadow-lg shadow-blue-600/30 transition-all shrink-0 cursor-pointer"
            >
              <PlusCircle className="w-5 h-5" />
              <span>Create New Case</span>
            </Link>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="glass-panel p-5 rounded-xl border border-slate-800 flex items-center space-x-4">
            <div className="w-12 h-12 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
              <HardDrive className="w-6 h-6" />
            </div>
            <div>
              <div className="text-2xl font-bold text-white">{cases.length}</div>
              <div className="text-xs text-slate-400">Active Investigation Cases</div>
            </div>
          </div>

          <div className="glass-panel p-5 rounded-xl border border-slate-800 flex items-center space-x-4">
            <div className="w-12 h-12 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <div className="text-2xl font-bold text-white">100%</div>
              <div className="text-xs text-slate-400">SHA-256 Hash Integrity</div>
            </div>
          </div>

          <div className="glass-panel p-5 rounded-xl border border-slate-800 flex items-center space-x-4">
            <div className="w-12 h-12 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 shrink-0">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <div className="text-2xl font-bold text-white">Offline</div>
              <div className="text-xs text-slate-400">On-Premise Forensic Engine</div>
            </div>
          </div>
        </div>

        {/* Case List Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white tracking-wide">Recent Cases</h2>
            <span className="text-xs text-slate-400 font-mono">Showing {cases.length} total cases</span>
          </div>

          {loading ? (
            <div className="glass-panel p-12 rounded-xl border border-slate-800 text-center text-slate-400 text-sm">
              Loading cases...
            </div>
          ) : error ? (
            <div className="glass-panel p-6 rounded-xl border border-rose-800/60 bg-rose-950/20 text-rose-300 text-sm">
              {error}
            </div>
          ) : cases.length === 0 ? (
            <div className="glass-panel p-12 rounded-xl border border-slate-800 text-center space-y-3">
              <p className="text-slate-400 text-sm">No cases found in database.</p>
              <Link
                href="/cases/new"
                className="inline-flex items-center space-x-2 text-xs font-semibold text-blue-400 hover:text-blue-300"
              >
                <span>Create Case #FV-2026-001 now</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {cases.map((c) => (
                <Link
                  key={c.id}
                  href={`/cases/${c.id}`}
                  className="glass-panel-interactive p-5 rounded-xl border border-slate-800 block group space-y-4 cursor-pointer"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="px-2.5 py-1 rounded bg-blue-500/10 text-blue-400 text-xs font-mono font-bold border border-blue-500/20">
                        {c.case_number}
                      </span>
                      <h3 className="font-bold text-base text-white mt-2 group-hover:text-blue-400 transition-colors">
                        {c.name}
                      </h3>
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-600 group-hover:text-blue-400 group-hover:translate-x-1 transition-all" />
                  </div>

                  <p className="text-xs text-slate-400 line-clamp-2">
                    {c.description || "No description provided."}
                  </p>

                  <div className="border-t border-slate-800/80 pt-3 flex items-center justify-between text-xs text-slate-400 font-mono">
                    <div className="flex items-center space-x-1">
                      <User className="w-3.5 h-3.5 text-slate-500" />
                      <span>{c.investigator}</span>
                    </div>
                    <div className="flex items-center space-x-1 text-slate-300 font-semibold">
                      <HardDrive className="w-3.5 h-3.5 text-blue-400" />
                      <span>{c.evidence_count} evidence files</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
