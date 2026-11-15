import React, { useState } from "react";
import { KeyRound, ShieldCheck, LogOut, Loader2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useToast } from "./ToastProvider";
import { PoweredByStravaBadge } from "./StravaBranding";

export default function JoinCodeModal() {
  const { profile, verifyJoinCode, logout, isDemo } = useAuth();
  const { showToast } = useToast();
  const [code, setCode] = useState("");
  const [consentChecked, setConsentChecked] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!consentChecked) {
      showToast("Devam etmek için grup veri paylaşım onayını işaretlemelisiniz.", "error");
      return;
    }
    try {
      setSubmitting(true);
      await verifyJoinCode(code);
    } catch (err) {
      showToast(err.message || "Kod doğrulanamadı.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-obsidian-900 flex items-center justify-center px-4 pt-[calc(1rem+env(safe-area-inset-top))] pb-[calc(1rem+env(safe-area-inset-bottom))]">
      <div className="w-full max-w-md rounded-2xl border border-obsidian-600 bg-obsidian-800 p-6 sm:p-8 shadow-2xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-ember-500/15 text-ember-400 border border-ember-500/30">
            <KeyRound className="h-6 w-6" />
          </div>
          <div>
            <h1 className="font-display text-xl font-bold text-sand-100">
              Grup Katılım Kodu
            </h1>
            <p className="text-sm text-sand-400">
              Hoş geldin, {profile?.full_name || "Koşucu"}
            </p>
          </div>
        </div>

        <p className="text-sm text-sand-300 leading-relaxed mb-5">
          IdaRun özel koşu grubuna katılabilmek için grup yöneticisinden aldığın
          davet kodunu doğrulamalısın.
        </p>

        {isDemo && (
          <div className="mb-5 rounded-xl border border-pine-500/30 bg-pine-500/10 px-4 py-3 text-xs text-pine-400">
            Demo Modu varsayılan katılım kodu:{" "}
            <span className="font-mono font-bold text-sand-100">IDARUN2026</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="join-code-input"
              className="block text-xs font-semibold uppercase tracking-wider text-sand-400 mb-2"
            >
              Katılım Kodu
            </label>
            <input
              id="join-code-input"
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="Örn: IDARUN2026"
              required
              autoFocus
              className="w-full rounded-xl border border-obsidian-600 bg-obsidian-900 px-4 py-3 font-mono text-base tracking-widest text-sand-100 placeholder:text-sand-500 focus:border-ember-500 focus:outline-none"
            />
          </div>

          <label className="flex items-start gap-2.5 rounded-xl border border-obsidian-700 bg-obsidian-900/70 p-3 text-xs text-sand-300 cursor-pointer">
            <input
              id="strava-consent-checkbox"
              type="checkbox"
              checked={consentChecked}
              onChange={(e) => setConsentChecked(e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-ember-500 shrink-0"
            />
            <span className="leading-relaxed">
              Belirlenen grup koşu saatlerindeki Strava koşu özetlerimin (mesafe, süre,
              irtifa) yalnızca onaylı IdaRun kulüp üyeleriyle ortak rota hedefi ve grup
              tablosunda paylaşılmasına açık rıza veriyorum. İstediğim an Profilimden
              bağlantıyı kesip verilerimi silebilirim.
            </span>
          </label>

          <button
            id="verify-join-code-btn"
            type="submit"
            disabled={submitting || !code.trim() || !consentChecked}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-ember-500 hover:bg-ember-600 disabled:opacity-50 px-4 py-3 text-sm font-semibold text-white transition-colors"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ShieldCheck className="h-4 w-4" />
            )}
            Kodu Doğrula ve Devam Et
          </button>
        </form>

        <button
          type="button"
          onClick={logout}
          className="mt-4 w-full flex items-center justify-center gap-2 rounded-xl border border-obsidian-600 py-2.5 text-xs font-medium text-sand-400 hover:text-sand-100 hover:bg-obsidian-700/60 transition-colors"
        >
          <LogOut className="h-3.5 w-3.5" />
          Farklı Hesapla Giriş Yap
        </button>

        <div className="mt-5 pt-4 border-t border-obsidian-700/70 flex justify-center">
          <PoweredByStravaBadge />
        </div>
      </div>
    </div>
  );
}
