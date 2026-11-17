import React from "react";
import { Activity, MapPin, Trophy, Loader2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { buildStravaAuthUrl, isStravaConfigured, isSupabaseConfigured } from "../lib/supabase";
import { ConnectWithStravaButton, PoweredByStravaBadge } from "../components/StravaBranding";

export default function Login() {
  const { oauthProcessing } = useAuth();
  const canUseRealStrava = isSupabaseConfigured && isStravaConfigured;

  const handleStravaLogin = () => {
    window.location.href = buildStravaAuthUrl();
  };

  return (
    <div className="min-h-screen bg-obsidian-900 flex flex-col justify-between px-4 pt-[calc(2rem+env(safe-area-inset-top))] pb-[calc(2rem+env(safe-area-inset-bottom))] sm:px-6">
      <div className="mx-auto w-full max-w-4xl flex-1 flex flex-col justify-center">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Left Hero */}
          <div className="lg:col-span-7 space-y-5">
            <div className="flex items-center gap-3">
              <img
                src="/icons/icon-192.png"
                alt="Kazdağları Running"
                className="h-12 w-12 shrink-0 rounded-2xl border border-obsidian-600 shadow-lg"
              />
              <div>
                <span className="font-display text-2xl font-extrabold text-sand-100">
                  Kazdağları Running
                </span>
                <p className="text-xs font-medium text-ember-400 mt-0.5 leading-snug">
                  Akçay sahilde rüzgara karşı, Kazdağları’nda yokuşa karşı. Ortak noktamız: Durmamak!
                </p>
              </div>
            </div>

            <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-sand-100 leading-tight">
              Akçay&apos;dan Tokyo&apos;ya Kolektif Adımlar
            </h1>

            <p className="text-sm sm:text-base text-sand-300 leading-relaxed max-w-xl">
              Grup koşularını Strava üzerinden otomatik senkronize et, yalnızca resmi
              antrenman saatlerindeki kilometreleri topla ve 9.500 km&apos;lik Avrasya
              rotasında takımınla Tokyo&apos;ya ilerle.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div className="rounded-xl border border-obsidian-700 bg-obsidian-800/80 p-3.5">
                <MapPin className="h-4 w-4 text-ember-400 mb-2" />
                <p className="text-xs font-semibold text-sand-100">20 Ara Durak</p>
                <p className="text-[11px] text-sand-400 mt-0.5">
                  Akçay&apos;dan Tokyo&apos;ya canlı rota haritası
                </p>
              </div>
              <div className="rounded-xl border border-obsidian-700 bg-obsidian-800/80 p-3.5">
                <Trophy className="h-4 w-4 text-pine-400 mb-2" />
                <p className="text-xs font-semibold text-sand-100">Çoklu Sıralama</p>
                <p className="text-[11px] text-sand-400 mt-0.5">
                  Mesafe, irtifa, pace ve koşu adedi
                </p>
              </div>
              <div className="rounded-xl border border-obsidian-700 bg-obsidian-800/80 p-3.5">
                <Activity className="h-4 w-4 text-ember-400 mb-2" />
                <p className="text-xs font-semibold text-sand-100">Saat Filtresi</p>
                <p className="text-[11px] text-sand-400 mt-0.5">
                  Yalnızca grup takvimi koşuları sayılır
                </p>
              </div>
            </div>
          </div>

          {/* Right Auth Card */}
          <div className="lg:col-span-5 rounded-2xl border border-obsidian-700 bg-obsidian-800 p-6 sm:p-7 shadow-2xl space-y-5">
            <div>
              <h2 className="font-display text-xl font-bold text-sand-100">
                Gruba Katıl / Giriş Yap
              </h2>
              <p className="text-xs text-sand-400 mt-1">
                Strava hesabını bağla ve kulüp katılım kodunu doğrula.
              </p>
            </div>

            {oauthProcessing ? (
              <div className="flex items-center justify-center gap-3 rounded-xl border border-obsidian-600 bg-obsidian-900 py-5 text-sm text-sand-200">
                <Loader2 className="h-5 w-5 animate-spin text-ember-400" />
                Strava hesabınız doğrulanıyor...
              </div>
            ) : (
              <>
                <ConnectWithStravaButton
                  id="strava-login-btn"
                  onClick={handleStravaLogin}
                  disabled={!canUseRealStrava}
                />

                <p className="text-[11px] text-sand-400 leading-relaxed">
                  Giriş yaparak yalnızca kulüp takvimindeki koşu özetlerinizin (mesafe, süre,
                  irtifa) kapalı grup hedefi için senkronize edilmesini onaylarsınız. İstediğiniz
                  an Profil sayfanızdan bağlantıyı kesebilir ve verilerinizi silebilirsiniz.
                </p>
              </>
            )}
          </div>
        </div>
      </div>

      <footer className="mx-auto w-full max-w-4xl pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left text-xs text-sand-500">
        <span>
          IdaRun PWA · Bağımsız koşu kulübü uygulamasıdır, Strava tarafından sponsor edilmemektedir.
        </span>
        <PoweredByStravaBadge />
      </footer>
    </div>
  );
}
