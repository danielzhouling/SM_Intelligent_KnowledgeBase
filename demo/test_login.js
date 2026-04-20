const { chromium } = require('playwright');
const path = require('path');

async function testLoginPage() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });

  page.on('pageerror', err => {
    errors.push(err.message);
  });

  const filePath = path.resolve(__dirname, 'index.html');
  await page.goto(`file://${filePath}`);

  // Wait for page to load
  await page.waitForSelector('#login-form');

  // Test 1: Check page title
  const title = await page.title();
  console.log('Page title:', title);

  // Test 2: Check demo accounts are present
  const demoAccounts = await page.$$('.login-account');
  console.log('Demo accounts found:', demoAccounts.length);

  // Test 3: Check all form fields exist
  const usernameInput = await page.$('#username');
  const passwordInput = await page.$('#password');
  const roleSelect = await page.$('#role');
  console.log('Username field exists:', !!usernameInput);
  console.log('Password field exists:', !!passwordInput);
  console.log('Role select exists:', !!roleSelect);

  // Test 4: Click on demo account and verify autofill
  await page.click('.login-account[data-account="hq-admin"]');
  await page.waitForTimeout(300);

  const usernameValue = await page.$eval('#username', el => el.value);
  const passwordValue = await page.$eval('#password', el => el.value);
  const roleValue = await page.$eval('#role', el => el.value);

  console.log('After clicking hq-admin demo account:');
  console.log('  Username:', usernameValue);
  console.log('  Password:', passwordValue);
  console.log('  Role:', roleValue);

  // Test 5: Try to login with wrong password
  await page.fill('#password', 'wrongpassword');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(500);

  // Check if error toast appeared (wrong password should show error)
  const toastError = await page.$('.toast-error');
  console.log('Error toast after wrong password:', !!toastError);

  // Test 6: Login with correct credentials
  await page.fill('#password', 'password123');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(1000);

  // Should redirect to bots.html
  const currentUrl = page.url();
  console.log('After successful login, URL:', currentUrl);

  if (errors.length > 0) {
    console.log('\nConsole Errors:', errors);
  } else {
    console.log('\nNo console errors detected!');
  }

  await browser.close();

  // Summary
  console.log('\n=== TEST SUMMARY ===');
  console.log('Demo accounts:', demoAccounts.length === 3 ? 'PASS' : 'FAIL');
  console.log('Form fields:', (usernameInput && passwordInput && roleSelect) ? 'PASS' : 'FAIL');
  console.log('Demo account autofill:', (usernameValue === 'hq-admin' && passwordValue === 'password123') ? 'PASS' : 'FAIL');
  console.log('Console errors:', errors.length === 0 ? 'PASS' : 'FAIL');
}

testLoginPage().catch(console.error);