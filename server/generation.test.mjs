import { describe, it, expect, vi, afterEach } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  generateCategory,
  createResearchProvider,
  LEVELS,
} from "./generation.mjs";
import { CategoryJobs } from "./jobs.mjs";
import { createApp } from "./app.mjs";

const url = "https://example.org/verified-fixture";
const draft = {
  scope: "Escopo de teste, sem pesquisa real.",
  questions: LEVELS.flatMap((level, l) =>
    Array.from({ length: 4 }, (_, i) => ({
      id: `q${l}-${i}`,
      level,
      prompt: `Enunciado de teste ${l}-${i}`,
      options: ["A", "B", "C", "D"],
      correctIndex: i,
      source: url,
    })),
  ),
};
function checks() {
  return {
    checks: draft.questions.map((q) => ({
      id: q.id,
      approved: true,
      reason: "Aprovação fictícia usada somente no teste.",
      source: url,
      duplicateOf: null,
    })),
  };
}
function response(data, { search = true } = {}) {
  return {
    status: "completed",
    output: [
      ...(search
        ? [
            {
              type: "web_search_call",
              status: "completed",
              action: { type: "search", sources: [{ type: "url", url }] },
            },
          ]
        : []),
      {
        type: "message",
        content: [
          { type: "output_text", text: JSON.stringify(data), annotations: [] },
        ],
      },
    ],
  };
}
function provider(validation = checks()) {
  return vi
    .fn()
    .mockResolvedValueOnce(response(draft))
    .mockResolvedValueOnce(response(validation));
}
const temporary = [];
const servers = [];
afterEach(async () => {
  for (const server of servers.splice(0))
    await new Promise((resolve) => server.close(resolve));
  for (const directory of temporary.splice(0))
    await rm(directory, { recursive: true, force: true });
});
describe("pesquisa e validação independentes", () => {
  it("faz duas pesquisas separadas e só libera perguntas com fontes verificadas", async () => {
    const fake = provider(),
      phases = [];
    const result = await generateCategory({
      categoryId: "custom-test",
      name: "Tema",
      provider: fake,
      onPhase: (p) => phases.push(p),
    });
    expect(fake).toHaveBeenCalledTimes(2);
    expect(phases).toEqual(["researching", "validating"]);
    expect(result.questions).toHaveLength(12);
    expect(new Set(result.questions.map((q) => q.id)).size).toBe(12);
    expect(
      result.questions.every(
        (q) => q.categoryId === "custom-test" && q.source === url,
      ),
    ).toBe(true);
    expect(result.validationSources).toEqual([url]);
  });
  it("recusa texto sem pesquisa real na ferramenta", async () => {
    const fake = vi.fn().mockResolvedValue(response(draft, { search: false }));
    await expect(
      generateCategory({
        categoryId: "custom-test",
        name: "Tema",
        provider: fake,
      }),
    ).rejects.toMatchObject({ code: "research_missing" });
    expect(fake).toHaveBeenCalledTimes(1);
  });
  it("recusa fonte inventada que não apareceu na pesquisa", async () => {
    const bad = structuredClone(draft);
    bad.questions[0].source = "https://invented.example/fact";
    const fake = vi.fn().mockResolvedValueOnce(response(bad));
    await expect(
      generateCategory({
        categoryId: "custom-test",
        name: "Tema",
        provider: fake,
      }),
    ).rejects.toMatchObject({ code: "invalid_question" });
  });
  it("mantém a categoria bloqueada se um nível não tem três aprovações", async () => {
    const validation = checks();
    validation.checks[0].approved = false;
    validation.checks[1].approved = false;
    await expect(
      generateCategory({
        categoryId: "custom-test",
        name: "Tema",
        provider: provider(validation),
      }),
    ).rejects.toMatchObject({ code: "not_enough_approved" });
  });
  it("descarta uma duplicata semântica apontada pelo validador e aceita o mínimo de nove", async () => {
    const validation = checks();
    for (const i of [0, 4, 8])
      validation.checks[i].duplicateOf = "existing-question";
    const result = await generateCategory({
      categoryId: "custom-test",
      name: "Tema",
      provider: provider(validation),
    });
    expect(result.questions).toHaveLength(9);
    for (const level of LEVELS)
      expect(result.questions.filter((q) => q.level === level)).toHaveLength(3);
  });
  it("recusa validação incompleta ou fontes não consultadas", async () => {
    const validation = checks();
    validation.checks.pop();
    await expect(
      generateCategory({
        categoryId: "custom-test",
        name: "Tema",
        provider: provider(validation),
      }),
    ).rejects.toMatchObject({ code: "invalid_validation" });
    const invalid = checks();
    invalid.checks.forEach(
      (c) => (c.source = "https://invented.example/unseen"),
    );
    await expect(
      generateCategory({
        categoryId: "custom-test",
        name: "Tema",
        provider: provider(invalid),
      }),
    ).rejects.toMatchObject({ code: "not_enough_approved" });
  });
  it("informa falta de créditos sem retornar o corpo sensível do provedor", async () => {
    const transport = vi.fn().mockResolvedValue({ ok: false, status: 429 });
    const call = createResearchProvider({
      apiKey: "unit-test-placeholder",
      fetchImpl: transport,
    });
    await expect(
      call({ name: "test", schema: {}, instructions: "test", input: "test" }),
    ).rejects.toMatchObject({ code: "quota" });
    const body = JSON.parse(transport.mock.calls[0][1].body);
    expect(body.tools[0]).toMatchObject({
      type: "web_search",
      external_web_access: true,
    });
    expect(body.store).toBe(false);
  });
});
describe("fila e API de categorias", () => {
  it("não expõe questões antes de concluir a validação e reaproveita a mesma solicitação", async () => {
    let releaseDraft, releaseValidation;
    const fake = vi
      .fn()
      .mockImplementationOnce(
        () => new Promise((resolve) => (releaseDraft = resolve)),
      )
      .mockImplementationOnce(
        () => new Promise((resolve) => (releaseValidation = resolve)),
      );
    const jobs = new CategoryJobs({ provider: fake });
    await jobs.create("custom-test", "Tema");
    expect(jobs.get("custom-test").status).toBe("researching");
    expect(jobs.get("custom-test").questions).toEqual([]);
    await jobs.create("custom-test", "TEMA");
    expect(fake).toHaveBeenCalledTimes(1);
    releaseDraft(response(draft));
    await vi.waitFor(() =>
      expect(jobs.get("custom-test").status).toBe("validating"),
    );
    expect(jobs.get("custom-test").questions).toEqual([]);
    releaseValidation(response(checks()));
    await vi.waitFor(() =>
      expect(jobs.get("custom-test").status).toBe("ready"),
    );
    expect(jobs.get("custom-test").questions).toHaveLength(12);
  });
  it("persiste e restaura as questões já aprovadas sem chamar a IA de novo", async () => {
    const directory = await mkdtemp(join(tmpdir(), "arena-quiz-jobs-"));
    temporary.push(directory);
    const file = join(directory, "categories.json");
    const jobs = new CategoryJobs({ provider: provider(), file });
    await jobs.init();
    await jobs.create("custom-test", "Tema");
    await vi.waitFor(() =>
      expect(jobs.get("custom-test").status).toBe("ready"),
    );
    await jobs.writes;
    const restored = new CategoryJobs({ provider: null, file });
    await restored.init();
    expect(restored.get("custom-test").questions).toHaveLength(12);
    expect((await restored.create("custom-test", "Tema")).status).toBe("ready");
  });
  it("retorna erro explícito sem chave e não fabrica questões", async () => {
    const jobs = new CategoryJobs({ provider: null });
    const server = createApp({ jobs });
    servers.push(server);
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    const base = `http://127.0.0.1:${server.address().port}`;
    const health = await fetch(base + "/api/health");
    expect(await health.json()).toEqual({ ok: true, aiConfigured: false });
    const result = await fetch(base + "/api/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: "custom-test", name: "Tema" }),
    });
    expect(result.status).toBe(503);
    expect((await result.json()).error).toContain("chave de API");
    expect(jobs.get("custom-test")).toBeNull();
  });
  it("limita gerações e rejeita colisão de identificador", async () => {
    const jobs = new CategoryJobs({ provider: provider(), maxDaily: 1 });
    await jobs.create("custom-test", "Tema");
    await expect(
      jobs.create("custom-other", "Outro tema"),
    ).rejects.toMatchObject({ code: "limit" });
    await expect(
      jobs.create("custom-test", "Tema diferente"),
    ).rejects.toMatchObject({ code: "conflict" });
    await vi.waitFor(() =>
      expect(jobs.get("custom-test").status).toBe("ready"),
    );
  });
});
