import { describe, it, expect, beforeEach } from "vitest";
import { useSignalsStore, selectFilteredSorted } from "@/lib/signals-store";

describe("selectFilteredSorted — memoização", () => {
  beforeEach(() => {
    // Reseta seed do store para um estado determinístico.
    useSignalsStore.setState({
      hoverId: null,
      detailId: null,
      flashIds: [],
    });
  });

  it("retorna a MESMA referência quando uma propriedade não-relacionada muda (hoverId)", () => {
    const a = selectFilteredSorted(useSignalsStore.getState());

    // Muda apenas hoverId — não afeta signals/filters/sort.
    useSignalsStore.setState({ hoverId: "abc" });
    const b = selectFilteredSorted(useSignalsStore.getState());

    // Mesma referência ⇒ o seletor NÃO recomputou (cache do reselect).
    expect(b).toBe(a);

    useSignalsStore.setState({ detailId: "xyz", flashIds: ["1", "2"] });
    const c = selectFilteredSorted(useSignalsStore.getState());
    expect(c).toBe(a);
  });

  it("recomputa quando filters ou sort mudam", () => {
    const a = selectFilteredSorted(useSignalsStore.getState());

    useSignalsStore.setState((s) => ({
      filters: { ...s.filters, search: "BTC" },
    }));
    const b = selectFilteredSorted(useSignalsStore.getState());
    expect(b).not.toBe(a);

    useSignalsStore.setState({ sort: "rr" });
    const c = selectFilteredSorted(useSignalsStore.getState());
    expect(c).not.toBe(b);
  });
});
