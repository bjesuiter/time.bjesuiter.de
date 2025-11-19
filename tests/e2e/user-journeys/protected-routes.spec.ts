import { expect, test } from "../fixtures/test";

test.describe("Protected Routes and Redirect Behavior", () => {
  const testUser = {
    email: "protectedtest@example.com",
    password: "testpassword123",
    name: "Protected Test User"
  };

  test("unauthenticated user accessing root redirects to landing page", async ({ page, serverUrl }) => {
    await page.goto(serverUrl);
    await page.waitForLoadState("networkidle");
    
    // Should see landing page content, not dashboard
    await expect(page.locator('h1')).toContainText("Time Tracking");
    await expect(page.locator('text=Sign In')).toBeVisible();
    await expect(page.locator('h1:has-text("Dashboard")')).not.toBeVisible();
  });

  test("authenticated user accessing root shows dashboard", async ({ page, serverUrl }) => {
    // Sign up and sign in first
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
    
    // Should see dashboard content
    await expect(page.locator('h1')).toContainText("Dashboard");
    await expect(page.locator('text=Welcome to Your Dashboard')).toBeVisible();
  });

  test("authenticated user cannot access signup page", async ({ page, serverUrl }) => {
    // Sign up and sign in first
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
    
    // Try to access signup page
    await page.goto(`${serverUrl}/signup`);
    await page.waitForLoadState("networkidle");
    
    // Should be redirected away from signup
    const currentUrl = page.url();
    expect(currentUrl).not.toBe(`${serverUrl}/signup`);
    
    // Should still see dashboard or be redirected to dashboard
    if (currentUrl === `${serverUrl}/`) {
      await expect(page.locator('h1')).toContainText("Dashboard");
    }
  });

  test("authenticated user cannot access signin page", async ({ page, serverUrl }) => {
    // Sign up and sign in first
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
    
    // Try to access signin page
    await page.goto(`${serverUrl}/signin`);
    await page.waitForLoadState("networkidle");
    
    // Should be redirected away from signin
    const currentUrl = page.url();
    expect(currentUrl).not.toBe(`${serverUrl}/signin`);
    
    // Should still see dashboard or be redirected to dashboard
    if (currentUrl === `${serverUrl}/`) {
      await expect(page.locator('h1')).toContainText("Dashboard");
    }
  });

  test("unauthenticated user can access signin page", async ({ page, serverUrl }) => {
    await page.goto(`${serverUrl}/signin`);
    await page.waitForLoadState("networkidle");
    
    // Should see signin form
    await expect(page.locator('h1')).toContainText("Welcome Back");
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
  });

  test("unauthenticated user can access signup page", async ({ page, serverUrl }) => {
    await page.goto(`${serverUrl}/signup`);
    await page.waitForLoadState("networkidle");
    
    // Should see signup form
    await expect(page.locator('h1')).toContainText("Create Account");
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(page.locator('input[name="confirmPassword"]')).toBeVisible();
  });

  test("unauthenticated user can access admin registration page", async ({ page, serverUrl }) => {
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
    
    await page.fill('input[name="name"]', testUser.name);
    await page.fill('input[name="email"]', testUser.email);
    await page.fill('input[name="password"]', testUser.password);
    await page.fill('input[name="confirmPassword"]', testUser.password);
    await page.click('button[type="submit"]');
    
    // Wait for redirect to dashboard
    await page.waitForURL(`${serverUrl}/`);
    await page.waitForLoadState("networkidle");
    
    // Navigate away and back
    await page.goto(`${serverUrl}/signin`);
    await page.waitForLoadState("networkidle");
    
    // Should be redirected back to dashboard (session still active)
    await page.waitForURL(`${serverUrl}/`);
    await expect(page.locator('h1')).toContainText("Dashboard");
  });

  test("sign out clears session and redirects properly", async ({ page, serverUrl }) => {
    // Sign up and sign in first
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
    
    // Sign out
    await page.click('button[aria-label="User menu"]');
    await page.click('button:has-text("Sign out")');
    
    // Wait for redirect
    await page.waitForLoadState("networkidle");
    
    // Should see landing page
    await expect(page.locator('h1')).toContainText("Time Tracking");
    
    // Try to access dashboard directly
    await page.goto(serverUrl);
    await page.waitForLoadState("networkidle");
    
    // Should still see landing page (session cleared)
    await expect(page.locator('h1')).toContainText("Time Tracking");
    await expect(page.locator('h1:has-text("Dashboard")')).not.toBeVisible();
  });

  test("browser back button works correctly with authentication", async ({ page, serverUrl }) => {
    // Start on landing page
    await page.goto(serverUrl);
    await page.waitForLoadState("networkidle");
    await expect(page.locator('h1')).toContainText("Time Tracking");
    
    // Go to signin page
    await page.goto(`${serverUrl}/signin`);
    await page.waitForLoadState("networkidle");
    await expect(page.locator('h1')).toContainText("Welcome Back");
    
    // Use browser back
    await page.goBack();
    await page.waitForLoadState("networkidle");
    
    // Should be back on landing page
    await expect(page.locator('h1')).toContainText("Time Tracking");
  });

  test("direct URL navigation handles authentication properly", async ({ page, serverUrl }) => {
    // Try to access dashboard directly without authentication
    await page.goto(serverUrl);
    await page.waitForLoadState("networkidle");
    
    // Should see landing page, not dashboard
    await expect(page.locator('h1')).toContainText("Time Tracking");
    await expect(page.locator('h1:has-text("Dashboard")')).not.toBeVisible();
    
    // Now sign up and sign in
    await page.goto(`${serverUrl}/signup`);
    await page.waitForLoadState("networkidle");
    
    await page.fill('input[name="name"]', testUser.name);
    await page.fill('input[name="email"]', testUser.email);
    await page.fill('input[name="password"]', testUser.password);
    await page.fill('input[name="confirmPassword"]', testUser.password);
    await page.click('button[type="submit"]');
    
    // Should be redirected to dashboard
    await page.waitForURL(`${serverUrl}/`);
    await page.waitForLoadState("networkidle");
    await expect(page.locator('h1')).toContainText("Dashboard");
  });

  test("page refresh maintains authentication state", async ({ page, serverUrl }) => {
    // Sign up and sign in first
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
    
    // Refresh the page
    await page.reload();
    await page.waitForLoadState("networkidle");
    
    // Should still see dashboard (session maintained)
    await expect(page.locator('h1')).toContainText("Dashboard");
    await expect(page.locator('text=Welcome to Your Dashboard')).toBeVisible();
  });
});