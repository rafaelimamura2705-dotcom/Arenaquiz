import { test, expect } from "@playwright/test";
import { questions } from "../src/data/demo";
test("criação inicia a pesquisa e habilita o duelo automaticamente após validação", async ({
  page,
}) => {
  let id = "",
    polls = 0,
    started = 0;
  const response = (status: string) => ({
    category: {
      id,
      name: "Astronomia",
      status,
      message:
        status === "ready"
          ? "Perguntas aprovadas. Categoria habilitada para duelos."
          : "Pesquisando e conferindo fontes.",
      scope: "Tema de teste de integração.",
      validatedAt: status === "ready" ? new Date().toISOString() : null,
      questions:
        status === "ready"
          ? questions
              .filter((q) => q.categoryId === "science")
              .map((q) => ({ ...q, id: `${id}-${q.id}`, categoryId: id }))
          : [],
    },
  });
  await page.route("**/api/categories", async (route) => {
    started++;
    id = route.request().postDataJSON().id;
    await route.fulfill({ status: 202, json: response("researching") });
  });
  await page.route("**/api/categories/custom-*", async (route) => {
    polls++;
    await route.fulfill({
      json: response(polls === 1 ? "validating" : "ready"),
    });
  });
  await page.goto("/#categories");
  await page.getByRole("button", { name: "Criar categoria" }).click();
  await page
    .getByLabel("Nome da categoria", { exact: true })
    .fill("Astronomia");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Criar categoria" })
    .click();
  const card = page.locator(".category-card").filter({ hasText: "Astronomia" });
  await expect(card).toContainText("Pesquisando o tema");
  await expect(
    page.getByRole("button", { name: "Ver disponibilidade" }),
  ).toBeVisible();
  await expect(card).toContainText("Conferindo fontes e respostas");
  await expect(
    page.getByRole("button", { name: "Buscar duelo" }),
  ).toBeVisible();
  expect(started).toBe(1);
  await page.reload();
  await card.click();
  await expect(
    page.getByRole("button", { name: "Buscar duelo" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Buscar duelo" }).click();
  await page.getByRole("button", { name: "Estou pronto", exact: true }).click();
  await expect(page.locator(".question-content h1")).toHaveText(
    "Qual planeta é conhecido como planeta vermelho?",
  );
});
test("erro do agente mantém a categoria criada e permite tentar novamente", async ({
  page,
}) => {
  await page.route("**/api/categories", (route) =>
    route.fulfill({
      status: 503,
      json: { error: "Configure a chave de API no servidor." },
    }),
  );
  await page.goto("/#categories");
  await page.getByRole("button", { name: "Criar categoria" }).click();
  await page
    .getByLabel("Nome da categoria", { exact: true })
    .fill("Astronomia");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Criar categoria" })
    .click();
  await expect(
    page.getByRole("button", { name: "Pesquisar e gerar perguntas" }),
  ).toBeVisible();
  await expect(page.locator(".screen-categories")).toContainText(
    "Configure a chave de API no servidor.",
  );
  await expect(page.getByRole("button", { name: "Buscar duelo" })).toHaveCount(
    0,
  );
});
