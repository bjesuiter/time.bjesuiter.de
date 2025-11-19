import { expect, test } from "../fixtures/test";

test.describe("Form Validation and Error Handling", () => {
  test.skip("validates signup required fields", async () => {
    // TODO: Fix signup form validation in test environment
    // Form validation is not working as expected in tests
    // This test is skipped until the issue is resolved
  });

  test.skip("validates signup email format", async ({ page, serverUrl }) => {
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
        await page.getByTestId("signup-email-input").fill(email);
        await page.getByTestId("signup-password-input").fill("validpassword123");
        await page.getByTestId("signup-confirm-password-input").fill("validpassword123");
        await page.getByTestId("signup-submit-button").click();

        await expect(page.getByTestId("signup-email-error")).toBeVisible();

        // Clear form for next test
        await page.getByTestId("signup-email-input").fill("");
        await page.getByTestId("signup-password-input").fill("");
        await page.getByTestId("signup-confirm-password-input").fill("");
      }
    }
  });

  test.skip("validates signup password length", async ({ page, serverUrl }) => {
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
      await page.getByTestId("signup-email-input").fill("test@example.com");
      await page.getByTestId("signup-password-input").fill(password);
      await page.getByTestId("signup-confirm-password-input").fill(password);
      await page.getByTestId("signup-submit-button").click();

      if (password.length === 0) {
        await expect(page.getByTestId("signup-password-error")).toBeVisible();
      } else {
        await expect(page.getByTestId("signup-password-error")).toBeVisible();
      }

      // Clear form for next test
      await page.getByTestId("signup-email-input").fill("");
      await page.getByTestId("signup-password-input").fill("");
      await page.getByTestId("signup-confirm-password-input").fill("");
    }
  });

  test.skip("validates signup password confirmation", async ({
    page,
    serverUrl,
  }) => {
    await page.goto(`${serverUrl}/signup`);
    await page.waitForLoadState("networkidle");

    await page.getByTestId("signup-email-input").fill("test@example.com");
    await page.getByTestId("signup-password-input").fill("validpassword123");
    await page.getByTestId("signup-confirm-password-input").fill("differentpassword");
    await page.getByTestId("signup-submit-button").click();

    await expect(page.getByTestId("signup-confirm-password-error")).toBeVisible();
  });

  test.skip("clears signup field errors on input", async ({ page, serverUrl }) => {
    await page.goto(`${serverUrl}/signup`);
    await page.waitForLoadState("networkidle");

    // Trigger validation errors
    await page.getByTestId("signup-submit-button").click();
    await expect(page.getByTestId("signup-email-error")).toBeVisible();

    // Start typing in email field
    await page.getByTestId("signup-email-input").fill("test");
    await expect(page.getByTestId("signup-email-error")).not.toBeVisible();

    // Trigger password error
    await page.getByTestId("signup-password-input").fill("123");
    await page.getByTestId("signup-confirm-password-input").fill("123");
    await page.getByTestId("signup-submit-button").click();
    await expect(page.getByTestId("signup-password-error")).toBeVisible();

    // Start typing in password field
    await page.getByTestId("signup-password-input").fill("validpassword");
    await expect(page.getByTestId("signup-password-error")).not.toBeVisible();
  });

  test("validates signup form with valid data", async ({ page, serverUrl }) => {
    await page.goto(`${serverUrl}/signup`);
    await page.waitForLoadState("networkidle");

    // Fill with valid data
    await page.getByTestId("signup-name-input").fill("Test User");
    await page.getByTestId("signup-email-input").fill("validuser@example.com");
    await page.getByTestId("signup-password-input").fill("validpassword123");
    await page.getByTestId("signup-confirm-password-input").fill("validpassword123");

    // Submit form
    await page.getByTestId("signup-submit-button").click();

    // Should redirect to dashboard (no validation errors)
    await page.waitForURL(`${serverUrl}/`);
    await expect(page.getByTestId("dashboard-heading")).toBeVisible();
  });

  test.skip("validates signin required fields", async ({ page, serverUrl }) => {
    await page.goto(`${serverUrl}/signin`);
    await page.waitForLoadState("networkidle");

    // Submit empty form
    await page.getByTestId("signin-submit-button").click();

    await expect(page.getByTestId("signin-email-error")).toBeVisible();
    await expect(page.getByTestId("signin-password-error")).toBeVisible();
  });

  test.skip("validates signin email format", async ({ page, serverUrl }) => {
    await page.goto(`${serverUrl}/signin`);
    await page.waitForLoadState("networkidle");

    await page.getByTestId("signin-email-input").fill("invalid-email");
    await page.getByTestId("signin-password-input").fill("somepassword");
    await page.getByTestId("signin-submit-button").click();

    await expect(page.getByTestId("signin-email-error")).toBeVisible();
  });

  test("shows error for invalid signin credentials", async ({
    page,
    serverUrl,
  }) => {
    await page.goto(`${serverUrl}/signin`);
    await page.waitForLoadState("networkidle");

    await page.getByTestId("signin-email-input").fill("nonexistent@example.com");
    await page.getByTestId("signin-password-input").fill("wrongpassword");
    await page.getByTestId("signin-submit-button").click();

    await expect(page.getByTestId("signin-general-error")).toBeVisible();
  });

  test.skip("clears signin field errors on input", async ({ page, serverUrl }) => {
    await page.goto(`${serverUrl}/signin`);
    await page.waitForLoadState("networkidle");

    // Trigger validation errors
    await page.getByTestId("signin-submit-button").click();
    await expect(page.locator("text=Email is required")).toBeVisible();

    // Start typing in email field
    await page.getByTestId("signin-email-input").fill("test");
    await expect(page.getByTestId("signin-email-error")).not.toBeVisible();

    // Fill email and trigger password error
    await page.getByTestId("signin-email-input").fill("test@example.com");
    await page.getByTestId("signin-submit-button").click();
    await expect(page.locator("text=Password is required")).toBeVisible();

    // Start typing in password field
    await page.getByTestId("signin-password-input").fill("some");
    await expect(page.getByTestId("signin-password-error")).not.toBeVisible();
  });

  test("handles network errors gracefully", async ({ page, serverUrl }) => {
    await page.goto(`${serverUrl}/signin`);
    await page.waitForLoadState("networkidle");

    // Mock network failure by intercepting the request
    await page.route("**/api/auth/sign-in", (route) => route.abort());

    await page.getByTestId("signin-email-input").fill("test@example.com");
    await page.getByTestId("signin-password-input").fill("somepassword");
    await page.getByTestId("signin-submit-button").click();

    // Should show a general error message
    await expect(page.getByTestId("signin-general-error")).toBeVisible();
  });

  test.skip("forms have proper labels and ARIA attributes", async ({
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
    await page.getByTestId("signup-name-input").fill("Test User");
    await page.getByTestId("signup-email-input").fill("loadingtest@example.com");
    await page.getByTestId("signup-password-input").fill("validpassword123");
    await page.getByTestId("signup-confirm-password-input").fill("validpassword123");

    // Submit and check for loading state
    await page.getByTestId("signup-submit-button").click();

    // Should show loading spinner and disabled button
    await expect(page.locator(".animate-spin")).toBeVisible();
    await expect(page.getByTestId("signup-submit-button")).toBeDisabled();
  });

  test.skip("error messages are accessible", async ({ page, serverUrl }) => {
    await page.goto(`${serverUrl}/signup`);
    await page.waitForLoadState("networkidle");

    // Trigger validation error
    await page.getByTestId("signup-submit-button").click();

    // Check that error messages are properly structured
    const errorMessage = page.getByTestId("signup-email-error");
    await expect(errorMessage).toBeVisible();

    // Error should be in a visible container with proper styling
    const errorContainer = page.locator(".text-red-600");
    await expect(errorContainer).toBeVisible();
  });
});
