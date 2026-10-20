import type { Category, Player, Question, Result } from "../domain/types";
import { customCategory, normalizeCategoryName } from "../domain/categories";
import { categories } from "../data/demo";
export interface LocalData {
  player: Player;
  seen: Record<string, string[]>;
  results: Result[];
  customCategories: Category[];
  generatedQuestions: Question[];
}
export const STORAGE_KEY = "arena-quiz-demo-v1";
export function defaultData(): LocalData {
  return {
    player: { id: "local-player", name: "Aventureiro", avatar: "🧑‍🚀" },
    seen: {},
    results: [],
    customCategories: [],
    generatedQuestions: [],
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
    if (Array.isArray(raw.customCategories)) {
      const names = new Set(
        categories.map((category) => normalizeCategoryName(category.name)),
      );
      const ids = new Set<string>();
      for (const candidate of raw.customCategories) {
        if (
          !candidate ||
          typeof candidate.name !== "string" ||
          typeof candidate.id !== "string"
        )
          continue;
        const name = candidate.name.trim().replace(/\s+/g, " ");
        const normalized = normalizeCategoryName(name);
        if (
          name.length < 3 ||
          name.length > 60 ||
          !/^custom-[a-zA-Z0-9-]+$/.test(candidate.id) ||
          names.has(normalized) ||
          ids.has(candidate.id)
        )
          continue;
        const category = customCategory(name, candidate.id);
        if (
          ["queued", "researching", "validating", "error"].includes(
            candidate.status,
          )
        )
          category.status = candidate.status;
        if (typeof candidate.generationMessage === "string")
          category.generationMessage = candidate.generationMessage.slice(
            0,
            1000,
          );
        if (typeof candidate.scope === "string")
          category.scope = candidate.scope.slice(0, 4000);
        if (typeof candidate.validatedAt === "string")
          category.validatedAt = candidate.validatedAt;
        data.customCategories.push(category);
        names.add(normalized);
        ids.add(candidate.id);
      }
    }
    if (Array.isArray(raw.generatedQuestions)) {
      const ids = new Set<string>();
      for (const q of raw.generatedQuestions) {
        if (
          !q ||
          typeof q.id !== "string" ||
          ids.has(q.id) ||
          !data.customCategories.some((c) => c.id === q.categoryId) ||
          !["abrangente", "específica", "especialista"].includes(q.level) ||
          typeof q.prompt !== "string" ||
          !q.prompt.trim() ||
          !Array.isArray(q.options) ||
          q.options.length !== 4 ||
          q.options.some((o: unknown) => typeof o !== "string" || !o.trim()) ||
          !Number.isInteger(q.correctIndex) ||
          q.correctIndex < 0 ||
          q.correctIndex > 3 ||
          typeof q.source !== "string" ||
          !q.source.startsWith("https://")
        )
          continue;
        ids.add(q.id);
        data.generatedQuestions.push({
          id: q.id,
          categoryId: q.categoryId,
          level: q.level,
          prompt: q.prompt,
          options: q.options,
          correctIndex: q.correctIndex,
          source: q.source,
        });
      }
      for (const c of data.customCategories) {
        if (
          ["abrangente", "específica", "especialista"].every(
            (level) =>
              data.generatedQuestions.filter(
                (q) => q.categoryId === c.id && q.level === level,
              ).length >= 3,
          )
        )
          c.status = "ready";
      }
    }
    if (Array.isArray(raw.results))
      data.results = raw.results
        .filter(
          (r: Result) =>
            r !== null &&
            typeof r === "object" &&
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
