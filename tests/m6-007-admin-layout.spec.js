const { test, expect } = require('@playwright/test');

test.describe('TASK-M6-007: Admin Layout Shell', () => {

  const adminPages = [
    { url: 'http://localhost/admin/index.html', name: 'Dashboard' },
    { url: 'http://localhost/admin/users.html', name: 'Users' },
    { url: 'http://localhost/admin/roles.html', name: 'Roles' },
    { url: 'http://localhost/admin/bots.html', name: 'Bots' },
    { url: 'http://localhost/admin/feedback.html', name: 'Feedback' },
  ];

  async function adminLogin(page) {
    await page.goto('http://localhost/admin/login.html');
    await page.waitForSelector('#login-form', { timeout: 5000 });

    // Fill and submit admin login form
    await page.fill('#username', 'admin');
    await page.fill('#password', 'admin123');
    await page.click('#login-form button[type="submit"]');

    // Wait for redirect or page load
    await page.waitForTimeout(2000);
  }

  for (const adminPage of adminPages) {
    test(`${adminPage.name}: should have admin-sidebar`, async ({ page }) => {
      await adminLogin(page);
      await page.goto(adminPage.url);
      await page.waitForSelector('.admin-sidebar', { timeout: 10000 });

      const sidebar = page.locator('.admin-sidebar');
      await expect(sidebar).toBeAttached();
    });

    test(`${adminPage.name}: sidebar should be dark background`, async ({ page }) => {
      await adminLogin(page);
      await page.goto(adminPage.url);
      await page.waitForSelector('.admin-sidebar', { timeout: 10000 });

      const sidebar = page.locator('.admin-sidebar');
      const bgColor = await sidebar.evaluate(el => getComputedStyle(el).backgroundColor);
      const match = bgColor.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
      if (match) {
        const r = parseInt(match[1]), g = parseInt(match[2]), b = parseInt(match[3]);
        expect(r + g + b).toBeLessThan(400);
      }
    });

    test(`${adminPage.name}: should have nav items`, async ({ page }) => {
      await adminLogin(page);
      await page.goto(adminPage.url);
      await page.waitForSelector('.nav-item', { timeout: 10000 });

      const navItems = page.locator('.nav-item');
      const count = await navItems.count();
      expect(count).toBeGreaterThanOrEqual(4);
    });

    test(`${adminPage.name}: should have logout button`, async ({ page }) => {
      await adminLogin(page);
      await page.goto(adminPage.url);
      await page.waitForSelector('#btn-logout', { timeout: 10000 });

      await expect(page.locator('#btn-logout')).toBeAttached();
    });

    test(`${adminPage.name}: should load without JS errors`, async ({ page }) => {
      await adminLogin(page);
      const errors = [];
      page.on('pageerror', err => errors.push(err.message));
      await page.goto(adminPage.url);
      await page.waitForTimeout(2000);
      expect(errors).toEqual([]);
    });

    test(`${adminPage.name}: mobile sidebar hidden <768px`, async ({ page }) => {
      await adminLogin(page);
      await page.goto(adminPage.url);
      await page.waitForSelector('.admin-sidebar', { timeout: 10000 });
      await page.setViewportSize({ width: 375, height: 812 });
      await page.waitForTimeout(500);

      const sidebar = page.locator('.admin-sidebar');
      const display = await sidebar.evaluate(el => getComputedStyle(el).display);
      expect(display).toBe('none');
    });

    test(`${adminPage.name}: mobile should have menu trigger <768px`, async ({ page }) => {
      await adminLogin(page);
      await page.goto(adminPage.url);
      await page.waitForSelector('.admin-sidebar', { timeout: 10000 });
      await page.setViewportSize({ width: 375, height: 812 });
      await page.waitForTimeout(500);

      const trigger = page.locator('#adminMobileBtn').first();
      await expect(trigger).toBeAttached();
    });
  }
});
