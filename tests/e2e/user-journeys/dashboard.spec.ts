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

    // Fill out the signup form
    await page.getByTestId("signup-name-input").fill(testUser.name);
    await page.getByTestId("signup-email-input").fill(testUser.email);
    await page.getByTestId("signup-password-input").fill(testUser.password);
    await page.getByTestId("signup-confirm-password-input").fill(
      testUser.password,
    );

    // Submit the form
    await page.getByTestId("signup-submit-button").click();

    // Wait for navigation to complete
    await page.waitForLoadState("networkidle", { timeout: 5000 });

    // Check current URL
    const currentUrl = page.url();

    if (currentUrl.includes("/settings")) {
      // If redirected to settings, we need to complete Clockify setup first
      // For now, let's skip this test scenario by going back to signin
      await page.goto(`${serverUrl}/signin`);
      await page.waitForLoadState("networkidle");

      // Sign in with the created user
      await page.getByTestId("signin-email-input").fill(testUser.email);
      await page.getByTestId("signin-password-input").fill(testUser.password);
      await page.getByTestId("signin-submit-button").click();
      await page.waitForLoadState("networkidle");
    } else {
      // Wait a bit more to ensure dashboard is loaded
      await page.waitForLoadState("networkidle");
    }
  });

  test("dashboard displays correctly for authenticated users", async ({ page }) => {
    // Check dashboard heading
    await expect(page.getByTestId("dashboard-heading")).toBeVisible();

    // Check welcome message
    await expect(page.getByTestId("dashboard-welcome-message")).toBeVisible();

    // Check description text
    await expect(page.locator("p.text-gray-600")).toContainText(
      "Your time tracking hub is ready",
    );

    // Check coming soon section
    await expect(page.getByTestId("dashboard-coming-soon-section"))
      .toBeVisible();
    await expect(
      page.locator("text=detailed weekly time summaries"),
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

  test("toolbar shows user information when authenticated", async ({ page }) => {
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
    const mainContent = page.locator(".max-w-7xl.mx-auto.py-8");
    await expect(mainContent).toBeVisible();

    // Check dashboard card
    const dashboardCard = page.locator(".bg-white.rounded-xl");
    await expect(dashboardCard).toBeVisible();

    // Check welcome icon
    const welcomeIcon = page.locator(".bg-indigo-50.w-20.h-20");
    await expect(welcomeIcon).toBeVisible();
  });

  test("dashboard is responsive on different screen sizes", async ({ page }) => {
    // Test mobile view
    await page.setViewportSize({ width: 375, height: 667 });
    await page.reload();
    await page.waitForLoadState("networkidle");

    await expect(page.getByTestId("dashboard-heading")).toBeVisible();
    await expect(page.getByTestId("dashboard-welcome-message")).toBeVisible();

    // Test tablet view
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.reload();
    await page.waitForLoadState("networkidle");

    await expect(page.getByTestId("dashboard-heading")).toBeVisible();

    // Test desktop view
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.reload();
    await page.waitForLoadState("networkidle");

    await expect(page.getByTestId("dashboard-heading")).toBeVisible();
  });

  test("authenticated user can access signup page", async ({ page, serverUrl }) => {
    // Navigate to signup while authenticated
    await page.goto(`${serverUrl}/signup`);
    await page.waitForLoadState("networkidle");

    // Should be able to access signup page (app allows this)
    const currentUrl = page.url();
    expect(currentUrl).toContain("/signup");

    // Should see signup form
    await expect(page.getByTestId("signup-heading")).toBeVisible();
  });

  test("authenticated user can access signin page", async ({ page, serverUrl }) => {
    // Navigate to signin while authenticated
    await page.goto(`${serverUrl}/signin`);
    await page.waitForLoadState("networkidle");

    // Should be able to access signin page (app allows this)
    const currentUrl = page.url();
    expect(currentUrl).toContain("/signin");

    // Should see signin form
    await expect(page.getByTestId("signin-heading")).toBeVisible();
  });

  test("session persists across page reloads", async ({ page }) => {
    // Reload the page
    await page.reload();
    await page.waitForLoadState("networkidle");

    // Should still see dashboard (session persisted)
    await expect(page.getByTestId("dashboard-heading")).toBeVisible();
    await expect(page.getByTestId("dashboard-welcome-message")).toBeVisible();

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
    await expect(page.getByTestId("dashboard-heading")).toBeVisible();
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

    // Check rocket icon (more specific selector)
    const rocketIcon = page.locator(".text-blue-600").first();
    await expect(rocketIcon).toBeVisible();
  });
});
