import { createFileRoute } from "@tanstack/react-router";
import { ApiError, handleApi } from "@/lib/server/api-auth.server";

export const Route = createFileRoute("/api/marketplace/products")({
  server: {
    handlers: {
      GET: async ({ request }) =>
        handleApi(request, async (user) => {
          const params = new URL(request.url).searchParams;
          const category = params.get("category");
          const asset = params.get("asset");
          let query = user.supabase
            .from("marketplace_products")
            .select(
              "id, name, category, creator_handle, creator_verified, description, rating, reviews, price, featured, assets",
            )
            .order("reviews", { ascending: false });
          if (category && category !== "All") query = query.eq("category", category);
          if (asset && asset !== "All") query = query.contains("assets", [asset]);
          const { data, error } = await query;
          if (error) throw new ApiError(error.message, 500);
          return (data ?? []).map((p) => ({
            id: p.id,
            name: p.name,
            category: p.category,
            creator: { handle: p.creator_handle, verified: p.creator_verified },
            description: p.description,
            rating: Number(p.rating),
            reviews: p.reviews,
            price: Number(p.price),
            featured: p.featured,
            assets: (p.assets ?? []) as string[],
          }));
        }),
    },
  },
});
