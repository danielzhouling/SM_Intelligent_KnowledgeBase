/**
 * SM-Dmall ERP Knowledge Base
 * API Service Layer - 前端API服务层
 *
 * 支持Mock模式和真实API模式切换
 * TODO: M5阶段完成真实API对接
 */

// ============================================
// 配置
// ============================================

const CONFIG = {
  API_BASE_URL: '/api',  // 后端代理服务地址
  MODE: 'mock',          // 'mock' | 'real'
  DIFY_CONFIG: {
    'A': { name: '故障处理', endpoint: '/chat/agent-a' },
    'B': { name: '操作指南', endpoint: '/chat/agent-b' },
    'C': { name: '版本指南', endpoint: '/chat/agent-c' }
  }
};

// ============================================
// API服务层
// ============================================

const ApiService = {
  _mode: CONFIG.MODE,
  _session: null,

  // ----------------------------------------
  // 模式切换
  // ----------------------------------------

  setMode(mode) {
    this._mode = mode;
    console.log(`[ApiService] Mode changed to: ${mode}`);
  },

  getMode() {
    return this._mode;
  },

  // ----------------------------------------
  // HTTP工具方法
  // ----------------------------------------

  async _request(method, endpoint, data = null) {
    const url = CONFIG.API_BASE_URL + endpoint;
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include'  // 携带cookie
    };

    if (data) {
      options.body = JSON.stringify(data);
    }

    try {
      const response = await fetch(url, options);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error?.message || 'Request failed');
      }

      return result;
    } catch (error) {
      console.error(`[ApiService] ${method} ${endpoint} failed:`, error);
      throw error;
    }
  },

  _get(endpoint, params = {}) {
    const query = new URLSearchParams(params).toString();
    const url = query ? `${endpoint}?${query}` : endpoint;
    return this._request('GET', url);
  },

  _post(endpoint, data) {
    return this._request('POST', endpoint, data);
  },

  _put(endpoint, data) {
    return this._request('PUT', endpoint, data);
  },

  _delete(endpoint) {
    return this._request('DELETE', endpoint);
  },

  // ========================================
  // 认证服务
  // ========================================

  async login(username, password) {
    if (this._mode === 'mock') {
      // Mock模式验证
      const account = MockData.DEMO_ACCOUNTS[username];
      if (account && account.password === password) {
        const user = {
          username,
          role: account.role,
          roleName: MockData.ROLE_PERMISSIONS[account.role].name
        };
        Session.save(user);
        this._session = user;
        return { success: true, data: user };
      }
      throw new Error('Invalid credentials');
    } else {
      // 真实API
      const result = await this._post('/auth/login', { username, password });
      if (result.success && result.data) {
        Session.save(result.data);
        this._session = result.data;
      }
      return result;
    }
  },

  async logout() {
    if (this._mode === 'mock') {
      Session.clear();
      this._session = null;
      return { success: true };
    } else {
      return await this._post('/auth/logout', {});
    }
  },

  getCurrentUser() {
    return this._session || Session.get();
  },

  // ========================================
  // 对话服务 - 核心功能
  // ========================================

  /**
   * 发送消息（阻塞模式，等待完整回答）
   * @param {string} botId - Bot ID (A/B/C)
   * @param {string} query - 用户问题
   * @param {string} conversationId - 会话ID（可选）
   * @returns {Promise<{answer: string, sources: Array, conversationId: string}>}
   */
  async sendMessage(botId, query, conversationId = '') {
    if (this._mode === 'mock') {
      // Mock模式
      const qa = MockData.findMatchingQA(botId, query);
      return {
        answer: qa.answer,
        sources: qa.sources,
        conversationId: conversationId || 'mock-' + Date.now()
      };
    } else {
      // 真实API
      const result = await this._post('/chat/message', {
        botId,
        query,
        conversationId
      });

      if (result.success && result.data) {
        return {
          answer: result.data.answer,
          sources: result.data.metadata?.citations || [],
          conversationId: result.data.conversation_id
        };
      }
      throw new Error(result.error?.message || 'Failed to send message');
    }
  },

  /**
   * 发送消息（流式模式，实时展示AI回答）
   * @param {string} botId - Bot ID
   * @param {string} query - 用户问题
   * @param {Function} onChunk - 每个片段返回时的回调 (content: string) => void
   * @param {Function} onComplete - 完成时的回调 (data: object) => void
   * @returns {Promise<string>} conversationId
   */
  async sendMessageStream(botId, query, onChunk, onComplete) {
    if (this._mode === 'mock') {
      // Mock流式模拟
      const qa = MockData.findMatchingQA(botId, query);
      const words = qa.answer.split('');

      for (let i = 0; i < words.length; i++) {
        await new Promise(resolve => setTimeout(resolve, 30));
        onChunk(words[i]);
      }

      onComplete({
        answer: qa.answer,
        sources: qa.sources,
        conversationId: 'mock-' + Date.now()
      });

      return 'mock-' + Date.now();
    } else {
      // 真实SSE流式请求
      const response = await fetch(CONFIG.API_BASE_URL + '/chat/message/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ botId, query }),
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Stream request failed');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let conversationId = '';
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));

              if (data.event === 'message') {
                onChunk(data.content);
              } else if (data.event === 'message_end') {
                conversationId = data.conversation_id;
                onComplete(data);
              }
            } catch (e) {
              // 忽略解析错误
            }
          }
        }
      }

      return conversationId;
    }
  },

  /**
   * 获取会话列表
   */
  async getConversations(botId) {
    if (this._mode === 'mock') {
      return { success: true, data: [] };
    }
    return await this._get('/chat/conversations', { botId });
  },

  /**
   * 获取历史消息
   */
  async getMessages(conversationId) {
    if (this._mode === 'mock') {
      return { success: true, data: [] };
    }
    return await this._get('/chat/messages', { conversationId });
  },

  // ========================================
  // 用户服务 (管理后台)
  // ========================================

  async getUsers() {
    if (this._mode === 'mock') {
      const users = localStorage.getItem('demo_users');
      return { success: true, data: users ? JSON.parse(users) : [] };
    }
    return await this._get('/users');
  },

  async createUser(userData) {
    if (this._mode === 'mock') {
      const users = JSON.parse(localStorage.getItem('demo_users') || '[]');
      const newUser = {
        id: generateId(),
        ...userData,
        status: 'active',
        createdAt: new Date().toISOString()
      };
      users.push(newUser);
      localStorage.setItem('demo_users', JSON.stringify(users));
      return { success: true, data: newUser };
    }
    return await this._post('/users', userData);
  },

  async updateUser(userId, userData) {
    if (this._mode === 'mock') {
      const users = JSON.parse(localStorage.getItem('demo_users') || '[]');
      const index = users.findIndex(u => u.id === userId);
      if (index >= 0) {
        users[index] = { ...users[index], ...userData };
        localStorage.setItem('demo_users', JSON.stringify(users));
        return { success: true, data: users[index] };
      }
      throw new Error('User not found');
    }
    return await this._put(`/users/${userId}`, userData);
  },

  async deleteUser(userId) {
    if (this._mode === 'mock') {
      const users = JSON.parse(localStorage.getItem('demo_users') || '[]');
      const filtered = users.filter(u => u.id !== userId);
      localStorage.setItem('demo_users', JSON.stringify(filtered));
      return { success: true };
    }
    return await this._delete(`/users/${userId}`);
  },

  // ========================================
  // 角色服务 (管理后台)
  // ========================================

  async getRoles() {
    if (this._mode === 'mock') {
      const roles = localStorage.getItem('demo_roles');
      return { success: true, data: roles ? JSON.parse(roles) : [] };
    }
    return await this._get('/roles');
  },

  async createRole(roleData) {
    if (this._mode === 'mock') {
      const roles = JSON.parse(localStorage.getItem('demo_roles') || '[]');
      const newRole = {
        id: generateId(),
        ...roleData,
        createdAt: new Date().toISOString()
      };
      roles.push(newRole);
      localStorage.setItem('demo_roles', JSON.stringify(roles));
      return { success: true, data: newRole };
    }
    return await this._post('/roles', roleData);
  },

  async updateRole(roleId, roleData) {
    if (this._mode === 'mock') {
      const roles = JSON.parse(localStorage.getItem('demo_roles') || '[]');
      const index = roles.findIndex(r => r.id === roleId);
      if (index >= 0) {
        roles[index] = { ...roles[index], ...roleData };
        localStorage.setItem('demo_roles', JSON.stringify(roles));
        return { success: true, data: roles[index] };
      }
      throw new Error('Role not found');
    }
    return await this._put(`/roles/${roleId}`, roleData);
  },

  async deleteRole(roleId) {
    if (this._mode === 'mock') {
      const roles = JSON.parse(localStorage.getItem('demo_roles') || '[]');
      const filtered = roles.filter(r => r.id !== roleId);
      localStorage.setItem('demo_roles', JSON.stringify(filtered));
      return { success: true };
    }
    return await this._delete(`/roles/${roleId}`);
  },

  // ========================================
  // Bot服务 (管理后台)
  // ========================================

  async getBots() {
    if (this._mode === 'mock') {
      const bots = localStorage.getItem('demo_bots');
      return {
        success: true,
        data: bots ? JSON.parse(bots) : Object.values(MockData.BOT_CONFIG)
      };
    }
    return await this._get('/bots');
  },

  async createBot(botData) {
    if (this._mode === 'mock') {
      const bots = JSON.parse(localStorage.getItem('demo_bots') || '[]');
      const newBot = {
        id: generateId(),
        ...botData,
        status: 'active',
        createdAt: new Date().toISOString()
      };
      bots.push(newBot);
      localStorage.setItem('demo_bots', JSON.stringify(bots));
      return { success: true, data: newBot };
    }
    return await this._post('/bots', botData);
  },

  async updateBot(botId, botData) {
    if (this._mode === 'mock') {
      const bots = JSON.parse(localStorage.getItem('demo_bots') || '[]');
      const index = bots.findIndex(b => b.id === botId);
      if (index >= 0) {
        bots[index] = { ...bots[index], ...botData };
        localStorage.setItem('demo_bots', JSON.stringify(bots));
        return { success: true, data: bots[index] };
      }
      throw new Error('Bot not found');
    }
    return await this._put(`/bots/${botId}`, botData);
  },

  async toggleBot(botId, enabled) {
    return this.updateBot(botId, { status: enabled ? 'active' : 'disabled' });
  },

  // ========================================
  // 反馈服务
  // ========================================

  async submitFeedback(messageId, rating, reason, comment) {
    const feedbackData = {
      messageId,
      rating,      // 'useful' | 'not_useful'
      reason,      // 'irrelevant' | 'wrong_source' | 'incomplete' | 'other'
      comment,
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    if (this._mode === 'mock') {
      const feedbacks = JSON.parse(localStorage.getItem('demo_feedbacks') || '[]');
      const newFeedback = {
        id: generateId(),
        ...feedbackData
      };
      feedbacks.push(newFeedback);
      localStorage.setItem('demo_feedbacks', JSON.stringify(feedbacks));
      return { success: true, data: newFeedback };
    }
    return await this._post('/feedbacks', feedbackData);
  },

  async getFeedbacks(filters = {}) {
    if (this._mode === 'mock') {
      let feedbacks = JSON.parse(localStorage.getItem('demo_feedbacks') || '[]');

      // 应用筛选
      if (filters.botId) {
        feedbacks = feedbacks.filter(f => f.botId === filters.botId);
      }
      if (filters.rating) {
        feedbacks = feedbacks.filter(f => f.rating === filters.rating);
      }
      if (filters.status) {
        feedbacks = feedbacks.filter(f => f.status === filters.status);
      }

      return { success: true, data: feedbacks };
    }
    return await this._get('/feedbacks', filters);
  },

  async reviewFeedback(feedbackId, result, comment) {
    const reviewData = {
      result,      // 'valid' | 'invalid' | 'wrong_source' | 'duplicate'
      comment,
      reviewedAt: new Date().toISOString(),
      status: 'reviewed'
    };

    if (this._mode === 'mock') {
      const feedbacks = JSON.parse(localStorage.getItem('demo_feedbacks') || '[]');
      const index = feedbacks.findIndex(f => f.id === feedbackId);
      if (index >= 0) {
        feedbacks[index] = { ...feedbacks[index], ...reviewData };
        localStorage.setItem('demo_feedbacks', JSON.stringify(feedbacks));
        return { success: true, data: feedbacks[index] };
      }
      throw new Error('Feedback not found');
    }
    return await this._put(`/feedbacks/${feedbackId}/review`, reviewData);
  }
};

// ============================================
// ID生成工具
// ============================================

function generateId() {
  return `id_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// ============================================
// 导出
// ============================================

// 浏览器环境
if (typeof window !== 'undefined') {
  window.ApiService = ApiService;
  window.CONFIG = CONFIG;
}

// Node.js环境
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ApiService, CONFIG };
}
