import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { TopBar } from "@/components/dashboard/top-bar";
import { LeftSidebar } from "@/components/dashboard/left-sidebar";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FeaturedCarousel } from "@/components/marketplace/featured-carousel";
import { CreatorTestimonials } from "@/components/marketplace/creator-testimonials";
import { ProductCard } from "@/components/marketplace/product-card";
import { ProductDetailModal } from "@/components/marketplace/product-detail-modal";
import { CreatorBanner } from "@/components/marketplace/creator-banner";
import { CATEGORIES, PRODUCTS, type CategoryFilter, type Product } from "@/lib/marketplace-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/marketplace")({
  head: () => ({
    meta: [
      { title: "Marketplace — AISignalRadar" },
      { name: "description", content: "Estratégias, indicadores, bots, alerts e cursos criados pela comunidade AISignalRadar." },
      { property: "og:title", content: "AISignalRadar Marketplace" },
      { property: "og:description", content: "Descubra produtos de traders verificados — comece grátis ou assine recorrente." },
    ],
  }),
  component: MarketplacePage,
});

type SortKey = "popular" | "rating" | "price-asc" | "price-desc";

function MarketplacePage() {
  const [cat, setCat] = useState<CategoryFilter>("All");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("popular");
  const [selected, setSelected] = useState<Product | null>(null);
  const [open, setOpen] = useState(false);

  const filtered = useMemo(() => {
    let list = PRODUCTS;
    if (cat !== "All") list = list.filter((p) => p.category === cat);
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.creator.handle.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q)
      );
    }
    list = [...list].sort((a, b) => {
      if (sort === "rating") return b.rating - a.rating;
      if (sort === "price-asc") return a.price - b.price;
      if (sort === "price-desc") return b.price - a.price;
      return b.reviews - a.reviews;
    });
    return list;
  }, [cat, query, sort]);

  function openProduct(p: Product) {
    setSelected(p);
    setOpen(true);
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <TopBar />
      <div className="flex">
        <LeftSidebar />
        <main className="flex-1 min-w-0">
          <div className="max-w-6xl mx-auto px-5 py-8 space-y-10">
            <header className="space-y-1">
              <h1 className="text-[26px] md:text-[30px] font-semibold tracking-tight">Marketplace</h1>
              <p className="text-sm text-muted-foreground">Descubra estratégias, indicadores e bots criados pela comunidade.</p>
            </header>

            <FeaturedCarousel onOpen={openProduct} />

            <CreatorTestimonials />


            <section className="space-y-4">
              <div className="flex flex-wrap items-center gap-3 border-b border-border">
                <div className="flex flex-wrap -mb-px">
                  {CATEGORIES.map((c) => {
                    const active = c === cat;
                    return (
                      <button
                        key={c}
                        onClick={() => setCat(c)}
                        className={cn(
                          "px-3.5 py-2 text-sm transition-colors border-b-2 -mb-px",
                          active
                            ? "border-[#378ADD] text-foreground font-medium"
                            : "border-transparent text-muted-foreground hover:text-foreground"
                        )}
                      >
                        {c}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="relative flex-1 min-w-[220px]">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                  <Input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Buscar por nome, criador ou descrição..."
                    className="pl-8 h-9 text-sm"
                  />
                </div>
                <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
                  <SelectTrigger className="h-9 w-[160px] text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="popular">Mais populares</SelectItem>
                    <SelectItem value="rating">Maior rating</SelectItem>
                    <SelectItem value="price-asc">Menor preço</SelectItem>
                    <SelectItem value="price-desc">Maior preço</SelectItem>
                  </SelectContent>
                </Select>
                <span className="text-xs text-muted-foreground ml-auto">{filtered.length} produtos</span>
              </div>

              {filtered.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border bg-card/20 p-12 text-center text-sm text-muted-foreground">
                  Nenhum produto encontrado para os filtros atuais.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {filtered.map((p) => (
                    <ProductCard key={p.id} product={p} onOpen={openProduct} />
                  ))}
                </div>
              )}
            </section>

            <CreatorBanner />
          </div>
        </main>
      </div>
      <ProductDetailModal product={selected} open={open} onOpenChange={setOpen} />
    </div>
  );
}
