const { test, expect } = require('@playwright/test');

test.describe('Auth: stale refresh token does not block login', () => {
  test('admin: expired refresh token in localStorage should not block login', async ({ page }) => {
    // Simulate the exact user scenario: old expired refresh token in localStorage
    await page.goto('http://localhost/admin/login.html');
    await page.evaluate(() => {
      localStorage.setItem('kb_admin_refresh_token', 'expired-jwt-token-that-will-fail');
      localStorage.setItem('kb_admin_access_expires', '0');
    });

    // Verify the stale token is there
    const staleToken = await page.evaluate(() => localStorage.getItem('kb_admin_refresh_token'));
    expect(staleToken).toBe('expired-jwt-token-that-will-fail');

    // Now try to login - this should SUCCEED despite the stale token
    await page.waitForLoadState('networkidle');
    await page.fill('#username', 'admin');
    await page.fill('#password', 'admin123');
    await page.click('button[type="submit"]');

    // Should redirect to index.html (not stay on login or show error)
    await page.waitForURL('**/admin/index.html', { timeout: 10000 });
    await page.waitForTimeout(3000);

    const currentUrl = page.url();
    console.log('URL after login with stale token:', currentUrl);

    // Should NOT be on login page
    expect(currentUrl).not.toContain('login.html');

    // Should have a valid refresh token now (not the stale one)
    const newToken = await page.evaluate(() => localStorage.getItem('kb_admin_refresh_token'));
    expect(newToken).not.toBe('expired-jwt-token-that-will-fail');
    expect(newToken).toBeTruthy();
  });

  test('user: expired refresh token in localStorage should not block login', async ({ page }) => {
    await page.goto('http://localhost/demo/index.html');
    await page.evaluate(() => {
      localStorage.setItem('kb_refresh_token', 'expired-jwt-token-that-will-fail');
      localStorage.setItem('kb_access_expires', '0');
    });

    await page.waitForLoadState('networkidle');
    await page.fill('#username', 'hq-admin');
    await page.fill('#password', 'password123');
    await page.click('button[type="submit"]');

    await page.waitForURL('**/demo/bots.html', { timeout: 10000 });
    await page.waitForTimeout(3000);

    const currentUrl = page.url();
    console.log('User URL after login with stale token:', currentUrl);
    expect(currentUrl).not.toContain('index.html');

    const newToken = await page.evaluate(() => localStorage.getItem('kb_refresh_token'));
    expect(newToken).not.toBe('expired-jwt-token-that-will-fail');
    expect(newToken).toBeTruthy();
  });
});

