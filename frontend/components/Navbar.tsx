"use client";

import Link from "next/link";
import { Shield, HardDrive, Cpu, PlusCircle } from "lucide-react";

export default function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo */}
          <Link href="/" className="flex items-center space-x-3 group">
            <div className="w-10 h-10 rounded-lg bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400 group-hover:bg-blue-600/30 transition-all shadow-[0_0_15px_rgba(59,130,246,0.2)]">
              <Shield className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-xl tracking-wider text-white">FORGE<span className="text-blue-500">-VISION</span></span>
                <span className="text-[10px] uppercase font-bold tracking-widest px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  Prototype
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-mono tracking-tight">Offline Forensic Evidence Platform</p>
            </div>
          </Link>

          {/* System Indicators & Quick Actions */}
          <div className="flex items-center space-x-4">
            <div className="hidden md:flex items-center space-x-3 text-xs text-slate-400 font-mono bg-slate-900/60 px-3 py-1.5 rounded-md border border-slate-800">
              <div className="flex items-center space-x-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span className="text-emerald-400 font-medium">OFFLINE READY</span>
              </div>
              <span className="text-slate-700">|</span>
              <div className="flex items-center space-x-1">
                <HardDrive className="w-3.5 h-3.5 text-slate-400" />
                <span>LOCAL DB</span>
              </div>
              <span className="text-slate-700">|</span>
              <div className="flex items-center space-x-1">
                <Cpu className="w-3.5 h-3.5 text-slate-400" />
                <span>SHA-256 HASHED</span>
              </div>
            </div>

            <Link
              href="/cases/new"
              className="flex items-center space-x-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-4 py-2 rounded-md shadow-lg shadow-blue-600/25 transition-all"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Create Case</span>
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
