export type Category = "Strategies" | "Indicators" | "Alerts" | "Bots" | "Education";

export type Product = {
  id: string;
  name: string;
  category: Category;
  creator: { handle: string; verified: boolean };
  description: string;
  rating: number;
  reviews: number;
  price: number;
  featured?: boolean;
  assets?: string[];
};

export const CATEGORIES = ["All", "Strategies", "Indicators", "Alerts", "Bots", "Education"] as const;
export type CategoryFilter = (typeof CATEGORIES)[number];

export const CATEGORY_GRADIENTS: Record<Category, string> = {
  Strategies: "from-[#378ADD]/40 to-violet-500/20",
  Indicators: "from-emerald-500/40 to-teal-500/20",
  Alerts: "from-amber-500/40 to-orange-500/20",
  Bots: "from-violet-500/40 to-fuchsia-500/20",
  Education: "from-pink-500/40 to-rose-500/20",
};

export const CATEGORY_BADGES: Record<Category, string> = {
  Strategies: "bg-[#378ADD]/15 text-[#5fa8ff] border-[#378ADD]/30",
  Indicators: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  Alerts: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  Bots: "bg-violet-500/15 text-violet-300 border-violet-500/30",
  Education: "bg-pink-500/15 text-pink-300 border-pink-500/30",
};
