import { expect, test } from "../fixtures/test";

test.describe("Dashboard and Authenticated User Experience", () => {
  const testUser = {
    email: "dashboardtest@example.com",
    password: "testpassword123",
    name: "Dashboard Test User",
  };

  test.beforeEach(async ({ page, serverUrl }, testInfo) => {
    // Sign up and sign in a test user before each test
    await page.goto(`${serverUrl}/signup`);
    await page.waitForLoadState("networkidle");

    // Fill out the signup form
    await page.getByTestId("signup-name-input").fill(testUser.name);
    const uniqueEmail = `${testUser.email.replace(
      "@",
      `+${testInfo.parallelIndex}-${Date.now()}@`,
    )}`;
    await page.getByTestId("signup-email-input").fill(uniqueEmail);
    await page.getByTestId("signup-password-input").fill(testUser.password);
    await page
      .getByTestId("signup-confirm-password-input")
      .fill(testUser.password);

    // Submit the form
    await page.getByTestId("signup-submit-button").click();

    const signupError = page.getByTestId("signup-general-error");
    const settingsUrl = `${serverUrl}/settings`;
    const dashboardUrl = new RegExp(
      `^${serverUrl.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\\\$&")}/?$`,
    );

    const signupResult = await Promise.race([
      page.waitForURL(dashboardUrl, { timeout: 10000 }).then(() => "dashboard"),
      page.waitForURL(settingsUrl, { timeout: 10000 }).then(() => "settings"),
      signupError
        .waitFor({ state: "visible", timeout: 10000 })
        .then(() => "error"),
    ]);

    if (signupResult !== "dashboard") {
      await page.goto(`${serverUrl}/signin`);
      await page.waitForLoadState("networkidle");

      // Sign in with the created user
      await page.getByTestId("signin-email-input").fill(uniqueEmail);
      await page.getByTestId("signin-password-input").fill(testUser.password);
      await page.getByTestId("signin-submit-button").click();
      await page.waitForURL(dashboardUrl);
    }
  });

  test("dashboard displays correctly for authenticated users", async ({
    page,
  }) => {
    // Check dashboard heading
    await expect(
      page.getByRole("heading", { name: "Dashboard" }),
    ).toBeVisible();

    // Check setup checklist
    await expect(page.getByText("Complete Your Setup")).toBeVisible();
    await expect(page.getByText("0 of 4 steps completed")).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Go to Settings" }),
    ).toBeVisible();
  });

  test("user menu is visible and functional", async ({ page }) => {
    // Check user menu button exists
    const userMenuButton = page.getByTestId("user-menu-button");
    await expect(userMenuButton).toBeVisible();

    // Click user menu
    await userMenuButton.click();

    // Check menu items
    await expect(page.getByTestId("user-menu-sign-out-button")).toBeVisible();

    // Test sign out
    await page.getByTestId("user-menu-sign-out-button").click();
    await page.waitForLoadState("networkidle");

    // Should be redirected to landing page
    await expect(page.locator("h1")).toContainText("Time Tracking");
  });

  test("toolbar shows user information when authenticated", async ({
    page,
  }) => {
    // Check toolbar is present
    const toolbar = page.locator("header");
    await expect(toolbar).toBeVisible();

    // Check user menu button in toolbar
    const userMenuButton = page.getByTestId("user-menu-button");
    await expect(userMenuButton).toBeVisible();
  });

  test("dashboard styling and layout are correct", async ({ page }) => {
    // Check main dashboard container
    const dashboardContainer = page.locator(".min-h-screen.bg-linear-to-br");
    await expect(dashboardContainer).toBeVisible();

    // Check main content area (more specific selector)
    const mainContent = page.locator(".max-w-2xl.mx-auto.px-4.py-8");
    await expect(mainContent).toBeVisible();

    // Check dashboard card
    const dashboardCard = page.locator(".bg-white.rounded-xl");
    await expect(dashboardCard).toBeVisible();
    await expect(page.getByText("Complete Your Setup")).toBeVisible();
  });

  test("dashboard is responsive on different screen sizes", async ({
    page,
  }) => {
    // Test mobile view
    await page.setViewportSize({ width: 375, height: 667 });
    await page.reload();
    await page.waitForLoadState("networkidle");

    await expect(
      page.getByRole("heading", { name: "Dashboard" }),
    ).toBeVisible();
    await expect(page.getByText("Complete Your Setup")).toBeVisible();

    // Test tablet view
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.reload();
    await page.waitForLoadState("networkidle");

    await expect(
      page.getByRole("heading", { name: "Dashboard" }),
    ).toBeVisible();

    // Test desktop view
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.reload();
    await page.waitForLoadState("networkidle");

    await expect(
      page.getByRole("heading", { name: "Dashboard" }),
    ).toBeVisible();
  });

  test("authenticated user can access signup page", async ({
    page,
    serverUrl,
  }) => {
    // Navigate to signup while authenticated
    const signupUrl = `${serverUrl}/signup`;
    await page.goto(signupUrl, { waitUntil: "domcontentloaded" });
    if (page.url().startsWith("chrome-error://")) {
      await page.goto(signupUrl, { waitUntil: "domcontentloaded" });
    }

    // Should be able to access signup page (app allows this)
    await expect(page).toHaveURL(/\/signup$/);

    // Should see signup form
    await expect(page.getByTestId("signup-heading")).toBeVisible();
  });

  test("authenticated user can access signin page", async ({
    page,
    serverUrl,
  }) => {
    // Navigate to signin while authenticated
    const signinUrl = `${serverUrl}/signin`;
    await page.goto(signinUrl, { waitUntil: "domcontentloaded" });
    if (page.url().startsWith("chrome-error://")) {
      await page.goto(signinUrl, { waitUntil: "domcontentloaded" });
    }

    // Should be able to access signin page (app allows this)
    await expect(page).toHaveURL(/\/signin$/);

    // Should see signin form
    await expect(page.getByTestId("signin-heading")).toBeVisible();
  });

  test("session persists across page reloads", async ({ page }) => {
    // Reload the page
    await page.reload();
    await page.waitForLoadState("networkidle");

    // Should still see dashboard (session persisted)
    await expect(
      page.getByRole("heading", { name: "Dashboard" }),
    ).toBeVisible();
    await expect(page.getByText("Complete Your Setup")).toBeVisible();

    // User menu should still be visible
    const userMenuButton = page.getByTestId("user-menu-button");
    await expect(userMenuButton).toBeVisible();
  });

  test("dashboard content loads without errors", async ({ page }) => {
    // Listen for console errors
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        errors.push(msg.text());
      }
    });

    await page.reload();
    await page.waitForLoadState("networkidle");

    // Check that no JavaScript errors occurred
    expect(errors).toHaveLength(0);

    // Check that all expected content loaded
    await expect(
      page.getByRole("heading", { name: "Dashboard" }),
    ).toBeVisible();
    await expect(page.locator(".bg-white.rounded-xl")).toBeVisible();
  });

  test("setup checklist displays correctly", async ({ page }) => {
    await expect(page.getByText("Complete Your Setup")).toBeVisible();
    await expect(page.getByText("Connect Clockify API")).toBeVisible();
    await expect(page.getByText("Select Workspace")).toBeVisible();
    await expect(page.getByText("Select Client")).toBeVisible();
    await expect(page.getByText("Configure Tracked Projects")).toBeVisible();
  });
});
