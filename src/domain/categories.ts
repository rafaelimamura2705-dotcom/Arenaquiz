import type { Category } from "./types";

export function normalizeCategoryName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .replace(/\s+/g, " ")
    .trim();
}

export function customCategory(name: string, id: string): Category {
  return {
    id,
    name: name.trim().replace(/\s+/g, " "),
    description: "Criada por você. As perguntas ainda precisam ser preparadas.",
    icon: "book",
    color: "sage",
    tag: "Sua categoria",
    status: "awaiting-questions",
  };
}
