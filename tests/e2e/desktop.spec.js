import { test, expect } from '@playwright/test';

test.describe('mpOS Desktop', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.desktop-area');
  });

  test('should load desktop with icons', async ({ page }) => {
    const icons = page.locator('.desktop-icon');
    await expect(icons.first()).toBeVisible();
    const count = await icons.count();
    expect(count).toBeGreaterThanOrEqual(3);
  });

  test('should open and close a window via start menu', async ({ page }) => {
    // Click Start button
    await page.click('.start-btn');
    await expect(page.locator('.start-menu')).toHaveClass(/open/);

    // Click Help
    await page.click('[data-action="openHelp"]');
    await expect(page.locator('#help')).toBeVisible();

    // Close via titlebar button
    await page.click('#help .titlebar-btn[aria-label="Close"]');
    await expect(page.locator('#help')).toBeHidden();
  });

  test('should toggle language', async ({ page }) => {
    // Open System Properties
    await page.dblclick('.desktop-icon[data-icon="mycomputer"]');
    await expect(page.locator('#mycomputer')).toBeVisible();
  });

  test('should have correct page title', async ({ page }) => {
    await expect(page).toHaveTitle(/mpOS/);
  });

  test('should have CSP meta tag', async ({ page }) => {
    const csp = await page.getAttribute('meta[http-equiv="Content-Security-Policy"]', 'content');
    expect(csp).toContain("base-uri 'self'");
    expect(csp).toContain("default-src 'self'");
  });

  test('taskbar clock should display time', async ({ page }) => {
    const clock = page.locator('.tray-clock');
    await expect(clock).toBeVisible();
    const text = await clock.textContent();
    expect(text).toMatch(/\d{1,2}:\d{2}/);
  });
});

test.describe('Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.desktop-area');
  });

  test('windows should have dialog role', async ({ page }) => {
    await page.dblclick('.desktop-icon[data-icon="mycomputer"]');
    const win = page.locator('#mycomputer');
    await expect(win).toBeVisible();
    await expect(win).toHaveAttribute('role', 'dialog');
  });

  test('titlebar buttons should be keyboard accessible', async ({ page }) => {
    await page.dblclick('.desktop-icon[data-icon="mycomputer"]');
    const closeBtn = page.locator('#mycomputer .titlebar-btn[aria-label="Close"]');
    await closeBtn.focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('#mycomputer')).toBeHidden();
  });
});
