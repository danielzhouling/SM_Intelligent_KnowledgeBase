const { test, expect } = require('@playwright/test');

const ADMIN_LOGIN_URL = 'http://localhost/admin/login.html';

test.describe('TASK-M6-006: Admin Login Page Redesign', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto(ADMIN_LOGIN_URL);
  });

  test('should have dark gradient background on login-page', async ({ page }) => {
    const loginPage = page.locator('.login-page');
    await expect(loginPage).toBeVisible();

    const bg = await loginPage.evaluate(el => getComputedStyle(el).background);
    expect(bg).toContain('gradient');
  });

  test('should have centered login card with card styling', async ({ page }) => {
    const card = page.locator('.login-card');
    await expect(card).toBeVisible();
  });

  test('should have admin branding with logo', async ({ page }) => {
    const header = page.locator('.login-header');
    await expect(header).toBeVisible();

    // Should contain "Admin" in title
    const title = page.locator('.login-title');
    await expect(title).toContainText('Admin');
  });

  test('should have login form with labeled inputs', async ({ page }) => {
    await expect(page.locator('#login-form')).toBeVisible();
    await expect(page.locator('#username')).toBeVisible();
    await expect(page.locator('#password')).toBeVisible();
    await expect(page.locator('label[for="username"]')).toHaveCount(1);
    await expect(page.locator('label[for="password"]')).toHaveCount(1);
  });

  test('should have submit button with visible styling', async ({ page }) => {
    const btn = page.locator('#login-form button[type="submit"]');
    await expect(btn).toBeVisible();
  });

  test('should have demo account section', async ({ page }) => {
    const accounts = page.locator('.login-account');
    await expect(accounts).toHaveCount(1);
  });

  test('should load JS scripts without errors', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));
    await page.reload();
    await page.waitForTimeout(1000);
    expect(errors).toEqual([]);
  });

  test('mobile: login card should adapt to small screen', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    const card = page.locator('.login-card');
    await expect(card).toBeVisible();
  });
});
