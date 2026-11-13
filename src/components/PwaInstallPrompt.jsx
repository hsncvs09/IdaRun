import React, { useEffect, useState } from "react";
import { Download, Share, X } from "lucide-react";

const DISMISS_KEY = "idarun_pwa_prompt_dismissed";

export default function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isIosHint, setIsIosHint] = useState(false);
  const [dismissed, setDismissed] = useState(() => localStorage.getItem(DISMISS_KEY) === "1");

  useEffect(() => {
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      window.navigator.standalone === true;
    if (isStandalone || dismissed) return;

    const ua = window.navigator.userAgent.toLowerCase();
    const isIos = /iphone|ipad|ipod/.test(ua);
    const isSafari = /safari/.test(ua) && !/crios|fxios/.test(ua);
    if (isIos && isSafari) {
      setIsIosHint(true);
    }

    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
  }, [dismissed]);

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, "1");
    setDismissed(true);
  };

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === "accepted") {
      setDeferredPrompt(null);
      handleDismiss();
    }
  };

  if (dismissed || (!deferredPrompt && !isIosHint)) return null;

  return (
    <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-obsidian-600 bg-obsidian-800 px-4 py-3 shadow-lg">
      <div className="flex items-center gap-3 min-w-0">
        <img
          src="/icons/icon-192.png"
          alt="IdaRun"
          className="h-9 w-9 rounded-lg shrink-0 border border-obsidian-600"
        />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-sand-100 truncate">
            IdaRun&apos;ı Ana Ekrana Ekle
          </p>
          {deferredPrompt ? (
            <p className="text-xs text-sand-400 truncate">
              Tek dokunuşla uygulama gibi aç ve çevrimdışı önbellekten yararlan.
            </p>
          ) : (
            <p className="text-xs text-sand-400 flex items-center gap-1 flex-wrap">
              Safari alt menüsünden <Share className="inline h-3.5 w-3.5 text-ember-400" />{" "}
              &ldquo;Ana Ekrana Ekle&rdquo;yi seç.
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {deferredPrompt && (
          <button
            id="pwa-install-btn"
            type="button"
            onClick={handleInstall}
            className="inline-flex items-center gap-1.5 rounded-lg bg-ember-500 hover:bg-ember-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors"
          >
            <Download className="h-3.5 w-3.5" />
            Yükle
          </button>
        )}
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Yükleme istemini kapat"
          className="rounded-lg p-1.5 text-sand-400 hover:bg-obsidian-700 hover:text-sand-100 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
