const { test, expect } = require('@playwright/test');

const BOTS_URL = 'http://localhost/demo/bots.html';

test.describe('TASK-M6-003: Bot Selection Page Redesign', () => {

  test.beforeEach(async ({ page }) => {
    // Login first to access bots page
    await page.goto('http://localhost/demo/index.html');
    await page.fill('#username', 'admin');
    await page.fill('#password', 'admin123');
    await page.click('.btn-login');
    await page.waitForURL('**/bots.html');
  });

  test('should have dark header (.header with dark background)', async ({ page }) => {
    const header = page.locator('.header');
    await expect(header).toBeVisible();

    const bgColor = await header.evaluate(el => getComputedStyle(el).backgroundColor);
    // Dark header should not be white/light — rgb values should be low
    const match = bgColor.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    expect(match).toBeTruthy();
    const r = parseInt(match[1]), g = parseInt(match[2]), b = parseInt(match[3]);
    expect(r + g + b).toBeLessThan(400); // dark-ish background
  });

  test('should have brand logo in header', async ({ page }) => {
    const brandIcon = page.locator('.brand-icon');
    await expect(brandIcon).toBeAttached();
    // SVG should exist inside
    const svg = brandIcon.locator('svg');
    await expect(svg).toBeAttached();
  });

  test('should have user info section in header', async ({ page }) => {
    const userName = page.locator('#user-name');
    await expect(userName).toBeAttached();
    const userRole = page.locator('#user-role');
    await expect(userRole).toBeAttached();
  });

  test('should have logout button', async ({ page }) => {
    const logoutBtn = page.locator('#btn-logout');
    await expect(logoutBtn).toBeVisible();
  });

  test('should have bots-grid with auto-fit responsive grid', async ({ page }) => {
    const grid = page.locator('#bots-grid');
    await expect(grid).toBeVisible();

    const display = await grid.evaluate(el => getComputedStyle(el).display);
    expect(display).toBe('grid');
  });

  test('should render bot cards with header/body/footer structure', async ({ page }) => {
    // Wait for bots to render
    await page.waitForSelector('.bot-card', { timeout: 5000 });

    const cards = page.locator('.bot-card');
    const count = await cards.count();
    expect(count).toBeGreaterThanOrEqual(1);

    // First card should have header/body/footer
    const firstCard = cards.first();
    await expect(firstCard.locator('.bot-card-header')).toBeVisible();
    await expect(firstCard.locator('.bot-card-body')).toBeVisible();
    await expect(firstCard.locator('.bot-card-footer')).toBeVisible();
  });

  test('should use gradient badge instead of robot face avatar', async ({ page }) => {
    await page.waitForSelector('.bot-badge', { timeout: 10000 });

    // Old robot face elements should NOT exist
    const robotFace = page.locator('.bot-face');
    await expect(robotFace).toHaveCount(0);

    const botEyes = page.locator('.bot-eyes');
    await expect(botEyes).toHaveCount(0);

    // New gradient badges should exist
    const badge = page.locator('.bot-badge').first();
    await expect(badge).toBeAttached();

    // Badge should contain a letter (A, B, C, D, etc.)
    const text = await badge.textContent();
    expect(text.trim()).toMatch(/^[A-Z]$/);
  });

  test('bot badges should have gradient backgrounds', async ({ page }) => {
    await page.waitForSelector('.bot-badge', { timeout: 10000 });

    // Check that at least one badge has a gradient background
    const badges = page.locator('.bot-badge');
    const count = await badges.count();

    let foundGradient = false;
    for (let i = 0; i < count; i++) {
      const bg = await badges.nth(i).evaluate(el => getComputedStyle(el).background);
      if (bg.includes('gradient')) {
        foundGradient = true;
        break;
      }
    }
    expect(foundGradient).toBe(true);
  });

  test('should have bot status indicator', async ({ page }) => {
    await page.waitForSelector('.bot-card', { timeout: 5000 });

    const status = page.locator('.bot-status').first();
    await expect(status).toBeVisible();
  });

  test('should have Start Chat button in card footer', async ({ page }) => {
    await page.waitForSelector('.bot-card-footer', { timeout: 5000 });

    const btn = page.locator('.bot-card-footer .btn-block').first();
    await expect(btn).toBeVisible();
    await expect(btn).toContainText('Start Chat');
  });

  test('should load JS scripts without errors', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));
    await page.reload();
    await page.waitForTimeout(1000);
    expect(errors).toEqual([]);
  });

  test('mobile: bots-grid should be single column below 768px', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    const grid = page.locator('#bots-grid');
    const columns = await grid.evaluate(el =>
      getComputedStyle(el).gridTemplateColumns
    );
    const colCount = columns.split(' ').filter(c => c.trim()).length;
    expect(colCount).toBe(1);
  });

  test('mobile: should show mobile-menu-btn below 768px', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.waitForTimeout(500);
    const mobileBtn = page.locator('.mobile-menu-btn');
    await expect(mobileBtn).toBeAttached();
    const display = await mobileBtn.evaluate(el => getComputedStyle(el).display);
    expect(display).toBe('flex');
  });

  test('clicking Start Chat navigates to chat.html', async ({ page }) => {
    await page.waitForSelector('.bot-card-footer .btn-block', { timeout: 5000 });

    const btn = page.locator('.bot-card-footer .btn-block').first();
    await btn.click();
    await page.waitForURL('**/chat.html**', { timeout: 5000 });
    expect(page.url()).toContain('chat.html');
  });
});
