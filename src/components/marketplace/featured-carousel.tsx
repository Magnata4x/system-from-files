import { BadgeCheck } from "lucide-react";
import { CATEGORY_BADGES, CATEGORY_GRADIENTS, PRODUCTS, type Product } from "@/lib/marketplace-data";
import { cn } from "@/lib/utils";

export function FeaturedCarousel({ onOpen }: { onOpen: (p: Product) => void }) {
  const featured = PRODUCTS.filter((p) => p.featured);
  return (
    <section className="space-y-3">
      <header className="flex items-baseline justify-between">
        <h2 className="text-lg font-semibold">Featured</h2>
        <span className="text-xs text-muted-foreground">Hand-picked by AISignalRadar</span>
      </header>
      <div className="overflow-x-auto -mx-5 px-5 pb-2 scrollbar-thin">
        <div className="flex gap-4 min-w-min">
          {featured.map((p) => (
            <button
              key={p.id}
              onClick={() => onOpen(p)}
              className="group relative w-[320px] shrink-0 rounded-xl border border-border bg-card/40 hover:border-[#378ADD]/40 transition-all overflow-hidden text-left"
            >
              <div className={cn("relative h-32 bg-gradient-to-br", CATEGORY_GRADIENTS[p.category])}>
                <span className={cn("absolute top-2.5 left-2.5 text-[10.5px] px-1.5 py-0.5 rounded border", CATEGORY_BADGES[p.category])}>
                  {p.category}
                </span>
                <span className="absolute top-2.5 right-2.5 text-[10px] uppercase font-semibold tracking-wide px-1.5 py-0.5 rounded bg-background/70 backdrop-blur border border-border text-amber-400">
                  Featured
                </span>
              </div>
              <div className="p-3.5 space-y-1.5">
                <div className="font-medium text-sm">{p.name}</div>
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  @{p.creator.handle}
                  {p.creator.verified && <BadgeCheck className="size-3 text-[#5fa8ff]" />}
                </div>
                <div className="text-sm font-semibold tabular-nums pt-1">
                  {p.price === 0 ? <span className="text-emerald-400">Gratuito</span> : <>R${p.price}<span className="text-[11px] text-muted-foreground font-normal">/mês</span></>}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
