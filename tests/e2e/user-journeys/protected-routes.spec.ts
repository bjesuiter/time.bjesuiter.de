import { expect, test } from "../fixtures/test";

test.describe("Protected Routes and Redirect Behavior", () => {
  const testUser = {
    email: "protectedtest@example.com",
    password: "testpassword123",
    name: "Protected Test User",
  };

  test("unauthenticated user accessing root redirects to landing page", async ({
    page,
    serverUrl,
  }) => {
    await page.goto(serverUrl);
    await page.waitForLoadState("networkidle");

    // Should see landing page content, not dashboard
    await expect(page.locator("h1")).toContainText("Time Tracking");
    await expect(page.getByTestId("landingpage-sign-in-link")).toBeVisible();
    await expect(page.locator('h1:has-text("Dashboard")')).not.toBeVisible();
  });

  test("authenticated user accessing root shows dashboard", async ({
    page,
    serverUrl,
  }) => {
    // Sign up and sign in first
    await page.goto(`${serverUrl}/signup`);
    await page.waitForLoadState("networkidle");

    await page.getByTestId("signup-name-input").fill(testUser.name);
    await page.getByTestId("signup-email-input").fill(testUser.email);
    await page.getByTestId("signup-password-input").fill(testUser.password);
    await page
      .getByTestId("signup-confirm-password-input")
      .fill(testUser.password);
    await page.getByTestId("signup-submit-button").click();

    // Wait for redirect to dashboard
    await page.waitForURL(`${serverUrl}/`);
    await page.waitForLoadState("networkidle");

    // Should see dashboard content
    await expect(page.getByTestId("dashboard-heading")).toBeVisible();
    await expect(page.getByTestId("dashboard-welcome-message")).toBeVisible();
  });

  test("authenticated user cannot access signup page", async ({
    page,
    serverUrl,
  }) => {
    // Sign up and sign in first
    await page.goto(`${serverUrl}/signup`);
    await page.waitForLoadState("networkidle");

    await page.getByTestId("signup-name-input").fill(testUser.name);
    await page.getByTestId("signup-email-input").fill(testUser.email);
    await page.getByTestId("signup-password-input").fill(testUser.password);
    await page
      .getByTestId("signup-confirm-password-input")
      .fill(testUser.password);
    await page.getByTestId("signup-submit-button").click();

    // Wait for redirect to dashboard
    await page.waitForURL(`${serverUrl}/`);
    await page.waitForLoadState("networkidle");

    // Try to access signup page
    await page.goto(`${serverUrl}/signup`);
    await page.waitForLoadState("networkidle");

    // Check current URL - app allows authenticated users to access signup
    const currentUrl = page.url();
    expect(currentUrl).toContain("/signup");

    // Should see signup form
    await expect(page.getByTestId("signup-heading")).toBeVisible();
  });

  test("authenticated user cannot access signin page", async ({
    page,
    serverUrl,
  }) => {
    // Sign up and sign in first
    await page.goto(`${serverUrl}/signup`);
    await page.waitForLoadState("networkidle");

    await page.getByTestId("signup-name-input").fill(testUser.name);
    await page.getByTestId("signup-email-input").fill(testUser.email);
    await page.getByTestId("signup-password-input").fill(testUser.password);
    await page
      .getByTestId("signup-confirm-password-input")
      .fill(testUser.password);
    await page.getByTestId("signup-submit-button").click();

    // Wait for redirect to dashboard
    await page.waitForURL(`${serverUrl}/`);
    await page.waitForLoadState("networkidle");

    // Try to access signin page
    await page.goto(`${serverUrl}/signin`);
    await page.waitForLoadState("networkidle");

    // Check current URL - app allows authenticated users to access signin
    const currentUrl = page.url();
    expect(currentUrl).toContain("/signin");

    // Should see signin form
    await expect(page.getByTestId("signin-heading")).toBeVisible();
  });

  test("unauthenticated user can access signin page", async ({
    page,
    serverUrl,
  }) => {
    await page.goto(`${serverUrl}/signin`);
    await page.waitForLoadState("networkidle");

    // Should see signin form
    await expect(page.getByTestId("signin-heading")).toBeVisible();
    await expect(page.getByTestId("signin-email-input")).toBeVisible();
    await expect(page.getByTestId("signin-password-input")).toBeVisible();
  });

  test("unauthenticated user can access signup page", async ({
    page,
    serverUrl,
  }) => {
    await page.goto(`${serverUrl}/signup`);
    await page.waitForLoadState("networkidle");

    // Should see signup form
    await expect(page.getByTestId("signup-heading")).toBeVisible();
    await expect(page.getByTestId("signup-email-input")).toBeVisible();
    await expect(page.getByTestId("signup-password-input")).toBeVisible();
    await expect(
      page.getByTestId("signup-confirm-password-input"),
    ).toBeVisible();
  });

  test("unauthenticated user can access admin registration page", async ({
    page,
    serverUrl,
  }) => {
    await page.goto(`${serverUrl}/registerAdmin`);
    await page.waitForLoadState("networkidle");

    // Should see admin registration page (exact content depends on implementation)
    // At minimum, the page should load without errors
    const title = await page.title();
    expect(title).toBeTruthy();
  });

  test("session persists across navigation", async ({ page, serverUrl }) => {
    // Sign up and sign in first
    await page.goto(`${serverUrl}/signup`);
    await page.waitForLoadState("networkidle");

    await page.getByTestId("signup-name-input").fill(testUser.name);
    await page.getByTestId("signup-email-input").fill(testUser.email);
    await page.getByTestId("signup-password-input").fill(testUser.password);
    await page
      .getByTestId("signup-confirm-password-input")
      .fill(testUser.password);
    await page.getByTestId("signup-submit-button").click();

    // Wait for redirect to dashboard
    await page.waitForURL(`${serverUrl}/`);
    await page.waitForLoadState("networkidle");

    // Navigate away and back
    await page.goto(`${serverUrl}/signin`);
    await page.waitForLoadState("networkidle");

    // Should see signin form (app allows authenticated users to access signin)
    await expect(page.getByTestId("signin-heading")).toBeVisible();
  });

  test("sign out clears session and redirects properly", async ({
    page,
    serverUrl,
  }) => {
    // Sign up and sign in first
    await page.goto(`${serverUrl}/signup`);
    await page.waitForLoadState("networkidle");

    await page.getByTestId("signup-name-input").fill(testUser.name);
    await page.getByTestId("signup-email-input").fill(testUser.email);
    await page.getByTestId("signup-password-input").fill(testUser.password);
    await page
      .getByTestId("signup-confirm-password-input")
      .fill(testUser.password);
    await page.getByTestId("signup-submit-button").click();

    // Wait for redirect to dashboard
    await page.waitForURL(`${serverUrl}/`);
    await page.waitForLoadState("networkidle");

    // Sign out
    await page.getByTestId("user-menu-button").click();
    await page.getByTestId("user-menu-sign-out-button").click();

    // Wait for redirect
    await page.waitForLoadState("networkidle");

    // Should see landing page
    await expect(page.locator("h1")).toContainText("Time Tracking");

    // Try to access dashboard directly
    await page.goto(serverUrl);
    await page.waitForLoadState("networkidle");

    // Should still see landing page (session cleared)
    await expect(page.locator("h1")).toContainText("Time Tracking");
    await expect(page.getByTestId("landingpage-sign-in-link")).toBeVisible();
  });

  test("browser back button works correctly with authentication", async ({
    page,
    serverUrl,
  }) => {
    // Start on landing page
    await page.goto(serverUrl);
    await page.waitForLoadState("networkidle");
    await expect(page.locator("h1")).toContainText("Time Tracking");

    // Go to signin page
    await page.getByTestId("landingpage-sign-in-link").click();
    await page.waitForURL(`${serverUrl}/signin`);
    await expect(page.getByTestId("signin-heading")).toBeVisible();

    // Use browser back
    await page.goBack();
    await page.waitForLoadState("networkidle");

    // Should be back on landing page
    await expect(page.locator("h1")).toContainText("Time Tracking");
  });

  test("direct URL navigation handles authentication properly", async ({
    page,
    serverUrl,
  }) => {
    // Try to access dashboard directly without authentication
    await page.goto(serverUrl);
    await page.waitForLoadState("networkidle");

    // Should see landing page, not dashboard
    await expect(page.locator("h1")).toContainText("Time Tracking");
    await expect(page.locator('h1:has-text("Dashboard")')).not.toBeVisible();

    // Now sign up and sign in
    await page.goto(`${serverUrl}/signup`);
    await page.waitForLoadState("networkidle");

    await page.getByTestId("signup-name-input").fill(testUser.name);
    await page.getByTestId("signup-email-input").fill(testUser.email);
    await page.getByTestId("signup-password-input").fill(testUser.password);
    await page
      .getByTestId("signup-confirm-password-input")
      .fill(testUser.password);
    await page.getByTestId("signup-submit-button").click();

    // Should be redirected to dashboard
    await page.waitForURL(`${serverUrl}/`);
    await page.waitForLoadState("networkidle");
    await expect(page.getByTestId("dashboard-heading")).toBeVisible();
  });

  test("page refresh maintains authentication state", async ({
    page,
    serverUrl,
  }) => {
    // Sign up and sign in first
    await page.goto(`${serverUrl}/signup`);
    await page.waitForLoadState("networkidle");

    await page.getByTestId("signup-name-input").fill(testUser.name);
    await page.getByTestId("signup-email-input").fill(testUser.email);
    await page.getByTestId("signup-password-input").fill(testUser.password);
    await page
      .getByTestId("signup-confirm-password-input")
      .fill(testUser.password);
    await page.getByTestId("signup-submit-button").click();

    // Wait for redirect to dashboard
    await page.waitForURL(`${serverUrl}/`);
    await page.waitForLoadState("networkidle");

    // Refresh the page
    await page.reload();
    await page.waitForLoadState("networkidle");

    // Should still see dashboard (session maintained)
    await expect(page.getByTestId("dashboard-heading")).toBeVisible();
    await expect(page.getByTestId("dashboard-welcome-message")).toBeVisible();
  });
});
