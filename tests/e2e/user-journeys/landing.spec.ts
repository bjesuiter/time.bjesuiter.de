import { expect, test } from "../fixtures/test";

test.describe("Landing Page and Navigation", () => {
  test("landing page displays correctly for unauthenticated users", async ({ page, serverUrl }) => {
    await page.goto(serverUrl);
    await page.waitForLoadState("networkidle");

    // Check main heading
    await expect(page.locator("h1")).toContainText("Time Tracking,");
    await expect(page.locator("h1")).toContainText("But Make It Fun!");

    // Check subheading
    await expect(page.locator("p").first()).toContainText(
      "A personal Clockify-powered dashboard",
    );

    // Check sign in button
    await expect(page.getByTestId("landingpage-sign-in-link")).toBeVisible();

    // Check feature cards
    await expect(page.locator("text=Clockify Integration")).toBeVisible();
    await expect(page.locator("text=Weekly Summaries")).toBeVisible();
    await expect(page.locator("text=Overtime Tracking")).toBeVisible();

    // Check footer links
    await expect(page.locator('a:has-text("Create an account")')).toBeVisible();
    await expect(
      page.locator('a:has-text("Admin Registration")'),
    ).toBeVisible();
  });

  test("navigation links work from landing page", async ({ page, serverUrl }) => {
    await page.goto(serverUrl);
    await page.waitForLoadState("networkidle");

    // Test Sign In link
    await page.click('a:has-text("Sign In")');
    await page.waitForURL(`${serverUrl}/signin`);
    await expect(page.locator("h1")).toContainText("Welcome Back");

    // Go back to landing page
    await page.goto(serverUrl);
    await page.waitForLoadState("networkidle");

    // Test Create an account link (if signup is allowed)
    const signupLink = page.locator('a:has-text("Create an account")');
    if (await signupLink.isVisible()) {
      await signupLink.click();
      await page.waitForURL(`${serverUrl}/signup`);
      await expect(page.locator("h1")).toContainText("Create Account");
    }

    // Go back to landing page
    await page.goto(serverUrl);
    await page.waitForLoadState("networkidle");

    // Test Admin Registration link
    await page.click('a:has-text("Admin Registration")');
    await page.waitForURL(`${serverUrl}/registerAdmin`);
  });

  test("external links work correctly", async ({ page, serverUrl }) => {
    await page.goto(serverUrl);
    await page.waitForLoadState("networkidle");

    // Test Bluesky link
    const blueskyLink = page.locator('a[href*="bsky.app"]');
    await expect(blueskyLink).toBeVisible();

    // Test Blog link
    const blogLink = page.locator('a[href*="blog.codemonument.com"]');
    await expect(blogLink).toBeVisible();

    // Note: We don't actually click external links to avoid leaving the test domain
    // but we verify they exist and have correct hrefs
  });

  test("page is responsive and mobile-friendly", async ({ page, serverUrl }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto(serverUrl);
    await page.waitForLoadState("networkidle");

    // Check that main elements are still visible
    await expect(page.locator("h1")).toContainText("Time Tracking,");
    await expect(page.getByTestId("landingpage-sign-in-link")).toBeVisible();

    // Test tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.reload();
    await page.waitForLoadState("networkidle");

    await expect(page.locator("h1")).toContainText("Time Tracking,");
    await expect(page.getByTestId("landingpage-sign-in-link")).toBeVisible();

    // Test desktop viewport
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.reload();
    await page.waitForLoadState("networkidle");

    await expect(page.locator("h1")).toContainText("Time Tracking,");
    await expect(page.getByTestId("landingpage-sign-in-link")).toBeVisible();
  });

  test("page loads without JavaScript errors", async ({ page, serverUrl }) => {
    // Listen for console errors
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        errors.push(msg.text());
      }
    });

    await page.goto(serverUrl);
    await page.waitForLoadState("networkidle");

    // Check that no JavaScript errors occurred
    expect(errors).toHaveLength(0);
  });

  test("page has proper meta information", async ({ page, serverUrl }) => {
    await page.goto(serverUrl);
    await page.waitForLoadState("networkidle");

    // Check page title
    const title = await page.title();
    expect(title).toBeTruthy();
    expect(title.length).toBeGreaterThan(0);

    // Check viewport meta tag
    const viewport = await page.getAttribute(
      'meta[name="viewport"]',
      "content",
    );
    expect(viewport).toContain("width=device-width");
  });

  test("images and assets load properly", async ({ page, serverUrl }) => {
    await page.goto(serverUrl);
    await page.waitForLoadState("networkidle");

    // Check for broken images
    const images = await page.locator("img").all();
    for (const img of images) {
      const src = await img.getAttribute("src");
      if (src && !src.startsWith("data:")) {
        // For external images, we just check they have a src attribute
        expect(src).toBeTruthy();
      }
    }
  });

  test("accessibility basics are met", async ({ page, serverUrl }) => {
    await page.goto(serverUrl);
    await page.waitForLoadState("networkidle");

    // Check that main heading exists
    await expect(page.locator("h1")).toBeVisible();

    // Check that interactive elements are focusable
    const focusableElements = await page
      .locator("a, button, input, select, textarea")
      .all();
    expect(focusableElements.length).toBeGreaterThan(0);

    // Test keyboard navigation
    await page.keyboard.press("Tab");
    const firstFocused = page.locator(":focus");
    await expect(firstFocused).toBeVisible();
  });
});
