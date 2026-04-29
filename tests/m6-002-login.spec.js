const { test, expect } = require('@playwright/test');

const LOGIN_URL = 'http://localhost/demo/login.html';

test.describe('TASK-M6-002: User Login Page Redesign', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto(LOGIN_URL);
  });

  test('should have dark gradient background on login-page', async ({ page }) => {
    const loginPage = page.locator('.login-page');
    await expect(loginPage).toBeVisible();

    const bg = await loginPage.evaluate(el =>
      getComputedStyle(el).background || getComputedStyle(el).backgroundColor
    );
    // Should not be a flat light color — must be a gradient or dark
    expect(bg).toBeTruthy();
  });

  test('should have split-panel layout with login-container', async ({ page }) => {
    const container = page.locator('.login-container');
    await expect(container).toBeVisible();

    const display = await container.evaluate(el => getComputedStyle(el).display);
    expect(display).toBe('grid');
  });

  test('should have branding panel on left (login-left)', async ({ page }) => {
    const leftPanel = page.locator('.login-left');
    await expect(leftPanel).toBeVisible();

    // Should contain brand title and features
    await expect(page.locator('.brand-title')).toBeVisible();
    await expect(page.locator('.login-features')).toBeVisible();
  });

  test('should have login form panel on right (login-right)', async ({ page }) => {
    const rightPanel = page.locator('.login-right');
    await expect(rightPanel).toBeVisible();

    // Form elements must exist
    await expect(page.locator('#username')).toBeVisible();
    await expect(page.locator('#password')).toBeVisible();
    await expect(page.locator('.btn-login')).toBeVisible();
  });

  test('form inputs should have label associations', async ({ page }) => {
    const usernameInput = page.locator('#username');
    const usernameLabel = page.locator('label[for="username"]');
    await expect(usernameLabel).toHaveCount(1);

    const passwordInput = page.locator('#password');
    const passwordLabel = page.locator('label[for="password"]');
    await expect(passwordLabel).toHaveCount(1);
  });

  test('form inputs should have visible focus ring', async ({ page }) => {
    const username = page.locator('#username');
    await username.click();

    const boxShadow = await username.evaluate(el =>
      getComputedStyle(el).boxShadow
    );
    // Focus ring should produce a non-empty box-shadow
    expect(boxShadow).not.toBe('none');
    expect(boxShadow.length).toBeGreaterThan(0);
  });

  test('should have demo accounts section', async ({ page }) => {
    const accounts = page.locator('.login-account');
    await expect(accounts).toHaveCount(4);
  });

  test('should load JS scripts without errors', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));
    await page.reload();
    await page.waitForTimeout(1000);
    expect(errors).toEqual([]);
  });

  test('mobile: login-left should be hidden below 768px', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    const leftPanel = page.locator('.login-left');
    await expect(leftPanel).toBeHidden();
  });

  test('mobile: login-container should be single column below 768px', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    const container = page.locator('.login-container');
    const columns = await container.evaluate(el =>
      getComputedStyle(el).gridTemplateColumns
    );
    // Single column = only one value
    const colCount = columns.split(' ').filter(c => c.trim()).length;
    expect(colCount).toBe(1);
  });
});
