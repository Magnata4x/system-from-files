import { BadgeCheck, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Rating } from "./rating";
import { CATEGORY_BADGES, CATEGORY_GRADIENTS, type Product } from "@/lib/marketplace-data";
import { useWishlist } from "@/lib/wishlist-store";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export function ProductCard({ product, onOpen }: { product: Product; onOpen: (p: Product) => void }) {
  const free = product.price === 0;
  const { has, toggle } = useWishlist();
  const wished = has(product.id);

  function handleWish(e: React.MouseEvent) {
    e.stopPropagation();
    const nowSaved = toggle(product.id);
    toast(nowSaved ? "Salvo na wishlist" : "Removido da wishlist", {
      description: nowSaved ? "Veja em Profile › Wishlist" : undefined,
    });
  }

  return (
    <div className="group rounded-lg border border-border bg-card/40 hover:bg-card/70 hover:border-[#378ADD]/40 transition-all overflow-hidden flex flex-col">
      <button
        type="button"
        onClick={() => onOpen(product)}
        className={cn(
          "relative h-24 w-full bg-gradient-to-br border-b border-border/60",
          CATEGORY_GRADIENTS[product.category]
        )}
      >
        <span className={cn("absolute top-2 left-2 text-[10.5px] px-1.5 py-0.5 rounded border", CATEGORY_BADGES[product.category])}>
          {product.category}
        </span>
        {product.featured && (
          <span className="absolute top-2 right-2 text-[10px] uppercase font-semibold tracking-wide px-1.5 py-0.5 rounded bg-background/70 backdrop-blur border border-border text-amber-400">
            Featured
          </span>
        )}
        <button
          type="button"
          onClick={handleWish}
          aria-label={wished ? "Remove from wishlist" : "Add to wishlist"}
          className={cn(
            "absolute bottom-2 right-2 size-7 rounded-full bg-background/70 backdrop-blur border border-border flex items-center justify-center transition-colors hover:border-rose-400/60",
            wished && "border-rose-400/60"
          )}
        >
          <Heart className={cn("size-3.5 transition-colors", wished ? "fill-rose-400 text-rose-400" : "text-muted-foreground")} />
        </button>
      </button>

      <div className="p-3 space-y-2 flex-1 flex flex-col">
        <button type="button" onClick={() => onOpen(product)} className="text-left">
          <div className="text-[13px] font-medium text-foreground line-clamp-1">{product.name}</div>
        </button>

        <div className="flex items-center gap-2">
          <div className="size-7 rounded-full bg-gradient-to-br from-[#378ADD]/30 to-[#5fa8ff]/10 border border-border flex items-center justify-center text-[10px] font-semibold">
            {product.creator.handle.slice(0, 2).toUpperCase()}
          </div>
          <span className="text-xs text-muted-foreground truncate flex items-center gap-1">
            @{product.creator.handle}
            {product.creator.verified && <BadgeCheck className="size-3 text-[#5fa8ff]" />}
          </span>
        </div>

        <p className="text-[11.5px] text-muted-foreground line-clamp-2 flex-1">{product.description}</p>

        <Rating value={product.rating} count={product.reviews} />

        <div className="flex items-center justify-between pt-1.5 border-t border-border/60">
          {free ? (
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              Gratuito
            </span>
          ) : (
            <span className="text-sm font-semibold tabular-nums">
              R${product.price}<span className="text-[11px] text-muted-foreground font-normal">/mês</span>
            </span>
          )}
          <div className="flex gap-1.5">
            <Button size="sm" variant="outline" className="h-7 text-xs px-2.5" onClick={() => onOpen(product)}>
              Preview
            </Button>
            <Button size="sm" className="h-7 text-xs px-2.5 bg-[#378ADD] hover:bg-[#2d74bd] text-white">
              Obter
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
