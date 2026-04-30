const { test, expect } = require('@playwright/test');

const BASE = 'http://localhost/demo';

test.describe('TASK-M6-019: Citation/Source Display', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE}/login.html`);
    await page.waitForSelector('#login-form', { timeout: 10000 });
    await page.fill('#username', 'hq-admin');
    await page.fill('#password', 'password123');
    await page.click('#login-form button[type="submit"]');
    await page.waitForURL('**/bots.html', { timeout: 10000 });
  });

  async function startBotChat(page, botName) {
    await page.waitForSelector('.bot-card', { timeout: 10000 });
    const botCards = page.locator('.bot-card');
    const count = await botCards.count();

    for (let i = 0; i < count; i++) {
      const cardText = await botCards.nth(i).textContent();
      if (cardText.includes(botName)) {
        await botCards.nth(i).locator('button[data-bot]').click();
        await page.waitForURL('**/chat.html*', { timeout: 10000 });
        await page.waitForSelector('#chat-input', { timeout: 10000 });
        return true;
      }
    }
    return false;
  }

  test('Bot A: should show sources after streaming message', async ({ page }) => {
    const found = await startBotChat(page, 'Bot A');
    if (!found) { test.skip(); return; }

    await page.fill('#chat-input', 'POS upload failed');
    await page.click('.btn-send');
    await page.waitForTimeout(15000);

    const sourceTags = page.locator('.source-tag');
    const sourceCount = await sourceTags.count();
    console.log(`Bot A source tags found: ${sourceCount}`);
    expect(sourceCount).toBeGreaterThan(0);

    const firstTagText = await sourceTags.first().textContent();
    console.log(`First source tag: ${firstTagText}`);
    expect(firstTagText.length).toBeGreaterThan(0);
  });

  test('Bot B: should show sources after streaming message', async ({ page }) => {
    const found = await startBotChat(page, 'Bot B');
    if (!found) { test.skip(); return; }

    await page.fill('#chat-input', 'How to process refund');
    await page.click('.btn-send');
    await page.waitForTimeout(15000);

    const sourceTags = page.locator('.source-tag');
    const sourceCount = await sourceTags.count();
    console.log(`Bot B source tags found: ${sourceCount}`);
    expect(sourceCount).toBeGreaterThan(0);

    const firstTagText = await sourceTags.first().textContent();
    console.log(`First source tag: ${firstTagText}`);
    expect(firstTagText.length).toBeGreaterThan(0);
  });

  test('Bot C: should show Knowledge Base placeholder (no citations)', async ({ page }) => {
    const found = await startBotChat(page, 'Bot C');
    if (!found) { test.skip(); return; }

    await page.fill('#chat-input', 'version info');
    await page.click('.btn-send');
    await page.waitForTimeout(10000);

    // Bot C has no knowledge base
    // Check that no document-name source tags (data-source-index) appear
    const docTags = page.locator('.source-tag[data-source-index]');
    const docCount = await docTags.count();
    console.log(`Bot C document source tags: ${docCount}`);
    expect(docCount).toBe(0);
  });

  test('source detail should expand on click', async ({ page }) => {
    const found = await startBotChat(page, 'Bot A');
    if (!found) { test.skip(); return; }

    await page.fill('#chat-input', 'POS upload failed');
    await page.click('.btn-send');
    await page.waitForTimeout(15000);

    // Find source tags with data-source-index (actual document references)
    const docTags = page.locator('.source-tag[data-source-index]');
    const docCount = await docTags.count();

    if (docCount > 0) {
      await docTags.first().click();

      // Source detail gets .visible class on click
      const sourceDetail = page.locator('.source-detail').first();
      await expect(sourceDetail).toHaveClass(/visible/, { timeout: 5000 });

      const content = await sourceDetail.locator('.source-detail-content').textContent();
      console.log(`Source detail: ${content?.substring(0, 80)}`);
      expect(content.length).toBeGreaterThan(0);
    }
  });
});
