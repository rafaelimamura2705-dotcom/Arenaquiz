import type { Player, Result } from "../domain/types";
export interface LocalData {
  player: Player;
  seen: Record<string, string[]>;
  results: Result[];
}
export const STORAGE_KEY = "arena-quiz-demo-v1";
export function defaultData(): LocalData {
  return {
    player: { id: "local-player", name: "Aventureiro", avatar: "🧑‍🚀" },
    seen: {},
    results: [],
  };
}
export function loadData(): LocalData {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null");
    if (!raw || typeof raw !== "object") return defaultData();
    const data = defaultData();
    if (typeof raw.player?.name === "string" && raw.player.name.trim())
      data.player = {
        id: "local-player",
        name: raw.player.name.slice(0, 24),
        avatar:
          typeof raw.player.avatar === "string" ? raw.player.avatar : "🧑‍🚀",
      };
    if (raw.seen && typeof raw.seen === "object")
      for (const [key, value] of Object.entries(raw.seen))
        if (Array.isArray(value) && value.every((v) => typeof v === "string"))
          data.seen[key] = value;
    if (Array.isArray(raw.results))
      data.results = raw.results
        .filter(
          (r: Result) =>
            typeof r.id === "string" &&
            typeof r.category === "string" &&
            typeof r.opponent === "string" &&
            typeof r.date === "string" &&
            Array.isArray(r.wins) &&
            r.wins.length === 2 &&
            r.wins.every(Number.isFinite) &&
            (r.winner === 0 || r.winner === 1) &&
            [r.points, r.correct, r.questions].every(Number.isFinite),
        )
        .slice(0, 100)
        .map((r: Result) => ({
          id: r.id,
          date: r.date,
          category: r.category,
          opponent: r.opponent,
          wins: r.wins,
          winner: r.winner,
          points: r.points,
          correct: r.correct,
          questions: r.questions,
        }));
    return data;
  } catch {
    return defaultData();
  }
}
