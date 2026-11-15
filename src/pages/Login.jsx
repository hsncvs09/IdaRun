import React from "react";
import { Activity, MapPin, Shield, Trophy, KeyRound, Loader2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { buildStravaAuthUrl, isStravaConfigured, isSupabaseConfigured } from "../lib/supabase";
import { ConnectWithStravaButton, PoweredByStravaBadge } from "../components/StravaBranding";

export default function Login() {
  const { loginAsDemo, oauthProcessing } = useAuth();
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
                alt="IdaRun"
                className="h-12 w-12 rounded-2xl border border-obsidian-600 shadow-lg"
              />
              <div>
                <span className="font-display text-2xl font-extrabold text-sand-100">
                  IdaRun
                </span>
                <p className="text-xs font-medium text-ember-400 uppercase tracking-wider">
                  Kazdağları Koşu Topluluğu
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
                <p className="text-xs font-semibold text-sand-100">12 Ara Durak</p>
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

                {!canUseRealStrava && (
                  <p className="text-[11px] text-sand-400 leading-relaxed rounded-lg border border-obsidian-700 bg-obsidian-900/70 px-3 py-2">
                    Canlı Strava/Supabase anahtarları (.env) henüz tanımlı değil. Aşağıdaki{" "}
                    <strong className="text-sand-200">Demo Modu</strong> seçenekleriyle
                    tüm özellikleri hemen test edebilirsin.
                  </p>
                )}

                <div className="relative py-1">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-obsidian-700" />
                  </div>
                  <div className="relative flex justify-center text-[11px] uppercase">
                    <span className="bg-obsidian-800 px-2.5 text-sand-500 font-semibold">
                      Demo Modu
                    </span>
                  </div>
                </div>

                <div className="space-y-2.5">
                  <button
                    id="demo-member-btn"
                    type="button"
                    onClick={() => loginAsDemo("member", false)}
                    className="w-full flex items-center justify-center gap-2 rounded-xl border border-obsidian-600 bg-obsidian-900 hover:bg-obsidian-700 px-4 py-2.5 text-sm font-semibold text-sand-100 transition-colors"
                  >
                    Demo Üye Olarak Gir (Deniz Kaya)
                  </button>

                  <button
                    id="demo-admin-btn"
                    type="button"
                    onClick={() => loginAsDemo("admin", false)}
                    className="w-full flex items-center justify-center gap-2 rounded-xl border border-ember-500/40 bg-ember-500/10 hover:bg-ember-500/20 px-4 py-2.5 text-sm font-semibold text-ember-400 transition-colors"
                  >
                    <Shield className="h-4 w-4" />
                    Demo Admin Olarak Gir (Hasan Çavuş)
                  </button>

                  <button
                    id="demo-joincode-btn"
                    type="button"
                    onClick={() => loginAsDemo("member", true)}
                    className="w-full flex items-center justify-center gap-2 rounded-xl border border-obsidian-700 hover:bg-obsidian-700/60 px-4 py-2 text-xs font-medium text-sand-400 transition-colors"
                  >
                    <KeyRound className="h-3.5 w-3.5" />
                    Katılım Kodu Doğrulama Adımını Test Et
                  </button>
                </div>
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
