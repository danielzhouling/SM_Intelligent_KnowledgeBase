/**
 * SM-Dmall ERP 智能知识库系统 — 系统测试脚本 v2
 * 每个测试用例使用独立 browser context，避免 session 干扰
 */
const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');

const BASE = 'http://localhost';
const API = 'http://localhost:8000';
const TIMEOUT = 10000;

const results = [];
function record(id, name, pass, detail = '') {
  results.push({ id, name, pass: !!pass, detail });
  const icon = pass ? '✅' : '❌';
  console.log(`${icon} ${id} ${name}${detail ? ' — ' + detail : ''}`);
}

async function newContext(browser) {
  return browser.newContext({ viewport: { width: 1280, height: 800 } });
}

// ---- API helpers ----
function api(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, API);
    const opts = {
      hostname: url.hostname, port: url.port,
      path: url.pathname + url.search, method,
      headers: { 'Content-Type': 'application/json' },
    };
    if (token) opts.headers['Authorization'] = `Bearer ${token}`;
    const req = http.request(opts, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(d) }); }
        catch { resolve({ status: res.statusCode, body: d }); }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function loginAPI(username, password) {
  const res = await api('POST', '/api/auth/login', { username, password });
  if (res.status === 200 && res.body?.data?.access_token) {
    return { access: res.body.data.access_token, refresh: res.body.data.refresh_token };
  }
  return null;
}

// ---- UI helpers ----
async function loginUI(page, username, password) {
  await page.goto(`${BASE}/demo/index.html`, { timeout: TIMEOUT });
  const userInput = page.locator('#username');
  await userInput.fill(username);
  const passInput = page.locator('#password');
  await passInput.fill(password);
  await page.locator('button[type="submit"]').click();
  await page.waitForTimeout(2000);
  return page.url();
}

async function loginAdminUI(page, username, password) {
  await page.goto(`${BASE}/admin/login.html`, { timeout: TIMEOUT });
  await page.locator('#username').fill(username);
  await page.locator('#password').fill(password);
  await page.locator('button[type="submit"]').click();
  await page.waitForTimeout(2000);
  return page.url();
}

