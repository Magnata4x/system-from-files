import { describe, it, expect } from "vitest";
import {
  analyzePairs,
  DEFAULT_DNA_MIN_SAMPLE,
  DNA_MIN_SAMPLE_BOUNDS,
} from "../dna-pair-analyzer";
import type { Trade } from "../bot4x-data";

// Helpers ────────────────────────────────────────────────────────────────────

let _seq = 0;
function makeTrade(pair: string, result: "WIN" | "LOSS", pnlPct = 0): Trade {
  _seq += 1;
  return {
    id: `o_${Date.now() + _seq}_${pair}_${_seq}`,
    pair,
    side: "LONG",
    entry: 100,
    sl: 99,
    tp: 101,
    openedAt: Date.now(),
    pnlPct,
    result,
  } as unknown as Trade;
}

function makeHistory(pair: string, wins: number, losses: number): Trade[] {
  const trades: Trade[] = [];
  for (let i = 0; i < wins; i++) trades.push(makeTrade(pair, "WIN", 1));
  for (let i = 0; i < losses; i++) trades.push(makeTrade(pair, "LOSS", -1));
  return trades;
}

// Tests ──────────────────────────────────────────────────────────────────────

describe("DNA analyzer — mínimo de trades fechados configurável", () => {
  it("o padrão exposto pelo módulo é 10 (e NÃO 20)", () => {
    expect(DEFAULT_DNA_MIN_SAMPLE).toBe(10);
    expect(DEFAULT_DNA_MIN_SAMPLE).not.toBe(20);
  });

  it("com 10 trades fechados, par com WR claramente acima da média recebe veredito (não fica NEUTRAL por amostra)", () => {
    // PAIR_A: 9W/1L (90%); PAIR_B: 1W/9L (10%) → baseline ~50%, k=2
    const history = [...makeHistory("PAIR_A", 9, 1), ...makeHistory("PAIR_B", 1, 9)];
    const res = analyzePairs(history); // usa default (10)

    const a = res.analyses.find((x) => x.pair === "PAIR_A");
    const b = res.analyses.find((x) => x.pair === "PAIR_B");
    expect(a?.total).toBe(10);
    expect(b?.total).toBe(10);
    // Não deve cair na rule "Amostra insuficiente" — esse era o sintoma do antigo MIN=20.
    expect(a?.reason).not.toMatch(/Amostra insuficiente/i);
    expect(b?.reason).not.toMatch(/Amostra insuficiente/i);
    // Garantia central: com MIN=10, n=10 passa pela rule de amostra e entra na
    // análise estatística (Wilson). O veredito final pode ser PREFER/AVOID/NEUTRAL
    // dependendo da correção de Bonferroni, mas NÃO pode ser bloqueado por amostra.
    expect(a?.reason).toMatch(/IC95|Sem diferença estatística/);
    expect(b?.reason).toMatch(/IC95|Sem diferença estatística/);
  });

  it("com 9 trades fechados (< 10) o par fica NEUTRAL por amostra insuficiente", () => {
    const history = makeHistory("PAIR_A", 8, 1); // 9 totais
    const res = analyzePairs(history);
    const a = res.analyses.find((x) => x.pair === "PAIR_A");
    expect(a?.total).toBe(9);
    expect(a?.recommendation).toBe("NEUTRAL");
    expect(a?.reason).toMatch(/Amostra insuficiente/i);
    expect(a?.reason).toMatch(/mínimo 10/);
  });

  it("a mensagem de amostra insuficiente reflete o valor configurado (não fixo em 20)", () => {
    const history = makeHistory("PAIR_A", 5, 5);
    const res = analyzePairs(history, { minSample: 15 });
    const a = res.analyses.find((x) => x.pair === "PAIR_A");
    expect(a?.reason).toContain("mínimo 15");
    expect(a?.reason).not.toContain("mínimo 20");
  });

  it("opção minSample sobrescreve o padrão (ex.: 5 libera veredito antes que 10)", () => {
    // 5W/0L em PAIR_A vs 0W/5L em PAIR_B
    const history = [...makeHistory("PAIR_A", 5, 0), ...makeHistory("PAIR_B", 0, 5)];

    const resDefault = analyzePairs(history); // mínimo 10 → todos NEUTRAL
    expect(resDefault.preferred).toEqual([]);
    expect(resDefault.avoid).toEqual([]);

    const resLow = analyzePairs(history, { minSample: 5 });
    // Com n=5 e baseline=50%, o IC de Wilson ainda pode sobrepor; o que garantimos
    // aqui é que a rule de amostra insuficiente NÃO é mais o bloqueio.
    const aLow = resLow.analyses.find((x) => x.pair === "PAIR_A");
    expect(aLow?.reason).not.toMatch(/Amostra insuficiente/i);
  });

  it("valores fora dos limites são clampados aos bounds (defesa contra regressão p/ 20)", () => {
    const history = makeHistory("PAIR_A", 6, 4); // 10 trades
    // Tentar forçar 20 deveria ser respeitado (dentro dos bounds), mas tentar 1 ou 9999 não.
    const resTooLow = analyzePairs(history, { minSample: 1 });
    const a1 = resTooLow.analyses.find((x) => x.pair === "PAIR_A");
    // bound mínimo é 5 → 10 ≥ 5, então não deve estar "insuficiente"
    expect(a1?.reason).not.toMatch(/Amostra insuficiente/i);

    const resTooHigh = analyzePairs(history, { minSample: 9999 });
    const a2 = resTooHigh.analyses.find((x) => x.pair === "PAIR_A");
    expect(a2?.reason).toMatch(/Amostra insuficiente/i);
    expect(a2?.reason).toContain(`mínimo ${DNA_MIN_SAMPLE_BOUNDS.max}`);
  });
});
