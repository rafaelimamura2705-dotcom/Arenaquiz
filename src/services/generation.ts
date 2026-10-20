import type { Category, Question } from "../domain/types";
export interface GeneratedCategory {
  id: string;
  name: string;
  status: "queued" | "researching" | "validating" | "ready" | "error";
  message: string;
  scope: string;
  questions: Question[];
  validatedAt: string | null;
}
async function request(
  path: string,
  body?: { id: string; name: string },
): Promise<GeneratedCategory> {
  let response: Response;
  try {
    response = await fetch(path, {
      method: body ? "POST" : "GET",
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    throw new Error(
      "Não foi possível acessar o serviço de IA. Use a versão online com o servidor de geração configurado.",
    );
  }
  let data;
  try {
    data = await response.json();
  } catch {
    throw new Error(
      "O servidor de geração não está disponível neste endereço.",
    );
  }
  if (!response.ok)
    throw new Error(
      typeof data.error === "string"
        ? data.error
        : "Não foi possível solicitar a pesquisa.",
    );
  const category = data.category;
  if (
    !category ||
    typeof category.id !== "string" ||
    !["queued", "researching", "validating", "ready", "error"].includes(
      category.status,
    ) ||
    !Array.isArray(category.questions)
  )
    throw new Error("O serviço retornou uma categoria inválida.");
  return category;
}
export function startResearch(category: Category) {
  return request("/api/categories", { id: category.id, name: category.name });
}
export function researchStatus(id: string) {
  return request(`/api/categories/${encodeURIComponent(id)}`);
}
export function canPlay(category: Category) {
  return !category.status || category.status === "ready";
}
export function generationLabel(category: Category) {
  return (
    {
      "awaiting-questions": "Aguardando perguntas",
      queued: "Pesquisa solicitada",
      researching: "Pesquisando o tema",
      validating: "Conferindo fontes e respostas",
      ready: "Pronta para duelos",
      error: "Geração não concluída",
    } as const
  )[category.status ?? "ready"];
}