test.describe('Auth Flow Debug - Full Trace', () => {
  test('admin: full login trace with console capture', async ({ page }) => {
    // Capture ALL console messages
    const logs = [];
    page.on('console', msg => {
      logs.push(`[${msg.type()}] ${msg.text()}`);
    });

    // Capture network requests
    const requests = [];
    page.on('request', req => {
      if (req.url().includes('/api/')) {
        requests.push(`>> ${req.method()} ${req.url()}`);
      }
    });
    page.on('response', res => {
      if (res.url().includes('/api/')) {
        requests.push(`<< ${res.status()} ${res.url()}`);
      }
    });

    // Capture page errors
    const errors = [];
    page.on('pageerror', err => {
      errors.push(err.message);
    });

    // Step 1: Login
    console.log('=== Step 1: Login ===');
    await page.goto('http://localhost/admin/login.html');
    await page.waitForLoadState('networkidle');

    await page.fill('#username', 'admin');
    await page.fill('#password', 'admin123');
    await page.click('button[type="submit"]');

    // Step 2: Wait for redirect
    await page.waitForURL('**/admin/index.html', { timeout: 10000 });
    console.log('=== Step 2: Redirected to index.html ===');

    // Wait for all async operations to complete
    await page.waitForTimeout(5000);

    // Capture final state
    const state = await page.evaluate(() => {
      return {
        url: window.location.href,
        refreshToken: localStorage.getItem('kb_admin_refresh_token'),
        accessTokenInMemory: typeof TokenManager !== 'undefined' ? TokenManager.getAccessToken() : 'N/A',
        currentUser: typeof AdminApiService !== 'undefined' ? AdminApiService.getCurrentUser() : 'N/A',
        mode: typeof AdminApiService !== 'undefined' ? AdminApiService.getMode() : 'N/A',
      };
    });

    console.log('\n=== Final State ===');
    console.log('URL:', state.url);
    console.log('Refresh token:', state.refreshToken ? state.refreshToken.substring(0, 20) + '...' : 'NULL');
    console.log('Access token:', state.accessTokenInMemory ? 'exists' : 'null');
    console.log('Current user:', JSON.stringify(state.currentUser));
    console.log('Mode:', state.mode);

    console.log('\n=== Console Logs ===');
    logs.forEach(l => console.log(l));

    console.log('\n=== API Requests ===');
    requests.forEach(r => console.log(r));

    console.log('\n=== Page Errors ===');
    errors.forEach(e => console.log(e));

    // Check for failure indicators
    const toasts = await page.locator('.toast-warning, .toast-error').allTextContents();
    console.log('\n=== Toast Messages ===');
    console.log(toasts);

    expect(state.url).not.toContain('login.html');
  });

  test('user: full login trace with console capture', async ({ page }) => {
    const logs = [];
    page.on('console', msg => {
      logs.push(`[${msg.type()}] ${msg.text()}`);
    });
    const requests = [];
    page.on('request', req => {
      if (req.url().includes('/api/')) requests.push(`>> ${req.method()} ${req.url()}`);
    });
    page.on('response', res => {
      if (res.url().includes('/api/')) requests.push(`<< ${res.status()} ${res.url()}`);
    });
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));

    console.log('=== User Login ===');
    await page.goto('http://localhost/demo/index.html');
    await page.waitForLoadState('networkidle');

    await page.fill('#username', 'hq-admin');
    await page.fill('#password', 'password123');
    await page.click('button[type="submit"]');

    await page.waitForURL('**/demo/bots.html', { timeout: 10000 });
    await page.waitForTimeout(5000);

    const state = await page.evaluate(() => {
      return {
        url: window.location.href,
        refreshToken: localStorage.getItem('kb_refresh_token'),
        accessToken: typeof TokenManager !== 'undefined' ? TokenManager.getAccessToken() : 'N/A',
        currentUser: typeof ApiService !== 'undefined' ? ApiService.getCurrentUser() : 'N/A',
      };
    });

    console.log('\n=== Final State ===');
    console.log('URL:', state.url);
    console.log('Refresh token:', state.refreshToken ? 'exists' : 'NULL');
    console.log('Access token:', state.accessToken ? 'exists' : 'null');
    console.log('Current user:', JSON.stringify(state.currentUser));

    console.log('\n=== Console Logs ===');
    logs.forEach(l => console.log(l));

    console.log('\n=== API Requests ===');
    requests.forEach(r => console.log(r));

    console.log('\n=== Page Errors ===');
    errors.forEach(e => console.log(e));

    expect(state.url).not.toContain('index.html');
  });

  test('admin: login → refresh page → should still work', async ({ page }) => {
    const logs = [];
    page.on('console', msg => logs.push(`[${msg.type()}] ${msg.text()}`));

    // Login
    await page.goto('http://localhost/admin/login.html');
    await page.waitForLoadState('networkidle');
    await page.fill('#username', 'admin');
    await page.fill('#password', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/admin/index.html', { timeout: 10000 });
    await page.waitForTimeout(2000);

    // Now reload the page (simulates hard refresh)
    console.log('=== Reloading page ===');
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(5000);

    const state = await page.evaluate(() => ({
      url: window.location.href,
      refreshToken: localStorage.getItem('kb_admin_refresh_token'),
      accessToken: typeof TokenManager !== 'undefined' ? TokenManager.getAccessToken() : 'N/A',
    }));

    console.log('\n=== After Reload ===');
    console.log('URL:', state.url);
    console.log('Refresh token:', state.refreshToken ? 'exists' : 'NULL');
    console.log('Access token:', state.accessToken ? 'exists' : 'null');

    console.log('\n=== Console Logs After Reload ===');
    logs.filter(l => !l.includes('[log]')).forEach(l => console.log(l));
    // Show only errors/warnings
    const errorLogs = logs.filter(l => l.includes('[error]') || l.includes('[warning]'));
    console.log('\n=== Errors/Warnings After Reload ===');
    errorLogs.forEach(l => console.log(l));

    expect(state.url).not.toContain('login.html');
  });

  test('admin: login → navigate to announcements → should work', async ({ page }) => {
    const logs = [];
    page.on('console', msg => logs.push(`[${msg.type()}] ${msg.text()}`));

    // Login
    await page.goto('http://localhost/admin/login.html');
    await page.waitForLoadState('networkidle');
    await page.fill('#username', 'admin');
    await page.fill('#password', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/admin/index.html', { timeout: 10000 });
    await page.waitForTimeout(2000);

    // Navigate to announcements
    await page.goto('http://localhost/admin/announcements.html');
    await page.waitForTimeout(5000);

    const state = await page.evaluate(() => ({
      url: window.location.href,
      refreshToken: localStorage.getItem('kb_admin_refresh_token'),
    }));

    console.log('URL:', state.url);
    console.log('Refresh token:', state.refreshToken ? 'exists' : 'NULL');

    const errorLogs = logs.filter(l => l.includes('[error]'));
    if (errorLogs.length) {
      console.log('Errors:', errorLogs);
    }

    expect(state.url).not.toContain('login.html');
  });
});
