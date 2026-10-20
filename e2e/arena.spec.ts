import { test, expect, type Page } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.route("**/api/categories", (route) =>
    route.fulfill({
      status: 503,
      json: { error: "Serviço de IA precisa de uma chave de API configurada." },
    }),
  );
});
import { questions } from "../src/data/demo";
async function enterDuel(page: Page) {
  await page.goto("/#categories");
  await page.getByRole("button", { name: "Buscar duelo" }).click();
  await expect(
    page.getByRole("heading", { name: "Adversário encontrado!" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Estou pronto", exact: true }).click();
  await expect(page.locator(".question-card")).toBeVisible();
}
async function playRound(page: Page, win = true) {
  for (let i = 0; i < 3; i++) {
    const text = await page.locator(".question-content h1").innerText();
    const q = questions.find((q) => q.prompt === text)!;
    await page
      .locator(".answer")
      .nth(win ? q.correctIndex : (q.correctIndex + 1) % 4)
      .click();
    await page.getByRole("button", { name: "Confirmar resposta" }).click();
    await expect(page.locator(".answer-feedback")).toBeVisible();
    await page.getByRole("button", { name: "Continuar", exact: true }).click();
  }
  await expect(page.locator(".round-panel")).toBeVisible();
}
test("duelo completo em 2x0, estatísticas persistentes e estoque sem repetição", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await enterDuel(page);
  await playRound(page);
  await page.getByRole("button", { name: "Ir para a 2ª partida" }).click();
  await playRound(page);
  await expect(page.locator(".duel-tally")).toContainText("2 × 0");
  await page.getByRole("button", { name: "Ver resultado final" }).click();
  await expect(
    page.getByRole("heading", { name: "Duelo vencido!" }),
  ).toBeVisible();
  await expect(page.locator(".final-score")).toContainText("2 : 0");
  await page.getByRole("button", { name: "Ver meu histórico" }).click();
  await expect(
    page.locator(".screen-history .result-list").first().locator(".result-row"),
  ).toHaveCount(1);
  await expect(
    page.locator(".screen-history .result-list").first(),
  ).toContainText("6/6 acertos");
  await page.reload();
  await expect(
    page.locator(".screen-history .result-list").first().locator(".result-row"),
  ).toHaveCount(1);
  await page.getByRole("button", { name: "Categorias", exact: true }).click();
  await page.getByRole("button", { name: "Buscar duelo" }).click();
  await expect(page.getByRole("alert")).toContainText(
    "O estoque de perguntas inéditas",
  );
  const saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("arena-quiz-demo-v1")!),
  );
  expect(new Set(saved.seen["local-player"]).size).toBe(6);
  expect(saved.results[0]).not.toHaveProperty("answers");
  expect(saved.results[0]).not.toHaveProperty("prompt");
  expect(errors).toEqual([]);
});
test("duelo em 1x1 exige especialista e termina em 2x1", async ({ page }) => {
  await enterDuel(page);
  await playRound(page);
  await page.getByRole("button", { name: "Ir para a 2ª partida" }).click();
  await playRound(page, false);
  await expect(page.locator(".duel-tally")).toContainText("1 × 1");
  await page.getByRole("button", { name: "Ir para a 3ª partida" }).click();
  await expect(page.locator(".arena-meta")).toContainText("especialista");
  await playRound(page);
  await page.getByRole("button", { name: "Ver resultado final" }).click();
  await expect(page.locator(".final-score")).toContainText("2 : 1");
});
test("cadastro e login simulados, avatar, busca, criação de categoria e filtros de ranking", async ({
  page,
}) => {
  await page.goto("/#auth");
  await page.getByLabel("Nome na arena").fill("Cora");
  await page.getByLabel("E-mail fictício").fill("cora@example.com");
  await page.getByLabel("Senha fictícia").fill("apenas-demo");
  await page.getByRole("button", { name: "Começar minha jornada" }).click();
  await expect(page.locator(".screen-categories")).toBeVisible();
  await page.getByLabel("Buscar categorias").fill("ciencia");
  await expect(page.locator(".category-card")).toHaveCount(1);
  await expect(
    page.getByText("Não encontrou seu tema?", { exact: false }),
  ).toHaveCount(0);
  await page.getByLabel("Buscar categorias").fill("categoria inexistente");
  await expect(page.locator(".category-card")).toHaveCount(0);
  await expect(
    page.getByText("Não encontrou seu tema?", { exact: false }),
  ).toBeVisible();
  await page.getByLabel("Limpar busca").click();
  await expect(page.locator(".category-card")).toHaveCount(6);
  await page.getByRole("button", { name: "Criar categoria" }).click();
  await page
    .getByLabel("Nome da categoria", { exact: true })
    .fill("Mitologia nórdica");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Criar categoria" })
    .click();
  const created = page
    .locator(".category-card")
    .filter({ hasText: "Mitologia nórdica" });
  await expect(created).toBeVisible();
  await expect(created).toHaveAttribute("aria-pressed", "true");
  await expect(created).toContainText("Geração não concluída");
  await expect(page.locator(".category-card")).toHaveCount(7);
  await page.reload();
  await expect(created).toBeVisible();
  await page.getByRole("button", { name: "Meu perfil" }).click();
  await expect(
    page.getByRole("heading", { name: "Cora", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Usar avatar 🦉" }).click();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Usar avatar 🦉" }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Editar nome / Entrar" }).click();
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await page.getByLabel("Nome na arena").fill("Cora de volta");
  await page.getByLabel("E-mail fictício").fill("cora@example.com");
  await page.getByLabel("Senha fictícia").fill("ficticia");
  await page
    .getByRole("button", { name: "Entrar na arena", exact: true })
    .click();
  await page.getByRole("button", { name: "Ranking", exact: true }).click();
  const initial = await page.locator(".place-1 p").innerText();
  await page.getByRole("button", { name: "Este mês" }).click();
  await expect(page.locator(".place-1 p")).not.toHaveText(initial);
  await page.getByLabel("Categoria", { exact: true }).selectOption("science");
  await expect(page.locator(".screen-ranking>.fine-print")).toContainText(
    "Ciência",
  );
  const storage = await page.evaluate(() =>
    localStorage.getItem("arena-quiz-demo-v1"),
  );
  expect(storage).not.toContain("cora@example.com");
  expect(storage).not.toContain("ficticia");
});
test("relógio expira sem resposta e questões exibidas não voltam após recarregar", async ({
  page,
}) => {
  await enterDuel(page);
  const question = await page.locator(".question-content h1").innerText();
  await page.clock.install();
  await page.clock.fastForward(26000);
  await expect(
    page.getByRole("status").filter({ hasText: "O tempo acabou!" }),
  ).toBeVisible();
  await expect(page.locator(".answer-feedback")).toContainText(
    "Resposta correta",
  );
  await page.reload();
  await expect(page.locator(".screen-home")).toBeVisible();
  await page
    .getByRole("button", { name: "Entrar na arena", exact: true })
    .click();
  await page.getByRole("button", { name: "Buscar duelo" }).click();
  await page.getByRole("button", { name: "Estou pronto", exact: true }).click();
  await expect(page.locator(".question-content h1")).not.toHaveText(question);
});
test("quem não confirma volta às categorias e precisa de novo pareamento", async ({
  page,
}) => {
  await page.goto("/#categories");
  await page.getByRole("button", { name: "Buscar duelo" }).click();
  await expect(
    page.getByRole("heading", { name: "Adversário encontrado!" }),
  ).toBeVisible();
  await page.clock.install();
  await page.clock.fastForward(31000);
  await expect(page.locator(".screen-categories")).toBeVisible();
  await page.getByRole("button", { name: "Buscar duelo" }).click();
  await page.clock.fastForward(2300);
  await expect(
    page.getByRole("button", { name: "Estou pronto", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".question-card")).toHaveCount(0);
});
for (const width of [390, 1280])
  test(`layout responsivo ${width}px, navegação e telas sem rolagem horizontal`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: "Sua mente. Sua melhor arma." }),
    ).toBeVisible();
    await page.screenshot({
      path: `/tmp/arenaquiz-home-${width}.png`,
      fullPage: true,
    });
    for (const route of [
      "categories",
      "auth",
      "profile",
      "history",
      "ranking",
    ]) {
      await page.goto(`/#${route}`);
      await expect(page.locator(`.screen-${route}`)).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
    }
    if (width < 600) {
      await page.getByRole("button", { name: "Abrir menu" }).click();
      await page.getByRole("button", { name: "Início", exact: true }).click();
      await expect(page.locator(".screen-home")).toBeVisible();
    }
  });

test("duelo no celular mantém arena e resultados dentro da tela", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await enterDuel(page);
  await page.screenshot({
    path: "/tmp/arenaquiz-arena-mobile.png",
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await playRound(page);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Ir para a 2ª partida" }).click();
  await playRound(page);
  await page.getByRole("button", { name: "Ver resultado final" }).click();
  await expect(
    page.getByRole("heading", { name: "Duelo vencido!" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
