import { useMemo, useState } from "react";
import { BadgeCheck, Heart, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Rating } from "@/components/marketplace/rating";
import { ProductDetailModal } from "@/components/marketplace/product-detail-modal";
import { CATEGORY_BADGES, CATEGORY_GRADIENTS, PRODUCTS, type Product } from "@/lib/marketplace-data";
import { useWishlist } from "@/lib/wishlist-store";
import { cn } from "@/lib/utils";
import { Link } from "@tanstack/react-router";

export function WishlistTab() {
  const { ids, remove } = useWishlist();
  const [selected, setSelected] = useState<Product | null>(null);
  const [open, setOpen] = useState(false);

  const items = useMemo(() => PRODUCTS.filter((p) => ids.includes(p.id)), [ids]);

  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-card/20 p-10 text-center">
        <Heart className="size-6 text-muted-foreground mx-auto mb-3" />
        <h3 className="text-sm font-medium">Sua wishlist está vazia</h3>
        <p className="text-xs text-muted-foreground mt-1">
          Toque no coração nos cards do marketplace para salvar produtos aqui.
        </p>
        <Button asChild size="sm" className="mt-4 bg-[#378ADD] hover:bg-[#2d74bd] text-white">
          <Link to="/marketplace">Ir para o marketplace</Link>
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium">{items.length} {items.length === 1 ? "produto salvo" : "produtos salvos"}</h2>
          <Button asChild variant="outline" size="sm" className="h-7 text-xs">
            <Link to="/marketplace">Explorar mais</Link>
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {items.map((p) => (
            <div key={p.id} className="rounded-lg border border-border bg-card/40 overflow-hidden flex">
              <button
                type="button"
                onClick={() => { setSelected(p); setOpen(true); }}
                className={cn("relative w-20 shrink-0 bg-gradient-to-br border-r border-border/60", CATEGORY_GRADIENTS[p.category])}
                aria-label={`Open ${p.name}`}
              />
              <div className="p-3 flex-1 min-w-0 flex flex-col gap-1.5">
                <div className="flex items-start justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => { setSelected(p); setOpen(true); }}
                    className="text-left text-[13px] font-medium line-clamp-1 hover:text-[#5fa8ff]"
                  >
                    {p.name}
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(p.id)}
                    aria-label="Remove from wishlist"
                    className="size-6 rounded-md border border-border bg-background/40 flex items-center justify-center text-muted-foreground hover:text-rose-400 hover:border-rose-400/60 transition-colors shrink-0"
                  >
                    <Trash2 className="size-3" />
                  </button>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                  <span className={cn("px-1.5 py-0.5 rounded border text-[10px]", CATEGORY_BADGES[p.category])}>{p.category}</span>
                  <span className="flex items-center gap-1 truncate">
                    @{p.creator.handle}
                    {p.creator.verified && <BadgeCheck className="size-3 text-[#5fa8ff]" />}
                  </span>
                </div>
                <div className="flex items-center justify-between mt-auto pt-1">
                  <Rating value={p.rating} count={p.reviews} />
                  <span className="text-xs font-semibold tabular-nums">
                    {p.price === 0 ? <span className="text-emerald-400">Free</span> : <>R${p.price}<span className="text-[10px] text-muted-foreground font-normal">/mês</span></>}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <ProductDetailModal product={selected} open={open} onOpenChange={setOpen} />
    </>
  );
}
