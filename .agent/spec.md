# 研发规范与技术决策

## 一、代码规范

### 1.1 前端代码

- HTML：语义化标签，结构清晰
- CSS：使用 CSS 变量管理主题色，响应式布局
- JavaScript：原生 JS，不依赖框架，预留 API 接口注释

### 1.2 文件结构

```
demo/
├── index.html          # 登录页
├── bots.html           # Bot选择页
├── chat.html           # 聊天页
├── css/
│   └── styles.css      # 样式文件
├── js/
│   ├── app.js          # 主逻辑
│   └── mock-data.js    # 模拟数据
└── assets/             # 静态资源

admin/
├── login.html          # 管理员登录
├── index.html          # 主框架
├── dashboard.html      # 仪表盘
├── users.html          # 用户管理
├── roles.html          # 角色管理
├── bots.html           # Bot注册
└── feedback.html      # 反馈审核
```

### 1.3 API接口预留

每个CRUD操作标注：
```javascript
// TODO: API call
// POST /api/users
createUser(data).then(...)
```

## 二、数据规范

### 2.1 localStorage Key命名

```
demo_session        # 用户登录session
demo_users          # 用户列表
demo_roles          # 角色列表
demo_permissions    # 权限列表
demo_bots           # Bot列表
demo_feedbacks      # 反馈列表
```

### 2.2 数据ID生成

使用时间戳 + 随机数：
```javascript
const generateId = () => `id_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
```

## 三、测试要求

- 每个页面需手动测试完整流程
- 用户端：登录 → 选Bot → 聊天 → 反馈
- 管理后台：登录 → 各模块CRUD
- 测试后提交git

## 四、Git提交规范

```
feat: 完成用户端登录页
fix: 修复反馈区提交逻辑
docs: 更新需求文档
```

## 五、数据规范详解

### 5.1 localStorage Key定义

| Key | 用途 | 数据结构 |
|-----|------|----------|
| demo_session | 用户登录session | {username, role, roleName} |
| demo_users | 用户列表（管理后台） | Array<{id, username, name, roles, status}> |
| demo_roles | 角色列表 | Array<{id, name, permissions}> |
| demo_permissions | 权限列表 | Array<{id, key, name, type}> |
| demo_bots | Bot列表 | Array<{id, name, description, status, knowledge}> |
| demo_feedbacks | 反馈列表 | Array<{id, botId, question, answer, rating, reason, comment, status, reviewer, reviewedAt}> |
| demo_annotations | 注释列表 | Array<{id, botId, messageIndex, issueType, comment, timestamp}> |
| admin_session | 管理员登录session | {username, role} |

### 5.2 用户角色定义

| 角色Key | 角色名称 | Bot权限 | 功能权限 |
|---------|----------|---------|----------|
| hq-admin | HQ IT Admin | A, B, C | 全部 |
| store-manager | Store Manager | B | 无 |
| helpdesk | Helpdesk | A, B | 无 |

### 5.3 权限类型定义

**功能权限**:
- user.manage - 用户管理
- role.manage - 角色管理
- feedback.view - 反馈查看
- feedback.review - 反馈审核
- knowledge.* - 知识库管理

**Bot权限**:
- bot.* - 所有Bot
- bot.A - 故障处理Bot
- bot.B - 操作指南Bot
- bot.C - 版本指南Bot

### 5.4 数据ID生成规则

```javascript
const generateId = () => `id_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
```

### 5.5 账号配置

**用户端Demo账号** (demo/js/mock-data.js):
```javascript
const DEMO_ACCOUNTS = {
  'hq-admin': { password: 'password123', role: 'hq-admin' },
  'store-manager': { password: 'password123', role: 'store-manager' },
  'helpdesk': { password: 'password123', role: 'helpdesk' }
};
```

**管理后台账号** (demo/js/mock-data.js):
```javascript
const ADMIN_ACCOUNTS = {
  'admin': { password: 'admin123', role: 'admin' }
};
```

