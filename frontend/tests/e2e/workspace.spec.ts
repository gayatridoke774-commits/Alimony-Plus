import { test, expect } from "@playwright/test";
test("dashboard renders and all workspace routes are usable", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/dashboard");
  await expect(
    page.getByRole("heading", { name: "Good morning, Meera." }),
  ).toBeVisible();
  await expect(page.getByText("₹20,000", { exact: true })).toBeVisible();
  await page.screenshot({
    path: "test-results/dashboard-desktop.png",
    fullPage: true,
  });
  for (const route of [
    "cases",
    "orders",
    "payments",
    "documents",
    "calculator",
    "data-review",
    "help",
    "settings",
  ]) {
    await page.goto(`/${route}`);
    await expect(page.locator("h1")).toBeVisible();
  }
  expect(errors).toEqual([]);
});
test("logging a partial payment changes the ledger and demo reset restores it", async ({
  page,
}) => {
  await page.goto("/payments");
  await page.getByRole("button", { name: "Log payment", exact: true }).click();
  await page.getByLabel("Amount received (₹)").fill("5000");
  await page.getByLabel("Received on").fill("2026-10-09");
  await page.getByLabel("Payment covers").fill("2026-10");
  await page.getByRole("button", { name: "Save record", exact: true }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(
    page.getByText("₹15,000", { exact: true }).first(),
  ).toBeVisible();
  const october = page.getByRole("row").filter({ hasText: "October 2026" });
  await expect(october).toContainText("₹5,000");
  await expect(october).toContainText("Partially paid");
  await page.getByRole("link", { name: "Settings & privacy" }).click();
  await page.getByRole("button", { name: "Reset demo", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Reset demo", exact: true })
    .click();
  await page.getByRole("link", { name: "Maintenance", exact: true }).click();
  await expect(
    page.getByRole("row").filter({ hasText: "October 2026" }),
  ).toContainText("Overdue");
});
test("case to proceeding to order workflow remains connected across navigation", async ({
  page,
}) => {
  await page.goto("/cases");
  await page.getByRole("button", { name: "New case", exact: true }).click();
  await page.getByLabel("Case title").fill("Synthetic test case");
  await page.getByRole("button", { name: "Save record" }).click();
  await expect(
    page.getByRole("heading", { name: "Synthetic test case" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Add proceeding", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByLabel("Case", { exact: true })
    .selectOption({ label: "Synthetic test case" });
  await page.getByLabel("Court / forum").fill("Test court");
  await page.getByLabel("Case number / CNR").fill("TEST-001");
  await page.getByLabel("Proceeding type").fill("Test maintenance");
  await page.getByLabel("Filing date").fill("2026-10-01");
  await page.getByRole("button", { name: "Save record" }).click();
  await page.getByRole("link", { name: "Court orders", exact: true }).click();
  await page.getByRole("button", { name: "Record order" }).click();
  await page
    .getByLabel("Proceeding", { exact: true })
    .selectOption({ label: "TEST-001 · Test court" });
  await page.getByLabel("Order type", { exact: true }).fill("Test order");
  await page.getByLabel("Order date").fill("2026-10-02");
  await page.getByLabel("Ordered amount (₹)").fill("2000");
  await page.getByRole("button", { name: "Save record" }).click();
  await expect(
    page.getByRole("heading", { name: "Test order", exact: true }),
  ).toBeVisible();
});
test("source review preserves unknown values in exported JSON", async ({
  page,
}) => {
  await page.goto("/data-review");
  await page.getByRole("button", { name: "Add record" }).click();
  await page.getByLabel("Title", { exact: true }).fill("Unknown income test");
  await page.getByLabel("Evidence / provenance").fill("Not provided");
  await page.getByLabel("Certainty").selectOption("Unknown");
  await expect(page.getByLabel("Amount (₹)", { exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "Save structured record" }).click();
  await expect(
    page.getByRole("row").filter({ hasText: "Unknown income test" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Export JSON" }).click();
  const pending = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Export records", exact: true })
    .click();
  const download = await pending;
  expect(download.suggestedFilename()).toBe(
    "alimony-plus-structured-data.json",
  );
  const stream = await download.createReadStream();
  let text = "";
  for await (const chunk of stream!) text += chunk.toString();
  const json = JSON.parse(text);
  expect(
    json.records.find(
      (r: { title: string }) => r.title === "Unknown income test",
    ).numericValue,
  ).toBeNull();
});
test("calculator shows scenarios and clears stale output after edits", async ({
  page,
}) => {
  await page.goto("/calculator");
  await page
    .getByRole("button", { name: "Calculate planning scenarios" })
    .click();
  await expect(
    page.getByText("₹19,000", { exact: false }).first(),
  ).toBeVisible();
  await page.getByLabel("Your monthly income", { exact: true }).fill("10000");
  await expect(page.getByText("Baseline planning amount")).not.toBeVisible();
});
test("mobile navigation, overflow and dialog keyboard behavior", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/dashboard");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/dashboard-mobile.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Open navigation" }).click();
  await page.getByRole("link", { name: "My cases", exact: false }).click();
  await expect(page.locator("h1")).toHaveText("Every case. One clear view.");
  await page.getByRole("button", { name: "New case", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(
    page.getByRole("button", { name: "New case", exact: true }),
  ).toBeFocused();
});
test("backend failure is visible and unauthenticated API access is rejected", async ({
  page,
  request,
}) => {
  const response = await request.get("/api/backend/cases");
  expect(response.status()).toBe(401);
  await page.route("**/api/backend/auth/login", (route) =>
    route.fulfill({
      status: 503,
      json: { message: "The case service is unavailable." },
    }),
  );
  await page.goto("/login");
  await page.getByLabel("Email address").fill("synthetic@example.com");
  await page.getByLabel("Password", { exact: true }).fill("synthetic-password");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.locator(".form-error")).toContainText("unavailable");
  await expect(page).toHaveURL(/login/);
});
