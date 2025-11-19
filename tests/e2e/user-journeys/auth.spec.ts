import { expect, test } from "../fixtures/test";

test.describe("Authentication Flow", () => {
  const adminUser = {
    email: "admin@test.com",
    password: "test1234",
  };

  test("admin can sign in and sign out", async ({ page, serverUrl }) => {
    // First, register the admin user
    await page.goto(`${serverUrl}/registerAdmin`);
    await page.waitForLoadState("networkidle");

    // Wait for admin registration to complete
    await page.waitForTimeout(5000);

    // Go to signin page
    await page.goto(`${serverUrl}/signin`);
    await page.waitForLoadState("networkidle");

    // Check sign in form is present
    await expect(page.getByTestId("signin-heading")).toBeVisible();
    await expect(page.getByTestId("signin-email-input")).toBeVisible();
    await expect(page.getByTestId("signin-password-input")).toBeVisible();

    // Fill out sign in form with admin credentials
    await page.getByTestId("signin-email-input").fill(adminUser.email);
    await page.getByTestId("signin-password-input").fill(adminUser.password);

    // Submit sign in form
    await Promise.all([
      page.waitForURL(`${serverUrl}/`),
      page.getByTestId("signin-submit-button").click(),
    ]);

    // Check that we're signed in
    await expect(page.getByTestId("dashboard-heading")).toBeVisible();

    // Test sign out
    await page.getByTestId("user-menu-button").click();
    await page.getByTestId("user-menu-sign-out-button").click();

    // Wait for redirect to home page
    await page.waitForURL(`${serverUrl}/`);

    // Should see landing page content
    await expect(page.locator("h1")).toContainText("Time Tracking");
  });

  test("sign in fails with invalid credentials", async ({
    page,
    serverUrl,
  }) => {
    // First, register the admin user to ensure the system is set up
    await page.goto(`${serverUrl}/registerAdmin`);
    await page.waitForLoadState("networkidle");

    // Wait for admin registration to complete (handle different states)
    const successMessage = page.locator("text=Registration Successful");
    // TODO: This "User Already Exists" message should not be possible since we start with a fresh database => debug
    const existingUserMessage = page.locator("text=User Already Exists");

    await Promise.race([
      expect(successMessage).toBeVisible({ timeout: 10000 }),
      expect(existingUserMessage).toBeVisible({ timeout: 10000 }),
    ]);

    await page.goto(`${serverUrl}/signin`);
    await page.waitForLoadState("networkidle");

    // Try to sign in with invalid credentials
    await page.getByTestId("signin-email-input").fill("invalid@example.com");
    await page.getByTestId("signin-password-input").fill("wrongpassword");
    await page.getByTestId("signin-submit-button").click();

    // Should show error message
    await expect(page.locator("text=Invalid email or password")).toBeVisible();

    // Should still be on sign in page
    await expect(page.getByTestId("signin-heading")).toBeVisible();
  });

  test("navigation links work correctly", async ({ page, serverUrl }) => {
    // Test navigation from landing page
    await page.goto(serverUrl);
    await page.waitForLoadState("networkidle");

    // Click sign in link
    await page.getByTestId("landingpage-sign-in-link").click();
    await page.waitForURL(`${serverUrl}/signin`);
    await expect(page.getByTestId("signin-heading")).toBeVisible();

    // Click back to sign in link (from signup page)
    await page.goto(`${serverUrl}/signup`);
    await page.waitForLoadState("networkidle");

    // Check if signup is disabled or shows form
    const pageContent = await page.content();
    const hasDisabled = pageContent.includes(
      "User registration is currently disabled",
    );
    const hasForm = pageContent.includes('input[type="email"]');

    if (hasDisabled) {
      await expect(
        page.locator("text=User registration is currently disabled"),
      ).toBeVisible();
    } else if (hasForm) {
      await expect(page.locator('input[type="email"]')).toBeVisible();
    }

    // Go back to signin
    await page.goto(`${serverUrl}/signin`);
    await page.waitForLoadState("networkidle");
    await expect(page.getByTestId("signin-heading")).toBeVisible();
  });

  test("session persists across page reloads", async ({ page, serverUrl }) => {
    // First, register the admin user
    await page.goto(`${serverUrl}/registerAdmin`);
    await page.waitForLoadState("networkidle");

    // Wait for admin registration to complete (handle different states)
    const successMessage = page.locator("text=Registration Successful");
    const existingUserMessage = page.locator("text=User Already Exists");

    await Promise.race([
      expect(successMessage).toBeVisible({ timeout: 10000 }),
      expect(existingUserMessage).toBeVisible({ timeout: 10000 }),
    ]);

    // Sign in first
    await page.goto(`${serverUrl}/signin`);
    await page.waitForLoadState("networkidle");

    await page.getByTestId("signin-email-input").fill(adminUser.email);
    await page.getByTestId("signin-password-input").fill(adminUser.password);
    await page.getByTestId("signin-submit-button").click();

    await page.waitForURL(`${serverUrl}/`);
    await expect(page.getByTestId("dashboard-heading")).toBeVisible();

    // Reload the page
    await page.reload();
    await page.waitForLoadState("networkidle");

    // Should still see dashboard (session persisted)
    await expect(page.getByTestId("dashboard-heading")).toBeVisible();
    await expect(page.getByTestId("dashboard-welcome-message")).toBeVisible();
  });

  test("user menu is functional when authenticated", async ({
    page,
    serverUrl,
  }) => {
    // First, register the admin user
    await page.goto(`${serverUrl}/registerAdmin`);
    await page.waitForLoadState("networkidle");

    // Wait for admin registration to complete (handle different states)
    const successMessage = page.locator("text=Registration Successful");
    const existingUserMessage = page.locator("text=User Already Exists");

    await Promise.race([
      expect(successMessage).toBeVisible({ timeout: 10000 }),
      expect(existingUserMessage).toBeVisible({ timeout: 10000 }),
    ]);

    // Sign in first
    await page.goto(`${serverUrl}/signin`);
    await page.waitForLoadState("networkidle");

    await page.getByTestId("signin-email-input").fill(adminUser.email);
    await page.getByTestId("signin-password-input").fill(adminUser.password);
    await page.getByTestId("signin-submit-button").click();

    await page.waitForURL(`${serverUrl}/`);

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
});