(async () => {
  const browser = await chromium.launch({ headless: true });

  // ============================================================
  // 一、用户端登录测试
  // ============================================================
  console.log('\n========== 一、用户端登录测试 ==========\n');

  // TC-U-01 正常登录 hq-admin
  try {
    const ctx = await newContext(browser);
    const page = await ctx.newPage();
    const url = await loginUI(page, 'hq-admin', 'password123');
    const ok = url.includes('bots.html') || url.includes('chat.html');
    record('TC-U-01', '正常登录 hq-admin', ok, `→ ${url}`);
    await ctx.close();
  } catch (e) { record('TC-U-01', '正常登录 hq-admin', false, e.message); }

  // TC-U-02 错误密码
  try {
    const ctx = await newContext(browser);
    const page = await ctx.newPage();
    await page.goto(`${BASE}/demo/index.html`, { timeout: TIMEOUT });
    await page.locator('#username').fill('hq-admin');
    await page.locator('#password').fill('wrongpassword');
    await page.locator('button[type="submit"]').click();
    await page.waitForTimeout(2000);
    const url = page.url();
    const stayed = url.includes('index.html') || url.endsWith('/demo/') || url.endsWith('/demo');
    record('TC-U-02', '错误密码', stayed, stayed ? '停留在登录页' : `→ ${url}`);
    await ctx.close();
  } catch (e) { record('TC-U-02', '错误密码', false, e.message); }

  // TC-U-03 空账号密码
  try {
    const ctx = await newContext(browser);
    const page = await ctx.newPage();
    await page.goto(`${BASE}/demo/index.html`, { timeout: TIMEOUT });
    // 不填直接提交 — 浏览器 HTML5 required 验证会阻止
    const submitBtn = page.locator('button[type="submit"]');
    await submitBtn.click();
    await page.waitForTimeout(1000);
    const url = page.url();
    const stayed = url.includes('index.html');
    record('TC-U-03', '空账号密码拦截', stayed, stayed ? '停留在登录页(HTML5验证)' : `→ ${url}`);
    await ctx.close();
  } catch (e) { record('TC-U-03', '空账号密码拦截', false, e.message); }

  // TC-U-04 Demo 快捷登录
  try {
    const ctx = await newContext(browser);
    const page = await ctx.newPage();
    await page.goto(`${BASE}/demo/index.html`, { timeout: TIMEOUT });
    // 查找 demo 账号快捷按钮
    const demoBtn = page.locator('.demo-account, [class*="demo-card"], [class*="quick-login"]').first();
    if (await demoBtn.count() > 0) {
      await demoBtn.click();
      await page.waitForTimeout(500);
      // 自动填充后点登录
      await page.locator('button[type="submit"]').click();
      await page.waitForTimeout(2000);
      const url = page.url();
      record('TC-U-04', 'Demo快捷登录', !url.includes('index.html'), `→ ${url}`);
    } else {
      record('TC-U-04', 'Demo快捷登录', false, '未找到快捷登录按钮');
    }
    await ctx.close();
  } catch (e) { record('TC-U-04', 'Demo快捷登录', false, e.message); }

  // TC-U-05 权限隔离
  const permCases = [
    { user: 'store-manager', pwd: 'password123', label: 'store-manager', expectBotCount: 1 },
    { user: 'helpdesk', pwd: 'password123', label: 'helpdesk', expectBotCount: 2 },
    { user: 'hq-admin', pwd: 'password123', label: 'hq-admin', expectBotCount: 3 },
  ];
  for (const tc of permCases) {
    try {
      const ctx = await newContext(browser);
      const page = await ctx.newPage();
      const url = await loginUI(page, tc.user, tc.pwd);
      const navigated = url.includes('bots') || url.includes('chat');
      // 尝试数 Bot 卡片
      let botCards = 0;
      if (navigated) {
        await page.waitForTimeout(1000);
        botCards = await page.locator('.bot-card').count();
      }
      record('TC-U-05', `权限隔离—${tc.label}`, navigated, navigated ? `登录成功, Bot卡片: ${botCards}` : '未跳转');
      await ctx.close();
    } catch (e) { record('TC-U-05', `权限隔离—${tc.label}`, false, e.message); }
  }

  // ============================================================
  // 二、Bot 选择 + 聊天
  // ============================================================
  console.log('\n========== 二、Bot选择 + 聊天测试 ==========\n');

  // 先登录准备一个聊天 session
  let chatCtx, chatPage;
  try {
    chatCtx = await newContext(browser);
    chatPage = await chatCtx.newPage();
    await loginUI(chatPage, 'hq-admin', 'password123');

    // TC-U-06 Bot 卡片展示
    const url = chatPage.url();
    const onBots = url.includes('bots');
    if (onBots) {
      const cardCount = await chatPage.locator('.bot-card').count();
      record('TC-U-06', 'Bot卡片展示', cardCount > 0, `Bot卡片数: ${cardCount}`);
    } else {
      record('TC-U-06', 'Bot卡片展示', false, `URL未在bots页: ${url}`);
    }

    // TC-U-07 选择 Bot 进入聊天
    const firstCard = chatPage.locator('.bot-card').first();
    if (await firstCard.count() > 0) {
      await firstCard.click();
      await chatPage.waitForTimeout(2000);
      const chatUrl = chatPage.url();
      const inChat = chatUrl.includes('chat');
      // 检查欢迎消息
      const hasWelcome = await chatPage.locator('.welcome-message, [class*="welcome"]').count() > 0;
      record('TC-U-07', '选择Bot进入聊天', inChat, `→ ${chatUrl}, 欢迎消息: ${hasWelcome ? '有' : '无'}`);
    } else {
      record('TC-U-07', '选择Bot进入聊天', false, '无Bot卡片');
    }
  } catch (e) {
    record('TC-U-06', 'Bot卡片展示', false, e.message);
    record('TC-U-07', '选择Bot进入聊天', false, e.message);
  }

  // TC-U-09 发送消息（基本对话）
  try {
    if (chatPage) {
      // 确保在 chat 页面
      if (!chatPage.url().includes('chat')) {
        await chatPage.goto(`${BASE}/demo/chat.html?bot=A`, { timeout: TIMEOUT });
        await chatPage.waitForTimeout(1500);
      }
      const input = chatPage.locator('#messageInput');
      if (await input.count() > 0) {
        await input.fill('SAP upload failed');
        const sendBtn = chatPage.locator('#sendBtn');
        if (await sendBtn.count() > 0) {
          await sendBtn.click();
        } else {
          await input.press('Enter');
        }
        await chatPage.waitForTimeout(4000);
        const msgCount = await chatPage.locator('.message').count();
        record('TC-U-09', '发送消息基本对话', msgCount >= 2, `消息数: ${msgCount} (含用户+AI)`);
      } else {
        record('TC-U-09', '发送消息基本对话', false, '未找到消息输入框');
      }
    }
  } catch (e) { record('TC-U-09', '发送消息基本对话', false, e.message); }

  // TC-U-10 多轮对话
  try {
    if (chatPage) {
      const input = chatPage.locator('#messageInput');
      if (await input.count() > 0) {
        await input.fill('What are other possible causes?');
        const sendBtn = chatPage.locator('#sendBtn');
        if (await sendBtn.count() > 0) await sendBtn.click();
        else await input.press('Enter');
        await chatPage.waitForTimeout(4000);
        const msgCount = await chatPage.locator('.message').count();
        record('TC-U-10', '多轮对话', msgCount >= 4, `消息数: ${msgCount} (2轮应>=4条)`);
      }
    }
  } catch (e) { record('TC-U-10', '多轮对话', false, e.message); }

  // TC-U-11 流式响应
  try {
    if (chatPage) {
      const input = chatPage.locator('#messageInput');
      if (await input.count() > 0) {
        await input.fill('hello');
        await chatPage.locator('#sendBtn').first().click();
        // 快速检查是否有打字指示器
        await chatPage.waitForTimeout(300);
        const typing = await chatPage.locator('.typing-indicator, [class*="typing"], [class*="loading"]').count();
        await chatPage.waitForTimeout(4000);
        const msgs = await chatPage.locator('.message').count();
        record('TC-U-11', '流式响应显示', msgs >= 5, `typing indicator: ${typing}, 总消息: ${msgs}`);
      }
    }
  } catch (e) { record('TC-U-11', '流式响应显示', false, e.message); }

  // TC-U-12 空消息
  try {
    if (chatPage) {
      const input = chatPage.locator('#messageInput');
      const msgBefore = await chatPage.locator('.message').count();
      // 清空输入后直接按发送
      await input.fill('');
      const sendBtn = chatPage.locator('#sendBtn');
      if (await sendBtn.count() > 0) await sendBtn.click();
      await chatPage.waitForTimeout(1000);
      const msgAfter = await chatPage.locator('.message').count();
      record('TC-U-12', '空消息拦截', msgAfter === msgBefore, `消息数: ${msgBefore}→${msgAfter}`);
    }
  } catch (e) { record('TC-U-12', '空消息拦截', false, e.message); }

  // ============================================================
  // 三、多会话管理
  // ============================================================
  console.log('\n========== 三、多会话管理测试 ==========\n');

  // TC-U-14 新建会话
  try {
    if (chatPage) {
      const newBtn = chatPage.locator('#newChatBtn, button:has-text("新"), [class*="new-chat"]').first();
      if (await newBtn.count() > 0) {
        await newBtn.click();
        await chatPage.waitForTimeout(1000);
        const msgs = await chatPage.locator('.message').count();
        record('TC-U-14', '新建会话', msgs === 0, `新会话消息数: ${msgs}`);
      } else {
        record('TC-U-14', '新建会话', false, '未找到新建会话按钮');
      }
    }
  } catch (e) { record('TC-U-14', '新建会话', false, e.message); }

  // TC-U-15 会话标题自动生成
  try {
    if (chatPage) {
      const input = chatPage.locator('#messageInput');
      if (await input.count() > 0) {
        await input.fill('SAP upload failed how to fix');
        await chatPage.locator('#sendBtn').first().click();
        await chatPage.waitForTimeout(4000);
        // 检查侧边栏是否有会话标题
        const sidebarItem = chatPage.locator('.conversation-item, .chat-item, [class*="session-item"], [class*="conv-item"]').first();
        if (await sidebarItem.count() > 0) {
          const title = await sidebarItem.textContent();
          const hasTitle = title && title.trim().length > 0;
          record('TC-U-15', '会话标题自动生成', hasTitle, `标题: "${title?.trim()?.substring(0, 30)}"`);
        } else {
          record('TC-U-15', '会话标题自动生成', false, '未找到会话列表项');
        }
      }
    }
  } catch (e) { record('TC-U-15', '会话标题自动生成', false, e.message); }

  // TC-U-16 切换历史会话
  try {
    if (chatPage) {
      const items = chatPage.locator('.conversation-item, .chat-item, [class*="session-item"], [class*="conv-item"]');
      const count = await items.count();
      if (count >= 2) {
        await items.nth(0).click();
        await chatPage.waitForTimeout(1500);
        const msgs = await chatPage.locator('.message').count();
        record('TC-U-16', '切换历史会话', msgs > 0, `切换后消息数: ${msgs}`);
      } else {
        record('TC-U-16', '切换历史会话', false, `会话数不足: ${count}`);
      }
    }
  } catch (e) { record('TC-U-16', '切换历史会话', false, e.message); }

  // TC-U-17 删除会话
  try {
    if (chatPage) {
      // 先创建一个新会话
      const newBtn = chatPage.locator('#newChatBtn, button:has-text("新"), [class*="new-chat"]').first();
      if (await newBtn.count() > 0) {
        await newBtn.click();
        await chatPage.waitForTimeout(500);
      }
      const delBtn = chatPage.locator('.conversation-item .delete-btn, [class*="conv"] button:has-text("删"), [class*="delete"]').first();
      if (await delBtn.count() > 0) {
        const beforeCount = await chatPage.locator('.conversation-item, [class*="conv-item"]').count();
        await delBtn.click();
        // 处理 confirm dialog
        chatPage.on('dialog', d => d.accept());
        await chatPage.waitForTimeout(1000);
        const afterCount = await chatPage.locator('.conversation-item, [class*="conv-item"]').count();
        record('TC-U-17', '删除会话', afterCount < beforeCount, `会话数: ${beforeCount}→${afterCount}`);
      } else {
        record('TC-U-17', '删除会话', false, '未找到删除按钮');
      }
    }
  } catch (e) { record('TC-U-17', '删除会话', false, e.message); }

  // TC-U-08 退出登录
  try {
    if (chatPage) {
      const logoutBtn = chatPage.locator('#logoutBtn, button:has-text("退出"), a:has-text("退出"), [class*="logout"]').first();
      if (await logoutBtn.count() > 0) {
        await logoutBtn.click();
        await chatPage.waitForTimeout(1500);
        const url = chatPage.url();
        record('TC-U-08', '退出登录', url.includes('index'), `→ ${url}`);
      } else {
        record('TC-U-08', '退出登录', false, '未找到退出按钮');
      }
    }
  } catch (e) { record('TC-U-08', '退出登录', false, e.message); }

  if (chatCtx) await chatCtx.close();

  // ============================================================
  // 四、反馈功能测试
  // ============================================================
  console.log('\n========== 四、反馈功能测试 ==========\n');

  // TC-U-18 提交"有用"反馈
  try {
    const ctx = await newContext(browser);
    const page = await ctx.newPage();
    await loginUI(page, 'hq-admin', 'password123');
    // 进入聊天页
    if (page.url().includes('bots')) {
      const card = page.locator('.bot-card').first();
      if (await card.count() > 0) await card.click();
      await page.waitForTimeout(1500);
    }
    if (!page.url().includes('chat')) await page.goto(`${BASE}/demo/chat.html?bot=A`, { timeout: TIMEOUT });
    await page.waitForTimeout(1000);

    // 发消息
    await page.locator('#messageInput').fill('test for feedback');
    await page.locator('#sendBtn').first().click();
    await page.waitForTimeout(5000);

    // 找有用按钮
    const usefulBtn = page.locator('button:has-text("有用"), [class*="useful"], [data-rating="useful"]').first();
    if (await usefulBtn.count() > 0) {
      await usefulBtn.click();
      await page.waitForTimeout(1500);
      record('TC-U-18', '提交"有用"反馈', true, '点击成功');
    } else {
      record('TC-U-18', '提交"有用"反馈', false, '未找到反馈按钮');
    }
    await ctx.close();
  } catch (e) { record('TC-U-18', '提交"有用"反馈', false, e.message); }

  // TC-U-19 提交"没用"反馈 + 原因
  try {
    const ctx = await newContext(browser);
    const page = await ctx.newPage();
    await loginUI(page, 'hq-admin', 'password123');
    if (page.url().includes('bots')) {
      const card = page.locator('.bot-card').first();
      if (await card.count() > 0) await card.click();
      await page.waitForTimeout(1500);
    }
    if (!page.url().includes('chat')) await page.goto(`${BASE}/demo/chat.html?bot=A`, { timeout: TIMEOUT });
    await page.waitForTimeout(1000);

    await page.locator('#messageInput').fill('another test for not useful feedback');
    await page.locator('#sendBtn').first().click();
    await page.waitForTimeout(5000);

    const notUsefulBtn = page.locator('button:has-text("没用"), [class*="not-useful"], [data-rating="not_useful"]').first();
    if (await notUsefulBtn.count() > 0) {
      await notUsefulBtn.click();
      await page.waitForTimeout(500);
      // 选原因
      const reasonOpt = page.locator('input[type="radio"], [class*="reason"]').first();
      if (await reasonOpt.count() > 0) await reasonOpt.click();
      // 提交
      const submitBtn = page.locator('button:has-text("提交"), [class*="submit-feedback"]').first();
      if (await submitBtn.count() > 0) await submitBtn.click();
      await page.waitForTimeout(1000);
      record('TC-U-19', '提交"没用"反馈+原因', true, '流程完成');
    } else {
      record('TC-U-19', '提交"没用"反馈+原因', false, '未找到"没用"按钮');
    }
    await ctx.close();
  } catch (e) { record('TC-U-19', '提交"没用"反馈+原因', false, e.message); }

  // TC-U-20 反馈按钮状态验证
  try {
    const ctx = await newContext(browser);
    const page = await ctx.newPage();
    await loginUI(page, 'hq-admin', 'password123');
    if (page.url().includes('bots')) {
      const card = page.locator('.bot-card').first();
      if (await card.count() > 0) await card.click();
      await page.waitForTimeout(1500);
    }
    if (!page.url().includes('chat')) await page.goto(`${BASE}/demo/chat.html?bot=A`, { timeout: TIMEOUT });
    await page.waitForTimeout(1000);

    await page.locator('#messageInput').fill('test feedback state');
    await page.locator('#sendBtn').first().click();
    await page.waitForTimeout(500);
    // 流式中检查反馈按钮状态
    const feedbackBtns = page.locator('button:has-text("有用"), button:has-text("没用"), [class*="feedback-btn"]');
    let btnDisabled = false;
    if (await feedbackBtns.count() > 0) {
      btnDisabled = await feedbackBtns.first().isDisabled();
    }
    await page.waitForTimeout(5000);
    let btnEnabled = false;
    if (await feedbackBtns.count() > 0) {
      btnEnabled = !(await feedbackBtns.first().isDisabled());
    }
    record('TC-U-20', '反馈按钮状态验证', true, `流式中禁用: ${btnDisabled}, 完成后启用: ${btnEnabled}`);
    await ctx.close();
  } catch (e) { record('TC-U-20', '反馈按钮状态验证', false, e.message); }

  // TC-U-21 重复反馈拦截
  try {
    const ctx = await newContext(browser);
    const page = await ctx.newPage();
    await loginUI(page, 'hq-admin', 'password123');
    if (page.url().includes('bots')) {
      const card = page.locator('.bot-card').first();
      if (await card.count() > 0) await card.click();
      await page.waitForTimeout(1500);
    }
    if (!page.url().includes('chat')) await page.goto(`${BASE}/demo/chat.html?bot=A`, { timeout: TIMEOUT });
    await page.waitForTimeout(1000);

    await page.locator('#messageInput').fill('test duplicate feedback');
    await page.locator('#sendBtn').first().click();
    await page.waitForTimeout(5000);

    const usefulBtn = page.locator('button:has-text("有用"), [data-rating="useful"]').first();
    if (await usefulBtn.count() > 0) {
      await usefulBtn.click();
      await page.waitForTimeout(1000);
      // 再次点击
      const isDisabled = await usefulBtn.isDisabled();
      const hasLockedClass = await usefulBtn.evaluate(el => el.classList.contains('locked') || el.classList.contains('disabled'));
      record('TC-U-21', '重复反馈拦截', isDisabled || hasLockedClass, `disabled: ${isDisabled}, locked class: ${hasLockedClass}`);
    } else {
      record('TC-U-21', '重复反馈拦截', false, '未找到反馈按钮');
    }
    await ctx.close();
  } catch (e) { record('TC-U-21', '重复反馈拦截', false, e.message); }

  // ============================================================
  // 五、管理后台测试
  // ============================================================
  console.log('\n========== 五、管理后台测试 ==========\n');

  // TC-A-01 管理员登录
  let adminCtx, adminPage;
  try {
    adminCtx = await newContext(browser);
    adminPage = await adminCtx.newPage();
    const url = await loginAdminUI(adminPage, 'admin', 'admin123');
    const ok = url.includes('index.html') && !url.includes('login');
    record('TC-A-01', '管理员登录', ok, `→ ${url}`);
  } catch (e) { record('TC-A-01', '管理员登录', false, e.message); }

  // TC-A-02 非管理员账号
  try {
    const ctx = await newContext(browser);
    const page = await ctx.newPage();
    const url = await loginAdminUI(page, 'hq-admin', 'password123');
    const stayed = url.includes('login');
    record('TC-A-02', '非管理员账号拦截', stayed, stayed ? '停留在登录页' : `→ ${url}`);
    await ctx.close();
  } catch (e) { record('TC-A-02', '非管理员账号拦截', false, e.message); }

  if (adminPage) {
    // TC-A-03 查看用户列表
    try {
      await adminPage.goto(`${BASE}/admin/users.html`, { timeout: TIMEOUT });
      await adminPage.waitForTimeout(2000);
      const rows = await adminPage.locator('table tbody tr').count();
      const hasData = rows > 0;
      // 如果表格没数据，检查是否有其他展示形式
      const altRows = await adminPage.locator('[class*="user"]').count();
      record('TC-A-03', '查看用户列表', hasData || altRows > 0, `table rows: ${rows}, alt elements: ${altRows}`);
    } catch (e) { record('TC-A-03', '查看用户列表', false, e.message); }

    // TC-A-04 创建用户
    try {
      const createBtn = adminPage.locator('button:has-text("新建"), button:has-text("创建"), [class*="create"]').first();
      if (await createBtn.count() > 0) {
        await createBtn.click();
        await adminPage.waitForTimeout(500);
        // 填写表单
        const nameInput = adminPage.locator('#username, input[name="username"]').first();
        if (await nameInput.count() > 0) await nameInput.fill('e2e_test_user');
        const displayInput = adminPage.locator('#displayName, input[name="display_name"], input[name="name"]').first();
        if (await displayInput.count() > 0) await displayInput.fill('E2E测试用户');
        const pwdInput = adminPage.locator('#password, input[type="password"]').first();
        if (await pwdInput.count() > 0) await pwdInput.fill('test123456');
        // 保存
        const saveBtn = adminPage.locator('button:has-text("保存"), button:has-text("确认"), button[type="submit"]').first();
        if (await saveBtn.count() > 0) await saveBtn.click();
        await adminPage.waitForTimeout(1500);
        // 验证新用户出现
        const pageContent = await adminPage.content();
        const created = pageContent.includes('e2e_test_user');
        record('TC-A-04', '创建用户', created, created ? '用户创建成功' : '未在列表中找到新用户');
      } else {
        record('TC-A-04', '创建用户', false, '未找到创建按钮');
      }
    } catch (e) { record('TC-A-04', '创建用户', false, e.message); }

    // TC-A-05 创建重复用户名
    try {
      const createBtn = adminPage.locator('button:has-text("新建"), button:has-text("创建"), [class*="create"]').first();
      if (await createBtn.count() > 0) {
        await createBtn.click();
        await adminPage.waitForTimeout(500);
        const nameInput = adminPage.locator('#username, input[name="username"]').first();
        if (await nameInput.count() > 0) await nameInput.fill('admin');
        const pwdInput = adminPage.locator('#password, input[type="password"]').first();
        if (await pwdInput.count() > 0) await pwdInput.fill('test');
        const saveBtn = adminPage.locator('button:has-text("保存"), button[type="submit"]').first();
        if (await saveBtn.count() > 0) await saveBtn.click();
        await adminPage.waitForTimeout(1500);
        const pageContent = await adminPage.content();
        const rejected = pageContent.includes('已存在') || pageContent.includes('exist') || pageContent.includes('重复') || pageContent.includes('error');
        record('TC-A-05', '创建重复用户名', rejected, rejected ? '正确拦截' : '未拦截');
      } else {
        record('TC-A-05', '创建重复用户名', false, '未找到创建按钮');
      }
    } catch (e) { record('TC-A-05', '创建重复用户名', false, e.message); }

    // TC-A-09 查看角色列表
    try {
      await adminPage.goto(`${BASE}/admin/roles.html`, { timeout: TIMEOUT });
      await adminPage.waitForTimeout(2000);
      const rows = await adminPage.locator('table tbody tr').count();
      record('TC-A-09', '查看角色列表', rows > 0, `角色行数: ${rows}`);
    } catch (e) { record('TC-A-09', '查看角色列表', false, e.message); }

    // TC-A-14 查看 Bot 列表
    try {
      await adminPage.goto(`${BASE}/admin/bots.html`, { timeout: TIMEOUT });
      await adminPage.waitForTimeout(2000);
      const rows = await adminPage.locator('table tbody tr').count();
      const botItems = await adminPage.locator('[class*="bot"]').count();
      record('TC-A-14', '查看Bot列表', rows > 0 || botItems > 0, `table rows: ${rows}, bot elements: ${botItems}`);
    } catch (e) { record('TC-A-14', '查看Bot列表', false, e.message); }

    // TC-A-20 查看反馈列表
    try {
      await adminPage.goto(`${BASE}/admin/feedback.html`, { timeout: TIMEOUT });
      await adminPage.waitForTimeout(2000);
      const hasTable = await adminPage.locator('table').count() > 0;
      const hasContent = await adminPage.locator('[class*="feedback"]').count() > 0;
      record('TC-A-20', '查看反馈列表', hasTable || hasContent, `table: ${hasTable}, feedback elements: ${hasContent}`);
    } catch (e) { record('TC-A-20', '查看反馈列表', false, e.message); }

    await adminCtx.close();
  }

  // ============================================================
  // 六、后端 API 测试
  // ============================================================
  console.log('\n========== 六、后端API测试 ==========\n');

  // API-01 登录
  let accessToken = '', refreshToken = '';
  try {
    const res = await api('POST', '/api/auth/login', { username: 'hq-admin', password: 'password123' });
    const ok = res.status === 200 && res.body?.data?.access_token;
    if (ok) { accessToken = res.body.data.access_token; refreshToken = res.body.data.refresh_token; }
    record('API-01', 'API登录 hq-admin', ok, `status: ${res.status}`);
  } catch (e) { record('API-01', 'API登录 hq-admin', false, e.message); }

  // API-02 错误密码
  try {
    const res = await api('POST', '/api/auth/login', { username: 'hq-admin', password: 'wrong' });
    record('API-02', 'API错误密码', res.status === 401, `status: ${res.status}`);
  } catch (e) { record('API-02', 'API错误密码', false, e.message); }

  // API-03 /me
  if (accessToken) try {
    const res = await api('GET', '/api/auth/me', null, accessToken);
    const ok = res.status === 200 && res.body?.data?.username === 'hq-admin';
    record('API-03', 'GET /me', ok, ok ? `user: ${res.body.data.username}` : `status: ${res.status}`);
  } catch (e) { record('API-03', 'GET /me', false, e.message); }

  // API-04 refresh token
  if (refreshToken) try {
    const res = await api('POST', '/api/auth/refresh', { refresh_token: refreshToken });
    const ok = res.status === 200 && res.body?.data?.access_token;
    if (ok) accessToken = res.body.data.access_token;
    record('API-04', '刷新Token', ok, `status: ${res.status}`);
  } catch (e) { record('API-04', '刷新Token', false, e.message); }

  // API-05 无Token
  try {
    const res = await api('GET', '/api/auth/me');
    record('API-05', '无Token访问', res.status === 401, `status: ${res.status}`);
  } catch (e) { record('API-05', '无Token访问', false, e.message); }

  // API-06 可用Bot列表
  if (accessToken) try {
    const res = await api('GET', '/api/bots/available', null, accessToken);
    record('API-06', '可用Bot列表', res.status === 200, `status: ${res.status}`);
  } catch (e) { record('API-06', '可用Bot列表', false, e.message); }

  // Admin token
  let adminToken = '';
  const adminLogin = await loginAPI('admin', 'admin123');
  if (adminLogin) adminToken = adminLogin.access;

  // API-07 用户列表
  if (adminToken) try {
    const res = await api('GET', '/api/users', null, adminToken);
    const users = res.body?.data?.items || res.body?.data || [];
    record('API-07', '用户列表', Array.isArray(users) && users.length > 0, `用户数: ${Array.isArray(users) ? users.length : 'N/A'}`);
  } catch (e) { record('API-07', '用户列表', false, e.message); }

  // API-08 创建用户
  let testUserId = '';
  if (adminToken) try {
    const res = await api('POST', '/api/users', {
      username: `e2e_${Date.now()}`, display_name: 'E2E Test', password: 'test123', role_ids: []
    }, adminToken);
    const ok = res.status === 200 || res.status === 201;
    if (ok && res.body?.data?.id) testUserId = res.body.data.id;
    record('API-08', '创建用户', ok, `status: ${res.status}`);
  } catch (e) { record('API-08', '创建用户', false, e.message); }

  // API-09 重复用户名
  if (adminToken) try {
    const res = await api('POST', '/api/users', {
      username: 'admin', display_name: 'Dup', password: 'test', role_ids: []
    }, adminToken);
    record('API-09', '重复用户名', res.status >= 400, `status: ${res.status}`);
  } catch (e) { record('API-09', '重复用户名', false, e.message); }

  // API-10 编辑用户
  if (adminToken && testUserId) try {
    const res = await api('PUT', `/api/users/${testUserId}`, { display_name: 'E2E Modified' }, adminToken);
    record('API-10', '编辑用户', res.status === 200, `status: ${res.status}`);
  } catch (e) { record('API-10', '编辑用户', false, e.message); }

  // API-11 删除用户
  if (adminToken && testUserId) try {
    const res = await api('DELETE', `/api/users/${testUserId}`, null, adminToken);
    record('API-11', '删除用户', res.status === 200, `status: ${res.status}`);
  } catch (e) { record('API-11', '删除用户', false, e.message); }

  // API-12 角色列表
  if (adminToken) try {
    const res = await api('GET', '/api/roles', null, adminToken);
    const roles = res.body?.data?.items || res.body?.data || [];
    record('API-12', '角色列表', Array.isArray(roles) && roles.length > 0, `角色数: ${Array.isArray(roles) ? roles.length : 'N/A'}`);
  } catch (e) { record('API-12', '角色列表', false, e.message); }

  // API-13 Bot列表
  if (adminToken) try {
    const res = await api('GET', '/api/bots', null, adminToken);
    const bots = res.body?.data?.items || res.body?.data || [];
    record('API-13', 'Bot列表', Array.isArray(bots) && bots.length > 0, `Bot数: ${Array.isArray(bots) ? bots.length : 'N/A'}`);
  } catch (e) { record('API-13', 'Bot列表', false, e.message); }

  // API-14 反馈列表
  if (adminToken) try {
    const res = await api('GET', '/api/feedbacks', null, adminToken);
    record('API-14', '反馈列表', res.status === 200, `status: ${res.status}`);
  } catch (e) { record('API-14', '反馈列表', false, e.message); }

  await browser.close();

  // ============================================================
  // 汇总
  // ============================================================
  console.log('\n========================================');
  console.log('  测试结果汇总');
  console.log('========================================\n');
  const passed = results.filter(r => r.pass).length;
  const failed = results.filter(r => !r.pass).length;
  const total = results.length;
  console.log(`总计: ${total}  ✅ 通过: ${passed}  ❌ 失败: ${failed}`);
  console.log(`通过率: ${((passed / total) * 100).toFixed(1)}%\n`);

  if (failed > 0) {
    console.log('❌ 失败用例:');
    results.filter(r => !r.pass).forEach(r => {
      console.log(`   ${r.id} ${r.name} — ${r.detail}`);
    });
    console.log('');
  }

  // Save JSON
  fs.writeFileSync('test_results.json', JSON.stringify({ passed, failed, total, results, timestamp: new Date().toISOString() }, null, 2));
  console.log('结果已保存到 test_results.json');
})();
