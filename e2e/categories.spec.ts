import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.route("**/api/categories", (route) =>
    route.fulfill({
      status: 503,
      json: { error: "Serviço de IA precisa de uma chave de API configurada." },
    }),
  );
});

for (const width of [390, 1280])
  test(`categoria criada imediatamente, persistida e sem duplicatas em ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto("/#categories");
    await page.getByLabel("Buscar categorias").fill("Mitologia nórdica");
    await expect(page.locator(".category-card")).toHaveCount(0);
    await page.getByRole("button", { name: "Criar categoria" }).click();
    const dialog = page.getByRole("dialog");
    await page.getByLabel("Nome da categoria", { exact: true }).fill("   ");
    await dialog.getByRole("button", { name: "Criar categoria" }).click();
    await expect(dialog.getByRole("alert")).toContainText("3 a 60 caracteres");
    await page
      .getByLabel("Nome da categoria", { exact: true })
      .fill("  Mitologia   nórdica  ");
    await dialog.getByRole("button", { name: "Criar categoria" }).click();
    await expect(dialog).toHaveCount(0);
    await expect(page.getByLabel("Buscar categorias")).toHaveValue("");
    const card = page
      .locator(".category-card")
      .filter({ hasText: "Mitologia nórdica" });
    await expect(card).toHaveCount(1);
    await expect(card).toHaveAttribute("aria-pressed", "true");
    await expect(card).toContainText("Geração não concluída");
    await page.getByRole("button", { name: "Ver disponibilidade" }).click();
    await expect(page.getByRole("alert")).toContainText(
      "chave de API configurada",
    );
    await expect(page.locator(".question-card")).toHaveCount(0);
    await page.reload();
    await expect(card).toHaveCount(1);
    await page.getByRole("button", { name: "Criar categoria" }).click();
    await page
      .getByLabel("Nome da categoria", { exact: true })
      .fill("MITOLOGIA NORDICA");
    await dialog.getByRole("button", { name: "Criar categoria" }).click();
    await expect(page.locator(".category-card")).toHaveCount(7);
    await expect(card).toHaveAttribute("aria-pressed", "true");
    await page.getByRole("button", { name: "Criar categoria" }).click();
    await page
      .getByLabel("Nome da categoria", { exact: true })
      .fill("  HISTORIA  ");
    await dialog.getByRole("button", { name: "Criar categoria" }).click();
    await expect(page.locator(".category-card")).toHaveCount(7);
    await expect(
      page.locator(".category-card").filter({ hasText: "Viagem no tempo" }),
    ).toHaveAttribute("aria-pressed", "true");
    await expect(
      page.getByRole("button", { name: "Buscar duelo" }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  });
