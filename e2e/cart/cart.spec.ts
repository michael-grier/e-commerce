import { expect, test } from "@playwright/test";

// While the cart sheet is open the page behind it is hidden from the accessibility tree, so
// header assertions (like the cart count badge) only run after closing the sheet with Escape.
// The add button reads "Added to cart" for a moment after a click, hence the /Add(ed)?/ name.

/** Adds the first variant of the Street Deck product and waits for the cart sheet to open. */
async function addStreetDeckToCart(page: import("@playwright/test").Page): Promise<void> {
  await page.goto("/products/street-deck-825");
  // A click landing before React hydrates is silently lost, so retry the action-and-outcome
  // pair rather than allowing test-level retries (the config runs with retries: 0 on purpose).
  await expect(async () => {
    await page.getByRole("button", { name: /^Add(ed)? to cart$/ }).click();
    await expect(page.getByRole("dialog")).toBeVisible({ timeout: 2_000 });
  }).toPass({ timeout: 15_000 });
}

/** Closes the cart sheet and waits for it to be gone, so header assertions can see the page. */
async function closeCartSheet(page: import("@playwright/test").Page): Promise<void> {
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toBeHidden();
}

test.describe("cart @smoke", () => {
  test("adding a product opens the cart with the item and updates the header count", async ({
    page,
  }) => {
    await addStreetDeckToCart(page);
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByRole("heading", { name: /Street Deck 8\.25/ })).toBeVisible();
    await expect(dialog.getByText("1 item.")).toBeVisible();
    await closeCartSheet(page);
    await expect(page.getByRole("button", { name: /^Cart/ })).toContainText("1");
  });

  test("adding the same variant again merges the line instead of duplicating it", async ({
    page,
  }) => {
    await addStreetDeckToCart(page);
    await closeCartSheet(page);
    await page.getByRole("button", { name: /^Add(ed)? to cart$/ }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByText("2 items.")).toBeVisible();
    await expect(dialog.getByRole("heading", { name: /Street Deck 8\.25/ })).toHaveCount(1);
  });

  test("pending stock explains why quantity controls are disabled", async ({ page }) => {
    let releaseStock = () => {};
    const stockReady = new Promise<void>((resolve) => {
      releaseStock = resolve;
    });
    await page.route("**/api/cart/stock?*", async (route) => {
      await stockReady;
      await route.fulfill({ json: { availableQty: 12 } });
    });
    try {
      await addStreetDeckToCart(page);
      const dialog = page.getByRole("dialog");
      await expect(dialog.getByRole("status")).toHaveText("Checking stock availability.");
      await expect(dialog.getByRole("spinbutton")).toBeDisabled();
      await expect(dialog.getByRole("button", { name: /Increase quantity/ })).toBeDisabled();
      releaseStock();
      await expect(dialog.getByRole("spinbutton")).toBeEnabled();
      await expect(dialog.getByRole("status")).toBeHidden();
    } finally {
      releaseStock();
    }
  });

  test("both cart views clamp typed quantities and disable plus at current stock", async ({
    page,
  }) => {
    await addStreetDeckToCart(page);
    const dialog = page.getByRole("dialog");
    const input = dialog.getByRole("spinbutton");
    await expect(input).toBeEnabled();
    const max = Number(await input.getAttribute("max"));
    expect(max).toBe(12);
    await input.fill(String(max - 1));
    await dialog.getByRole("button", { name: /Increase quantity/ }).click();
    await expect(input).toHaveValue(String(max));
    await expect(dialog.getByRole("button", { name: /Increase quantity/ })).toBeDisabled();
    await input.fill(String(max + 20));
    await expect(input).toHaveValue(String(max));
    await expect(dialog.getByRole("status")).toContainText(`Maximum available: ${max}`);
    await dialog.getByRole("link", { name: "View cart" }).click();
    await expect(dialog).toBeHidden();
    const main = page.getByRole("main");
    const cartInput = main.getByRole("spinbutton");
    await expect(cartInput).toBeEnabled();
    await expect(main.getByRole("button", { name: /Increase quantity/ })).toBeDisabled();
    await cartInput.fill(String(max + 20));
    await expect(cartInput).toHaveValue(String(max));
    await expect(main.getByRole("status")).toContainText(`Maximum available: ${max}`);
    await main.getByRole("button", { name: /Decrease quantity/ }).click();
    await expect(cartInput).toHaveValue(String(max - 1));
    await expect(main.getByRole("button", { name: /Increase quantity/ })).toBeEnabled();
    await page.reload();
    await expect(main.getByRole("spinbutton")).toHaveValue(String(max - 1));
  });

  test("saved carts refresh stock, clamp excess, and handle sold-out or failed lookups", async ({
    page,
  }) => {
    await addStreetDeckToCart(page);
    await expect(page.getByRole("dialog").getByRole("spinbutton")).toBeEnabled();
    await page.getByRole("dialog").getByRole("spinbutton").fill("5");
    await page.route("**/api/cart/stock?*", (route) =>
      route.fulfill({ json: { availableQty: 2 } }),
    );
    await page.goto("/cart");
    const main = page.getByRole("main");
    await expect(main.getByRole("spinbutton")).toHaveValue("2");
    await expect(main.getByRole("status")).toContainText("Maximum available: 2");
    await page.route("**/api/cart/stock?*", (route) =>
      route.fulfill({ json: { availableQty: 10 } }),
    );
    await page.evaluate(() => window.dispatchEvent(new Event("focus")));
    await expect(main.getByRole("spinbutton")).toHaveAttribute("max", "10");
    await expect(main.getByRole("spinbutton")).toHaveValue("2");
    await expect(main.getByRole("status")).toBeHidden();
    await expect(main.getByRole("button", { name: /Increase quantity/ })).toBeEnabled();
    await page.route("**/api/cart/stock?*", (route) =>
      route.fulfill({ json: { availableQty: 1 } }),
    );
    await page.evaluate(() => window.dispatchEvent(new Event("focus")));
    await expect(main.getByRole("spinbutton")).toHaveAttribute("max", "1");
    await expect(main.getByRole("spinbutton")).toHaveValue("1");
    await expect(main.getByRole("status")).toContainText("Maximum available: 1");
    await expect(main.getByRole("button", { name: /Increase quantity/ })).toBeDisabled();
    await page.route("**/api/cart/stock?*", (route) =>
      route.fulfill({ json: { availableQty: 0 } }),
    );
    await page.reload();
    await expect(main.getByRole("spinbutton")).toBeDisabled();
    await expect(main.getByRole("status")).toContainText("Out of stock");
    await page.route("**/api/cart/stock?*", (route) => route.fulfill({ status: 503, json: {} }));
    await page.reload();
    await expect(main.getByRole("status")).toContainText("Unable to check stock");
    await expect(main.getByRole("button", { name: /Increase quantity/ })).toBeDisabled();
    await main.getByRole("button", { name: /Remove Street Deck/ }).click();
    await expect(main.getByText("Your cart is empty")).toBeVisible();
  });

  test("the cart survives a page reload", async ({ page }) => {
    await addStreetDeckToCart(page);
    await page.reload();
    await expect(page.getByRole("button", { name: /^Cart/ })).toContainText("1");
  });

  test("clearing the cart shows the empty state", async ({ page }) => {
    await addStreetDeckToCart(page);
    await page.getByRole("button", { name: "Clear cart" }).click();
    await expect(page.getByText("Ready when you are.")).toBeVisible();
    await closeCartSheet(page);
    await expect(page.getByRole("button", { name: /^Cart/ })).toContainText("0");
  });

  test("view cart navigates to the cart page with the persisted item", async ({ page }) => {
    await addStreetDeckToCart(page);
    // No lost-event retry here: the add-to-cart click already proved the page is hydrated, and
    // the sheet closes on this click, so the link only exists for one attempt. Production
    // navigation can finish before the close animation, so wait for both outcomes explicitly.
    await page.getByRole("dialog").getByRole("link", { name: "View cart" }).click();
    await expect(page).toHaveURL(/\/cart$/);
    await expect(page.getByRole("dialog")).toBeHidden();
    await expect(
      page.getByRole("main").getByRole("heading", { name: /Street Deck 8\.25/ }),
    ).toBeVisible();
  });

  test("local delivery requires the address-review agreement in the sidebar and cart page", async ({
    page,
  }) => {
    test.skip(
      process.env.DELIVERY_ENABLED !== "true" || !process.env.DELIVERY_AREA_NAME,
      "Local delivery is not configured in this environment.",
    );

    await addStreetDeckToCart(page);
    const dialog = page.getByRole("dialog");
    await dialog.getByText("Local delivery", { exact: true }).click();

    await expect(dialog.getByText("Address review required")).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Agree above to checkout" })).toBeDisabled();

    await dialog
      .getByRole("checkbox", { name: /I understand that my address will be reviewed/ })
      .click();
    await expect(dialog.getByRole("button", { name: "Checkout" })).toBeEnabled();

    await dialog.getByRole("link", { name: "View cart" }).click();
    await expect(page).toHaveURL(/\/cart$/);
    const cartPage = page.getByRole("main");
    const acknowledgement = cartPage.getByRole("checkbox", {
      name: /I understand that my address will be reviewed/,
    });
    await expect(cartPage.getByText("Address review required")).toBeVisible();
    await expect(acknowledgement).toHaveAttribute("data-state", "checked");

    await page.reload();
    await expect(
      cartPage.getByRole("checkbox", {
        name: /I understand that my address will be reviewed/,
      }),
    ).toHaveAttribute("data-state", "unchecked");
    await expect(cartPage.getByRole("button", { name: "Agree above to checkout" })).toBeDisabled();
  });
});
