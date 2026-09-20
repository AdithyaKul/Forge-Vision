"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { PlusCircle, ArrowLeft, Shield, CheckCircle2 } from "lucide-react";
import { createCase } from "@/lib/api";

export default function CreateCasePage() {
  const router = useRouter();
  const [name, setName] = useState("Warehouse Security Incident");
  const [investigator, setInvestigator] = useState("Det. A. Vance");
  const [description, setDescription] = useState(
    "Multi-camera timeline correlation and SHA-256 evidence preservation for security incident at Warehouse B."
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const created = await createCase({ name, investigator, description });
      router.push(`/cases/${created.id}`);
    } catch (err: any) {
      setError(err.message || "Failed to create case");
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 py-8 space-y-6">
        <button
          onClick={() => router.back()}
          className="inline-flex items-center space-x-2 text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Dashboard</span>
        </button>

        <div className="glass-panel p-6 sm:p-8 rounded-2xl border border-slate-800 space-y-6">
          <div className="border-b border-slate-800 pb-4">
            <div className="flex items-center space-x-2 text-blue-400 text-xs font-mono font-semibold uppercase">
              <Shield className="w-4 h-4" />
              <span>Forensic Intake</span>
            </div>
            <h1 className="text-2xl font-bold text-white mt-1">Open New Case File</h1>
            <p className="text-xs text-slate-400 mt-1">
              Creates a cryptographic genesis log entry and prepares the investigation workspace.
            </p>
          </div>

          {error && (
            <div className="p-3 bg-rose-950/40 border border-rose-800 text-rose-300 text-xs rounded-lg">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                Case Name / Incident Title
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 transition-all"
                placeholder="e.g. Warehouse Security Incident"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                Lead Investigator Name
              </label>
              <input
                type="text"
                required
                value={investigator}
                onChange={(e) => setInvestigator(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 transition-all"
                placeholder="e.g. Det. A. Vance"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                Incident Description & Scope
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 transition-all"
                placeholder="Brief notes about the incident, cameras involved, and scope..."
              />
            </div>

            <div className="pt-4 flex items-center justify-end space-x-3">
              <button
                type="button"
                onClick={() => router.back()}
                className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex items-center space-x-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-lg shadow-lg shadow-blue-600/30 transition-all disabled:opacity-50 cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" />
                <span>{submitting ? "Opening Case File..." : "Open Case Workspace"}</span>
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
