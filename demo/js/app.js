/**
 * SM-Dmall ERP Knowledge Base Demo
 * Main Application Logic (M5)
 *
 * 使用新的ApiService进行真实API对接
 */

// ============================================
// Utility Functions
// ============================================

function $(selector) {
  return document.querySelector(selector);
}

function $$(selector) {
  return document.querySelectorAll(selector);
}

function formatTime(date) {
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getUrlParam(key) {
  const params = new URLSearchParams(window.location.search);
  return params.get(key);
}

function setUrlParam(key, value) {
  const url = new URL(window.location);
  url.searchParams.set(key, value);
  window.history.pushState({}, '', url);
}

// ============================================
// Toast Notification System
// ============================================

const Toast = {
  container: null,

  init() {
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.className = 'toast-container';
      document.body.appendChild(this.container);
    }
  },

  show(message, type = 'info', duration = 3000) {
    this.init();

    const icons = {
      success: '✅',
      error: '❌',
      warning: '⚠️',
      info: 'ℹ️',
    };

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
      <span class="toast-icon">${icons[type]}</span>
      <span class="toast-message">${message}</span>
    `;

    this.container.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('hiding');
      setTimeout(() => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      }, 300);
    }, duration);
  },

  success(message) {
    this.show(message, 'success');
  },

  error(message) {
    this.show(message, 'error');
  },

  warning(message) {
    this.show(message, 'warning');
  },

  info(message) {
    this.show(message, 'info');
  },
};

// ============================================
// Modal System
// ============================================

const Modal = {
  overlay: null,

  init() {
    if (!this.overlay) {
      this.overlay = document.createElement('div');
      this.overlay.className = 'modal-overlay';
      this.overlay.innerHTML = `
        <div class="modal">
          <div class="modal-header">
            <h3 class="modal-title">Modal Title</h3>
            <button class="modal-close">&times;</button>
          </div>
          <div class="modal-body"></div>
          <div class="modal-footer"></div>
        </div>
      `;

      this.overlay.querySelector('.modal-close').addEventListener('click', () => this.hide());
      this.overlay.addEventListener('click', (e) => {
        if (e.target === this.overlay) this.hide();
      });

      document.body.appendChild(this.overlay);
    }
  },

  show(options) {
    this.init();
    const { title, content, footer, onClose } = options;

    const modal = this.overlay.querySelector('.modal');
    this.overlay.querySelector('.modal-title').textContent = title || 'Modal';
    this.overlay.querySelector('.modal-body').innerHTML = content || '';
    this.overlay.querySelector('.modal-footer').innerHTML = footer || '';

    this.overlay.classList.add('visible');

    if (onClose) {
      this.overlay.dataset.onClose = 'true';
      this.overlay.onclick = (e) => {
        if (e.target === this.overlay && onClose) {
          onClose();
        }
      };
    }
  },

  hide() {
    if (this.overlay) {
      this.overlay.classList.remove('visible');
    }
  },
};

// ============================================
// Session Management (使用TokenManager)
// ============================================

const Session = {
  /**
   * 获取当前用户 (从ApiService)
   */
  get() {
    return ApiService.getCurrentUser();
  },

  /**
   * 检查是否已登录
   */
  isLoggedIn() {
    return !!ApiService.getCurrentUser() || TokenManager.isLoggedIn();
  },

  /**
   * 获取用户角色
   */
  getUserRole() {
    const user = this.get();
    return user ? user.role : null;
  },

  /**
   * 获取用户可用的Bot权限
   */
  getAllowedBots() {
    const role = this.getUserRole();
    if (!role) return [];
    return MockData.ROLE_PERMISSIONS[role]?.bots || [];
  },
};

// ============================================
// Auth State Handler
// ============================================

function setupAuthHandler() {
  // 监听token过期事件
  window.addEventListener('auth:expired', () => {
    Toast.warning('登录已过期，请重新登录');
    setTimeout(() => {
      window.location.href = 'index.html';
    }, 1500);
  });
}

// ============================================
// Login Page Logic
// ============================================

async function initLoginPage() {
  // Redirect if already logged in
  if (await checkExistingAuth()) {
    window.location.href = 'bots.html';
    return;
  }

  setupAuthHandler();

  const loginForm = $('#login-form');
  const usernameInput = $('#username');
  const passwordInput = $('#password');
  const roleSelect = $('#role');
  const submitBtn = loginForm.querySelector('button[type="submit"]');

  // Handle demo account click to auto-fill credentials
  $$('.login-account').forEach(el => {
    el.addEventListener('click', () => {
      const account = el.dataset.account;
      if (account && MockData.DEMO_ACCOUNTS[account]) {
        usernameInput.value = account;
        passwordInput.value = MockData.DEMO_ACCOUNTS[account].password;
        Toast.info(`Account "${account}" filled`);
      }
    });
  });

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const username = usernameInput.value.trim();
    const password = passwordInput.value;

    if (!username) {
      Toast.error('Please enter your username');
      usernameInput.focus();
      return;
    }

    if (!password) {
      Toast.error('Please enter your password');
      passwordInput.focus();
      return;
    }

    // Disable button during login
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span>Logging in...</span>';

    try {
      const result = await ApiService.login(username, password);

      if (result.success && result.data) {
        Toast.success(`Welcome, ${result.data.user?.display_name || username}!`);
        setTimeout(() => {
          window.location.href = 'bots.html';
        }, 500);
      }
    } catch (error) {
      Toast.error(error.message || 'Login failed');
      passwordInput.focus();
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<span>Login</span><span>→</span>';
    }
  });
}

/**
 * 检查现有认证状态 (页面刷新后恢复)
 */
async function checkExistingAuth() {
  if (ApiService.getMode() === 'mock') {
    return Session.isLoggedIn();
  }

  try {
    const user = await ApiService.checkAuth();
    return !!user;
  } catch (e) {
    return false;
  }
}

// ============================================
// Bot Selection Page Logic
// ============================================

async function initBotsPage() {
  // Check if logged in
  if (!(await checkExistingAuth())) {
    window.location.href = 'index.html';
    return;
  }

  setupAuthHandler();

  // 获取当前用户
  let user = ApiService.getCurrentUser();
  if (!user) {
    try {
      await ApiService.getMe();
      user = ApiService.getCurrentUser();
    } catch (e) {
      window.location.href = 'index.html';
      return;
    }
  }

  // Update header
  $('#user-name').textContent = user?.display_name || user?.username || 'User';
  $('#user-role').textContent = user?.roleName || user?.role || '';

  // 获取可用Bots
  try {
    const result = await ApiService.getAvailableBots();
    const availableBots = result.success ? result.data : [];
    renderBots(availableBots, user);
  } catch (e) {
    console.error('Failed to load bots:', e);
    Toast.error('Failed to load bots');
    renderBots([], user);
  }

  // Logout handler
  $('#btn-logout').addEventListener('click', async () => {
    await ApiService.logout();
    Toast.success('Logged out successfully');
    setTimeout(() => {
      window.location.href = 'index.html';
    }, 500);
  });
}

/**
 * 渲染Bot列表
 * 注意: /api/bots/available 已由后端按用户权限过滤，前端直接展示
 */
function renderBots(availableBots, user) {
  const botsGrid = $('#bots-grid');
  botsGrid.innerHTML = '';

  // 使用API返回的真实Bot数据渲染（后端已按权限过滤）
  availableBots.forEach(bot => {
    const card = document.createElement('div');
    card.className = 'bot-card';

    // 获取MockData中的knowledge和默认图标作为fallback
    const mockBot = MockData.BOT_CONFIG[bot.key] || {};
    const icon = bot.icon || mockBot.icon || '🤖';
    const knowledge = mockBot.knowledge || [];
    const description = bot.description || mockBot.description || '';

    // Bot key letter for gradient badge
    const botKey = (bot.key || 'A').toUpperCase();
    const badgeClass = `bot-badge-${botKey.toLowerCase()}`;

    card.setAttribute('role', 'listitem');

    card.innerHTML = `
      <div class="bot-card-header">
        <div class="bot-badge ${badgeClass}">${botKey}</div>
        <div class="bot-status active">Active</div>
      </div>
      <div class="bot-card-body">
        <h3 class="bot-name">${escapeHtml(bot.name)}</h3>
        <p class="bot-desc">${escapeHtml(description)}</p>
        <div class="bot-meta">
          ${knowledge.map(k => `<span class="bot-meta-item">${escapeHtml(k)}</span>`).join('')}
        </div>
      </div>
      <div class="bot-card-footer">
        <button class="btn btn-primary btn-block" data-bot="${bot.id}" aria-label="Start chat with ${escapeHtml(bot.name)}">
          Start Chat
        </button>
      </div>
    `;

    botsGrid.appendChild(card);
  });

  // Update count
  const activeCount = availableBots.length;
  $('#available-count').textContent = activeCount;
  $('#total-count').textContent = activeCount;

  // Add click handlers for available bots
  $$('.bot-card .btn-block').forEach(btn => {
    btn.addEventListener('click', () => {
      const botId = btn.dataset.bot;
      window.location.href = `chat.html?id=${botId}`;
    });
  });
}

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ============================================
// Chat Page Logic
// ============================================

let currentBotId = null;
let currentBot = null;
let currentConversationId = null;
let currentConversationTitle = null;
let chatHistory = [];
let currentMessageId = null;
let conversations = [];  // 会话列表

async function initChatPage() {
  // Check if logged in
  if (!(await checkExistingAuth())) {
    window.location.href = 'index.html';
    return;
  }

  setupAuthHandler();

  // Get bot ID from URL
  currentBotId = getUrlParam('id') || 'A';

  // Fetch real bot config from API
  try {
    const result = await ApiService.getBots();
    if (result.success) {
      const realBot = result.data.find(b => b.id === currentBotId);
      if (realBot) {
        // Use real bot data from API, merge with MockData for display properties
        const mockBot = MockData.BOT_CONFIG[realBot.key] || MockData.BOT_CONFIG['A'];
        currentBot = {
          id: realBot.id,
          key: realBot.key,
          name: realBot.name,
          nameCn: realBot.name,
          description: realBot.description,
          icon: realBot.icon || mockBot.icon,
          knowledge: mockBot.knowledge || [],
          defaultPrompt: realBot.welcome_message || mockBot.defaultPrompt
        };
      } else {
        Toast.error('Bot not found');
        window.location.href = 'bots.html';
        return;
      }
    } else {
      currentBot = MockData.BOT_CONFIG[currentBotId] || MockData.BOT_CONFIG['A'];
    }
  } catch (e) {
    currentBot = MockData.BOT_CONFIG[currentBotId] || MockData.BOT_CONFIG['A'];
  }

  if (!currentBot) {
    Toast.error('Invalid Bot ID');
    window.location.href = 'bots.html';
    return;
  }

  // 获取用户信息
  let user = ApiService.getCurrentUser();
  if (!user) {
    try {
      await ApiService.getMe();
      user = ApiService.getCurrentUser();
    } catch (e) {
      window.location.href = 'index.html';
      return;
    }
  }

  // Update header
  $('#user-name').textContent = user?.display_name || user?.username || 'User';
  $('#user-role').textContent = user?.roleName || user?.role || '';
  $('#current-bot-name').textContent = currentBot.name;

  // Update sidebar
  $('#bot-avatar-icon').textContent = currentBot.icon;
  $('#bot-sidebar-name').textContent = currentBot.name;
  $('#bot-sidebar-desc').textContent = currentBot.description;

  // Render knowledge list
  const knowledgeList = $('#knowledge-list');
  knowledgeList.innerHTML = (currentBot.knowledge || [])
    .map(k => `<li class="chat-knowledge-item">${k}</li>`)
    .join('');

  // Load existing conversations
  await loadConversations();

  // Set up chat with welcome message (or load from selected conversation)
  if (currentConversationId) {
    await loadMessages(currentConversationId);
  } else {
    initChat();
  }

  // Event listeners
  $('#chat-form').addEventListener('submit', handleSendMessage);
  $('#btn-back').addEventListener('click', () => {
    window.location.href = 'bots.html';
  });
  $('#btn-logout').addEventListener('click', async () => {
    await ApiService.logout();
    Toast.success('Logged out successfully');
    setTimeout(() => {
      window.location.href = 'index.html';
    }, 500);
  });

  // New conversation button
  $('#btn-new-chat')?.addEventListener('click', newConversation);

  // Setup annotation modal handlers
  setupAnnotationModal();
}

/**
 * 加载会话列表
 */
async function loadConversations() {
  const conversationsList = $('#conversations-list');
  if (!conversationsList) return;

  if (ApiService.getMode() === 'mock') {
    // Mock mode - use localStorage
    const stored = localStorage.getItem(`demo_conversations_${currentBotId}`);
    conversations = stored ? JSON.parse(stored) : [];
    renderConversations();
    return;
  }

  try {
    const result = await ApiService.getConversations(currentBotId);
    if (result.success && result.data) {
      conversations = result.data;
      renderConversations();
    }
  } catch (e) {
    console.error('Failed to load conversations:', e);
    conversations = [];
    renderConversations();
  }
}

/**
 * 渲染会话列表
 */
function renderConversations() {
  const conversationsList = $('#conversations-list');
  if (!conversationsList) return;

  if (conversations.length === 0) {
    conversationsList.innerHTML = '<li class="conversation-empty" style="padding: 12px 16px; color: var(--text-muted); font-size: 12px;">No conversations yet</li>';
    return;
  }

  conversationsList.innerHTML = conversations.map(conv => `
    <li class="conversation-item ${conv.id === currentConversationId ? 'active' : ''}" data-conv-id="${conv.id}">
      <span class="conversation-icon">💬</span>
      <span class="conversation-title">${escapeHtml(conv.title || 'New Chat')}</span>
      <button class="conversation-delete" data-conv-id="${conv.id}" title="Delete">×</button>
    </li>
  `).join('');

  // Add click handlers
  $$('.conversation-item').forEach(item => {
    item.addEventListener('click', (e) => {
      if (e.target.classList.contains('conversation-delete')) {
        e.stopPropagation();
        return;
      }
      const convId = item.dataset.convId;
      switchConversation(convId);
    });
  });

  $$('.conversation-delete').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const convId = btn.dataset.convId;
      deleteConversation(convId);
    });
  });
}

/**
 * 切换会话
 */
async function switchConversation(convId) {
  if (convId === currentConversationId) return;

  currentConversationId = convId;
  const conv = conversations.find(c => c.id === convId);
  currentConversationTitle = conv?.title || 'New Chat';

  // Update header
  $('#current-conversation-title').textContent = currentConversationTitle;

  // Update conversations list UI
  $$('.conversation-item').forEach(item => {
    item.classList.toggle('active', item.dataset.convId === convId);
  });

  // Load messages for this conversation
  await loadMessages(convId);
}

/**
 * 加载历史消息
 */
async function loadMessages(convId) {
  if (ApiService.getMode() === 'mock') {
    const stored = localStorage.getItem(`demo_messages_${convId}`);
    const messages = stored ? JSON.parse(stored) : [];
    renderMessages(messages);
    return;
  }

  try {
    const result = await ApiService.getMessages(convId);
    if (result.success && result.data) {
      renderMessages(result.data);
    }
  } catch (e) {
    console.error('Failed to load messages:', e);
    initChat(); // Show welcome message on error
  }
}

/**
 * 渲染消息列表
 */
function renderMessages(messages) {
  chatHistory = [];
  const messagesContainer = $('#chat-messages');
  messagesContainer.innerHTML = '';

  if (messages.length === 0) {
    // Show welcome message
    addBotMessage(currentBot.defaultPrompt, [], true);
    return;
  }

  // Render each message
  messages.forEach(msg => {
    if (msg.role === 'user') {
      chatHistory.push({ role: 'user', content: msg.content });
      addUserMessage(msg.content, msg.created_at);
    } else {
      chatHistory.push({ role: 'bot', content: msg.content });
      addBotMessage(msg.content, [], false, msg.id);
    }
  });
}

/**
 * 开始新会话
 */
function newConversation() {
  currentConversationId = null;
  currentConversationTitle = null;
  $('#current-conversation-title').textContent = '';

  // Update conversations list UI
  $$('.conversation-item').forEach(item => {
    item.classList.remove('active');
  });

  // Clear messages and show welcome
  initChat();
}

/**
 * 删除会话
 */
async function deleteConversation(convId) {
  if (!confirm('Delete this conversation?')) return;

  if (ApiService.getMode() === 'mock') {
    // Mock mode: remove from localStorage
    localStorage.removeItem(`demo_messages_${convId}`);
    conversations = conversations.filter(c => c.id !== convId);
    localStorage.setItem(`demo_conversations_${currentBotId}`, JSON.stringify(conversations));
  } else {
    // Real mode: call backend API
    try {
      await ApiService.deleteConversation(convId);
      // Reload conversations from server
      await loadConversations();
    } catch (error) {
      Toast.error('Failed to delete conversation');
      console.error('[deleteConversation]', error);
      return;
    }
  }

  // If deleting current conversation, start new one
  if (convId === currentConversationId) {
    newConversation();
  }

  renderConversations();
}

function initChat() {
  chatHistory = [];
  const messagesContainer = $('#chat-messages');
  messagesContainer.innerHTML = '';

  // Add welcome message
  addBotMessage(currentBot.defaultPrompt, [], true);
}

async function handleSendMessage(e) {
  e.preventDefault();

  const input = $('#chat-input');
  const message = input.value.trim();

  if (!message) {
    Toast.warning('Please enter a message');
    return;
  }

  // Add user message
  addUserMessage(message);
  input.value = '';
  input.disabled = true;

  // Show typing indicator
  showTypingIndicator();

  try {
    if (ApiService.getMode() === 'mock') {
      // Mock模式延迟模拟
      await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 700));
      hideTypingIndicator();

      const qa = MockData.findMatchingQA(currentBotId, message);
      addBotMessage(qa.answer, qa.sources);

      // Mock模式：创建新会话（如果还没有）
      if (!currentConversationId) {
        const convId = 'mock-' + Date.now();
        const title = message.substring(0, 30) + (message.length > 30 ? '...' : '');
        currentConversationId = convId;
        currentConversationTitle = title;

        // 保存到会话列表
        conversations.unshift({
          id: convId,
          title: title,
          bot_id: currentBotId,
          created_at: new Date().toISOString(),
        });
        localStorage.setItem(`demo_conversations_${currentBotId}`, JSON.stringify(conversations));

        // 保存消息
        localStorage.setItem(`demo_messages_${convId}`, JSON.stringify([
          { role: 'user', content: message, created_at: new Date().toISOString() },
          { role: 'assistant', content: qa.answer, created_at: new Date().toISOString() },
        ]));

        // 更新UI
        $('#current-conversation-title').textContent = title;
        renderConversations();
      }
    } else {
      // 真实流式请求
      let fullAnswer = '';

      await ApiService.sendMessageStream(
        currentBotId,
        message,
        // onChunk - 每个字符的回调
        (chunk) => {
          fullAnswer += chunk;
          updateBotMessageStream(fullAnswer);
        },
        // onComplete
        (data) => {
          hideTypingIndicator();
          if (data.conversationId) {
            // 新会话创建
            if (!currentConversationId) {
              currentConversationId = data.conversationId;
              currentConversationTitle = message.substring(0, 30) + (message.length > 30 ? '...' : '');
              $('#current-conversation-title').textContent = currentConversationTitle;

              // 重新加载会话列表
              loadConversations();
            }
          }
          // 完成最终渲染
          finalizeBotMessage(fullAnswer, data.citations || []);
        },
        // onError
        (error) => {
          hideTypingIndicator();
          Toast.error(error || 'Failed to get response');
          // 移除正在流式输出的消息
          removeStreamingMessage();
        },
        // conversationId - 已有会话时传入，继续对话
        currentConversationId
      );
    }
  } catch (error) {
    hideTypingIndicator();
    Toast.error(error.message || 'Failed to send message');
  } finally {
    input.disabled = false;
    input.focus();
  }
}

function addUserMessage(text) {
  chatHistory.push({ role: 'user', content: text });
  const messagesContainer = $('#chat-messages');

  const messageEl = document.createElement('div');
  messageEl.className = 'message message-user';
  messageEl.innerHTML = `
    <div class="message-avatar">👤</div>
    <div class="message-content">
      <div class="message-text">${escapeHtml(text)}</div>
      <div class="message-time">${formatTime(new Date())}</div>
    </div>
  `;

  messagesContainer.appendChild(messageEl);
  scrollToBottom();
}

// 流式输出中的Bot消息
let streamingMessageEl = null;

function addBotMessage(text, sources = [], isWelcome = false) {
  chatHistory.push({ role: 'bot', content: text, sources });

  const messagesContainer = $('#chat-messages');
  const msgIndex = chatHistory.length - 1;
  const feedbackData = getFeedbackData(msgIndex);
  const isLocked = feedbackData && feedbackData.submitted;

  const messageEl = document.createElement('div');
  messageEl.className = 'message message-bot';

  messageEl.innerHTML = buildBotMessageHTML(text, sources, isWelcome, isLocked, msgIndex);

  messagesContainer.appendChild(messageEl);

  // 添加反馈按钮事件
  setupFeedbackHandlers(messageEl, msgIndex);

  scrollToBottom();
}

/**
 * 添加流式输出中的Bot消息
 */
function addStreamingBotMessage() {
  const messagesContainer = $('#chat-messages');

  streamingMessageEl = document.createElement('div');
  streamingMessageEl.className = 'message message-bot';

  streamingMessageEl.innerHTML = `
    <div class="message-avatar">${currentBot.icon}</div>
    <div class="message-content">
      <div class="message-text"></div>
      <div class="message-time">${formatTime(new Date())}</div>
    </div>
  `;

  messagesContainer.appendChild(streamingMessageEl);
  scrollToBottom();
}

/**
 * 更新流式输出内容
 */
function updateBotMessageStream(text) {
  if (!streamingMessageEl) {
    addStreamingBotMessage();
  }

  const textEl = streamingMessageEl.querySelector('.message-text');
  if (textEl) {
    textEl.innerHTML = formatMessageText(text);
    scrollToBottom();
  }
}

/**
 * 完成流式消息
 */
function finalizeBotMessage(text, sources) {
  if (!streamingMessageEl) return;

  const messagesContainer = $('#chat-messages');
  const msgIndex = chatHistory.length;

  // 移除流式消息
  streamingMessageEl.remove();

  // 添加到历史
  chatHistory.push({ role: 'bot', content: text, sources });

  // 创建最终消息
  const messageEl = document.createElement('div');
  messageEl.className = 'message message-bot';

  const feedbackData = getFeedbackData(msgIndex);
  const isLocked = feedbackData && feedbackData.submitted;

  messageEl.innerHTML = buildBotMessageHTML(text, sources, false, isLocked, msgIndex);

  messagesContainer.appendChild(messageEl);

  // 添加反馈按钮事件
  setupFeedbackHandlers(messageEl, msgIndex);

  scrollToBottom();
  streamingMessageEl = null;
}

/**
 * 移除流式消息
 */
function removeStreamingMessage() {
  if (streamingMessageEl) {
    streamingMessageEl.remove();
    streamingMessageEl = null;
    // 移除对应的用户消息
    chatHistory.pop();
  }
}

/**
 * 构建Bot消息HTML
 */
function buildBotMessageHTML(text, sources, isWelcome, isLocked, msgIndex) {
  const hasSources = sources && sources.length > 0;

  let metaHtml = '';

  if (hasSources) {
    metaHtml = `
      <div class="message-meta">
        <div class="message-sources">
          ${sources.map((s, i) => `
            <span class="source-tag" data-source-index="${i}">
              📄 ${s.title || 'Source'}
            </span>
          `).join('')}
        </div>
        ${isWelcome || isLocked ? '' : `
        <div class="feedback-buttons">
          <button class="btn-feedback btn-feedback-useful" data-msg-index="${msgIndex}" data-rating="useful">
            <span>👍</span><span>有用</span>
          </button>
          <button class="btn-feedback btn-feedback-not-useful" data-msg-index="${msgIndex}" data-rating="not_useful">
            <span>👎</span><span>没用</span>
          </button>
        </div>`}
        ${!isWelcome && isLocked ? `<div class="feedback-status">
          <span class="feedback-submitted">${feedbackData?.rating === 'useful' ? '👍 有用' : '👎 没用'}${feedbackData?.reason ? ' - ' + feedbackData.reason : ''}</span>
          <span class="feedback-locked">🔒</span>
        </div>` : ''}
      </div>
      <div class="source-details">
        ${sources.map((s, i) => `
          <div class="source-detail" data-detail-index="${i}">
            <div class="source-detail-header">📄 ${s.title || 'Source'}</div>
            <div class="source-detail-content">"${s.snippet || s.content || ''}"</div>
          </div>
        `).join('')}
      </div>
    `;
  } else {
    metaHtml = `
      <div class="message-meta">
        <div class="message-sources">
          <span class="source-tag" style="background: var(--bg-input); color: var(--text-muted);">
            ${isWelcome ? 'System' : 'Knowledge Base'}
          </span>
        </div>
        ${isWelcome || isLocked ? '' : `
        <div class="feedback-buttons">
          <button class="btn-feedback btn-feedback-useful" data-msg-index="${msgIndex}" data-rating="useful">
            <span>👍</span><span>有用</span>
          </button>
          <button class="btn-feedback btn-feedback-not-useful" data-msg-index="${msgIndex}" data-rating="not_useful">
            <span>👎</span><span>没用</span>
          </button>
        </div>`}
        ${!isWelcome && isLocked ? `<div class="feedback-status">
          <span class="feedback-submitted">${feedbackData?.rating === 'useful' ? '👍 有用' : '👎 没用'}</span>
          <span class="feedback-locked">🔒</span>
        </div>` : ''}
      </div>
    `;
  }

  return `
    <div class="message-avatar">${currentBot.icon}</div>
    <div class="message-content">
      <div class="message-text">${formatMessageText(text)}</div>
      <div class="message-time">${formatTime(new Date())}</div>
      ${metaHtml}
    </div>
  `;
}

/**
 * 设置反馈按钮事件
 */
function setupFeedbackHandlers(messageEl, msgIndex) {
  // 来源展开
  messageEl.querySelectorAll('.source-tag[data-source-index]').forEach(tag => {
    tag.addEventListener('click', () => {
      const index = tag.dataset.sourceIndex;
      const detail = messageEl.querySelector(`.source-detail[data-detail-index="${index}"]`);
      if (detail) {
        tag.classList.toggle('expanded');
        detail.classList.toggle('visible');
      }
    });
  });

  // 反馈按钮
  messageEl.querySelectorAll('.btn-feedback').forEach(btn => {
    btn.addEventListener('click', () => {
      const rating = btn.dataset.rating;
      if (rating === 'useful') {
        submitFeedback(msgIndex, 'useful');
      } else {
        openFeedbackReasonModal(msgIndex);
      }
    });
  });
}

function showTypingIndicator() {
  const messagesContainer = $('#chat-messages');
  const typingEl = document.createElement('div');
  typingEl.className = 'message message-bot';
  typingEl.id = 'typing-indicator';
  typingEl.innerHTML = `
    <div class="message-avatar">${currentBot.icon}</div>
    <div class="message-content">
      <div class="typing-indicator">
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
      </div>
    </div>
  `;
  messagesContainer.appendChild(typingEl);
  scrollToBottom();
}

function hideTypingIndicator() {
  const typingEl = $('#typing-indicator');
  if (typingEl) {
    typingEl.remove();
  }
}

function scrollToBottom() {
  const container = $('#chat-messages');
  if (container) {
    container.scrollTop = container.scrollHeight;
  }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function formatMessageText(text) {
  return escapeHtml(text)
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br>');
}

// ============================================
// Feedback System
// ============================================

let currentFeedbackMsgIndex = null;
let feedbackData = [];

function setupAnnotationModal() {
  const stored = localStorage.getItem('demo_feedbacks');
  feedbackData = stored ? JSON.parse(stored) : [];
}

function getFeedbackData(msgIndex) {
  return feedbackData.find(f => f.botId === currentBotId && f.msgIndex === msgIndex);
}

async function submitFeedback(msgIndex, rating, reason = '', comment = '') {
  const existing = feedbackData.findIndex(
    f => f.botId === currentBotId && f.msgIndex === msgIndex
  );
  if (existing !== -1) {
    Toast.warning('Feedback already submitted');
    return;
  }

  // 获取对应的消息
  const chatMsg = chatHistory[msgIndex];
  if (!chatMsg) {
    Toast.error('Message not found');
    return;
  }

  const feedback = {
    id: generateId(),
    botId: currentBotId,
    msgIndex,
    rating,
    reason,
    comment,
    query: chatHistory.slice(0, msgIndex).find(m => m.role === 'user')?.content || '',
    answer: chatMsg.content,
    conversationId: currentConversationId,
    submitted: true,
    timestamp: new Date().toISOString(),
  };

  feedbackData.push(feedback);
  localStorage.setItem('demo_feedbacks', JSON.stringify(feedbackData));

  // 提交到服务器 (非阻塞)
  if (ApiService.getMode() === 'real') {
    try {
      const msgId = chatMsg.messageId || `msg_${msgIndex}`;
      await ApiService.submitFeedback(
        currentBotId,
        msgId,
        feedback.query,
        feedback.answer,
        rating,
        reason,
        comment,
        currentConversationId
      );
    } catch (e) {
      console.error('Failed to submit feedback to server:', e);
    }
  }

  // 更新消息显示
  updateFeedbackDisplay(msgIndex);

  Toast.success('Thank you for your feedback!');
}

/**
 * 更新反馈显示状态
 */
function updateFeedbackDisplay(msgIndex) {
  const messagesContainer = $('#chat-messages');
  const messages = messagesContainer.querySelectorAll('.message');
  const msgEl = messages[msgIndex + 1]; // +1 因为第一条是welcome消息

  if (!msgEl) return;

  const feedback = getFeedbackData(msgIndex);
  if (!feedback) return;

  // 移除反馈按钮
  const feedbackBtns = msgEl.querySelector('.feedback-buttons');
  if (feedbackBtns) {
    feedbackBtns.remove();
  }

  // 添加状态显示
  let statusDiv = msgEl.querySelector('.feedback-status');
  if (!statusDiv) {
    statusDiv = document.createElement('div');
    statusDiv.className = 'feedback-status';
    const metaDiv = msgEl.querySelector('.message-meta');
    if (metaDiv) {
      metaDiv.appendChild(statusDiv);
    }
  }

  statusDiv.innerHTML = `
    <span class="feedback-submitted">${feedback.rating === 'useful' ? '👍 有用' : '👎 没用'}${feedback.reason ? ' - ' + feedback.reason : ''}</span>
    <span class="feedback-locked">🔒</span>
  `;
}

function openFeedbackReasonModal(msgIndex) {
  currentFeedbackMsgIndex = msgIndex;

  const content = `
    <div class="form-group">
      <label class="form-label">请选择原因：</label>
      <div class="radio-group">
        <label class="radio-item">
          <input type="radio" name="feedback-reason" value="irrelevant" checked>
          <span class="radio-label">不相关</span>
        </label>
        <p class="radio-desc">回答与问题无关</p>

        <label class="radio-item">
          <input type="radio" name="feedback-reason" value="wrong_source">
          <span class="radio-label">来源错误</span>
        </label>
        <p class="radio-desc">引用了错误的知识来源</p>

        <label class="radio-item">
          <input type="radio" name="feedback-reason" value="incomplete">
          <span class="radio-label">答案不完整</span>
        </label>
        <p class="radio-desc">回答不够完整，缺少关键信息</p>

        <label class="radio-item">
          <input type="radio" name="feedback-reason" value="other">
          <span class="radio-label">其他</span>
        </label>
        <p class="radio-desc">其他问题</p>
      </div>
    </div>

    <div class="form-group">
      <label class="form-label">补充说明（可选）：</label>
      <textarea class="form-input" id="feedback-comment" placeholder="请提供更多细节..."></textarea>
    </div>
  `;

  const footer = `
    <button class="btn btn-secondary" id="feedback-cancel">取消</button>
    <button class="btn btn-primary" id="feedback-submit">提交反馈</button>
  `;

  Modal.show({
    title: '👎 选择原因',
    content,
    footer,
  });

  $('#feedback-cancel').addEventListener('click', () => Modal.hide());
  $('#feedback-submit').addEventListener('click', () => {
    const reasonRadio = document.querySelector('input[name="feedback-reason"]:checked');
    const comment = $('#feedback-comment').value.trim();
    const reason = reasonRadio ? reasonRadio.value : '';

    submitFeedback(currentFeedbackMsgIndex, 'not_useful', reason, comment);
    Modal.hide();
  });
}

// ============================================
// ID Generator
// ============================================

function generateId() {
  return `id_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// ============================================
// Page Initialization Router
// ============================================

async function initPage() {
  const path = window.location.pathname;
  const page = path.substring(path.lastIndexOf('/') + 1);

  switch (page) {
    case 'index.html':
    case '':
      await initLoginPage();
      break;
    case 'bots.html':
      await initBotsPage();
      break;
    case 'chat.html':
      await initChatPage();
      break;
    default:
      if (await checkExistingAuth()) {
        window.location.href = 'bots.html';
      } else {
        window.location.href = 'index.html';
      }
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', initPage);
