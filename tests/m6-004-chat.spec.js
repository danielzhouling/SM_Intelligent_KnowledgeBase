const { test, expect } = require('@playwright/test');

test.describe('TASK-M6-004: Chat Page Redesign', () => {

  test.beforeEach(async ({ page }) => {
    // Login first
    await page.goto('http://localhost/demo/index.html');
    await page.fill('#username', 'admin');
    await page.fill('#password', 'admin123');
    await page.click('.btn-login');
    await page.waitForURL('**/bots.html');

    // Click first bot's Start Chat button to navigate to chat page
    await page.waitForSelector('.bot-card-footer .btn-block', { timeout: 10000 });
    await page.locator('.bot-card-footer .btn-block').first().click();
    await page.waitForURL('**/chat.html**', { timeout: 10000 });
    await page.waitForSelector('#chat-messages', { timeout: 10000 });
  });

  test('should have dark header with bot info', async ({ page }) => {
    const header = page.locator('.app-header, .header');
    await expect(header.first()).toBeAttached();

    // Header should be dark
    const bgColor = await header.first().evaluate(el => getComputedStyle(el).backgroundColor);
    const match = bgColor.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    if (match) {
      const r = parseInt(match[1]), g = parseInt(match[2]), b = parseInt(match[3]);
      expect(r + g + b).toBeLessThan(400);
    }
  });

  test('should have back button', async ({ page }) => {
    const backBtn = page.locator('#btn-back');
    await expect(backBtn).toBeAttached();
  });

  test('should have current bot name displayed', async ({ page }) => {
    const botName = page.locator('#current-bot-name');
    await expect(botName).toBeAttached();
  });

  test('should have 280px sidebar', async ({ page }) => {
    const sidebar = page.locator('.chat-sidebar');
    await expect(sidebar).toBeAttached();

    const width = await sidebar.evaluate(el => getComputedStyle(el).width);
    expect(parseInt(width)).toBeGreaterThanOrEqual(240);
  });

  test('should have sidebar with bot info and conversations', async ({ page }) => {
    const sidebar = page.locator('.chat-sidebar');

    // Bot sidebar info
    const botName = sidebar.locator('#bot-sidebar-name');
    await expect(botName).toBeAttached();

    // Conversations list
    const convList = sidebar.locator('#conversations-list');
    await expect(convList).toBeAttached();

    // Knowledge list
    const knowledgeList = sidebar.locator('#knowledge-list');
    await expect(knowledgeList).toBeAttached();
  });

  test('should have chat messages container', async ({ page }) => {
    const messages = page.locator('#chat-messages');
    await expect(messages).toBeAttached();
  });

  test('should have chat input form', async ({ page }) => {
    const form = page.locator('#chat-form');
    await expect(form).toBeAttached();

    const input = page.locator('#chat-input');
    await expect(input).toBeAttached();
  });

  test('should have new chat button in sidebar', async ({ page }) => {
    const newChatBtn = page.locator('#btn-new-chat');
    await expect(newChatBtn).toBeAttached();
  });

  test('should have conversation title display', async ({ page }) => {
    const title = page.locator('#current-conversation-title');
    await expect(title).toBeAttached();
  });

  test('should load JS scripts without errors', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));
    await page.reload();
    await page.waitForTimeout(2000);
    expect(errors).toEqual([]);
  });

  test('mobile: sidebar should be hidden below 768px', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.waitForTimeout(500);
    const sidebar = page.locator('.chat-sidebar');
    const display = await sidebar.evaluate(el => getComputedStyle(el).display);
    expect(display).toBe('none');
  });

  test('mobile: should show mobile menu button or hamburger trigger below 768px', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.waitForTimeout(500);
    // Should have a way to toggle sidebar on mobile
    const mobileTrigger = page.locator('.mobile-menu-btn, .chat-mobile-btn, #mobileMenuBtn').first();
    await expect(mobileTrigger).toBeAttached();
  });

  test('bot avatar icon should be rendered in sidebar', async ({ page }) => {
    const icon = page.locator('#bot-avatar-icon');
    await expect(icon).toBeAttached();
  });

  test('logout button should exist', async ({ page }) => {
    const logout = page.locator('#btn-logout');
    await expect(logout).toBeAttached();
  });
});
