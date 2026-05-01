/**
 * SM-Dmall ERP Knowledge Base
 * API Service Layer - 前端API服务层 (M5)
 *
 * 支持Mock模式和真实API模式切换
 * - 真实模式: JWT Token管理 (access_token内存, refresh_token本地存储)
 * - 401自动刷新拦截器
 * - SSE流式响应处理
 */

(function(global) {
  'use strict';

  // ============================================
  // 配置
  // ============================================

  const CONFIG = {
    API_BASE_URL: '/api',  // 后端代理服务地址 (Nginx反向代理)
    MODE: 'real',          // 'mock' | 'real'
    REFRESH_THRESHOLD: 5 * 60 * 1000,  // token提前5分钟刷新 (毫秒)
    SSE_RECONNECT_DELAY: 3000,          // SSE重连延迟 (毫秒)
  };

  // ============================================
  // Token管理
  // ============================================

  const TokenManager = {
    ACCESS_TOKEN_KEY: 'kb_access_token',
    REFRESH_TOKEN_KEY: 'kb_refresh_token',
    ACCESS_TOKEN_EXPIRES_KEY: 'kb_access_expires',

    // 内存中的access_token (不持久化，更安全)
    _accessToken: null,
    _refreshPromise: null,  // 防止并发刷新

    /**
     * 保存tokens
     */
    saveTokens(data) {
      // access_token 只存内存
      this._accessToken = data.access_token;
      // refresh_token 存localStorage
      if (data.refresh_token) {
        localStorage.setItem(this.REFRESH_TOKEN_KEY, data.refresh_token);
      }
      // 记录过期时间
      if (data.expires_in) {
        const expiresAt = Date.now() + data.expires_in * 1000;
        localStorage.setItem(this.ACCESS_TOKEN_EXPIRES_KEY, expiresAt.toString());
        this._accessToken = data.access_token;
      }
    },

    /**
     * 获取access_token
     */
    getAccessToken() {
      return this._accessToken;
    },

    /**
     * 设置access_token (页面刷新后恢复)
     */
    setAccessToken(token) {
      this._accessToken = token;
    },

    /**
     * 获取refresh_token
     */
    getRefreshToken() {
      return localStorage.getItem(this.REFRESH_TOKEN_KEY);
    },

    /**
     * 检查token是否即将过期
     */
    isTokenExpiringSoon() {
      const expiresAt = localStorage.getItem(this.ACCESS_TOKEN_EXPIRES_KEY);
      if (!expiresAt) return false;
      return Date.now() + CONFIG.REFRESH_THRESHOLD > parseInt(expiresAt);
    },

    /**
     * 是否已登录 (有refresh_token)
     */
    isLoggedIn() {
      return !!this.getRefreshToken() || !!this._accessToken;
    },

    /**
     * 刷新token
     */
    async refresh() {
      // 防止并发刷新
      if (this._refreshPromise) {
        return this._refreshPromise;
      }

      const refreshToken = this.getRefreshToken();
      if (!refreshToken) {
        throw new Error('No refresh token');
      }

      this._refreshPromise = (async () => {
        try {
          const response = await fetch(CONFIG.API_BASE_URL + '/auth/refresh', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refresh_token: refreshToken }),
          });

          if (!response.ok) {
            this.clearTokens();
            throw new Error('Token refresh failed');
          }

          const result = await response.json();
          if (result.success && result.data) {
            this.saveTokens(result.data);
            return result.data.access_token;
          } else {
            throw new Error(result.error?.message || 'Token refresh failed');
          }
        } finally {
          this._refreshPromise = null;
        }
      })();

      return this._refreshPromise;
    },

    /**
     * 清除所有tokens
     */
    clearTokens() {
      this._accessToken = null;
      localStorage.removeItem(this.ACCESS_TOKEN_KEY);
      localStorage.removeItem(this.REFRESH_TOKEN_KEY);
      localStorage.removeItem(this.ACCESS_TOKEN_EXPIRES_KEY);
    },
  };

  // ============================================
  // API服务层
  // ============================================

  const ApiService = {
    _mode: CONFIG.MODE,
    _currentUser: null,

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
    // HTTP工具方法 (带401自动刷新)
    // ----------------------------------------

    async _request(method, endpoint, data = null, options = {}) {
      const url = CONFIG.API_BASE_URL + endpoint;
      let accessToken = TokenManager.getAccessToken();

      // Try to restore session: if no access token but have refresh token, attempt refresh.
      // If refresh fails (expired/invalid), clear stale token silently and continue.
      if (this._mode === 'real' && !accessToken && TokenManager.getRefreshToken()) {
        try {
          accessToken = await TokenManager.refresh();
        } catch (e) {
          TokenManager.clearTokens();
          accessToken = null;
        }
      }

      // 如果token即将过期，先刷新
      if (this._mode === 'real' && accessToken && TokenManager.isLoggedIn() && TokenManager.isTokenExpiringSoon()) {
        try {
          accessToken = await TokenManager.refresh();
        } catch (e) {
          // Proactive refresh failed, continue with current token
        }
      }

      const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
      };

      if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
      }

      const fetchOptions = {
        method,
        headers,
        credentials: 'include',
        ...options,
      };

      if (data && method !== 'GET') {
        fetchOptions.body = JSON.stringify(data);
      }

      try {
        const response = await fetch(url, fetchOptions);
        const result = await response.json();

        // 处理401 - token失效
        if (response.status === 401) {
          // Only attempt token refresh if we have a refresh token to use.
          // Login/register endpoints don't need auth — if they return 401,
          // it means wrong credentials, not expired tokens.
          if (this._mode === 'real' && !options._retry && TokenManager.getRefreshToken()) {
            try {
              const newToken = await TokenManager.refresh();
              return this._request(method, endpoint, data, {
                ...options,
                headers: { ...headers, 'Authorization': `Bearer ${newToken}` },
                _retry: true,
              });
            } catch (e) {
              this._handleAuthFailure();
              throw new Error('认证已过期，请重新登录');
            }
          }
          // No refresh token or already retried — use server's error message
          const serverError = result.error?.message || result.detail || '认证已过期，请重新登录';
          if (TokenManager.getRefreshToken()) {
            this._handleAuthFailure();
          }
          throw new Error(serverError);
        }

        if (!response.ok) {
          throw new Error(result.error?.message || result.detail || `Request failed: ${response.status}`);
        }

        return result;
      } catch (error) {
        console.error(`[ApiService] ${method} ${endpoint} failed:`, error);
        throw error;
      }
    },

    _get(endpoint, params = {}, options = {}) {
      const query = new URLSearchParams(params).toString();
      const url = query ? `${endpoint}?${query}` : endpoint;
      return this._request('GET', url, null, options);
    },

    _post(endpoint, data, options = {}) {
      return this._request('POST', endpoint, data, options);
    },

    _put(endpoint, data, options = {}) {
      return this._request('PUT', endpoint, data, options);
    },

    _patch(endpoint, data, options = {}) {
      return this._request('PATCH', endpoint, data, options);
    },

    _delete(endpoint, options = {}) {
      return this._request('DELETE', endpoint, null, options);
    },

    /**
     * 处理认证失败
     */
    _handleAuthFailure() {
      TokenManager.clearTokens();
      this._currentUser = null;
      // 触发全局事件
      window.dispatchEvent(new CustomEvent('auth:expired'));
    },

    // ========================================
    // 认证服务
    // ========================================

    /**
     * 登录
     * @param {string} username
     * @param {string} password
     * @returns {Promise<{success, data: {access_token, refresh_token, user}}>}
     */
    async login(username, password) {
      if (this._mode === 'mock') {
        return this._mockLogin(username, password);
      }

      const result = await this._post('/auth/login', { username, password });

      if (result.success && result.data) {
        TokenManager.saveTokens(result.data);
        this._currentUser = result.data.user;
        return result;
      }

      throw new Error(result.error?.message || 'Login failed');
    },

    /**
     * 获取当前用户信息
     */
    async getMe() {
      if (this._mode === 'mock') {
        return { success: true, data: TokenManager.getAccessToken() ? this._currentUser : null };
      }

      const result = await this._get('/auth/me');
      if (result.success && result.data) {
        this._currentUser = result.data;
      }
      return result;
    },

    /**
     * 登出
     */
    async logout() {
      TokenManager.clearTokens();
      this._currentUser = null;

      if (this._mode === 'mock') {
        return { success: true };
      }

      try {
        return await this._post('/auth/logout', {});
      } catch (e) {
        // 即使API失败也清除本地状态
        return { success: true };
      }
    },

    /**
     * 检查登录状态 (页面刷新后恢复)
     */
    async checkAuth() {
      if (!TokenManager.isLoggedIn()) {
        return null;
      }

      try {
        const result = await this.getMe();
        if (result.success && result.data) {
          return result.data;
        }
      } catch (e) {
        // _request() already handles token refresh; if it still fails, session is truly invalid
      }

      return null;
    },

    getCurrentUser() {
      return this._currentUser;
    },

    // ========================================
    // Bot服务
    // ========================================

    /**
     * 获取当前用户可用的Bot列表
     */
    async getAvailableBots() {
      if (this._mode === 'mock') {
        return { success: true, data: Object.values(MockData.BOT_CONFIG) };
      }
      return await this._get('/bots/available');
    },

    /**
     * 获取所有Bot (管理后台)
     */
    async getBots() {
      if (this._mode === 'mock') {
        const bots = localStorage.getItem('demo_bots');
        return {
          success: true,
          data: bots ? JSON.parse(bots) : Object.values(MockData.BOT_CONFIG),
        };
      }
      return await this._get('/bots');
    },

    /**
     * 创建Bot (第一步)
     */
    async createBot(botData) {
      if (this._mode === 'mock') {
        const bots = JSON.parse(localStorage.getItem('demo_bots') || '[]');
        const newBot = {
          id: generateId(),
          ...botData,
          status: 'draft',
          created_at: new Date().toISOString(),
        };
        bots.push(newBot);
        localStorage.setItem('demo_bots', JSON.stringify(bots));
        return { success: true, data: newBot };
      }
      return await this._post('/bots', botData);
    },

    /**
     * 更新Bot基本信息
     */
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

    /**
     * 配置Dify API Key (第二步)
     */
    async configureDify(botId, difyApiKey) {
      if (this._mode === 'mock') {
        const bots = JSON.parse(localStorage.getItem('demo_bots') || '[]');
        const index = bots.findIndex(b => b.id === botId);
        if (index >= 0) {
          bots[index].dify_api_key = difyApiKey;
          bots[index].status = 'active';
          localStorage.setItem('demo_bots', JSON.stringify(bots));
          return { success: true, data: bots[index] };
        }
        throw new Error('Bot not found');
      }
      return await this._put(`/bots/${botId}/dify`, { dify_api_key: difyApiKey });
    },

    /**
     * 测试Dify连接
     */
    async testDifyConnection(botId) {
      if (this._mode === 'mock') {
        return { success: true, data: { success: true, message: 'Mock: Connection successful' } };
      }
      return await this._post(`/bots/${botId}/test`);
    },

    /**
     * 切换Bot状态
     */
    async toggleBotStatus(botId) {
      if (this._mode === 'mock') {
        const bots = JSON.parse(localStorage.getItem('demo_bots') || '[]');
        const index = bots.findIndex(b => b.id === botId);
        if (index >= 0) {
          bots[index].status = bots[index].status === 'active' ? 'disabled' : 'active';
          localStorage.setItem('demo_bots', JSON.stringify(bots));
          return { success: true, data: bots[index] };
        }
        throw new Error('Bot not found');
      }
      return await this._patch(`/bots/${botId}/status`);
    },

    // ========================================
    // 对话服务 - 核心功能
    // ========================================

    /**
     * 发送消息（阻塞模式，等待完整回答）
     */
    async sendMessage(botId, query, conversationId = '') {
      if (this._mode === 'mock') {
        const qa = MockData.findMatchingQA(botId, query);
        return {
          answer: qa.answer,
          sources: qa.sources,
          conversationId: conversationId || 'mock-' + Date.now(),
        };
      }

      const result = await this._post('/chat/message', {
        bot_id: botId,
        query,
        conversation_id: conversationId || null,
      });

      if (result.success && result.data) {
        return {
          answer: result.data.answer,
          sources: result.data.citations || [],
          conversationId: result.data.conversation_id,
          messageId: result.data.message_id,
        };
      }
      throw new Error(result.error?.message || 'Failed to send message');
    },

    /**
     * 发送消息（流式模式，实时展示AI回答）
     * @param {string} botId - Bot ID
     * @param {string} query - 用户问题
     * @param {function} onChunk - 流式内容回调
     * @param {function} onComplete - 完成回调
     * @param {function} onError - 错误回调
     * @param {string|null} [conversationId] - 会话ID (已有会话时传入，新建会话时传null)
     * @returns {Promise<{conversationId: string, citations: Array}>}
     */
    async sendMessageStream(botId, query, onChunk, onComplete, onError, conversationId = null) {
      if (this._mode === 'mock') {
        return this._mockStream(botId, query, onChunk, onComplete);
      }

      let accessToken = TokenManager.getAccessToken();

      // token即将过期，先刷新
      if (TokenManager.isTokenExpiringSoon()) {
        try {
          accessToken = await TokenManager.refresh();
        } catch (e) {
          onError?.('认证已过期，请刷新页面重新登录');
          throw e;
        }
      }

      try {
        const response = await fetch(CONFIG.API_BASE_URL + '/chat/message/stream', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            bot_id: botId,
            query,
            conversation_id: conversationId,
          }),
          credentials: 'include',
        });

        if (response.status === 401) {
          // 尝试刷新token
          try {
            accessToken = await TokenManager.refresh();
            // 重试请求
            return this.sendMessageStream(botId, query, onChunk, onComplete, onError, conversationId);
          } catch (e) {
            onError?.('认证已过期，请刷新页面重新登录');
            throw e;
          }
        }

        if (!response.ok) {
          const error = await response.json().catch(() => ({}));
          throw new Error(error.error?.message || 'Stream request failed');
        }

        return this._parseSSE(response, onChunk, onComplete, onError);
      } catch (error) {
        console.error('[ApiService] Stream error:', error);
        onError?.(error.message);
        throw error;
      }
    },

    /**
     * 解析SSE流
     */
    _parseSSE(response, onChunk, onComplete, onError) {
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let conversationId = '';
      let citations = [];
      let resultResolve = null;

      const read = () => {
        reader.read().then(({ done, value }) => {
          if (done) {
            // 处理缓冲区剩余数据
            if (buffer.trim()) {
              this._processSSEData(buffer.trim(), onChunk, (data) => {
                conversationId = data.conversation_id || conversationId;
                const raw = data.metadata?.retriever_resources;
                if (raw && raw.length) {
                  citations = raw.map(r => ({
                    title: r.document_name || '',
                    snippet: r.content || '',
                    content: r.content || '',
                    score: r.score,
                    position: r.position,
                    dataset_name: r.dataset_name || '',
                  }));
                }
              });
            }
            const result = { conversationId, citations };
            onComplete?.(result);
            resultResolve?.(result);
            return;
          }

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            this._processSSEData(line, onChunk, (data) => {
              conversationId = data.conversation_id || conversationId;
              const raw = data.metadata?.retriever_resources;
              if (raw && raw.length) {
                citations = raw.map(r => ({
                  title: r.document_name || '',
                  snippet: r.content || '',
                  content: r.content || '',
                  score: r.score,
                  position: r.position,
                  dataset_name: r.dataset_name || '',
                }));
              }
            });
          }

          read();
        }).catch(error => {
          console.error('[ApiService] SSE read error:', error);
          onError?.('网络连接中断');
          resultResolve?.({ conversationId, citations });
        });
      };

      read();

      return new Promise((resolve) => {
        resultResolve = resolve;
      });
    },

    /**
     * 处理单行SSE数据
     */
    _processSSEData(line, onChunk, onMeta) {
      if (!line.startsWith('data: ')) return;

      const dataStr = line.slice(6);
      if (!dataStr || dataStr === '[DONE]') return;

      try {
        const data = JSON.parse(dataStr);

        switch (data.event) {
          case 'message':
            // Dify chat bot 使用 message 事件，答案在 answer 字段
            onChunk(data.answer || '');
            break;
          case 'agent_message':
            // Dify Agent bot 使用 agent_message 事件，答案在 answer 字段
            onChunk(data.answer || '');
            break;
          case 'message_end':
            onMeta(data);
            break;
          case 'error':
            throw new Error(data.message || 'Stream error');
          case 'ping':
            // 忽略ping
            break;
        }
      } catch (e) {
        if (e.message !== 'Stream error') {
          console.warn('[ApiService] SSE parse error:', e);
        }
      }
    },

    /**
     * Mock流式模拟
     */
    _mockStream(botId, query, onChunk, onComplete) {
      const qa = MockData.findMatchingQA(botId, query);
      const words = qa.answer.split('');
      let index = 0;

      const streamNext = () => {
        if (index < words.length) {
          onChunk(words[index]);
          index++;
          setTimeout(streamNext, 20 + Math.random() * 30);
        } else {
          onComplete({
            answer: qa.answer,
            sources: qa.sources,
            conversationId: 'mock-' + Date.now(),
          });
        }
      };

      streamNext();
      return Promise.resolve({ conversationId: 'mock-' + Date.now(), citations: qa.sources });
    },

    /**
     * 获取会话列表
     */
    async getConversations(botId) {
      if (this._mode === 'mock') {
        const data = localStorage.getItem(`demo_conversations_${botId}`);
        return { success: true, data: data ? JSON.parse(data) : [] };
      }
      return await this._get('/chat/conversations', { bot_id: botId });
    },

    /**
     * 获取历史消息
     */
    async getMessages(conversationId) {
      if (this._mode === 'mock') {
        const data = localStorage.getItem(`demo_messages_${conversationId}`);
        return { success: true, data: data ? JSON.parse(data) : [] };
      }
      return await this._get(`/chat/conversations/${conversationId}/messages`);
    },

    /**
     * 删除会话
     * @param {string} conversationId - 要删除的会话ID
     * @returns {Promise<{success: boolean}>}
     */
    async deleteConversation(conversationId) {
      if (this._mode === 'mock') {
        // Mock 模式下从 localStorage 移除
        const keys = Object.keys(localStorage);
        keys.forEach(key => {
          if (key.startsWith('demo_messages_') && key.includes(conversationId)) {
            localStorage.removeItem(key);
          }
        });
        // 从会话列表移除
        const convKeys = Object.keys(localStorage).filter(k => k.startsWith('demo_conversations_'));
        convKeys.forEach(key => {
          const list = JSON.parse(localStorage.getItem(key) || '[]');
          const filtered = list.filter(c => c.id !== conversationId);
          localStorage.setItem(key, JSON.stringify(filtered));
        });
        return { success: true };
      }
      const result = await this._delete(`/chat/conversations/${conversationId}`);
      return result;
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
          created_at: new Date().toISOString(),
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
          created_at: new Date().toISOString(),
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
    // 反馈服务
    // ========================================

    async submitFeedback(botId, messageId, query, answer, rating, reason, comment, conversationId) {
      const feedbackData = {
        bot_id: botId,
        message_id: messageId,
        query,
        answer,
        rating,       // 'useful' | 'not_useful'
        reason,       // 'irrelevant' | 'wrong_source' | 'incomplete' | 'other'
        comment,
        conversation_id: conversationId,
      };

      if (this._mode === 'mock') {
        const feedbacks = JSON.parse(localStorage.getItem('demo_feedbacks') || '[]');
        const newFeedback = {
          id: generateId(),
          ...feedbackData,
          status: 'pending',
          created_at: new Date().toISOString(),
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
        if (filters.bot_id) {
          feedbacks = feedbacks.filter(f => f.bot_id === filters.bot_id);
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
      if (this._mode === 'mock') {
        const feedbacks = JSON.parse(localStorage.getItem('demo_feedbacks') || '[]');
        const index = feedbacks.findIndex(f => f.id === feedbackId);
        if (index >= 0) {
          feedbacks[index] = {
            ...feedbacks[index],
            status: 'reviewed',
            review_result: result,
            review_comment: comment,
            reviewed_at: new Date().toISOString(),
          };
          localStorage.setItem('demo_feedbacks', JSON.stringify(feedbacks));
          return { success: true, data: feedbacks[index] };
        }
        throw new Error('Feedback not found');
      }
      return await this._put(`/feedbacks/${feedbackId}/review`, {
        review_result: result,
        review_comment: comment,
      });
    },

    async exportFeedbacks(filters = {}) {
      if (this._mode === 'mock') {
        const feedbacks = JSON.parse(localStorage.getItem('demo_feedbacks') || '[]');
        return { success: true, data: feedbacks };
      }
      return await this._post('/feedbacks/export', filters);
    },

    // ========================================
    // 个人中心
    // ========================================

    async getProfile() {
      return await this._get('/auth/profile');
    },

    async updateProfile(data) {
      return await this._put('/auth/profile', data);
    },

    async changePassword(data) {
      const result = await this._put('/auth/password', data);
      if (result.success && result.data) {
        TokenManager.saveTokens(result.data);
      }
      return result;
    },

    // ========================================
    // 系统公告
    // ========================================

    async getActiveAnnouncement() {
      return await this._get('/announcements/active');
    },

    async getAnnouncements(page = 1, pageSize = 20) {
      return await this._get(`/announcements?page=${page}&page_size=${pageSize}`);
    },

    async createAnnouncement(data) {
      return await this._post('/announcements', data);
    },

    async updateAnnouncement(id, data) {
      return await this._put(`/announcements/${id}`, data);
    },

    async toggleAnnouncementStatus(id, status) {
      return await this._request('PATCH', `/announcements/${id}/status`, { status });
    },

    // ========================================
    // Mock登录 (保留用于开发)
    // ========================================

    _mockLogin(username, password) {
      const account = MockData.DEMO_ACCOUNTS[username];
      if (account && account.password === password) {
        const user = {
          id: generateId(),
          username,
          display_name: username,
          role: account.role,
          roleName: MockData.ROLE_PERMISSIONS[account.role]?.name || account.role,
        };

        const tokens = {
          access_token: `mock_token_${Date.now()}`,
          refresh_token: `mock_refresh_${Date.now()}`,
          expires_in: 86400,
        };

        // Save tokens to localStorage
        TokenManager.saveTokens(tokens);

        this._currentUser = user;
        return {
          success: true,
          data: {
            ...tokens,
            user,
          },
        };
      }
      throw new Error('Invalid credentials');
    },
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
    global.ApiService = ApiService;
    global.TokenManager = TokenManager;
    global.CONFIG = CONFIG;
  }

  // Node.js环境
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ApiService, TokenManager, CONFIG };
  }

})(typeof window !== 'undefined' ? window : this);