## 六、测试规范

### 6.1 页面测试流程

**用户端**:
1. 登录页 → 输入账号密码 → 验证跳转
2. Bot选择页 → 验证权限过滤 → 选择Bot
3. 聊天页 → 发送问题 → 验证回答和来源
4. 反馈区 → 提交反馈 → 验证状态锁定

**管理后台**:
1. 登录页 → admin账号登录
2. 仪表盘 → 验证统计数据
3. 用户管理 → CRUD操作
4. 角色管理 → CRUD + 权限分配
5. Bot注册 → 注册 + 启用/禁用
6. 反馈审核 → 审核 + 记录

## 七、后端代理服务规范

### 7.1 服务架构

```
端口: 3000
技术栈: Node.js + Express
```

### 7.2 路由结构

```
/api
├── /auth
│   ├── POST /login          # 用户登录
│   └── POST /logout         # 用户登出
├── /chat
│   ├── POST /message         # 发送消息（调用Dify）
│   ├── GET /conversations   # 获取会话列表
│   └── GET /messages        # 获取历史消息
├── /users                   # 用户管理CRUD
├── /roles                   # 角色管理CRUD
├── /bots                    # Bot管理CRUD
└── /feedbacks               # 反馈管理CRUD
```

### 7.3 Dify对接配置

**环境变量** (.env):
```bash
DIFY_API_KEY_APP_A=app-xxx-for-bot-a
DIFY_API_KEY_APP_B=app-xxx-for-bot-b
DIFY_API_KEY_APP_C=app-xxx-for-bot-c
DIFY_API_BASE_URL=https://api.dify.ai/v1
```

### 7.4 API响应格式

**成功响应**:
```json
{
  "success": true,
  "data": { ... }
}
```

