// Copiloto interno: usa o gateway de IA da Lovable e persiste o histórico.
import { createFileRoute } from "@tanstack/react-router";
import { ApiError, handleApi } from "@/lib/server/api-auth.server";

const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-3.8-flash";

interface ChatBody {
  message?: string;
  marketContext?: Record<string, unknown>;
  traderProfile?: Record<string, unknown>;
}

function systemPrompt(market: unknown, trader: unknown) {
  return [
    "Você é o Copiloto do AISignalRadar, um assistente de trading de criptomoedas.",
    "Responda em português do Brasil, direto ao ponto, em no máximo 6 linhas.",
    "Use os dados de contexto quando fizerem sentido. Nunca prometa lucro garantido.",
    `Contexto de mercado: ${JSON.stringify(market ?? {})}`,
    `Perfil do trader: ${JSON.stringify(trader ?? {})}`,
  ].join("\n");
}

export const Route = createFileRoute("/api/copilot/chat")({
  server: {
    handlers: {
      POST: async ({ request }) =>
        handleApi(request, async (user) => {
          const body = (await request.json().catch(() => ({}))) as ChatBody;
          const message = (body.message ?? "").trim();
          if (!message) throw new ApiError("message é obrigatório");

          const apiKey = process.env["LOVABLE_API_KEY"];
          if (!apiKey) throw new ApiError("Copiloto não configurado", 500);

          const { data: history } = await user.supabase
            .from("copilot_history")
            .select("role, content")
            .eq("user_id", user.userId)
            .order("created_at", { ascending: false })
            .limit(12);

          const recent = (history ?? [])
            .reverse()
            .filter((m) => m.role === "user" || m.role === "assistant")
            .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

          const started = Date.now();
          const res = await fetch(GATEWAY, {
            method: "POST",
            headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
            body: JSON.stringify({
              model: MODEL,
              messages: [
                { role: "system", content: systemPrompt(body.marketContext, body.traderProfile) },
                ...recent,
                { role: "user", content: message },
              ],
            }),
          });

          if (res.status === 429)
            throw new ApiError("Muitas perguntas seguidas. Tente em instantes.", 429);
          if (res.status === 402) throw new ApiError("Créditos de IA esgotados.", 402);
          if (!res.ok) throw new ApiError(`Falha no copiloto (${res.status})`, 502);

          const json = (await res.json()) as {
            choices?: { message?: { content?: string } }[];
          };
          const reply =
            json.choices?.[0]?.message?.content?.trim() ?? "Não consegui responder agora.";

          await user.supabase.from("copilot_history").insert([
            { user_id: user.userId, role: "user", content: message },
            { user_id: user.userId, role: "assistant", content: reply, agent: "copilot" },
          ]);

          return { reply, agent: "copilot", latency: Date.now() - started };
        }),
    },
  },
});
