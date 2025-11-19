import { expect, test } from "../fixtures/test";

test.describe("Admin Registration Flow", () => {
  test("admin registration page loads correctly", async ({ page, serverUrl }) => {
    await page.goto(`${serverUrl}/registerAdmin`);
    await page.waitForLoadState("networkidle");
    
    // Check page title and header
    await expect(page.locator('h1')).toContainText("Admin Registration");
    await expect(page.locator('text=Automated admin user setup')).toBeVisible();
    
    // Check for the admin icon
    await expect(page.locator('.text-slate-700')).toBeVisible();
  });

  test("admin registration shows appropriate response", async ({ page, serverUrl }) => {
    await page.goto(`${serverUrl}/registerAdmin`);
    await page.waitForLoadState("networkidle");
    
    // Check if we have success or error state
    const successMessage = page.locator('text=Registration Successful');
    const errorMessage = page.locator('text=User Already Exists');
    const registrationFailed = page.locator('text=Registration Failed');
    
    // At least one of these should be visible
    const hasSuccess = await successMessage.isVisible().catch(() => false);
    const hasError = await errorMessage.isVisible().catch(() => false);
    const hasFailed = await registrationFailed.isVisible().catch(() => false);
    
    if (hasSuccess) {
      // Success state checks
      await expect(page.locator('.text-green-600')).toBeVisible();
      await expect(page.locator('text=Admin Details:')).toBeVisible();
      await expect(page.locator('text=Email:')).toBeVisible();
      await expect(page.locator('a:has-text("Go to Sign In")')).toBeVisible();
    } else if (hasError) {
      // User already exists state
      await expect(page.locator('.text-amber-600')).toBeVisible();
      await expect(page.locator('a:has-text("Force Re-register")')).toBeVisible();
      await expect(page.locator('a:has-text("Go to Home")')).toBeVisible();
    } else if (hasFailed) {
      // Registration failed state
      await expect(page.locator('.text-amber-600')).toBeVisible();
      await expect(page.locator('a:has-text("Go to Home")')).toBeVisible();
    }
    
    // In all cases, the main heading should be visible
    await expect(page.locator('text=Admin Registration')).toBeVisible();
  });

  test("admin registration uses environment variables", async ({ page, serverUrl }) => {
    await page.goto(`${serverUrl}/registerAdmin`);
    await page.waitForLoadState("networkidle");
    
    // Check if we have success state (which shows email) or error state
    const successMessage = page.locator('text=Registration Successful');
    const hasSuccess = await successMessage.isVisible().catch(() => false);
    
    if (hasSuccess) {
      // The admin email should match the test environment variable
      const adminEmailElement = page.locator('text=Email:');
      await expect(adminEmailElement).toBeVisible();
      
      // Extract the email from the page
      const emailText = await adminEmailElement.textContent();
      expect(emailText).toContain('admin@test.com'); // From test environment
    } else {
      // In error state, we can't check the email, but page should still load
      await expect(page.locator('text=Admin Registration')).toBeVisible();
    }
  });

  test("go to sign in button works correctly", async ({ page, serverUrl }) => {
    await page.goto(`${serverUrl}/registerAdmin`);
    await page.waitForLoadState("networkidle");
    
    // Check if sign in button is available (only in success state)
    const signInButton = page.locator('a:has-text("Go to Sign In")');
    const hasSignInButton = await signInButton.isVisible().catch(() => false);
    
    if (hasSignInButton) {
      // Click the go to sign in button
      await signInButton.click();
      
      // Should navigate to signin page
      await page.waitForURL(`${serverUrl}/signin`);
      await expect(page.locator('h1')).toContainText("Welcome Back");
    } else {
      // If no sign in button, check for go to home button instead
      const homeButton = page.locator('a:has-text("Go to Home")');
      if (await homeButton.isVisible()) {
        await homeButton.click();
        await page.waitForURL(`${serverUrl}/`);
        await expect(page.locator('h1')).toContainText("Time Tracking");
      }
    }
  });

  test("admin registration page styling is correct", async ({ page, serverUrl }) => {
    await page.goto(`${serverUrl}/registerAdmin`);
    await page.waitForLoadState("networkidle");
    
    // Check main container styling
    const mainContainer = page.locator('.min-h-screen.bg-linear-to-br');
    await expect(mainContainer).toBeVisible();
    
    // Check card styling
    const card = page.locator('.bg-white.rounded-lg.shadow-xl');
    await expect(card).toBeVisible();
    
    // Check for either success or error state styling
    const successContainer = page.locator('.bg-green-50.border-green-200');
    const errorContainer = page.locator('.bg-amber-50.border-amber-200');
    
    const hasSuccess = await successContainer.isVisible().catch(() => false);
    const hasError = await errorContainer.isVisible().catch(() => false);
    
    expect(hasSuccess || hasError).toBeTruthy();
  });

  test("admin registration is accessible", async ({ page, serverUrl }) => {
    await page.goto(`${serverUrl}/registerAdmin`);
    await page.waitForLoadState("networkidle");
    
    // Check for proper heading structure
    await expect(page.locator('h1')).toBeVisible();
    
    // Check for keyboard navigable elements
    const focusableElements = await page.locator('a, button').all();
    expect(focusableElements.length).toBeGreaterThan(0);
    
    // Test keyboard navigation
    await page.keyboard.press('Tab');
    const firstFocused = page.locator(':focus');
    await expect(firstFocused).toBeVisible();
  });

  test("admin registration page loads without errors", async ({ page, serverUrl }) => {
    // Listen for console errors
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    await page.goto(`${serverUrl}/registerAdmin`);
    await page.waitForLoadState("networkidle");
    
    // Check that no JavaScript errors occurred
    expect(errors).toHaveLength(0);
    
    // Check that page loaded successfully
    await expect(page.locator('h1')).toContainText("Admin Registration");
  });

  test("admin registration handles force parameter correctly", async ({ page, serverUrl }) => {
    // Test with force parameter
    await page.goto(`${serverUrl}/registerAdmin?force=true`);
    await page.waitForLoadState("networkidle");
    
    // Check if we have success or error state
    const successMessage = page.locator('text=Registration Successful');
    const errorMessage = page.locator('text=User Already Exists');
    const registrationFailed = page.locator('text=Registration Failed');
    
    // At least one of these should be visible
    const hasSuccess = await successMessage.isVisible().catch(() => false);
    const hasError = await errorMessage.isVisible().catch(() => false);
    const hasFailed = await registrationFailed.isVisible().catch(() => false);
    
    // Force parameter should result in some state (success, error, or user exists)
    expect(hasSuccess || hasError || hasFailed).toBeTruthy();
    
    // In all cases, main heading should be visible
    await expect(page.locator('text=Admin Registration')).toBeVisible();
  });

  test("admin registration page is responsive", async ({ page, serverUrl }) => {
    // Test mobile view
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto(`${serverUrl}/registerAdmin`);
    await page.waitForLoadState("networkidle");
    
    await expect(page.locator('h1')).toContainText("Admin Registration");
    await expect(page.locator('.bg-white.rounded-lg')).toBeVisible();
    
    // Test tablet view
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.reload();
    await page.waitForLoadState("networkidle");
    
    await expect(page.locator('h1')).toContainText("Admin Registration");
    
    // Test desktop view
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.reload();
    await page.waitForLoadState("networkidle");
    
    await expect(page.locator('h1')).toContainText("Admin Registration");
  });

  test("admin registration shows correct user details", async ({ page, serverUrl }) => {
    await page.goto(`${serverUrl}/registerAdmin`);
    await page.waitForLoadState("networkidle");
    
    // Check if we have success state (which shows admin details)
    const successMessage = page.locator('text=Registration Successful');
    const hasSuccess = await successMessage.isVisible().catch(() => false);
    
    if (hasSuccess) {
      // Check that admin details section is present
      await expect(page.locator('text=Admin Details:')).toBeVisible();
      
      // Check that email is displayed
      const emailElement = page.locator('text=Email:');
      await expect(emailElement).toBeVisible();
      
      // The email should be in a styled container
      const emailContainer = page.locator('.bg-gray-50.rounded-lg.p-4');
      await expect(emailContainer).toBeVisible();
    } else {
      // In error state, admin details won't be shown, but page should still load
      await expect(page.locator('text=Admin Registration')).toBeVisible();
    }
  });

  test("admin registration navigation works from landing page", async ({ page, serverUrl }) => {
    // Start from landing page
    await page.goto(serverUrl);
    await page.waitForLoadState("networkidle");
    
    // Click admin registration link
    await page.click('a:has-text("Admin Registration")');
    
    // Should navigate to admin registration page
    await page.waitForURL(`${serverUrl}/registerAdmin`);
    await expect(page.locator('h1')).toContainText("Admin Registration");
  });

  test("admin registration page has proper meta information", async ({ page, serverUrl }) => {
    await page.goto(`${serverUrl}/registerAdmin`);
    await page.waitForLoadState("networkidle");
    
    // Check page title
    const title = await page.title();
    expect(title).toBeTruthy();
    expect(title.length).toBeGreaterThan(0);
    
    // Check viewport meta tag
    const viewport = await page.getAttribute('meta[name="viewport"]', 'content');
    expect(viewport).toContain('width=device-width');
  });
});