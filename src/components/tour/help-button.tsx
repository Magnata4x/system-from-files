import { useRouterState } from "@tanstack/react-router";
import { HelpCircle, Check } from "lucide-react";
import { useTourStore } from "@/lib/tour-store";
import { tourForRoute } from "@/lib/tour-content";

export function TourHelpButton() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const completed = useTourStore((s) => s.completedTours);
  const startTour = useTourStore((s) => s.startTour);
  const activeTour = useTourStore((s) => s.activeTour);

  const tour = tourForRoute(path);
  if (!tour || activeTour) return null;
  const isDone = completed.includes(tour.id);

  return (
    <button
      onClick={() => startTour(tour.id)}
      className="size-8 rounded-md flex items-center justify-center hover:bg-secondary transition-all hover:scale-105"
      style={{ border: `1.5px solid ${isDone ? "#1D9E75" : "#185FA5"}` }}
      title={isDone ? "Tour concluído — clique para rever" : `Rever tour: ${tour.label}`}
      aria-label={isDone ? "Tour concluído" : "Iniciar tour"}
    >
      {isDone ? (
        <Check className="size-4 text-[#1D9E75]" />
      ) : (
        <HelpCircle className="size-4 text-[#378ADD]" />
      )}
    </button>
  );
}
