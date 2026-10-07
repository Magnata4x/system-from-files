import { BadgeCheck, Heart, Sparkles } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Rating } from "./rating";
import { CATEGORY_BADGES, CATEGORY_GRADIENTS, type Product } from "@/lib/marketplace-data";
import { useWishlist } from "@/lib/wishlist-store";
import { cn } from "@/lib/utils";

type Props = {
  product: Product | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
};

export function ProductDetailModal({ product, open, onOpenChange }: Props) {
  const { has, toggle } = useWishlist();
  if (!product) return null;
  const free = product.price === 0;
  const wishlisted = has(product.id);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0">
        <div className={cn("relative h-32 bg-gradient-to-br border-b border-border/60", CATEGORY_GRADIENTS[product.category])}>
          <span className={cn("absolute top-3 left-3 text-[10.5px] px-1.5 py-0.5 rounded border", CATEGORY_BADGES[product.category])}>
            {product.category}
          </span>
        </div>

        <div className="px-6 pb-6 pt-4 space-y-5">
          <DialogHeader>
            <DialogTitle className="text-xl">{product.name}</DialogTitle>
            <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1">
              <div className="size-5 rounded-full bg-gradient-to-br from-[#378ADD]/30 to-[#5fa8ff]/10 border border-border flex items-center justify-center text-[9px] font-semibold">
                {product.creator.handle.slice(0, 2).toUpperCase()}
              </div>
              @{product.creator.handle}
              {product.creator.verified && <BadgeCheck className="size-3.5 text-[#5fa8ff]" />}
              <span>·</span>
              <Rating value={product.rating} count={product.reviews} />
            </div>
          </DialogHeader>

          <p className="text-sm text-foreground/80 leading-relaxed">{product.description}</p>

          <div>
            <h3 className="text-sm font-semibold mb-2">Reviews ({product.reviews})</h3>
            <p className="text-xs text-muted-foreground">
              O detalhe de avaliações individuais fica indisponível até existir uma fonte real de reviews.
            </p>
          </div>

          <div className="rounded-md border border-border bg-card/40 p-3 flex items-center gap-3">
            <div className="size-10 rounded-full bg-gradient-to-br from-[#378ADD]/40 to-[#5fa8ff]/10 border border-border flex items-center justify-center text-xs font-semibold">
              {product.creator.handle.slice(0, 2).toUpperCase()}
            </div>
            <div className="flex-1">
              <div className="text-sm font-medium flex items-center gap-1">
                @{product.creator.handle}
                {product.creator.verified && <BadgeCheck className="size-3.5 text-[#5fa8ff]" />}
              </div>
              <div className="text-xs text-muted-foreground">Criador do produto publicado no catálogo</div>
            </div>
            <Button variant="outline" size="sm" className="h-7 text-xs">View profile</Button>
          </div>

          <div className="flex flex-col gap-3 pt-3 border-t border-border/60">
            {!free && (
              <button
                type="button"
                onClick={() => toast.success(`Trial de 7 dias iniciado em ${product.name}`, { description: "Sem cobrança até o fim do período. Cancele a qualquer momento." })}
                className="w-full rounded-md border border-dashed border-[#378ADD]/40 bg-[#378ADD]/5 hover:bg-[#378ADD]/10 transition-colors px-3 py-2.5 text-left flex items-center gap-2.5"
              >
                <Sparkles className="size-4 text-[#5fa8ff] shrink-0" />
                <div className="flex-1">
                  <div className="text-xs font-medium text-foreground">Try free for 7 days</div>
                  <div className="text-[11px] text-muted-foreground">Acesso total. Cobrança automática só após o trial, cancele a qualquer momento.</div>
                </div>
              </button>
            )}

            <div className="flex items-center justify-between">
              <div>
                {free ? (
                  <span className="text-base font-semibold text-emerald-400">Gratuito</span>
                ) : (
                  <div>
                    <span className="text-2xl font-semibold tabular-nums">R${product.price}</span>
                    <span className="text-xs text-muted-foreground">/mês</span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    const nowSaved = toggle(product.id);
                    toast(nowSaved ? "Salvo na wishlist" : "Removido da wishlist");
                  }}
                  aria-label="Wishlist"
                >
                  <Heart className={cn("size-4", wishlisted && "fill-rose-400 text-rose-400")} />
                </Button>
                <Button className="bg-[#378ADD] hover:bg-[#2d74bd] text-white" onClick={() => toast.success(`Subscribed to ${product.name}`)}>
                  {free ? "Obter agora" : "Subscribe"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
