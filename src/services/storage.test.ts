import { afterEach, describe, expect, it, vi } from "vitest";
import { customCategory } from "../domain/categories";
import { loadData } from "./storage";

function stored(value: unknown) {
  vi.stubGlobal("localStorage", { getItem: () => JSON.stringify(value) });
}
afterEach(() => vi.unstubAllGlobals());
describe("persistência de categorias criadas", () => {
  it("lê dados anteriores sem apagar nome, perguntas vistas ou resultados", () => {
    const result = {
      id: "d",
      date: "Exemplo",
      category: "História",
      opponent: "Bruna",
      wins: [2, 0],
      winner: 0,
      points: 900,
      correct: 5,
      questions: 6,
    };
    stored({
      player: { name: "Cora", avatar: "🦉" },
      seen: { "local-player": ["history-0-0"] },
      results: [result],
    });
    const data = loadData();
    expect(data.player.name).toBe("Cora");
    expect(data.seen["local-player"]).toEqual(["history-0-0"]);
    expect(data.results).toEqual([result]);
    expect(data.customCategories).toEqual([]);
  });
  it("restaura uma categoria com status de perguntas pendentes", () => {
    const category = customCategory("  Mitologia   nórdica ", "custom-demo");
    stored({ customCategories: [category] });
    expect(loadData().customCategories).toEqual([category]);
  });
  it("ignora entradas inválidas e duplicatas sem descartar as categorias válidas", () => {
    const valid = customCategory("Mitologia nórdica", "custom-demo");
    stored({
      player: { name: "Cora" },
      customCategories: [
        null,
        {},
        customCategory("HISTORIA", "custom-history"),
        valid,
        customCategory("MITOLOGIA NORDICA", "custom-other"),
        customCategory("Outra categoria", "custom-demo"),
        customCategory("ab", "custom-short"),
        customCategory("Tema", "history"),
      ],
    });
    const data = loadData();
    expect(data.player.name).toBe("Cora");
    expect(data.customCategories).toEqual([valid]);
  });
});
