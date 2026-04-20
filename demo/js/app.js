/**
 * SM-Dmall ERP Knowledge Base Demo
 * Main Application Logic
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
    minute: '2-digit'
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
      info: 'ℹ️'
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
  }
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

    // Store callback
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
  }
};

// ============================================
// User Session Management
// ============================================

const Session = {
  KEY: 'demo_session',

  save(user) {
    localStorage.setItem(this.KEY, JSON.stringify(user));
  },

  get() {
    const data = localStorage.getItem(this.KEY);
    return data ? JSON.parse(data) : null;
  },

  clear() {
    localStorage.removeItem(this.KEY);
  },

  isLoggedIn() {
    return this.get() !== null;
  },

  getUserRole() {
    const user = this.get();
    return user ? user.role : null;
  },

  getAllowedBots() {
    const role = this.getUserRole();
    if (!role) return [];
    return MockData.ROLE_PERMISSIONS[role]?.bots || [];
  }
};

// ============================================
// Login Page Logic
// ============================================

function initLoginPage() {
  // Redirect if already logged in
  if (Session.isLoggedIn()) {
    window.location.href = 'bots.html';
    return;
  }

  const loginForm = $('#login-form');
  const usernameInput = $('#username');
  const passwordInput = $('#password');
  const roleSelect = $('#role');

  // Handle demo account click to auto-fill credentials
  $$('.login-account').forEach(el => {
    el.addEventListener('click', () => {
      const account = el.dataset.account;
      if (account && MockData.DEMO_ACCOUNTS[account]) {
        usernameInput.value = account;
        passwordInput.value = MockData.DEMO_ACCOUNTS[account].password;
        roleSelect.value = MockData.DEMO_ACCOUNTS[account].role;
        Toast.info(`Account "${account}" filled`);
      }
    });
  });

  loginForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const username = usernameInput.value.trim();
    const password = passwordInput.value;
    const role = roleSelect.value;

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

    if (!role) {
      Toast.error('Please select a role');
      roleSelect.focus();
      return;
    }

    // Validate credentials
    const account = MockData.DEMO_ACCOUNTS[username];
    if (!account || account.password !== password) {
      Toast.error('Invalid username or password');
      passwordInput.focus();
      return;
    }

    // Verify role matches account's assigned role
    if (account.role !== role) {
      Toast.error('Role does not match account. Please select the correct role.');
      roleSelect.focus();
      return;
    }

    // Save session
    Session.save({
      username,
      role,
      roleName: MockData.ROLE_PERMISSIONS[role].name
    });

    Toast.success(`Welcome, ${username}!`);
    setTimeout(() => {
      window.location.href = 'bots.html';
    }, 500);
  });
}

// ============================================
// Bot Selection Page Logic
// ============================================

function initBotsPage() {
  // Check if logged in
  if (!Session.isLoggedIn()) {
    window.location.href = 'index.html';
    return;
  }

  const user = Session.get();
  const allowedBots = Session.getAllowedBots();

  // Update header
  $('#user-name').textContent = user.username;
  $('#user-role').textContent = user.roleName;

  // Render bots
  const botsGrid = $('#bots-grid');
  botsGrid.innerHTML = '';

  Object.values(MockData.BOT_CONFIG).forEach(bot => {
    const isAllowed = allowedBots.includes(bot.id);
    const card = document.createElement('div');
    card.className = `bot-card ${isAllowed ? '' : 'bot-card-locked'}`;

    card.innerHTML = `
      <div class="bot-avatar">
        <div class="bot-head">
          <div class="bot-face">
            <div class="bot-eyes">
              <div class="bot-eye"></div>
              <div class="bot-eye"></div>
            </div>
            <div class="bot-mouth"></div>
          </div>
          <div class="bot-online"></div>
          <div class="bot-icon-overlay">${bot.icon}</div>
        </div>
      </div>
      <h3 class="bot-name">${bot.name}</h3>
      <p class="bot-desc">${bot.description}</p>
      <div class="bot-knowledge">
        ${bot.knowledge.map(k => `<span class="knowledge-tag">${k}</span>`).join('')}
      </div>
      <div class="bot-status ${isAllowed ? 'status-available' : 'status-locked'}">
        ${isAllowed ? 'Online' : 'Offline'}
      </div>
      <div class="bot-actions">
        ${isAllowed
          ? `<button class="btn btn-ai btn-block" data-bot="${bot.id}">
              <span>Start Chat</span>
              <span>→</span>
            </button>`
          : `<button class="btn btn-secondary btn-block" disabled>
              <span>🔒 Restricted</span>
            </button>`
        }
      </div>
    `;

    botsGrid.appendChild(card);
  });

  // Update available count
  $('#available-count').textContent = allowedBots.length;
  $('#total-count').textContent = Object.keys(MockData.BOT_CONFIG).length;

  // Add click handlers
  $$('.bot-card:not(.bot-card-locked)').forEach(card => {
    card.addEventListener('click', () => {
      const botId = card.querySelector('button').dataset.bot;
      window.location.href = `chat.html?id=${botId}`;
    });
  });

  // Logout handler
  $('#btn-logout').addEventListener('click', () => {
    Session.clear();
    Toast.success('Logged out successfully');
    setTimeout(() => {
      window.location.href = 'index.html';
    }, 500);
  });
}

// ============================================
// Chat Page Logic
// ============================================

let currentBotId = null;
let currentBot = null;
let chatHistory = [];

function initChatPage() {
  // Check if logged in
  if (!Session.isLoggedIn()) {
    window.location.href = 'index.html';
    return;
  }

  // Get bot ID from URL
  currentBotId = getUrlParam('id') || 'A';
  currentBot = MockData.BOT_CONFIG[currentBotId];

  if (!currentBot) {
    Toast.error('Invalid Bot ID');
    window.location.href = 'bots.html';
    return;
  }

  // Check permission
  const allowedBots = Session.getAllowedBots();
  if (!allowedBots.includes(currentBotId)) {
    Toast.error('You do not have access to this Bot');
    window.location.href = 'bots.html';
    return;
  }

  const user = Session.get();

  // Update header
  $('#user-name').textContent = user.username;
  $('#user-role').textContent = user.roleName;
  $('#current-bot-name').textContent = currentBot.name;

  // Update sidebar
  $('#bot-avatar-icon').textContent = currentBot.icon;
  $('#bot-sidebar-name').textContent = currentBot.name;
  $('#bot-sidebar-desc').textContent = currentBot.description;

  // Render knowledge list
  const knowledgeList = $('#knowledge-list');
  knowledgeList.innerHTML = currentBot.knowledge
    .map(k => `<li class="chat-knowledge-item">${k}</li>`)
    .join('');

  // Set up chat with welcome message
  initChat();

  // Event listeners
  $('#chat-form').addEventListener('submit', handleSendMessage);
  $('#btn-back').addEventListener('click', () => {
    window.location.href = 'bots.html';
  });
  $('#btn-logout').addEventListener('click', () => {
    Session.clear();
    Toast.success('Logged out successfully');
    setTimeout(() => {
      window.location.href = 'index.html';
    }, 500);
  });

  // Setup annotation modal handlers
  setupAnnotationModal();
}

function initChat() {
  chatHistory = [];
  const messagesContainer = $('#chat-messages');
  messagesContainer.innerHTML = '';

  // Add welcome message
  addBotMessage(currentBot.defaultPrompt, [], true);
}

function handleSendMessage(e) {
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

  // Simulate bot thinking
  showTypingIndicator();

  // Find matching response (simulate delay)
  setTimeout(() => {
    hideTypingIndicator();
    const qa = MockData.findMatchingQA(currentBotId, message);
    addBotMessage(qa.answer, qa.sources);
  }, 800 + Math.random() * 700);
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

function addBotMessage(text, sources = [], isWelcome = false) {
  chatHistory.push({ role: 'bot', content: text });
  const messagesContainer = $('#chat-messages');

  const messageEl = document.createElement('div');
  messageEl.className = 'message';

  const sourcesHtml = sources.length > 0 ? `
    <div class="message-meta">
      <div class="message-sources">
        ${sources.map((s, i) => `
          <span class="source-tag" data-source-index="${i}">
            📄 ${s.title}
          </span>
        `).join('')}
      </div>
      ${isWelcome ? '' : `<button class="btn-annotate" data-message-index="${chatHistory.length - 1}">
        <span>📝</span>
        <span>Annotate</span>
      </button>`}
    </div>
    <div class="source-details">
      ${sources.map((s, i) => `
        <div class="source-detail" data-detail-index="${i}">
          <div class="source-detail-header">📄 ${s.title}</div>
          <div class="source-detail-content">"${s.snippet}"</div>
        </div>
      `).join('')}
    </div>
  ` : `
    <div class="message-meta">
      <div class="message-sources">
        <span class="source-tag" style="background: var(--bg-input); color: var(--text-muted);">
          Demo mode - No real knowledge base
        </span>
      </div>
      ${isWelcome ? '' : `<button class="btn-annotate" data-message-index="${chatHistory.length - 1}">
        <span>📝</span>
        <span>Annotate</span>
      </button>`}
    </div>
  `;

  messageEl.innerHTML = `
    <div class="message-avatar">${currentBot.icon}</div>
    <div class="message-content">
      <div class="message-text">${formatMessageText(text)}</div>
      <div class="message-time">${formatTime(new Date())}</div>
      ${sourcesHtml}
    </div>
  `;

  messagesContainer.appendChild(messageEl);

  // Add source toggle handlers
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

  // Add annotate button handler
  const annotateBtn = messageEl.querySelector('.btn-annotate');
  if (annotateBtn) {
    annotateBtn.addEventListener('click', () => {
      openAnnotationModal(chatHistory.length - 1);
    });
  }

  scrollToBottom();
}

function showTypingIndicator() {
  const messagesContainer = $('#chat-messages');
  const typingEl = document.createElement('div');
  typingEl.className = 'message';
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
  container.scrollTop = container.scrollHeight;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function formatMessageText(text) {
  // Convert markdown-like formatting to HTML
  return escapeHtml(text)
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br>');
}

// ============================================
// Annotation System
// ============================================

let currentAnnotationIndex = null;
let annotations = [];

function setupAnnotationModal() {
  // Load existing annotations
  const stored = localStorage.getItem('demo_annotations');
  annotations = stored ? JSON.parse(stored) : [];
}

function openAnnotationModal(messageIndex) {
  currentAnnotationIndex = messageIndex;

  const content = `
    <div class="form-group">
      <label class="form-label">What is the issue with this answer?</label>
      <div class="radio-group">
        <label class="radio-item">
          <input type="radio" name="issue-type" value="inaccurate" checked>
          <span class="radio-label">Inaccurate</span>
        </label>
        <p class="radio-desc">The answer contains incorrect information</p>

        <label class="radio-item">
          <input type="radio" name="issue-type" value="incomplete">
          <span class="radio-label">Missing Information</span>
        </label>
        <p class="radio-desc">The answer is correct but incomplete</p>

        <label class="radio-item">
          <input type="radio" name="issue-type" value="other">
          <span class="radio-label">Other</span>
        </label>
        <p class="radio-desc">Other issues not listed above</p>
      </div>
    </div>

    <div class="form-group">
      <label class="form-label">Additional Comments (optional)</label>
      <textarea class="form-input" id="annotation-comment" placeholder="Please provide more details about the issue..."></textarea>
    </div>
  `;

  const footer = `
    <button class="btn btn-secondary" id="annotation-cancel">Cancel</button>
    <button class="btn btn-primary" id="annotation-submit">Submit Annotation</button>
  `;

  Modal.show({
    title: '📝 Annotate This Answer',
    content,
    footer
  });

  // Add event listeners
  $('#annotation-cancel').addEventListener('click', () => Modal.hide());
  $('#annotation-submit').addEventListener('click', submitAnnotation);
}

function submitAnnotation() {
  const issueType = document.querySelector('input[name="issue-type"]:checked');
  const comment = $('#annotation-comment').value.trim();

  if (!issueType) {
    Toast.error('Please select an issue type');
    return;
  }

  // Save annotation
  const annotation = {
    id: Date.now(),
    botId: currentBotId,
    messageIndex: currentAnnotationIndex,
    issueType: issueType.value,
    comment,
    timestamp: new Date().toISOString()
  };

  annotations.push(annotation);
  localStorage.setItem('demo_annotations', JSON.stringify(annotations));

  Modal.hide();
  Toast.success('Annotation submitted successfully! Thank you for your feedback.');

  console.log('Annotation saved:', annotation);
}

// ============================================
// Page Initialization Router
// ============================================

function initPage() {
  const path = window.location.pathname;
  const page = path.substring(path.lastIndexOf('/') + 1);

  switch (page) {
    case 'index.html':
    case '':
      initLoginPage();
      break;
    case 'bots.html':
      initBotsPage();
      break;
    case 'chat.html':
      initChatPage();
      break;
    default:
      if (Session.isLoggedIn()) {
        window.location.href = 'bots.html';
      } else {
        window.location.href = 'index.html';
      }
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', initPage);
