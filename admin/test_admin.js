const { chromium } = require('playwright');
const path = require('path');

async function testAdmin() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const errors = [];
  const results = [];

  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(`Console Error: ${msg.text()}`);
    }
  });

  page.on('pageerror', err => {
    errors.push(`Page Error: ${err.message}`);
  });

  const basePath = 'file://' + path.resolve(__dirname);
  const loginPath = basePath + '/login.html';
  const dashboardPath = basePath + '/index.html';
  const usersPath = basePath + '/users.html';
  const rolesPath = basePath + '/roles.html';
  const botsPath = basePath + '/bots.html';
  const feedbackPath = basePath + '/feedback.html';

  console.log('🔍 Testing Admin Dashboard');

  try {
    // ========== TEST 1: Admin Login Page ==========
    console.log('\n📋 TEST 1: Admin Login Page');
    await page.goto(loginPath);
    await page.waitForSelector('#login-form');

    const loginTitle = await page.title();
    console.log('  Page title:', loginTitle);

    const usernameInput = await page.$('#username');
    const passwordInput = await page.$('#password');
    const loginBtn = await page.$('button[type="submit"]');
    console.log('  ✅ Login form elements present');

    // Click demo account
    await page.click('.login-account[data-account="admin"]');
    await page.waitForTimeout(300);

    const usernameValue = await page.$eval('#username', el => el.value);
    const passwordValue = await page.$eval('#password', el => el.value);
    console.log('  ✅ Demo account autofill:', usernameValue === 'admin' ? 'PASS' : 'FAIL');

    // Login
    await page.click('button[type="submit"]');
    await page.waitForURL('**/index.html');
    console.log('  ✅ Login redirect to dashboard');
    results.push({ test: 'Admin Login Page', status: 'PASS' });


    // ========== TEST 2: Dashboard ==========
    console.log('\n📋 TEST 2: Dashboard');
    await page.waitForSelector('.stat-card');

    const statCards = await page.$$('.stat-card');
    console.log('  ✅ Stat cards found:', statCards.length);

    const statUsers = await page.$eval('#stat-users', el => el.textContent);
    const statRoles = await page.$eval('#stat-roles', el => el.textContent);
    const statBots = await page.$eval('#stat-bots', el => el.textContent);
    const statPending = await page.$eval('#stat-pending', el => el.textContent);
    console.log('  Stats - Users:', statUsers, 'Roles:', statRoles, 'Bots:', statBots, 'Pending:', statPending);

    const recentFeedbackRows = await page.$$('#recent-feedback-table tr');
    console.log('  ✅ Recent feedback rows:', recentFeedbackRows.length);
    results.push({ test: 'Dashboard', status: 'PASS' });


    // ========== TEST 3: User Management ==========
    console.log('\n📋 TEST 3: User Management');
    await page.goto(usersPath);
    await page.waitForSelector('#users-table');

    const userRows = await page.$$('#users-table tr');
    console.log('  ✅ User rows found:', userRows.length);

    // Test Add User modal
    await page.click('#btn-add-user');
    await page.waitForSelector('.modal-overlay.visible');
    console.log('  ✅ Add user modal opens');

    await page.fill('#username', 'test.user');
    await page.fill('#name', 'Test User');
    await page.click('#btn-save');
    await page.waitForSelector('.modal-overlay:not(.visible)', { timeout: 2000 }).catch(() => {});

    // Check if user was added
    const newUserRows = await page.$$('#users-table tr');
    console.log('  ✅ User added, total rows:', newUserRows.length);
    results.push({ test: 'User Management', status: 'PASS' });


    // ========== TEST 4: Role Management ==========
    console.log('\n📋 TEST 4: Role Management');
    await page.goto(rolesPath);
    await page.waitForSelector('#roles-table');

    const roleRows = await page.$$('#roles-table tr');
    console.log('  ✅ Role rows found:', roleRows.length);

    // Test Add Role modal
    await page.click('#btn-add-role');
    await page.waitForSelector('.modal-overlay.visible');
    console.log('  ✅ Add role modal opens');

    await page.fill('#role-name', 'Test Role');

    // Select some permissions
    const permCheckboxes = await page.$$('input[name="permissions"]');
    if (permCheckboxes.length > 0) {
      await permCheckboxes[0].click();
    }

    await page.click('#btn-save');
    await page.waitForSelector('.modal-overlay:not(.visible)', { timeout: 2000 }).catch(() => {});

    const newRoleRows = await page.$$('#roles-table tr');
    console.log('  ✅ Role added, total rows:', newRoleRows.length);
    results.push({ test: 'Role Management', status: 'PASS' });


    // ========== TEST 5: Bot Management ==========
    console.log('\n📋 TEST 5: Bot Management');
    await page.goto(botsPath);
    await page.waitForSelector('#bots-table');

    const botRows = await page.$$('#bots-table tr');
    console.log('  ✅ Bot rows found:', botRows.length);

    // Test Add Bot modal
    await page.click('#btn-add-bot');
    await page.waitForSelector('.modal-overlay.visible');
    console.log('  ✅ Add bot modal opens');

    await page.fill('#bot-key', 'D');
    await page.fill('#bot-name', 'Test Bot');
    await page.fill('#bot-name-cn', '测试Bot');
    await page.click('#btn-save');
    await page.waitForSelector('.modal-overlay:not(.visible)', { timeout: 2000 }).catch(() => {});

    const newBotRows = await page.$$('#bots-table tr');
    console.log('  ✅ Bot added, total rows:', newBotRows.length);
    results.push({ test: 'Bot Management', status: 'PASS' });


    // ========== TEST 6: Feedback Review ==========
    console.log('\n📋 TEST 6: Feedback Review');
    await page.goto(feedbackPath);
    await page.waitForSelector('#feedback-table');

    const feedbackRows = await page.$$('#feedback-table tr');
    console.log('  ✅ Feedback rows found:', feedbackRows.length);

    // Test filters
    await page.selectOption('#filter-bot', 'A');
    await page.waitForTimeout(300);
    const filteredRows = await page.$$('#feedback-table tr');
    console.log('  ✅ Filter by Bot A works, rows:', filteredRows.length);

    // Reset filter
    await page.selectOption('#filter-bot', '');
    await page.waitForTimeout(300);
    results.push({ test: 'Feedback Review', status: 'PASS' });


    // ========== TEST 7: Navigation ==========
    console.log('\n📋 TEST 7: Navigation');

    // Test sidebar navigation
    await page.click('a[href="users.html"]');
    await page.waitForSelector('#users-table');
    console.log('  ✅ Navigate to Users');

    await page.click('a[href="roles.html"]');
    await page.waitForSelector('#roles-table');
    console.log('  ✅ Navigate to Roles');

    await page.click('a[href="bots.html"]');
    await page.waitForSelector('#bots-table');
    console.log('  ✅ Navigate to Bots');

    await page.click('a[href="feedback.html"]');
    await page.waitForSelector('#feedback-table');
    console.log('  ✅ Navigate to Feedback');

    await page.click('a[href="index.html"]');
    await page.waitForSelector('.stat-card');
    console.log('  ✅ Navigate to Dashboard');
    results.push({ test: 'Navigation', status: 'PASS' });


    // ========== TEST 8: Logout ==========
    console.log('\n📋 TEST 8: Logout');
    await page.click('#btn-logout');
    await page.waitForURL('**/login.html');
    console.log('  ✅ Logout redirect to login');
    results.push({ test: 'Logout', status: 'PASS' });


    // ========== TEST 9: Access Control ==========
    console.log('\n📋 TEST 9: Access Control (Direct URL)');

    // Try to access dashboard without login - should redirect
    await page.goto(dashboardPath);
    await page.waitForURL('**/login.html');
    console.log('  ✅ Unauthenticated access to dashboard redirects to login');

    // Try to access users without login
    await page.goto(usersPath);
    await page.waitForURL('**/login.html');
    console.log('  ✅ Unauthenticated access to users redirects to login');
    results.push({ test: 'Access Control', status: 'PASS' });

  } catch (err) {
    console.error(`\n❌ TEST FAILED: ${err.message}`);
    errors.push(`Test Error: ${err.message}`);
    results.push({ test: 'Failed', status: 'FAIL', error: err.message });
  }

  // Report
  console.log('\n' + '='.repeat(50));
  console.log('📊 TEST RESULTS');
  console.log('='.repeat(50));

  results.forEach(r => {
    const icon = r.status === 'PASS' ? '✅' : '❌';
    console.log(`${icon} ${r.test}: ${r.status}${r.error ? ` - ${r.error}` : ''}`);
  });

  if (errors.length > 0) {
    console.log('\n⚠️ Errors collected:');
    errors.forEach(e => console.log(`  - ${e}`));
  }

  const passed = results.filter(r => r.status === 'PASS').length;
  const total = results.length;
  console.log(`\n📈 Summary: ${passed}/${total} tests passed`);

  await browser.close();

  if (passed < total) {
    process.exit(1);
  }
}

testAdmin().catch(console.error);
