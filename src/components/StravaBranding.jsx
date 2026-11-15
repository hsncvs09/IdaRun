import React from "react";
import { ExternalLink } from "lucide-react";

/**
 * Strava Echelon Chevron Icon (Official two-chevron mark)
 */
export function StravaChevronIcon({ className = "h-5 w-5" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className={className}
    >
      <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" />
    </svg>
  );
}

/**
 * Official "Connect with Strava" OAuth Button
 * Complies with Strava API Brand Guidelines:
 * - Standard 48px (h-12) height
 * - Official #FC5200 Strava Orange background with pure white mark & typography
 * - Unmodified "Connect with Strava" label
 */
export function ConnectWithStravaButton({
  id = "strava-login-btn",
  onClick,
  disabled = false,
  className = "",
}) {
  return (
    <button
      id={id}
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label="Connect with Strava"
      className={`w-full h-12 flex items-center justify-center gap-3 rounded-xl bg-[#FC5200] hover:bg-[#e04800] active:bg-[#c94000] disabled:opacity-40 disabled:cursor-not-allowed px-5 text-white transition-colors shadow-lg ${className}`}
    >
      <StravaChevronIcon className="h-5 w-5 shrink-0 text-white" />
      <span className="text-sm sm:text-base font-bold tracking-wide">
        Connect with{" "}
        <span className="font-extrabold uppercase tracking-wider">STRAVA</span>
      </span>
    </button>
  );
}

/**
 * Official "POWERED BY STRAVA" Attribution Badge
 * Complies with Strava API Brand Guidelines Section 1.2:
 * - Separate and distinct from application logo
 * - Rendered in official Strava Orange (#FC5200) or White
 */
export function PoweredByStravaBadge({ variant = "orange", className = "" }) {
  const colorClass =
    variant === "white" ? "text-white" : "text-[#FC5200]";

  return (
    <a
      href="https://www.strava.com"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Powered by Strava"
      data-testid="powered-by-strava-badge"
      className={`inline-flex items-center gap-2 select-none hover:opacity-90 transition-opacity ${className}`}
    >
      <StravaChevronIcon className={`h-4 w-4 shrink-0 ${colorClass}`} />
      <span className="flex flex-col leading-none text-left">
        <span className="text-[8px] font-bold uppercase tracking-[0.18em] text-sand-400">
          POWERED BY
        </span>
        <span
          className={`text-xs font-extrabold uppercase tracking-[0.14em] ${colorClass}`}
        >
          STRAVA
        </span>
      </span>
    </a>
  );
}

/**
 * Official "View on Strava" Deep Link
 * Complies with Strava API Brand Guidelines Section 3 ("Linking to Strava Data"):
 * - Must use exact text format "View on Strava"
 * - Legible bold/underline #FC5200 orange link
 */
export function ViewOnStravaLink({ activityId, className = "" }) {
  if (!activityId) return null;
  const href = `https://www.strava.com/activities/${activityId}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      data-testid={`view-on-strava-${activityId}`}
      className={`inline-flex items-center gap-1 font-sans text-xs font-bold text-[#FC5200] hover:text-[#ff6a24] underline underline-offset-2 transition-colors ${className}`}
    >
      <span>View on Strava</span>
      <ExternalLink className="h-3 w-3 shrink-0" />
    </a>
  );
}
