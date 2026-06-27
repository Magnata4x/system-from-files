import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";

// PWA-01: banner discreto exibido quando o browser perde conexão.
// - Detecta navigator.onLine + eventos online/offline.
// - Mostra timestamp dos últimos dados disponíveis (montagem do banner =
//   primeiro instante offline; representa "dados em cache até este momento").
// - Não renderiza nada em SSR (navigator indisponível).
export function OfflineBanner() {
  const [online, setOnline] = useState<boolean>(() =>
    typeof navigator === "undefined" ? true : navigator.onLine,
  );
  const [offlineSince, setOfflineSince] = useState<Date | null>(null);

  useEffect(() => {
    function handleOnline() {
      setOnline(true);
      setOfflineSince(null);
    }
    function handleOffline() {
      setOnline(false);
      setOfflineSince((prev) => prev ?? new Date());
    }
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    if (!navigator.onLine) handleOffline();
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (online) return null;

  const stamp = offlineSince
    ? offlineSince.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })
    : null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed top-0 inset-x-0 z-[60] flex items-center justify-center gap-2 bg-amber-500/95 text-amber-950 text-xs sm:text-sm font-medium px-3 py-2 shadow-md"
    >
      <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span>Sem conexão — exibindo últimos dados disponíveis</span>
      {stamp && (
        <span className="opacity-75 hidden sm:inline">· últimos dados às {stamp}</span>
      )}
    </div>
  );
}
