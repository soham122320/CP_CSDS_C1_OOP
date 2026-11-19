import { test, expect } from "@playwright/test";
const fresh = {
  version: 1,
  coins: 0,
  owned: [0],
  selected: 0,
  completed: {},
  livery: {
    color: "#e5f4ed",
    name: "RESCUE 01",
    decal: "MEDIC",
    lights: "alternate",
  },
};
test("3D station loads the small C++ WASM and real keyboard controls work", async ({
  page,
}) => {
  test.setTimeout(90000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "The city calls. You answer." }),
  ).toBeVisible();
  const start = page.getByRole("button", { name: "Start your shift" });
  await expect(start).toBeEnabled({ timeout: 20000 });
  await expect(page.locator(".city-preview canvas")).toBeVisible();
  const wasm = await page.request.get("/wasm/driving.wasm");
  expect(wasm.headers()["content-type"]).toContain("application/wasm");
  expect((await wasm.body()).subarray(0, 4).toString("hex")).toBe("0061736d");
  await start.click();
  await expect(page.locator(".gaming-shell")).toBeVisible();
  await expect(page.locator(".game-canvas canvas")).toBeVisible();
  await page.keyboard.down("ArrowUp");
  await expect
    .poll(
      async () =>
        Number(
          (await page.locator(".speed-number").innerText()).split("\n")[0],
        ),
      { timeout: 15000 },
    )
    .toBeGreaterThan(0);
  await page.keyboard.up("ArrowUp");
  await page.keyboard.down(" ");
  await expect
    .poll(
      async () =>
        Number(
          (await page.locator(".speed-number").innerText()).split("\n")[0],
        ),
      { timeout: 15000 },
    )
    .toBe(0);
  await page.keyboard.up(" ");
  await page.getByRole("button", { name: "Toggle siren" }).click();
  await expect(page.getByRole("button", { name: "Toggle siren" })).toHaveClass(
    /active/,
  );
  await page.keyboard.press("e");
  await expect(page.getByText("ON FOOT", { exact: true })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("heading", { name: "Your city can wait." }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Return to station" }).click();
  await expect(start).toBeVisible();
  expect(errors).toEqual([]);
});

test("levels are sequentially locked and restored progression unlocks the next level", async ({
  page,
}) => {
  test.setTimeout(60000);
  await page.goto("/");
  await page.getByRole("button", { name: "Levels", exact: true }).click();
  await expect(page.locator(".campaign-card")).toHaveCount(7);
  await expect(
    page.locator(".campaign-card").nth(1).getByRole("button"),
  ).toBeDisabled();
  await page.evaluate(
    (p) => localStorage.setItem("rescue-drive-profile", JSON.stringify(p)),
    { ...fresh, coins: 1000, completed: { 1: { stars: 3, time: 160 } } },
  );
  await page.reload();
  await page.getByRole("button", { name: "Levels", exact: true }).click();
  await expect(
    page.locator(".campaign-card").nth(1).getByRole("button"),
  ).toBeEnabled();
  await expect(
    page.locator(".campaign-card").nth(2).getByRole("button"),
  ).toBeDisabled();
  await expect(page.locator(".coin-pill")).toContainText("1,000");
});

test("garage purchase uses C++ policy, applies customization and persists after refresh", async ({
  page,
}) => {
  test.setTimeout(90000);
  await page.goto("/");
  await page.evaluate(
    (p) => localStorage.setItem("rescue-drive-profile", JSON.stringify(p)),
    {
      ...fresh,
      coins: 2500,
      completed: {
        1: { stars: 3, time: 100 },
        2: { stars: 2, time: 200 },
        3: { stars: 2, time: 250 },
      },
    },
  );
  await page.reload();
  await page.getByRole("button", { name: "Garage", exact: true }).click();
  await page.locator(".vehicle-card").nth(1).click();
  await page.getByRole("button", { name: "Buy for 1,500" }).click();
  await expect(page.locator(".coin-pill")).toContainText("1,000");
  await page.getByLabel("Unit name").fill("TEAM RIVER");
  await page.getByRole("button", { name: "Paint #ec8467" }).click();
  await page.reload();
  await page.getByRole("button", { name: "Garage", exact: true }).click();
  await expect(page.getByLabel("Unit name")).toHaveValue("TEAM RIVER");
  const p = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("rescue-drive-profile")!),
  );
  expect(p.selected).toBe(1);
  expect(p.owned).toContain(1);
  expect(p.coins).toBe(1000);
  expect(p.livery.color).toBe("#ec8467");
});

test("friend challenges create, import and reject corrupt driving codes", async ({
  page,
}) => {
  test.setTimeout(90000);
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "Start your shift" }),
  ).toBeEnabled();
  await page
    .getByRole("button", { name: "Friend challenges", exact: true })
    .click();
  await page.getByLabel("Challenge name").fill("A friend in need");
  await page.getByRole("button", { name: "Create share code" }).click();
  const code = await page.getByLabel("Shareable driving code").inputValue();
  expect(code).toMatch(/^RD1\./);
  await page.getByLabel("Friend’s challenge code").fill("broken");
  await page.getByRole("button", { name: "Load friend’s challenge" }).click();
  await expect(page.getByRole("status")).toContainText("Paste a complete RD1.");
  await page.getByLabel("Friend’s challenge code").fill(code);
  await page.getByRole("button", { name: "Load friend’s challenge" }).click();
  await expect(page.locator(".game-title")).toContainText("A friend in need");
  await expect(page.locator(".game-title")).toContainText("CUSTOM");
  await page.getByRole("button", { name: "Pause game" }).click();
  await page.getByRole("button", { name: "Return to station" }).click();
});

