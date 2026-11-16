import React from "react";
import { NavLink } from "react-router-dom";
import { Compass, User, Shield, RefreshCw, LogOut } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function Navbar({ onSync, syncing }) {
  const { profile, isDemo, logout } = useAuth();
  const isAdmin = profile?.role === "admin";

  const linkClass = ({ isActive }) =>
    `inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
      isActive
        ? "bg-ember-500/15 text-ember-400"
        : "text-sand-300 hover:bg-obsidian-700/70 hover:text-sand-100"
    }`;

  const mobileLinkClass = ({ isActive }) =>
    `flex flex-col items-center justify-center gap-1 py-2 px-3 text-[11px] font-medium transition-colors ${
      isActive ? "text-ember-400" : "text-sand-400 hover:text-sand-100"
    }`;

  return (
    <>
      {/* Top Desktop / Tablet Header */}
      <header className="sticky top-0 z-40 border-b border-obsidian-700 bg-obsidian-900/90 backdrop-blur-md pt-[env(safe-area-inset-top)] pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-2 px-4 sm:px-6">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <img
              src="/icons/icon-192.png"
              alt="Kazdağları Running Logo"
              className="h-9 w-9 shrink-0 rounded-lg border border-obsidian-600"
            />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-display text-[15px] sm:text-lg font-extrabold tracking-tight text-sand-100 leading-tight truncate">
                  Kazdağları Running
                </span>
                {isDemo && (
                  <span className="shrink-0 rounded-md border border-ember-500/30 bg-ember-500/10 px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase text-ember-400">
                    Demo
                  </span>
                )}
              </div>
              <p className="hidden sm:block text-[11px] text-sand-400">
                Akçay → Tokyo Kolektif Koşu
              </p>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-1">
            <NavLink to="/" end className={linkClass}>
              <Compass className="h-4 w-4" />
              Keşfet &amp; Rota
            </NavLink>
            <NavLink to="/profile" className={linkClass}>
              <User className="h-4 w-4" />
              Profilim
            </NavLink>
            {isAdmin && (
              <NavLink to="/admin" className={linkClass}>
                <Shield className="h-4 w-4" />
                Admin Paneli
              </NavLink>
            )}
          </nav>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {onSync && (
              <button
                id="navbar-sync-btn"
                type="button"
                onClick={onSync}
                disabled={syncing}
                className="inline-flex items-center gap-1.5 rounded-xl bg-ember-500 hover:bg-ember-600 disabled:opacity-60 px-2.5 sm:px-3 py-2 text-xs sm:text-sm font-semibold text-white transition-colors"
              >
                <RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
                <span className="hidden sm:inline">Strava Senkronize Et</span>
                <span className="sm:hidden">Senkronize</span>
              </button>
            )}

            <button
              id="logout-btn"
              type="button"
              onClick={logout}
              title="Çıkış Yap"
              className="inline-flex items-center gap-1.5 rounded-xl border border-obsidian-600 bg-obsidian-800 hover:bg-obsidian-700 px-2.5 py-2 text-xs font-medium text-sand-300 transition-colors"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden lg:inline">Çıkış</span>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-obsidian-700 bg-obsidian-900/95 backdrop-blur-md pb-[env(safe-area-inset-bottom)]">
        <div className={`grid ${isAdmin ? "grid-cols-3" : "grid-cols-2"}`}>
          <NavLink to="/" end className={mobileLinkClass}>
            <Compass className="h-5 w-5" />
            <span>Rota &amp; Sıralama</span>
          </NavLink>
          <NavLink to="/profile" className={mobileLinkClass}>
            <User className="h-5 w-5" />
            <span>Profilim</span>
          </NavLink>
          {isAdmin && (
            <NavLink to="/admin" className={mobileLinkClass}>
              <Shield className="h-5 w-5" />
              <span>Admin</span>
            </NavLink>
          )}
        </div>
      </nav>
    </>
  );
}
