import { test, expect } from "@playwright/test";

test("compiled engine loads, simulation dispatches, saves and restores after refresh", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Command centre." }),
  ).toBeVisible();
  const wasm = await page.request.get("/wasm/game.wasm");
  expect(wasm.headers()["content-type"]).toContain("application/wasm");
  expect((await wasm.body()).subarray(0, 4).toString("hex")).toBe("0061736d");
  await page
    .getByRole("button", { name: "Start simulation", exact: true })
    .click();
  await page.getByRole("button", { name: "Dispatch rescue unit" }).click();
  await expect(page.getByText("Mission in progress")).toBeVisible();
  await page.getByRole("button", { name: "Pause simulation" }).click();
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Command centre." }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Load operation", exact: true })
    .click();
  await expect(page.getByText("Mission in progress")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Resume simulation" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Change simulation speed" }).click();
  await page.getByRole("button", { name: "Change simulation speed" }).click();
  await page.getByRole("button", { name: "Resume simulation" }).click();
  await expect(page.getByText(/safely delivered/)).toBeVisible({
    timeout: 15000,
  });
  await page.getByRole("button", { name: "Pause simulation" }).click();
  for (const name of [
    "Rescue fleet",
    "Civilians",
    "Missions",
    "Facilities",
    "Pathfinder",
    "Analytics",
  ]) {
    await page.locator("nav").getByRole("button", { name }).click();
    await expect(page.locator("h1")).toBeVisible();
  }
  expect(errors).toEqual([]);
});

test("Dijkstra draws an actual C++ route and rejects blocked cells", async ({
  page,
}) => {
  await page.goto("/#Pathfinder");
  await expect(
    page.getByRole("heading", { name: "Dijkstra pathfinder." }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Calculate route" }).click();
  await expect(page.getByText("Optimal route found")).toBeVisible();
  await page.getByLabel("Start cell", { exact: true }).fill("16");
  await page.getByRole("button", { name: "Calculate route" }).click();
  await expect(page.getByText("No reachable route")).toBeVisible();
});

test("restart resets the operation only after confirmation", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Command centre." }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Start simulation", exact: true })
    .click();
  await page.getByRole("button", { name: "Dispatch rescue unit" }).click();
  await page
    .getByRole("button", { name: "Restart simulation", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page
    .getByRole("button", { name: "Restart operation", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Start simulation", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Ready to deploy", { exact: false }),
  ).toBeVisible();
});

test("mobile command centre has working navigation and no horizontal overflow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Command centre." }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Open menu" }).click();
  await page
    .locator("nav")
    .getByRole("button", { name: "Civilians", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "People, not just coordinates." }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("seven levels load real scenario rules", async ({ page }) => {
  await page.goto("/#Mission%20levels");
  await expect(
    page.getByRole("heading", { name: "Mission levels." }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Load level [1-7]/ }),
  ).toHaveCount(7);
  await page.getByRole("button", { name: "Load level 3", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Command centre." }),
  ).toBeVisible();
  await expect(
    page.getByText("CRITICAL WINDOW", { exact: true }),
  ).toBeVisible();
  await expect(page.locator(".operation-strip strong")).toHaveText("01:40");
  await page
    .locator("nav")
    .getByRole("button", { name: "Mission levels", exact: true })
    .click();
  await expect(page.getByText(/Deliver every critical civilian/)).toBeVisible();
});

test("create, share, import and save a custom friend mission", async ({
  page,
}) => {
  await page.goto("/#Mission%20levels");
  await page.getByRole("tab", { name: "Create for a friend" }).click();
  await page
    .getByLabel("Mission name", { exact: true })
    .fill("Rescue from a friend");
  await page.getByRole("button", { name: "Edit cell 65", exact: true }).click();
  await page
    .getByRole("button", { name: "Create share code", exact: true })
    .click();
  const code = await page.getByLabel("Shareable mission code").inputValue();
  expect(code).toMatch(/^RC1\./);
  await page.getByRole("tab", { name: "Play a friend’s code" }).click();
  await page.getByLabel("Friend’s mission code").fill(code);
  await page.getByRole("button", { name: "Validate & load challenge" }).click();
  await expect(
    page.getByRole("heading", { name: "Command centre." }),
  ).toBeVisible();
  await expect(
    page.getByText("RESCUE FROM A FRIEND", { exact: true }),
  ).toBeVisible();
  await expect(page.locator(".stat-card").first()).toContainText("/ 03");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Command centre." }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Load operation", exact: true })
    .click();
  await expect(
    page.getByText("RESCUE FROM A FRIEND", { exact: true }),
  ).toBeVisible();
});

test("bad friend codes are rejected without replacing the game", async ({
  page,
}) => {
  await page.goto("/#Mission%20levels");
  await page.getByRole("tab", { name: "Play a friend’s code" }).click();
  await page.getByLabel("Friend’s mission code").fill("broken");
  await page.getByRole("button", { name: "Validate & load challenge" }).click();
  await expect(page.getByRole("status")).toContainText("Paste a complete RC1.");
  await expect(
    page.getByText("Operation Ground Zero", { exact: true }),
  ).toBeVisible();
});

test("mission builder fits a mobile viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/#Mission%20levels");
  await page.getByRole("tab", { name: "Create for a friend" }).click();
  await expect(
    page.getByRole("group", { name: "Mission editor grid" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