test("training and free drive are untimed and mobile menus do not overflow", async ({
  page,
}) => {
  test.setTimeout(90000);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "Start your shift" }),
  ).toBeEnabled();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Enter training ground" }).click();
  await expect(page.locator(".game-timer")).toContainText("NO TIME PRESSURE");
  await expect(
    page.getByRole("button", { name: "Accelerate", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Pause game" }).click();
  await page.getByRole("button", { name: "Return to station" }).click();
  await page.getByRole("button", { name: "Start free drive" }).click();
  await expect(page.locator(".game-timer")).toContainText("NO TIME PRESSURE");
  await page.getByRole("button", { name: "Pause game" }).click();
  await page.getByRole("button", { name: "Return to station" }).click();
  for (const name of ["Levels", "Garage", "Friend challenges"]) {
    await page.getByRole("button", { name, exact: true }).click();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
});

test("walks to a house, treats and carries a patient, drives and completes a real hospital handover", async ({
  page,
}) => {
  test.setTimeout(240000);
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "Start your shift" }),
  ).toBeEnabled();
  await page
    .getByRole("button", { name: "Friend challenges", exact: true })
    .click();
  // A nearby custom call keeps the actual keyboard-driven journey short; no game state is injected.
  await page.getByRole("button", { name: "House 7", exact: true }).click();
  await page.getByRole("button", { name: "House 11", exact: true }).click();
  await page.getByRole("button", { name: "House 15", exact: true }).click();
  await page.getByRole("button", { name: "Test your route" }).click();
  await expect(page.locator(".game-canvas canvas")).toBeVisible();
  await page.keyboard.press("e");
  await expect(page.getByText("ON FOOT", { exact: true })).toBeVisible();
  await page.keyboard.down("ArrowUp");
  await expect
    .poll(
      async () =>
        (Number(
          await page
            .locator(".game-map-wrap svg circle")
            .last()
            .getAttribute("cy"),
        ) -
          90) /
        0.82,
      { timeout: 15000, intervals: [100, 200] },
    )
    .toBeLessThan(72);
  await page.keyboard.up("ArrowUp");
  await page.keyboard.down("ArrowRight");
  await expect(
    page.getByText("E · Help this patient", { exact: true }),
  ).toBeVisible({ timeout: 40000 });
  await page.keyboard.up("ArrowRight");
  await page.keyboard.press("e");
  await expect(
    page.getByRole("heading", { name: "Let’s get them ready." }),
  ).toBeVisible();
  for (const name of [
    "Prepare the kit",
    "Secure the bandage",
    "Stabilize for transport",
  ])
    await page.getByRole("button", { name: new RegExp(name) }).click();
  await expect(page.getByText("TEAM LIFT", { exact: true })).toBeVisible();
  await page.keyboard.down("ArrowLeft");
  await expect
    .poll(
      async () =>
        (Number(
          await page
            .locator(".game-map-wrap svg circle")
            .last()
            .getAttribute("cx"),
        ) -
          90) /
        0.82,
      { timeout: 90000, intervals: [100, 200] },
    )
    .toBeLessThan(2);
  await page.keyboard.up("ArrowLeft");
  if (
    !(await page
      .getByText("E · Load patient & enter ambulance", { exact: true })
      .isVisible())
  ) {
    await page.keyboard.down("ArrowDown");
    await expect(
      page.getByText("E · Load patient & enter ambulance", { exact: true }),
    ).toBeVisible({ timeout: 15000 });
    await page.keyboard.up("ArrowDown");
  }
  await page.keyboard.press("e");
  await expect(page.getByText("ON THE ROAD", { exact: true })).toBeVisible();
  const held = new Set<string>();
  const keys = async (next: string[]) => {
    for (const key of held)
      if (!next.includes(key)) {
        await page.keyboard.up(key);
        held.delete(key);
      }
    for (const key of next)
      if (!held.has(key)) {
        await page.keyboard.down(key);
        held.add(key);
      }
  };
  let arrived = false;
  for (let i = 0; i < 220; i++) {
    const circle = page.locator(".game-map-wrap svg circle").last();
    const x = (Number(await circle.getAttribute("cx")) - 90) / 0.82,
      z = (Number(await circle.getAttribute("cy")) - 90) / 0.82;
    const d = Math.hypot(x + 28, z - 57);
    if (d < 8) {
      arrived = true;
      break;
    }
    const heading = Number(
      (await page.getByLabel("Compass heading").innerText()).split("°")[0],
    );
    const bearing = ((Math.atan2(-28 - x, 57 - z) * 180) / Math.PI + 360) % 360,
      error = ((bearing - heading + 540) % 360) - 180;
    const speed = Number(
      (await page.locator(".speed-number").innerText()).split("\n")[0],
    );
    const limit = d < 15 ? 13 : Math.abs(error) > 35 ? 16 : 28;
    const next: string[] = [speed > limit ? " " : "ArrowUp"];
    if (error > 6) next.push("ArrowLeft");
    else if (error < -6) next.push("ArrowRight");
    await keys(next);
    await page.waitForTimeout(200);
  }
  await keys([" "]);
  expect(arrived).toBe(true);
  await expect
    .poll(
      async () =>
        Number(
          (await page.locator(".speed-number").innerText()).split("\n")[0],
        ),
      { timeout: 20000 },
    )
    .toBe(0);
  await keys([]);
  await page
    .getByRole("button", { name: "Hand over patients", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "You brought hope home." }),
  ).toBeVisible({ timeout: 10000 });
  await expect(page.getByText("+0 coins", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Replay timeline")).toBeVisible();
  await page.getByLabel("Replay timeline").fill("50");
});
