import { expect, test } from "../fixtures/test";

test.describe("Dashboard and Authenticated User Experience", () => {
  const testUser = {
    email: "dashboardtest@example.com",
    password: "testpassword123",
    name: "Dashboard Test User",
  };

  test.beforeEach(async ({ page, serverUrl }) => {
    // Sign up and sign in a test user before each test
    await page.goto(`${serverUrl}/signup`);
    await page.waitForLoadState("networkidle");

    await page.fill('input[name="name"]', testUser.name);
    await page.fill('input[name="email"]', testUser.email);
    await page.fill('input[name="password"]', testUser.password);
    await page.fill('input[name="confirmPassword"]', testUser.password);
    await page.click('button[type="submit"]');

    // Wait for redirect to dashboard
    await page.waitForURL(`${serverUrl}/`);
    await page.waitForLoadState("networkidle");
  });

  test("dashboard displays correctly for authenticated users", async ({
    page,
  }) => {
    // Check dashboard heading
    await expect(page.locator("h1")).toContainText("Dashboard");

    // Check welcome message
    await expect(page.locator("h2")).toContainText("Welcome to Your Dashboard");

    // Check description text
    await expect(page.locator("p")).toContainText(
      "Your time tracking hub is ready",
    );

    // Check coming soon section
    await expect(page.locator("text=Coming Soon: Phase 2")).toBeVisible();
    await expect(
      page.locator("text=detailed weekly time summaries"),
    ).toBeVisible();
  });

  test("user menu is visible and functional", async ({ page }) => {
    // Check user menu button exists
    const userMenuButton = page.locator('button[aria-label="User menu"]');
    await expect(userMenuButton).toBeVisible();

    // Click user menu
    await userMenuButton.click();

    // Check menu items
    await expect(page.locator('button:has-text("Sign out")')).toBeVisible();

    // Test sign out
    await page.click('button:has-text("Sign out")');
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
    const userMenuButton = page.locator('button[aria-label="User menu"]');
    await expect(userMenuButton).toBeVisible();
  });

  test("dashboard styling and layout are correct", async ({ page }) => {
    // Check main dashboard container
    const dashboardContainer = page.locator(".min-h-screen.bg-linear-to-br");
    await expect(dashboardContainer).toBeVisible();

    // Check main content area
    const mainContent = page.locator(".max-w-7xl.mx-auto");
    await expect(mainContent).toBeVisible();

    // Check dashboard card
    const dashboardCard = page.locator(".bg-white.rounded-xl");
    await expect(dashboardCard).toBeVisible();

    // Check welcome icon
    const welcomeIcon = page.locator(".bg-indigo-50.w-20.h-20");
    await expect(welcomeIcon).toBeVisible();
  });

  test("dashboard is responsive on different screen sizes", async ({
    page,
  }) => {
    // Test mobile view
    await page.setViewportSize({ width: 375, height: 667 });
    await page.reload();
    await page.waitForLoadState("networkidle");

    await expect(page.locator("h1")).toContainText("Dashboard");
    await expect(page.locator("h2")).toContainText("Welcome to Your Dashboard");

    // Test tablet view
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.reload();
    await page.waitForLoadState("networkidle");

    await expect(page.locator("h1")).toContainText("Dashboard");

    // Test desktop view
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.reload();
    await page.waitForLoadState("networkidle");

    await expect(page.locator("h1")).toContainText("Dashboard");
  });

  test("authenticated user cannot access signup page", async ({
    page,
    serverUrl,
  }) => {
    // Try to navigate to signup while authenticated
    await page.goto(`${serverUrl}/signup`);
    await page.waitForLoadState("networkidle");

    // Should be redirected away from signup (likely to dashboard)
    // The exact behavior depends on the app's routing logic
    const currentUrl = page.url();
    expect(currentUrl).not.toBe(`${serverUrl}/signup`);
  });

  test("authenticated user cannot access signin page", async ({
    page,
    serverUrl,
  }) => {
    // Try to navigate to signin while authenticated
    await page.goto(`${serverUrl}/signin`);
    await page.waitForLoadState("networkidle");

    // Should be redirected away from signin (likely to dashboard)
    const currentUrl = page.url();
    expect(currentUrl).not.toBe(`${serverUrl}/signin`);
  });

  test("session persists across page reloads", async ({ page }) => {
    // Reload the page
    await page.reload();
    await page.waitForLoadState("networkidle");

    // Should still see dashboard (session persisted)
    await expect(page.locator("h1")).toContainText("Dashboard");
    await expect(page.locator("h2")).toContainText("Welcome to Your Dashboard");

    // User menu should still be visible
    const userMenuButton = page.locator('button[aria-label="User menu"]');
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
    await expect(page.locator("h1")).toContainText("Dashboard");
    await expect(page.locator(".bg-white.rounded-xl")).toBeVisible();
  });

  test("coming soon section displays correctly", async ({ page }) => {
    // Check coming soon card
    const comingSoonCard = page.locator(".bg-linear-to-r.from-blue-50");
    await expect(comingSoonCard).toBeVisible();

    // Check coming soon heading
    await expect(page.locator("text=Coming Soon: Phase 2")).toBeVisible();

    // Check feature descriptions
    await expect(
      page.locator("text=detailed weekly time summaries"),
    ).toBeVisible();
    await expect(page.locator("text=granular project tracking")).toBeVisible();
    await expect(
      page.locator("text=smart overtime calculations"),
    ).toBeVisible();

    // Check rocket icon
    const rocketIcon = page.locator(".text-blue-600");
    await expect(rocketIcon).toBeVisible();
  });
});
