/**
 * SM-Dmall ERP Knowledge Base
 * Admin API Service Layer - 管理后台API服务层 (M5)
 *
 * 支持Mock模式和真实API模式切换
 * - 真实模式: JWT Token管理 (access_token内存, refresh_token本地存储)
 * - 401自动刷新拦截器
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
  };

  // ============================================
  // Token管理
  // ============================================

  const TokenManager = {
    ACCESS_TOKEN_KEY: 'kb_admin_access_token',
    REFRESH_TOKEN_KEY: 'kb_admin_refresh_token',
    ACCESS_TOKEN_EXPIRES_KEY: 'kb_admin_access_expires',

    _accessToken: null,
    _refreshPromise: null,

    saveTokens(data) {
      this._accessToken = data.access_token;
      if (data.refresh_token) {
        localStorage.setItem(this.REFRESH_TOKEN_KEY, data.refresh_token);
      }
      if (data.expires_in) {
        const expiresAt = Date.now() + data.expires_in * 1000;
        localStorage.setItem(this.ACCESS_TOKEN_EXPIRES_KEY, expiresAt.toString());
        this._accessToken = data.access_token;
      }
    },

    getAccessToken() {
      return this._accessToken;
    },

    setAccessToken(token) {
      this._accessToken = token;
    },

    getRefreshToken() {
      return localStorage.getItem(this.REFRESH_TOKEN_KEY);
    },

    isTokenExpiringSoon() {
      const expiresAt = localStorage.getItem(this.ACCESS_TOKEN_EXPIRES_KEY);
      if (!expiresAt) return false;
      return Date.now() + CONFIG.REFRESH_THRESHOLD > parseInt(expiresAt);
    },

    isLoggedIn() {
      return !!this.getRefreshToken() || !!this._accessToken;
    },

    async refresh() {
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

    clearTokens() {
      this._accessToken = null;
      localStorage.removeItem(this.ACCESS_TOKEN_KEY);
      localStorage.removeItem(this.REFRESH_TOKEN_KEY);
      localStorage.removeItem(this.ACCESS_TOKEN_EXPIRES_KEY);
    },
  };

  // ============================================
  // Admin API服务层
  // ============================================

  const AdminApiService = {
    _mode: CONFIG.MODE,
    _currentUser: null,

    setMode(mode) {
      this._mode = mode;
      console.log(`[AdminApiService] Mode changed to: ${mode}`);
    },

    getMode() {
      return this._mode;
    },

    async _request(method, endpoint, data = null, options = {}) {
      const url = CONFIG.API_BASE_URL + endpoint;
      let accessToken = TokenManager.getAccessToken();

      // Try to restore session: if no access token but have refresh token, attempt refresh.
      // If refresh fails (expired/invalid), clear stale token silently and continue.
      // Login/register endpoints don't need a token; authenticated endpoints will
      // get a 401 and the standard retry flow handles it.
      if (this._mode === 'real' && !accessToken && TokenManager.getRefreshToken()) {
        try {
          accessToken = await TokenManager.refresh();
        } catch (e) {
          TokenManager.clearTokens();
          accessToken = null;
        }
      }

      // Proactive refresh if token is expiring soon
      if (this._mode === 'real' && accessToken && TokenManager.isLoggedIn() && TokenManager.isTokenExpiringSoon()) {
        try {
          accessToken = await TokenManager.refresh();
        } catch (e) {
          // Proactive refresh failed, continue with current token.
          // If it's truly expired, the 401 handler will deal with it.
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

        if (response.status === 401) {
          // Only attempt token refresh if we have a refresh token to use.
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
          let errorMsg = result.error?.message || result.detail;
          if (Array.isArray(errorMsg)) {
            errorMsg = errorMsg.map(e => e.msg || JSON.stringify(e)).join(', ');
          } else if (typeof errorMsg === 'object') {
            errorMsg = JSON.stringify(errorMsg);
          }
          throw new Error(errorMsg || `Request failed: ${response.status}`);
        }

        return result;
      } catch (error) {
        console.error(`[AdminApiService] ${method} ${endpoint} failed:`, error);
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

    _handleAuthFailure() {
      TokenManager.clearTokens();
      this._currentUser = null;
      window.dispatchEvent(new CustomEvent('auth:expired'));
    },

    // ========================================
    // 认证服务
    // ========================================

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

    async logout() {
      TokenManager.clearTokens();
      this._currentUser = null;

      if (this._mode === 'mock') {
        return { success: true };
      }

      try {
        return await this._post('/auth/logout', {});
      } catch (e) {
        return { success: true };
      }
    },

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
    // 用户服务
    // ========================================

    async getUsers() {
      if (this._mode === 'mock') {
        return { success: true, data: this._getMockUsers() };
      }
      return await this._get('/users');
    },

    async createUser(userData) {
      if (this._mode === 'mock') {
        const users = this._getMockUsers();
        const newUser = {
          id: this._generateId(),
          ...userData,
          status: 'active',
          created_at: new Date().toISOString(),
        };
        users.push(newUser);
        this._saveMockUsers(users);
        return { success: true, data: newUser };
      }
      return await this._post('/users', userData);
    },

    async updateUser(userId, userData) {
      if (this._mode === 'mock') {
        const users = this._getMockUsers();
        const index = users.findIndex(u => u.id === userId);
        if (index >= 0) {
          users[index] = { ...users[index], ...userData };
          this._saveMockUsers(users);
          return { success: true, data: users[index] };
        }
        throw new Error('User not found');
      }
      return await this._put(`/users/${userId}`, userData);
    },

    async deleteUser(userId) {
      if (this._mode === 'mock') {
        let users = this._getMockUsers();
        users = users.filter(u => u.id !== userId);
        this._saveMockUsers(users);
        return { success: true };
      }
      return await this._delete(`/users/${userId}`);
    },

    // ========================================
    // 角色服务
    // ========================================

    async getRoles() {
      if (this._mode === 'mock') {
        return { success: true, data: this._getMockRoles() };
      }
      return await this._get('/roles');
    },

    async createRole(roleData) {
      if (this._mode === 'mock') {
        const roles = this._getMockRoles();
        const newRole = {
          id: this._generateId(),
          ...roleData,
          created_at: new Date().toISOString(),
        };
        roles.push(newRole);
        this._saveMockRoles(roles);
        return { success: true, data: newRole };
      }
      return await this._post('/roles', roleData);
    },

    async updateRole(roleId, roleData) {
      if (this._mode === 'mock') {
        const roles = this._getMockRoles();
        const index = roles.findIndex(r => r.id === roleId);
        if (index >= 0) {
          roles[index] = { ...roles[index], ...roleData };
          this._saveMockRoles(roles);
          return { success: true, data: roles[index] };
        }
        throw new Error('Role not found');
      }
      return await this._put(`/roles/${roleId}`, roleData);
    },

    async deleteRole(roleId) {
      if (this._mode === 'mock') {
        let roles = this._getMockRoles();
        roles = roles.filter(r => r.id !== roleId);
        this._saveMockRoles(roles);
        return { success: true };
      }
      return await this._delete(`/roles/${roleId}`);
    },

    // ========================================
    // Bot服务
    // ========================================

    async getBots() {
      if (this._mode === 'mock') {
        return { success: true, data: this._getMockBots() };
      }
      return await this._get('/bots');
    },

    async createBot(botData) {
      if (this._mode === 'mock') {
        const bots = this._getMockBots();
        const newBot = {
          id: this._generateId(),
          ...botData,
          status: 'draft',
          created_at: new Date().toISOString(),
        };
        bots.push(newBot);
        this._saveMockBots(bots);
        return { success: true, data: newBot };
      }
      return await this._post('/bots', botData);
    },

    async updateBot(botId, botData) {
      if (this._mode === 'mock') {
        const bots = this._getMockBots();
        const index = bots.findIndex(b => b.id === botId);
        if (index >= 0) {
          bots[index] = { ...bots[index], ...botData };
          this._saveMockBots(bots);
          return { success: true, data: bots[index] };
        }
        throw new Error('Bot not found');
      }
      return await this._put(`/bots/${botId}`, botData);
    },

    async configureDify(botId, difyApiKey) {
      if (this._mode === 'mock') {
        const bots = this._getMockBots();
        const index = bots.findIndex(b => b.id === botId);
        if (index >= 0) {
          bots[index].dify_api_key = difyApiKey;
          bots[index].status = 'active';
          this._saveMockBots(bots);
          return { success: true, data: bots[index] };
        }
        throw new Error('Bot not found');
      }
      return await this._put(`/bots/${botId}/dify`, { dify_api_key: difyApiKey });
    },

    async testDifyConnection(botId) {
      if (this._mode === 'mock') {
        return { success: true, data: { success: true, message: 'Mock: Connection successful' } };
      }
      return await this._post(`/bots/${botId}/test`);
    },

    async toggleBotStatus(botId) {
      if (this._mode === 'mock') {
        const bots = this._getMockBots();
        const index = bots.findIndex(b => b.id === botId);
        if (index >= 0) {
          bots[index].status = bots[index].status === 'active' ? 'disabled' : 'active';
          this._saveMockBots(bots);
          return { success: true, data: bots[index] };
        }
        throw new Error('Bot not found');
      }
      return await this._patch(`/bots/${botId}/status`);
    },

    async deleteBot(botId) {
      if (this._mode === 'mock') {
        let bots = this._getMockBots();
        const index = bots.findIndex(b => b.id === botId);
        if (index >= 0) {
          bots.splice(index, 1);
          this._saveMockBots(bots);
          return { success: true, data: { id: botId, deleted: true } };
        }
        throw new Error('Bot not found');
      }
      return await this._delete(`/bots/${botId}`);
    },

    // ========================================
    // 反馈服务
    // ========================================

    async getFeedbacks(filters = {}) {
      if (this._mode === 'mock') {
        let feedbacks = this._getMockFeedbacks();
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
        const feedbacks = this._getMockFeedbacks();
        const index = feedbacks.findIndex(f => f.id === feedbackId);
        if (index >= 0) {
          feedbacks[index] = {
            ...feedbacks[index],
            status: 'reviewed',
            review_result: result,
            review_comment: comment,
            reviewed_at: new Date().toISOString(),
          };
          this._saveMockFeedbacks(feedbacks);
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
        return { success: true, data: this._getMockFeedbacks() };
      }
      return await this._post('/feedbacks/export', filters);
    },

    // ========================================
    // 个人中心服务
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
    // 公告服务
    // ========================================

    async getAnnouncements(page = 1, pageSize = 20) {
      return await this._get('/announcements', { page, page_size: pageSize });
    },

    async createAnnouncement(data) {
      return await this._post('/announcements', data);
    },

    async updateAnnouncement(id, data) {
      return await this._put(`/announcements/${id}`, data);
    },

    async toggleAnnouncementStatus(id, status) {
      return await this._patch(`/announcements/${id}/status`, { status });
    },

    async getActiveAnnouncement() {
      return await this._get('/announcements/active');
    },

    // ========================================
    // Mock数据
    // ========================================

    _getMockUsers() {
      const stored = localStorage.getItem('admin_mock_users');
      if (stored) return JSON.parse(stored);
      return [
        { id: 'u001', username: 'hq-admin', display_name: 'HQ Admin User', roles: ['HQ IT Admin'], status: 'active', created_at: '2026-01-15T00:00:00Z' },
        { id: 'u002', username: 'store-manager', display_name: 'Store Manager', roles: ['Store Manager'], status: 'active', created_at: '2026-02-01T00:00:00Z' },
        { id: 'u003', username: 'helpdesk', display_name: 'Helpdesk Agent', roles: ['Helpdesk'], status: 'active', created_at: '2026-02-10T00:00:00Z' },
      ];
    },

    _saveMockUsers(users) {
      localStorage.setItem('admin_mock_users', JSON.stringify(users));
    },

    _getMockRoles() {
      const stored = localStorage.getItem('admin_mock_roles');
      if (stored) return JSON.parse(stored);
      return [
        { id: 'r001', name: 'System Admin', permissions: ['user.manage', 'role.manage', 'feedback.view', 'feedback.review', 'knowledge.*', 'bot.*'], userCount: 1 },
        { id: 'r002', name: 'HQ IT Admin', permissions: ['feedback.view', 'feedback.review', 'bot.*'], userCount: 1 },
        { id: 'r003', name: 'Store Manager', permissions: ['feedback.view', 'bot.B'], userCount: 1 },
        { id: 'r004', name: 'Helpdesk', permissions: ['feedback.view', 'feedback.review', 'bot.A', 'bot.B'], userCount: 1 },
      ];
    },

    _saveMockRoles(roles) {
      localStorage.setItem('admin_mock_roles', JSON.stringify(roles));
    },

    _getMockBots() {
      const stored = localStorage.getItem('admin_mock_bots');
      if (stored) return JSON.parse(stored);
      return [
        { id: 'bot-a', name: 'Bot A - 故障处理', key: 'A', description: '基于历史工单和PRD文档，快速查找问题解决方案', icon: 'wrench', status: 'draft', has_dify_key: false, created_at: '2026-04-23T00:00:00Z' },
        { id: 'bot-b', name: 'Bot B - 操作指南', key: 'B', description: '系统蓝图和用户手册查询，引导正确使用系统功能', icon: 'book', status: 'draft', has_dify_key: false, created_at: '2026-04-23T00:00:00Z' },
        { id: 'bot-c', name: 'Bot C - 版本指南', key: 'C', description: '查询版本发布记录和终端版本信息', icon: 'tag', status: 'draft', has_dify_key: false, created_at: '2026-04-23T00:00:00Z' },
      ];
    },

    _saveMockBots(bots) {
      localStorage.setItem('admin_mock_bots', JSON.stringify(bots));
    },

    _getMockFeedbacks() {
      const stored = localStorage.getItem('admin_mock_feedbacks');
      if (stored) return JSON.parse(stored);
      return [
        { id: 'f001', bot_id: 'bot-a', query: 'SAP upload failed', answer: 'Check network connection', rating: 'useful', status: 'pending', created_at: '2026-04-15T00:00:00Z' },
        { id: 'f002', bot_id: 'bot-b', query: 'How to process refund?', answer: 'Go to POS > Refund', rating: 'useful', status: 'reviewed', review_result: 'valid', reviewed_at: '2026-04-16T00:00:00Z' },
        { id: 'f003', bot_id: 'bot-a', query: 'POS online failed', answer: 'Restart POS', rating: 'not_useful', status: 'pending', created_at: '2026-04-18T00:00:00Z' },
      ];
    },

    _saveMockFeedbacks(feedbacks) {
      localStorage.setItem('admin_mock_feedbacks', JSON.stringify(feedbacks));
    },

    _generateId() {
      return `id_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    },

    _mockLogin(username, password) {
      if (username === 'admin' && password === 'admin123') {
        const user = {
          id: 'admin',
          username: 'admin',
          display_name: 'System Admin',
          role: 'System Admin',
          roleName: 'System Admin',
        };

        const tokens = {
          access_token: `mock_admin_token_${Date.now()}`,
          refresh_token: `mock_admin_refresh_${Date.now()}`,
          expires_in: 86400,
        };

        // Save tokens to localStorage (required for session persistence)
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
  // 导出
  // ============================================

  if (typeof window !== 'undefined') {
    global.AdminApiService = AdminApiService;
    global.TokenManager = TokenManager;
    global.ADMIN_CONFIG = CONFIG;
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { AdminApiService, TokenManager, CONFIG };
  }

})(typeof window !== 'undefined' ? window : this);
