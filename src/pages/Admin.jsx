import React, { useCallback, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import Navbar from "../components/Navbar";
import AdminPanel from "../components/AdminPanel";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../components/ToastProvider";
import { fetchDashboardBundle } from "../lib/dataService";

export default function Admin() {
  const { profile, isDemo } = useAuth();
  const { showToast } = useToast();
  const [bundle, setBundle] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const data = await fetchDashboardBundle(isDemo);
      setBundle(data);
    } catch (err) {
      showToast(err.message || "Yönetim verileri yüklenemedi.", "error");
    } finally {
      setLoading(false);
    }
  }, [isDemo, showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (profile?.role !== "admin") {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen bg-obsidian-900 pb-24 md:pb-10">
      <Navbar />
      <main className="mx-auto max-w-6xl px-4 sm:px-6 pt-6">
        {loading || !bundle ? (
          <div className="flex h-[50vh] items-center justify-center gap-3 text-sand-300">
            <Loader2 className="h-6 w-6 animate-spin text-ember-400" />
            <span>Yönetim paneli yükleniyor...</span>
          </div>
        ) : (
          <AdminPanel
            settings={bundle.settings}
            checkpoints={bundle.checkpoints}
            activities={bundle.activities}
            profiles={bundle.profiles}
            isDemo={isDemo}
            onRefresh={loadData}
          />
        )}
      </main>
    </div>
  );
}
