// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, cloudflare (build-only),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... } }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { VitePWA } from "vite-plugin-pwa";

// Public Lovable Cloud browser config. These values are publishable by design;
// keeping them as explicit build fallbacks prevents production bundles from
// collapsing the Supabase client fallback to an empty `process.env` object when
// the managed `.env` is unavailable during publish.
const publicSupabaseUrl =
  process.env.VITE_SUPABASE_URL ??
  process.env.SUPABASE_URL ??
  "https://tzqqkrlzrgsnicfugkzf.supabase.co";
const publicSupabasePublishableKey =
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
  process.env.SUPABASE_PUBLISHABLE_KEY ??
  process.env.VITE_SUPABASE_ANON_KEY ??
  process.env.SUPABASE_ANON_KEY ??
  "sb_publishable_YDsUlR4X2ESk0PHdtg59vg_DZcoU_Z0";

// PWA-01: offline degradado para usuários que monitoram posições abertas.
// - registerType:"autoUpdate" + sw em /sw.js, NetworkFirst para navegações
//   (HTML nunca pode ser cache-first), CacheFirst para assets hashados.
// - devOptions.enabled:false e injectRegister:null garantem que o plugin
//   NUNCA emite/registra SW em dev; o único registrador é o wrapper em
//   src/lib/pwa/register.ts (que recusa preview Lovable, iframe e ?sw=off).
// - /~oauth fica fora do navigation fallback p/ não interceptar callback.
export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
    prerender: {
      enabled: false,
    },
    pages: [
      { path: "/terms", prerender: { enabled: true } },
      { path: "/privacy", prerender: { enabled: true } },
    ],
  },
  vite: {
    define: {
      "process.env.SUPABASE_URL": JSON.stringify(publicSupabaseUrl),
      "process.env.SUPABASE_PUBLISHABLE_KEY": JSON.stringify(publicSupabasePublishableKey),
      "process.env.VITE_SUPABASE_URL": JSON.stringify(publicSupabaseUrl),
      "process.env.VITE_SUPABASE_PUBLISHABLE_KEY": JSON.stringify(publicSupabasePublishableKey),
    },
    plugins: [
      VitePWA({
        registerType: "autoUpdate",
        injectRegister: null,
        filename: "sw.js",
        devOptions: { enabled: false },
        manifest: {
          name: "AISignalRadar",
          short_name: "SignalRadar",
          description: "Real-time AI trading signals and position monitoring.",
          theme_color: "#0a0a0a",
          background_color: "#0a0a0a",
          display: "standalone",
          start_url: "/",
          scope: "/",
          icons: [
            { src: "/pwa-192x192.png", sizes: "192x192", type: "image/png", purpose: "any" },
            { src: "/pwa-512x512.png", sizes: "512x512", type: "image/png", purpose: "any" },
            { src: "/pwa-512x512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
          ],
        },
        workbox: {
          globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
          navigateFallbackDenylist: [/^\/~oauth/, /^\/api\//],
          runtimeCaching: [
            {
              // HTML / navigation requests: network-first, fallback to cache.
              urlPattern: ({ request }) => request.mode === "navigate",
              handler: "NetworkFirst",
              options: {
                cacheName: "html-cache",
                networkTimeoutSeconds: 3,
                expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 },
              },
            },
            {
              urlPattern: /\/api\//,
              handler: "NetworkFirst",
              options: {
                cacheName: "api-cache",
                networkTimeoutSeconds: 5,
                expiration: { maxEntries: 100, maxAgeSeconds: 60 * 5 },
              },
            },
            {
              // Same-origin hashed build assets: cache-first.
              urlPattern: ({ url, sameOrigin }) =>
                sameOrigin && /\.(?:js|css|woff2|png|svg|ico)$/.test(url.pathname),
              handler: "CacheFirst",
              options: {
                cacheName: "asset-cache",
                expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 },
              },
            },
          ],
        },
      }),
    ],
  },
});
