import { expect, test } from "@playwright/test";

// Hidden icon labels must not enlarge the document beyond the visible footer.
test.describe("footer scroll boundary @smoke", () => {
  for (const width of [390, 768, 1366, 1920]) {
    test(`ends the page at the footer at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 844 });
      for (const route of ["/", "/products"]) {
        await page.goto(route);
        const footer = page.getByRole("contentinfo");
        for (const name of ["Instagram", "YouTube"]) {
          const link = footer.getByRole("link", { name });
          await expect(link).toBeVisible();
          await link.focus();
          await expect(link).toBeFocused();
          await page.evaluate(() => {
            window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "instant" });
          });
          await expect
            .poll(() =>
              footer.evaluate((element) => {
                const bottom = element.getBoundingClientRect().bottom + window.scrollY;
                return document.documentElement.scrollHeight - bottom;
              }),
            )
            .toBeLessThanOrEqual(1);
        }
      }
    });
  }
});
