import { expect, test } from "../fixtures/test";

test.describe("Form Validation and Error Handling", () => {
  test("validates signup required fields", async ({ page, serverUrl }) => {
    await page.goto(`${serverUrl}/signup`);
    await page.waitForLoadState("networkidle");

    // Check if signup is allowed
    const signupDisabled = page.locator(
      "text=User registration is currently disabled",
    );
    const isDisabled = await signupDisabled.isVisible().catch(() => false);

    if (isDisabled) {
      // Skip validation test if signup is disabled
      await expect(signupDisabled).toBeVisible();
    } else {
      // Submit empty form
      await page.click('button[type="submit"]');

      // Should show email and password required errors
      await expect(page.locator("text=Email is required")).toBeVisible();
      await expect(page.locator("text=Password is required")).toBeVisible();
      await expect(
        page.locator("text=Please confirm your password"),
      ).toBeVisible();
    }
  });

  test("validates signup email format", async ({ page, serverUrl }) => {
    await page.goto(`${serverUrl}/signup`);
    await page.waitForLoadState("networkidle");

    // Check if signup is allowed
    const signupDisabled = page.locator(
      "text=User registration is currently disabled",
    );
    const isDisabled = await signupDisabled.isVisible().catch(() => false);

    if (isDisabled) {
      // Skip validation test if signup is disabled
      await expect(signupDisabled).toBeVisible();
    } else {
      // Test various invalid email formats
      const invalidEmails = [
        "invalid-email",
        "user@",
        "@domain.com",
        "user..name@domain.com",
        "user@domain",
        "user name@domain.com",
      ];

      for (const email of invalidEmails) {
        await page.fill('input[name="email"]', email);
        await page.fill('input[name="password"]', "validpassword123");
        await page.fill('input[name="confirmPassword"]', "validpassword123");
        await page.click('button[type="submit"]');

        await expect(
          page.locator("text=Please enter a valid email address"),
        ).toBeVisible();

        // Clear form for next test
        await page.fill('input[name="email"]', "");
        await page.fill('input[name="password"]', "");
        await page.fill('input[name="confirmPassword"]', "");
      }
    }
  });

  test("validates signup password length", async ({ page, serverUrl }) => {
    await page.goto(`${serverUrl}/signup`);
    await page.waitForLoadState("networkidle");

    // Test passwords that are too short
    const shortPasswords = [
      "",
      "1",
      "12",
      "123",
      "1234",
      "12345",
      "123456",
      "1234567",
    ];

    for (const password of shortPasswords) {
      await page.fill('input[name="email"]', "test@example.com");
      await page.fill('input[name="password"]', password);
      await page.fill('input[name="confirmPassword"]', password);
      await page.click('button[type="submit"]');

      if (password.length === 0) {
        await expect(page.locator("text=Password is required")).toBeVisible();
      } else {
        await expect(
          page.locator("text=Password must be at least 8 characters"),
        ).toBeVisible();
      }

      // Clear form for next test
      await page.fill('input[name="email"]', "");
      await page.fill('input[name="password"]', "");
      await page.fill('input[name="confirmPassword"]', "");
    }
  });

  test("validates signup password confirmation", async ({
    page,
    serverUrl,
  }) => {
    await page.goto(`${serverUrl}/signup`);
    await page.waitForLoadState("networkidle");

    await page.fill('input[name="email"]', "test@example.com");
    await page.fill('input[name="password"]', "validpassword123");
    await page.fill('input[name="confirmPassword"]', "differentpassword");
    await page.click('button[type="submit"]');

    await expect(page.locator("text=Passwords do not match")).toBeVisible();
  });

  test("clears signup field errors on input", async ({ page, serverUrl }) => {
    await page.goto(`${serverUrl}/signup`);
    await page.waitForLoadState("networkidle");

    // Trigger validation errors
    await page.click('button[type="submit"]');
    await expect(page.locator("text=Email is required")).toBeVisible();

    // Start typing in email field
    await page.fill('input[name="email"]', "test");
    await expect(page.locator("text=Email is required")).not.toBeVisible();

    // Trigger password error
    await page.fill('input[name="password"]', "123");
    await page.fill('input[name="confirmPassword"]', "123");
    await page.click('button[type="submit"]');
    await expect(
      page.locator("text=Password must be at least 8 characters"),
    ).toBeVisible();

    // Start typing in password field
    await page.fill('input[name="password"]', "validpassword");
    await expect(
      page.locator("text=Password must be at least 8 characters"),
    ).not.toBeVisible();
  });

  test("validates signup form with valid data", async ({ page, serverUrl }) => {
    await page.goto(`${serverUrl}/signup`);
    await page.waitForLoadState("networkidle");

    // Fill with valid data
    await page.fill('input[name="name"]', "Test User");
    await page.fill('input[name="email"]', "validuser@example.com");
    await page.fill('input[name="password"]', "validpassword123");
    await page.fill('input[name="confirmPassword"]', "validpassword123");

    // Submit form
    await page.click('button[type="submit"]');

    // Should redirect to dashboard (no validation errors)
    await page.waitForURL(`${serverUrl}/`);
    await expect(page.locator("h1")).toContainText("Dashboard");
  });

  test("validates signin required fields", async ({ page, serverUrl }) => {
    await page.goto(`${serverUrl}/signin`);
    await page.waitForLoadState("networkidle");

    // Submit empty form
    await page.click('button[type="submit"]');

    await expect(page.locator("text=Email is required")).toBeVisible();
    await expect(page.locator("text=Password is required")).toBeVisible();
  });

  test("validates signin email format", async ({ page, serverUrl }) => {
    await page.goto(`${serverUrl}/signin`);
    await page.waitForLoadState("networkidle");

    await page.fill('input[name="email"]', "invalid-email");
    await page.fill('input[name="password"]', "somepassword");
    await page.click('button[type="submit"]');

    await expect(
      page.locator("text=Please enter a valid email address"),
    ).toBeVisible();
  });

  test("shows error for invalid signin credentials", async ({
    page,
    serverUrl,
  }) => {
    await page.goto(`${serverUrl}/signin`);
    await page.waitForLoadState("networkidle");

    await page.fill('input[name="email"]', "nonexistent@example.com");
    await page.fill('input[name="password"]', "wrongpassword");
    await page.click('button[type="submit"]');

    await expect(page.locator("text=Invalid email or password")).toBeVisible();
  });

  test("clears signin field errors on input", async ({ page, serverUrl }) => {
    await page.goto(`${serverUrl}/signin`);
    await page.waitForLoadState("networkidle");

    // Trigger validation errors
    await page.click('button[type="submit"]');
    await expect(page.locator("text=Email is required")).toBeVisible();

    // Start typing in email field
    await page.fill('input[name="email"]', "test");
    await expect(page.locator("text=Email is required")).not.toBeVisible();

    // Fill email and trigger password error
    await page.fill('input[name="email"]', "test@example.com");
    await page.click('button[type="submit"]');
    await expect(page.locator("text=Password is required")).toBeVisible();

    // Start typing in password field
    await page.fill('input[name="password"]', "some");
    await expect(page.locator("text=Password is required")).not.toBeVisible();
  });

  test("handles network errors gracefully", async ({ page, serverUrl }) => {
    await page.goto(`${serverUrl}/signin`);
    await page.waitForLoadState("networkidle");

    // Mock network failure by intercepting the request
    await page.route("**/api/auth/sign-in", (route) => route.abort());

    await page.fill('input[name="email"]', "test@example.com");
    await page.fill('input[name="password"]', "somepassword");
    await page.click('button[type="submit"]');

    // Should show a general error message
    await expect(
      page.locator("text=An unexpected error occurred"),
    ).toBeVisible();
  });

  test("forms have proper labels and ARIA attributes", async ({
    page,
    serverUrl,
  }) => {
    // Test signup form
    await page.goto(`${serverUrl}/signup`);
    await page.waitForLoadState("networkidle");

    // Check for proper labels
    await expect(page.locator('label[for="email"]')).toBeVisible();
    await expect(page.locator('label[for="password"]')).toBeVisible();
    await expect(page.locator('label[for="confirmPassword"]')).toBeVisible();

    // Check for proper input attributes
    await expect(
      page.locator('input[name="email"][type="email"]'),
    ).toBeVisible();
    await expect(
      page.locator('input[name="password"][type="password"]'),
    ).toBeVisible();
    await expect(
      page.locator('input[name="confirmPassword"][type="password"]'),
    ).toBeVisible();

    // Test signin form
    await page.goto(`${serverUrl}/signin`);
    await page.waitForLoadState("networkidle");

    await expect(page.locator('label[for="email"]')).toBeVisible();
    await expect(page.locator('label[for="password"]')).toBeVisible();
  });

  test("forms are keyboard navigable", async ({ page, serverUrl }) => {
    await page.goto(`${serverUrl}/signup`);
    await page.waitForLoadState("networkidle");

    // Test tab navigation
    await page.keyboard.press("Tab");
    let focused = page.locator(":focus");
    await expect(focused).toBeVisible();

    await page.keyboard.press("Tab");
    focused = page.locator(":focus");
    await expect(focused).toBeVisible();

    await page.keyboard.press("Tab");
    focused = page.locator(":focus");
    await expect(focused).toBeVisible();

    await page.keyboard.press("Tab");
    focused = page.locator(":focus");
    await expect(focused).toBeVisible();

    await page.keyboard.press("Tab");
    focused = page.locator(":focus");
    await expect(focused).toBeVisible();
  });

  test("forms show loading states", async ({ page, serverUrl }) => {
    await page.goto(`${serverUrl}/signup`);
    await page.waitForLoadState("networkidle");

    // Fill form with valid data
    await page.fill('input[name="name"]', "Test User");
    await page.fill('input[name="email"]', "loadingtest@example.com");
    await page.fill('input[name="password"]', "validpassword123");
    await page.fill('input[name="confirmPassword"]', "validpassword123");

    // Submit and check for loading state
    await page.click('button[type="submit"]');

    // Should show loading spinner and disabled button
    await expect(page.locator(".animate-spin")).toBeVisible();
    await expect(page.locator('button[type="submit"][disabled]')).toBeVisible();
  });

  test("error messages are accessible", async ({ page, serverUrl }) => {
    await page.goto(`${serverUrl}/signup`);
    await page.waitForLoadState("networkidle");

    // Trigger validation error
    await page.click('button[type="submit"]');

    // Check that error messages are properly structured
    const errorMessage = page.locator("text=Email is required");
    await expect(errorMessage).toBeVisible();

    // Error should be in a visible container with proper styling
    const errorContainer = page.locator(".text-red-600");
    await expect(errorContainer).toBeVisible();
  });
});