**错误响应**:
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "错误描述"
  }
}
```

## 八、前端API服务层规范

### 8.1 文件结构

```
demo/js/
├── app.js              # 主逻辑
├── mock-data.js        # 模拟数据
└── api-service.js      # API服务层（新增）
```

### 8.2 api-service.js 接口定义

```javascript
const ApiService = {
  // ===== 认证 =====
  login(username, password) {},
  logout() {},

  // ===== 对话服务 =====
  // 发送消息（阻塞模式）
  sendMessage(botId, query) {},
  // 发送消息（流式模式）
  sendMessageStream(botId, query, onChunk, onComplete) {},
  // 获取会话列表
  getConversations(botId) {},
  // 获取历史消息
  getMessages(conversationId) {},

  // ===== 用户服务 =====
  getCurrentUser() {},
  getUsers() {},
  createUser(data) {},
  updateUser(userId, data) {},
  deleteUser(userId) {},

  // ===== 角色服务 =====
  getRoles() {},
  createRole(data) {},
  updateRole(roleId, data) {},
  deleteRole(roleId) {},

  // ===== Bot服务 =====
  getBots() {},
  createBot(data) {},
  updateBot(botId, data) {},
  toggleBot(botId, enabled) {},

  // ===== 反馈服务 =====
  submitFeedback(messageId, rating, reason, comment) {},
  getFeedbacks(filters) {},
  reviewFeedback(feedbackId, result, comment) {}
};
```

### 8.3 Mock模式切换

```javascript
// api-service.js
const ApiService = {
  // 设置API模式
  setMode(mode) {
    // mode: 'mock' | 'real'
    this._mode = mode;
  },

  // 根据模式调用不同实现
  async sendMessage(botId, query) {
    if (this._mode === 'mock') {
      return MockData.findMatchingQA(botId, query);
    } else {
      return this._callRealApi('/chat/message', { botId, query });
    }
  }
};
```

### 8.4 流式响应处理

```javascript
// 流式发送消息
async sendMessageStream(botId, query, onChunk, onComplete) {
  const response = await fetch('/api/chat/message/stream', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ botId, query }),
  });

  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value);
    // 解析SSE数据
    const lines = chunk.split('\n');
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = JSON.parse(line.slice(6));
        if (data.event === 'message') {
          onChunk(data.content);
        } else if (data.event === 'message_end') {
          onComplete(data);
        }
      }
    }
  }
}
```

## 九、Dify API对接细节

### 9.1 请求格式

```javascript
// 后端代理转发到Dify
async function forwardToDify(botId, params) {
  const apiKey = getDifyApiKey(botId); // 根据Bot获取对应API Key

  const response = await fetch(`${DIFY_BASE_URL}/chat-messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      inputs: {},
      query: params.query,
      response_mode: params.streaming ? 'streaming' : 'blocking',
      conversation_id: params.conversationId || '',
      user: params.userId
    })
  });

  return response;
}
```

### 9.2 响应处理

**阻塞模式**:
```javascript
{
  "event": "message_end",
  "task_id": "xxx",
  "conversation_id": "xxx",
  "message_id": "xxx",
  "answer": "完整回答",
  "metadata": {
    "usage": { "prompt_tokens": 100, "completion_tokens": 50 },
    "citations": [
      { "position": 1, "document_id": "xxx", "content": "引用片段" }
    ]
  }
}
```

**流式模式 (SSE)**:
```
data: {"event": "message", "type": "ai", "content": "部"}
data: {"event": "message", "type": "ai", "content": "分回"}
data: {"event": "message", "type": "ai", "content": "答"}
data: {"event": "message_end", "task_id": "xxx", ...}
```

### 9.3 会话上下文

```javascript
// 每个用户的会话上下文
const userContexts = new Map(); // userId -> { conversationId, messages[] }

// 创建新对话
function createConversation(userId, botId) {
  const conversationId = generateUUID();
  userContexts.set(`${userId}:${botId}`, {
    conversationId,
    messages: []
  });
  return conversationId;
}

// 获取当前会话ID
function getCurrentConversation(userId, botId) {
  return userContexts.get(`${userId}:${botId}`)?.conversationId;
}
```

## 十、环境配置清单

### 10.1 后端代理环境变量

```bash
# .env
PORT=3000
NODE_ENV=development

# Dify API配置
DIFY_API_KEY_APP_A=app-xxx
DIFY_API_KEY_APP_B=app-xxx
DIFY_API_KEY_APP_C=app-xxx
DIFY_API_BASE_URL=https://api.dify.ai/v1

# 数据库配置（可选，如需持久化用户数据）
DB_TYPE=sqlite
DB_PATH=./data/app.db
```

### 10.2 前端环境配置

```javascript
// demo/js/config.js
const CONFIG = {
  API_BASE_URL: '/api',  // 开发环境使用相对路径
  // 生产环境可配置为实际后端地址
  // API_BASE_URL: 'https://your-domain.com/api'
  MODE: 'mock'  // 'mock' | 'real'
};
```

## 十一、Qdrant向量数据库设计

### 11.1 Collection设计

Bot A/B/C 分别使用独立的Collection：

| Collection | 用途 | 数据来源 | 向量维度 |
|-----------|------|---------|---------|
| bot_a_knowledge | Bot A - 故障处理 | 工单、问题记录 | 768 |
| bot_b_knowledge | Bot B - 操作指南 | 用户手册、蓝图 | 768 |
| bot_c_versions | Bot C - 版本指南 | 飞书多维表格同步 | 768 |

### 11.2 Payload数据结构

```javascript
// Bot A/B payload
{
  "doc_id": "wo-2024-0521",
  "title": "SAP上传失败处理",
  "content": "SAP文件上传失败，问题原因：文件编码格式错误...",
  "source": "work_order",
  "created_at": "2024-05-21"
}

// Bot C payload
{
  "version": "v2.1.0",
  "date": "2026-04-15",
  "type": "功能新增",
  "content": "新增库存预警功能，支持多仓库管理...",
  "doc_link": "https://feishu.cn/..."
}
```

### 11.3 向量检索接口

```javascript
// 后端代理向量检索
async function searchKnowledge(botId, query, limit = 5) {
  // 1. 将用户问题转为向量
  const queryVector = await embedText(query);

  // 2. 从对应Collection检索
  const results = await qdrant.search(botId + '_knowledge', {
    vector: queryVector,
    limit: limit,
    score_threshold: 0.7  // 相似度阈值
  });

  return results.map(r => ({
    content: r.payload.content,
    score: r.score,
    metadata: r.payload
  }));
}
```

## 十二、Embedding服务配置

### 12.1 Ollama模型配置

```bash
# 安装模型
ollama pull m2-bert-base-multilingual-sentence-embedding
# 或
ollama pull nomic-embed-text

# 验证
ollama list
```

### 12.2 Embedding服务调用

```javascript
// 后端代理 - 获取文本向量
async function embedText(text) {
  const response = await fetch('http://localhost:11434/api/embeddings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'm2-bert-base-multilingual-sentence-embedding',
      prompt: text
    })
  });

  const data = await response.json();
  return data.embedding;
}
```

### 12.3 环境变量配置

```bash
# .env 补充
OLLAMA_HOST=http://localhost:11434
OLLAMA_MODEL=m2-bert-base-multilingual-sentence-embedding
QDRANT_HOST=localhost
QDRANT_PORT=6333
```

## 十三、Bot C飞书同步机制

### 13.1 同步流程

```
飞书多维表格 → 读取记录 → 生成向量 → 写入Qdrant
```

### 13.2 定时同步配置

```javascript
// 后端代理 - 定时任务配置
const cron = require('node-cron');

// 支持两种配置方式：
// 1. Crontab表达式（默认每小时）
SYNC_CRON='0 * * * *'

// 2. 禁用定时任务
SYNC_CRON='disabled'
```

### 13.3 手动触发接口

```
POST /api/feishu/sync
```

响应：
```json
{
  "success": true,
  "data": {
    "records_synced": 156,
    "synced_at": "2026-04-21T10:00:00Z",
    "collection": "bot_c_versions"
  }
}
```

### 13.4 同步状态查询

```
GET /api/feishu/sync/status
```

响应：
```json
{
  "success": true,
  "data": {
    "last_sync": "2026-04-21T10:00:00Z",
    "records_count": 156,
    "next_sync": "2026-04-21T11:00:00Z",
    "cron_expression": "0 * * * *"
  }
}
```

### 13.5 同步实现代码

```javascript
// src/services/feishuSync.js
async function syncBotCVersions() {
  // 1. 获取飞书Access Token
  const token = await getFeishuAccessToken();

  // 2. 读取飞书多维表格记录
  const records = await fetchFeishuRecords(token);

  // 3. 清空旧数据（全量重建）
  await qdrant.deleteCollection('bot_c_versions');
  await qdrant.createCollection('bot_c_versions', { vectorSize: 768 });

  // 4. 批量写入新数据
  const points = [];
  for (const record of records) {
    const vector = await embedText(record.fields['更新内容']);
    points.push({
      id: record.record_id,
      vector,
      payload: {
        version: record.fields['版本号'],
        date: record.fields['发布日期'],
        type: record.fields['更新类型'],
        content: record.fields['更新内容'],
        doc_link: record.fields['相关文档']?.[0]?.link || ''
      }
    });
  }

  await qdrant.upsert('bot_c_versions', { points });

  return { count: records.length };
}
```

### 13.6 飞书API配置

```bash
# .env 补充
FEISHU_APP_ID=cli_xxx
FEISHU_APP_SECRET=xxx
FEISHU_APP_TOKEN=xxx      # 多维表格app_token
FEISHU_TABLE_ID=xxx       # 多维表格table_id
```
