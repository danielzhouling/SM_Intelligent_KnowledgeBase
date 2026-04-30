# 研发规范与技术决策

## 一、代码规范

### 1.1 前端代码

- HTML：语义化HTML5标签（`<nav>`、`<main>`、`<section>`、`<aside>`），ARIA无障碍属性
- CSS：统一CSS变量系统，三断点响应式（mobile<768 / tablet 768-1024 / desktop>1024），移动端抽屉侧边栏
- JavaScript：原生 JS，不依赖框架，预留 API 接口注释
- 无障碍：`aria-label`、`role`、`aria-live`、键盘Tab导航、焦点管理

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
端口: 8000
技术栈: Python 3.11 + FastAPI + SQLAlchemy + asyncpg
数据库: PostgreSQL（独立实例，与Dify隔离）
```

### 7.2 项目结构

```
server/
├── main.py                  # FastAPI入口
├── config.py                # 配置管理
├── database.py              # 数据库连接
├── models/                  # SQLAlchemy模型
│   ├── user.py
│   ├── role.py
│   ├── bot.py
│   ├── feedback.py
│   └── conversation.py
├── routers/                 # API路由
│   ├── auth.py
│   ├── chat.py
│   ├── users.py
│   ├── roles.py
│   ├── bots.py
│   └── feedbacks.py
├── services/                # 业务逻辑
│   ├── dify_service.py      # Dify API对接
│   ├── feishu_sync.py       # 飞书同步
│   └── embedding_service.py # Embedding调用
├── schemas/                 # Pydantic请求/响应模型
│   └── ...
├── requirements.txt
└── Dockerfile
```

### 7.3 路由结构

```
/api
├── /auth
│   ├── POST /login          # 用户登录 → 返回JWT Token
│   ├── POST /logout         # 用户登出
│   └── GET  /me             # 获取当前用户信息
├── /chat
│   ├── POST /message         # 发送消息（调用Dify，支持blocking模式）
│   ├── POST /message/stream  # 流式发送消息（SSE）
│   ├── GET  /conversations   # 获取当前用户的会话列表
│   └── GET  /conversations/{id}/messages  # 获取会话历史消息
├── /users                   # 用户管理CRUD（管理后台）
├── /roles                   # 角色管理CRUD（管理后台）
├── /bots                    # Bot管理CRUD（管理后台）
│   ├── POST /               # 创建Bot（基本信息，无需API Key）
│   ├── GET  /               # Bot列表（管理后台可见所有状态）
│   ├── GET  /available      # 可用Bot列表（用户端，仅status=active）
│   ├── PUT  /{id}           # 更新Bot信息
│   ├── PUT  /{id}/dify      # 配置Dify API Key（第二步）
│   ├── POST /{id}/test      # 测试Dify连接（验证API Key有效性）
│   └── PATCH /{id}/status   # 切换Bot状态（active↔disabled）
├── /feedbacks               # 反馈管理CRUD
│   ├── POST /               # 用户提交反馈
│   ├── GET  /               # 反馈列表（管理后台，支持筛选）
│   ├── POST /{id}/review    # 审核反馈（管理后台）
│   └── POST /export         # 导出微调数据集
└── /feishu
    ├── POST /sync            # 手动触发飞书同步
    └── GET  /sync/status     # 同步状态查询
```

### 7.4 认证方案

**JWT Token认证**:
- 登录成功后签发JWT access_token + refresh_token
- access_token有效期: 24小时
- refresh_token有效期: 7天
- 前端每次请求携带 `Authorization: Bearer {access_token}`
- 后端中间件校验Token + 提取user_id

### 7.5 API响应格式

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

**分页响应**:
```json
{
  "success": true,
  "data": {
    "items": [...],
    "total": 100,
    "page": 1,
    "page_size": 20
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

```python
# server/services/dify_service.py
import httpx
from typing import AsyncGenerator

async def forward_to_dify(bot_id: str, params: dict) -> dict:
    api_key = get_dify_api_key(bot_id)
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{DIFY_BASE_URL}/chat-messages",
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {api_key}"
            },
            json={
                "inputs": {},
                "query": params["query"],
                "response_mode": "blocking",
                "conversation_id": params.get("conversation_id", ""),
                "user": params["user_id"]
            }
        )
        return response.json()

async def forward_to_dify_stream(bot_id: str, params: dict) -> AsyncGenerator:
    api_key = get_dify_api_key(bot_id)
    async with httpx.AsyncClient() as client:
        async with client.stream("POST", f"{DIFY_BASE_URL}/chat-messages",
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {api_key}"
            },
            json={
                "inputs": {},
                "query": params["query"],
                "response_mode": "streaming",
                "conversation_id": params.get("conversation_id", ""),
                "user": params["user_id"]
            }
        ) as response:
            async for line in response.aiter_lines():
                if line.startswith("data: "):
                    yield line[6:]
```

### 9.2 响应处理

**阻塞模式**:
```json
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

### 9.3 会话管理

```python
# server/models/conversation.py
# 后端仅存储映射关系，聊天内容由Dify持久化
class Conversation(Base):
    __tablename__ = "conversations"

    id: Mapped[str]          # 主键（UUID）
    user_id: Mapped[str]     # 关联用户
    bot_id: Mapped[str]      # 关联Bot
    dify_conversation_id: Mapped[str]  # Dify的conversation_id
    title: Mapped[str]       # 会话标题（取首条消息前20字）
    created_at: Mapped[datetime]
    updated_at: Mapped[datetime]
```

**多会话管理流程**:

同一用户可对同一Bot创建多个独立会话，侧边栏切换：

```
用户选择Bot A
├── 侧边栏显示历史会话列表
│   ├── 会话1: "SAP上传失败怎么办" (3轮)
│   ├── 会话2: "退款流程怎么操作" (2轮)
│   └── [新建会话]
│
├── 点击已有会话 → GET /conversations/{id}/messages → 加载历史
├── 继续聊天 → POST /message (带conversation_id) → Dify保持上下文
└── 点击"新建会话" → 清空聊天区，首条消息后创建新conversation记录
```

**会话创建时机**: 首条消息响应后创建（不产生空记录）

```
1. 用户发送首条消息 → 后端转发到Dify（不带conversation_id）
2. Dify返回 answer + conversation_id + message_id
3. 后端创建 conversations 表记录（our_id ↔ dify_conversation_id）
4. 前端收到 our_conversation_id，更新侧边栏（新会话出现）
```

**Bot禁用时的会话处理**:
- Bot禁用后，用户端Bot选择页不显示该Bot
- 已打开的聊天页，发消息时后端校验Bot状态 → 返回错误"该Bot已下线"
- 历史会话列表中该Bot的会话仍可见，可查看历史消息（只读，不可发新消息）

## 十、环境配置清单

### 10.1 后端服务环境变量

```bash
# .env
PORT=8000
PYTHON_ENV=development

# JWT配置
JWT_SECRET=your-secret-key-change-in-production
JWT_ACCESS_TOKEN_EXPIRE_HOURS=24
JWT_REFRESH_TOKEN_EXPIRE_DAYS=7

# Dify API配置
DIFY_API_KEY_APP_A=app-xxx
DIFY_API_KEY_APP_B=app-xxx
DIFY_API_KEY_APP_C=app-xxx
DIFY_API_BASE_URL=https://api.dify.ai/v1

# PostgreSQL配置（独立实例）
POSTGRES_HOST=sm-app-postgres
POSTGRES_PORT=5432
POSTGRES_DB=knowledge_base_app
POSTGRES_USER=kb_app
POSTGRES_PASSWORD=kb_password_change_me

# Ollama配置
OLLAMA_HOST=http://host.docker.internal:11434
OLLAMA_EMBED_MODEL=nomic-embed-text

# Qdrant配置
QDRANT_HOST=sm-qdrant
QDRANT_PORT=6333

# 飞书配置
FEISHU_APP_ID=cli_xxx
FEISHU_APP_SECRET=xxx
FEISHU_APP_TOKEN=xxx
FEISHU_TABLE_ID=xxx
SYNC_CRON=0 * * * *
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
ollama pull nomic-embed-text

# 验证
ollama list
```

### 12.2 Embedding服务调用

```python
# server/services/embedding_service.py
import httpx

async def embed_text(text: str) -> list[float]:
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{OLLAMA_HOST}/api/embeddings",
            json={"model": OLLAMA_EMBED_MODEL, "prompt": text}
        )
        return response.json()["embedding"]
```

## 十三、PostgreSQL数据库设计

### 13.1 表结构

```sql
-- 用户表
CREATE TABLE users (
    id VARCHAR(36) PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    status VARCHAR(20) DEFAULT 'active',  -- active / disabled
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 角色表
CREATE TABLE roles (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 用户-角色关联表（多对多）
CREATE TABLE user_roles (
    user_id VARCHAR(36) REFERENCES users(id) ON DELETE CASCADE,
    role_id VARCHAR(36) REFERENCES roles(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, role_id)
);

-- 权限表
CREATE TABLE permissions (
    id VARCHAR(36) PRIMARY KEY,
    key VARCHAR(100) UNIQUE NOT NULL,    -- 例: bot.A, user.manage
    name VARCHAR(100) NOT NULL,
    type VARCHAR(20) NOT NULL,           -- bot / function
    created_at TIMESTAMP DEFAULT NOW()
);

-- 角色-权限关联表（多对多）
CREATE TABLE role_permissions (
    role_id VARCHAR(36) REFERENCES roles(id) ON DELETE CASCADE,
    permission_id VARCHAR(36) REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

-- Bot表（两步走：先创建后配置API Key）
CREATE TABLE bots (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    key VARCHAR(50) UNIQUE NOT NULL,     -- 例: A, B, C
    description TEXT,                     -- Bot描述（展示在用户端卡片上）
    icon VARCHAR(50),                     -- 图标标识
    welcome_message TEXT,                 -- 聊天页欢迎语
    dify_api_key VARCHAR(255),            -- Dify API Key（可为空，为空时Bot不可用）
    status VARCHAR(20) DEFAULT 'draft',   -- draft(未配API)/active(已配可用)/disabled(禁用)
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 会话表（映射关系，聊天内容由Dify存储）
CREATE TABLE conversations (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) REFERENCES users(id) ON DELETE CASCADE,
    bot_id VARCHAR(36) REFERENCES bots(id) ON DELETE CASCADE,
    dify_conversation_id VARCHAR(100) NOT NULL,
    title VARCHAR(200),                  -- 首条消息前20字
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, bot_id, dify_conversation_id)
);

-- 反馈表
CREATE TABLE feedbacks (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) REFERENCES users(id) ON DELETE CASCADE,
    bot_id VARCHAR(36) REFERENCES bots(id) ON DELETE CASCADE,
    conversation_id VARCHAR(36) REFERENCES conversations(id),
    message_id VARCHAR(100) NOT NULL,    -- Dify的message_id
    query TEXT NOT NULL,                  -- 用户原始问题
    answer TEXT NOT NULL,                 -- AI回答
    rating VARCHAR(10) NOT NULL,         -- useful / not_useful
    reason VARCHAR(50),                  -- 不相关/来源错误/答案不完整/其他
    comment TEXT,                         -- 用户补充说明
    status VARCHAR(20) DEFAULT 'pending', -- pending/approved/rejected/source_error/duplicate
    reviewed_by VARCHAR(36) REFERENCES users(id),
    reviewed_at TIMESTAMP,
    review_result VARCHAR(20),
    review_comment TEXT,                 -- 审核员补充的正确答案（用于微调）
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 飞书同步状态表
CREATE TABLE sync_status (
    id VARCHAR(36) PRIMARY KEY,
    collection VARCHAR(50) NOT NULL,
    records_synced INTEGER DEFAULT 0,
    synced_at TIMESTAMP,
    status VARCHAR(20),                  -- success / failed
    error_message TEXT
);
```

### 13.2 初始数据

```sql
-- 初始权限
INSERT INTO permissions (id, key, name, type) VALUES
('p1', 'user.manage', '用户管理', 'function'),
('p2', 'role.manage', '角色管理', 'function'),
('p3', 'feedback.view', '反馈查看', 'function'),
('p4', 'feedback.review', '反馈审核', 'function'),
('p5', 'knowledge.*', '知识库管理', 'function');

-- 初始角色
INSERT INTO roles (id, name, description) VALUES
('r1', 'HQ IT Admin', '总部IT管理员'),
('r2', 'Store Manager', '门店经理'),
('r3', 'Helpdesk', '客服支持'),
('r4', 'System Admin', '系统管理员（后台）');

-- 角色-权限映射
INSERT INTO role_permissions (role_id, permission_id) VALUES
('r1', 'p3'), ('r1', 'p4'),
('r4', 'p1'), ('r4', 'p2'), ('r4', 'p3'), ('r4', 'p4'), ('r4', 'p5');

-- Bot注册后自动生成bot权限（由应用层处理）
```

## 十四、反馈闭环流程规范

### 14.1 反馈状态机

```
pending（用户提交）
    ├── approved（审核有效）→ 可导出微调数据
    ├── rejected（审核无效）→ 结束
    ├── source_error（知识源有误）→ 进知识库维护队列
    └── duplicate（重复反馈）→ 结束
```

### 14.2 审核字段

| 字段 | 说明 | 用途 |
|------|------|------|
| review_result | approved/rejected/source_error/duplicate | 分类 |
| review_comment | 审核员补充的正确答案 | 直接作为微调训练数据 |
| reviewed_by | 审核人 | 追溯 |
| reviewed_at | 审核时间 | 追溯 |

### 14.3 微调数据导出接口

```
POST /api/feedbacks/export
```

请求参数：
```json
{
  "status": "approved",
  "rating": "not_useful",
  "date_from": "2026-04-01",
  "date_to": "2026-04-22"
}
```

响应格式（适配微调训练数据）：
```json
{
  "success": true,
  "data": {
    "export_count": 42,
    "records": [
      {
        "query": "用户原始问题",
        "original_answer": "AI原始回答",
        "feedback_reason": "答案不完整",
        "correct_answer": "审核员补充的正确答案",
        "bot_id": "A",
        "citations": ["引用片段1"]
      }
    ]
  }
}
```

### 14.4 知识库维护队列

`source_error` 类型的反馈不进入微调，而是生成维护任务：

```sql
-- 可在feedbacks表中通过 status='source_error' 查询
-- 管理后台提供"来源错误反馈"筛选视图
-- 运营人员根据反馈修正/补充知识库文档
```

## 十五、Bot C飞书同步机制

### 15.1 同步流程

```
飞书多维表格 → 读取记录 → 生成向量 → 写入Qdrant
```

### 15.2 定时同步配置

```python
# 使用 APScheduler
from apscheduler.schedulers.asyncio import AsyncIOScheduler

# SYNC_CRON 环境变量控制，默认每小时
# SYNC_CRON='0 * * * *'  启用
# SYNC_CRON='disabled'   禁用
```

### 15.3 同步实现代码

```python
# server/services/feishu_sync.py
import httpx
from qdrant_client import QdrantClient
from server.services.embedding_service import embed_text

async def sync_bot_c_versions():
    # 1. 获取飞书Access Token
    token = await get_feishu_access_token()

    # 2. 读取飞书多维表格记录
    records = await fetch_feishu_records(token)

    # 3. 清空旧数据（全量重建）
    client = QdrantClient(host=QDRANT_HOST, port=QDRANT_PORT)
    client.delete_collection("bot_c_versions")
    client.create_collection("bot_c_versions", vectors_config={...})

    # 4. 批量写入新数据
    points = []
    for record in records:
        vector = await embed_text(record["fields"]["更新内容"])
        points.append({
            "id": record["record_id"],
            "vector": vector,
            "payload": {
                "version": record["fields"]["版本号"],
                "date": record["fields"]["发布日期"],
                "type": record["fields"]["更新类型"],
                "content": record["fields"]["更新内容"],
                "doc_link": record["fields"].get("相关文档", [{}])[0].get("link", "")
            }
        })

    client.upsert("bot_c_versions", points)
    return {"count": len(records)}
```

## 十六、Bot注册与Dify关联规范

### 16.1 设计原则

- **两步走**：创建Bot（基本信息）和配置Dify连接（API Key）解耦，不要求同时完成
- **无类型分类**：Dify的Chatbot和Agent共用同一套API（`/v1/chat-messages`），后端无需区分Bot类型
- **差异化靠配置**：Bot的展示差异通过description和welcome_message自然体现，不引入type/tags字段

### 16.2 Bot状态机制

```
创建Bot → draft（草稿：未配置API Key，不可用）
              │
              ├── PUT /bots/{id}/dify（配置API Key）
              │      + POST /bots/{id}/test（测试连接成功）
              │      → 自动变更为 active
              │
              └── active（可用：用户端可见可聊天）
                     │
                     ├── PATCH /bots/{id}/status → disabled（禁用）
                     └── disabled → PATCH /bots/{id}/status → active
```

### 16.3 第一步：创建Bot（基本信息）

```
POST /api/bots
```

请求体：
```json
{
  "name": "Bot A - 故障处理",
  "key": "A",
  "description": "基于历史工单和PRD文档，快速查找问题解决方案",
  "icon": "wrench",
  "welcome_message": "你好！我是故障处理助手，基于历史工单和文档为您查找解答。请描述你遇到的问题。"
}
```

响应：
```json
{
  "success": true,
  "data": {
    "id": "uuid-xxx",
    "name": "Bot A - 故障处理",
    "key": "A",
    "status": "draft",
    "dify_api_key": null
  }
}
```

### 16.4 第二步：配置Dify连接

```
PUT /api/bots/{id}/dify
```

请求体：
```json
{
  "dify_api_key": "app-xxxxxxxx"
}
```

配置流程：
1. 管理员在Dify Studio创建App → 获取API Key
2. 管理员在系统管理后台 → Bot详情页 → 粘贴API Key
3. 点击"测试连接" → `POST /api/bots/{id}/test`
4. 后端调用Dify API发送测试消息验证Key有效性
5. 测试通过 → 保存API Key → Bot状态自动变更为 `active`

### 16.5 测试连接接口

```
POST /api/bots/{id}/test
```

后端逻辑：
```python
async def test_dify_connection(bot_id: str, api_key: str):
    """发送测试消息验证Dify API Key有效性"""
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{DIFY_BASE_URL}/chat-messages",
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {api_key}"
            },
            json={
                "inputs": {},
                "query": "hello",
                "response_mode": "blocking",
                "user": "system-test"
            },
            timeout=30.0
        )
        if response.status_code == 200:
            return {"success": True, "message": "连接成功"}
        else:
            return {"success": False, "message": f"连接失败: {response.text}"}
```

### 16.6 用户端Bot列表接口

```
GET /api/bots/available
```

- 仅返回 `status=active` 的Bot
- 根据当前用户角色过滤Bot权限
- 响应包含 name, description, icon, welcome_message

### 16.7 管理后台Bot列表

- 展示所有Bot（包含draft/active/disabled）
- draft状态标注"未配置API Key，暂不可用"
- disabled状态标注"已禁用"
- 支持按状态筛选

## 十七、流式响应与反馈交互规范

### 17.1 流式响应事件处理

前端SSE流式处理需处理以下事件：

| 事件 | 处理 |
|------|------|
| `message` | 追加AI回答文本到聊天区 |
| `message_end` | 流结束，获取message_id和conversation_id，启用反馈按钮 |
| `error` | 显示错误提示，停止流式 |
| 网络断连 | 显示"网络中断，请重试"，停止流式 |

### 17.2 反馈按钮状态机

```
AI回复中（流式输出）
  → 反馈按钮灰色禁用
  → "AI正在回答..."提示

流式完成（收到message_end事件）
  → 启用"有用/没用"反馈按钮
  → 前端此时持有: message_id, conversation_id, 完整answer文本

用户点击反馈提交
  → POST /api/feedbacks
  → body: { message_id, bot_id, conversation_id, query, answer, rating, reason, comment }
```

### 17.3 SSE错误处理

前端 `sendMessageStream` 必须处理：

```javascript
// 流式请求错误处理规范
async sendMessageStream(botId, query, conversationId, callbacks) {
  try {
    const response = await fetch('/api/chat/message/stream', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getToken()}`
      },
      body: JSON.stringify({ botId, query, conversationId })
    });

    if (!response.ok) {
      // HTTP错误（401/403/500等）
      callbacks.onError?.(`请求失败: ${response.status}`);
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = JSON.parse(line.slice(6));
          switch (data.event) {
            case 'message':
              callbacks.onChunk?.(data.content);
              break;
            case 'message_end':
              callbacks.onComplete?.(data);
              break;
            case 'error':
              callbacks.onError?.(data.message);
              return;
          }
        }
      }
    }
  } catch (error) {
    // 网络异常（断连、超时）
    callbacks.onError?.('网络连接中断，请重试');
  }
}
```

## 十八、JWT认证与Token刷新规范

### 18.1 Token生命周期

| Token | 有效期 | 用途 |
|-------|--------|------|
| access_token | 24小时 | API请求认证 |
| refresh_token | 7天 | 刷新access_token |

### 18.2 前端自动刷新流程

```
前端发起API请求
  → 后端返回401（access_token过期）
  → 前端拦截器自动调用 POST /api/auth/refresh（带refresh_token）
  → 成功：获取新access_token，重放原请求
  → 失败（refresh_token也过期）：跳转登录页
```

### 18.3 前端请求拦截器

```javascript
// api-service.js 统一请求封装
async _request(url, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };

  let response = await fetch(url, { ...options, headers });

  // 自动刷新逻辑
  if (response.status === 401) {
    const refreshed = await this._refreshToken();
    if (refreshed) {
      headers['Authorization'] = `Bearer ${getToken()}`;
      response = await fetch(url, { ...options, headers });
    } else {
      // refresh也失败，跳转登录
      window.location.href = '/login.html';
      return;
    }
  }

  return response.json();
}
```

## 十九、错误处理与降级规范

### 19.1 后端错误处理

| 场景 | 后端行为 | 前端展示 |
|------|---------|---------|
| Dify超时（>30s） | 返回504 + "AI服务响应超时" | 提示用户稍后重试 |
| Dify返回错误 | 转发错误信息 | 显示错误原因 |
| Bot已禁用 | 返回403 + "该Bot已下线" | 提示Bot不可用 |
| API Key无效 | 返回500 + "Bot配置异常" | 提示联系管理员 |
| 用户无权限 | 返回403 + "无权访问该Bot" | 提示权限不足 |

### 19.2 Nginx统一入口

```nginx
# nginx.conf.template 增加API代理
location /api/ {
    proxy_pass http://sm-app-backend:8000/api/;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;

    # SSE流式响应专用配置
    proxy_buffering off;
    proxy_cache off;
    proxy_read_timeout 300s;
    proxy_http_version 1.1;
    proxy_set_header Connection '';
}

location / {
    # 前端静态文件
    root /usr/share/nginx/html;
    try_files $uri $uri/ /index.html;
}
```

### 19.3 CORS配置（开发环境）

```python
# server/main.py
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # 开发环境
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

## 二十、初始数据种子规范

### 20.1 启动时自动Seed

后端服务启动时检查数据库是否为空，空则自动执行种子数据：

```python
# server/seed.py
async def seed_initial_data():
    """仅在数据库为空时执行"""
    if await db.is_empty():
        await seed_permissions()
        await seed_roles()
        await seed_admin_user()
        await seed_demo_users()
```

### 20.2 种子数据内容

| 类别 | 数据 |
|------|------|
| 权限 | user.manage, role.manage, feedback.view, feedback.review, knowledge.* |
| 角色 | HQ IT Admin, Store Manager, Helpdesk, System Admin |
| 管理员 | admin / admin123 (bcrypt哈希) |
| Demo用户 | hq-admin, store-manager, helpdesk (password123, bcrypt哈希) |
| 角色-权限 | System Admin拥有全部权限，HQ IT Admin拥有feedback.view+review |
| Bot记录 | Bot A/B/C（status=draft，API Key待后续配置） |

## 二十一、UI设计规范（M6改造后）

### 21.1 设计系统

基于 style-a-tech 设计风格，统一管理所有页面视觉：

**CSS 变量体系**:
```css
:root {
  /* 主色 - Slate/Blue 专业色系 */
  --primary: #1E40AF;
  --primary-light: #3B82F6;
  --primary-dark: #1E3A8A;

  /* 背景 */
  --bg-page: #F8FAFC;
  --bg-card: #FFFFFF;
  --bg-dark: #1E293B;
  --bg-sidebar-hover: rgba(255, 255, 255, 0.08);

  /* 文字 */
  --text-primary: #0F172A;
  --text-secondary: #475569;
  --text-muted: #94A3B8;
  --text-inverse: #F8FAFC;

  /* 边框 */
  --border: #E2E8F0;
  --border-dark: #334155;

  /* 状态色 */
  --success: #10B981;
  --warning: #F59E0B;
  --error: #EF4444;

  /* Bot渐变色 */
  --bot-a-gradient: linear-gradient(135deg, #1E40AF, #3B82F6);
  --bot-b-gradient: linear-gradient(135deg, #059669, #10B981);
  --bot-c-gradient: linear-gradient(135deg, #7C3AED, #A855F7);

  /* 圆角 */
  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 16px;
  --radius-xl: 24px;
  --radius-full: 9999px;

  /* 字体 */
  --font-sans: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
}
```

### 21.2 响应式断点

| 断点 | 范围 | 布局策略 |
|------|------|---------|
| Desktop | >1024px | 完整布局：固定侧边栏 + 主内容 |
| Tablet | 768-1024px | 窄侧边栏(200-240px) + 主内容 |
| Mobile | <768px | 全宽内容 + 汉堡菜单触发抽屉侧边栏 |

### 21.3 移动端交互规范

- **抽屉侧边栏**: 汉堡按钮触发，overlay 半透明黑色遮罩，侧边栏从左滑入(280px)
- **关闭方式**: 点击 overlay 或返回箭头
- **表格**: 移动端 `overflow-x: auto` 水平滚动
- **卡片网格**: 移动端单列 `grid-template-columns: 1fr`
- **登录页**: 移动端隐藏品牌面板，仅显示表单

### 21.4 组件规范

**Bot 徽章（统一使用渐变字母徽章）**:
```html
<!-- 不再用 CSS 机器人脸，改为简洁渐变徽章 -->
<div class="bot-badge bot-badge-a">A</div>
<div class="bot-badge bot-badge-b">B</div>
<div class="bot-badge bot-badge-c">C</div>
```

**卡片统一结构**:
```html
<div class="card">
  <div class="card-header">标题 + 状态</div>
  <div class="card-body">内容</div>
  <div class="card-footer">操作按钮</div>
</div>
```

### 21.5 无障碍规范

- 所有交互元素必须有 `aria-label`
- Modal 使用 `role="dialog"` + `aria-modal="true"`
- 流式消息区域使用 `aria-live="polite"`
- 表单输入有 `<label>` 关联
- 键盘可 Tab 到所有可交互元素
- 焦点管理：Modal 打开时焦点陷阱，关闭后恢复触发元素

## 二十二、个人中心规范（M7）

### 22.1 后端API

```
GET  /api/auth/profile          # 获取当前用户个人信息
PUT  /api/auth/profile          # 修改个人信息
PUT  /api/auth/password         # 修改密码
```

**GET /api/auth/profile 响应**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "username": "hq-admin",
    "display_name": "HQ Admin",
    "email": "",
    "phone": "",
    "roles": [{"id": "r1", "name": "HQ IT Admin"}],
    "password_age_days": 45
  }
}
```

**PUT /api/auth/profile 请求**:
```json
{
  "display_name": "新名称",
  "email": "admin@example.com",
  "phone": ""
}
```

**PUT /api/auth/password 请求**:
```json
{
  "current_password": "old_password",
  "new_password": "NewP@ss123"
}
```

**PUT /api/auth/password 响应**（成功时签发新Token）:
```json
{
  "success": true,
  "data": {
    "access_token": "new-jwt-token",
    "refresh_token": "new-refresh-token",
    "message": "密码修改成功"
  }
}
```

**密码修改后端校验顺序**:
1. 验证当前密码（bcrypt.verify）
2. 校验新密码复杂度（8位+大小写+数字+特殊字符）
3. 新密码与当前密码不能相同
4. 新密码与最近5次历史密码比对（bcrypt.verify逐条）
5. 更新密码 + 写入password_history + 更新password_changed_at
6. 签发新JWT Token返回

### 22.2 数据模型变更

```sql
-- users表新增字段
ALTER TABLE users ADD COLUMN email VARCHAR(100) DEFAULT '';
ALTER TABLE users ADD COLUMN phone VARCHAR(20) DEFAULT '';
ALTER TABLE users ADD COLUMN password_changed_at TIMESTAMP DEFAULT NOW();
ALTER TABLE users ADD COLUMN must_change_password BOOLEAN DEFAULT FALSE;

-- 密码历史表
CREATE TABLE password_history (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) REFERENCES users(id) ON DELETE CASCADE,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);
```

### 22.3 前端交互规范

**Modal弹窗结构**:
```html
<!-- 个人设置Modal -->
<div class="modal" role="dialog" aria-modal="true" aria-label="个人设置">
  <div class="modal-tabs">
    <button class="tab active" data-tab="info">个人信息</button>
    <button class="tab" data-tab="password">修改密码</button>
  </div>

  <!-- Tab 1: 个人信息 -->
  <div class="tab-content" id="tab-info">
    <label for="profile-name">显示名称</label>
    <input id="profile-name" type="text" />
    <label for="profile-email">邮箱</label>
    <input id="profile-email" type="email" />
    <label for="profile-phone">手机号</label>
    <input id="profile-phone" type="tel" />
  </div>

  <!-- Tab 2: 修改密码 -->
  <div class="tab-content" id="tab-password" hidden>
    <label for="current-pwd">当前密码</label>
    <input id="current-pwd" type="password" />
    <label for="new-pwd">新密码</label>
    <input id="new-pwd" type="password" />
    <div class="password-strength">弱/中/强</div>
    <label for="confirm-pwd">确认密码</label>
    <input id="confirm-pwd" type="password" />
  </div>
</div>
```

**密码强度算法**:
```javascript
function getPasswordStrength(password) {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[@$!%*?&]/.test(password)) score++;
  if (score <= 2) return '弱';
  if (score <= 4) return '中';
  return '强';
}
```

## 二十三、系统公告规范（M7）

### 23.1 后端API

```
POST   /api/announcements              # 发布公告
GET    /api/announcements              # 公告列表（管理后台，分页）
PUT    /api/announcements/{id}         # 编辑公告
PATCH  /api/announcements/{id}/status  # 上线/下线
GET    /api/announcements/active       # 用户端获取最新1条生效公告
```

**POST /api/announcements 请求**:
```json
{
  "title": "系统维护通知",
  "content": "系统将于本周六凌晨进行维护...",
  "type": "warning"
}
```

**POST /api/announcements 响应**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "title": "系统维护通知",
    "type": "warning",
    "status": "published",
    "published_at": "2026-04-30T10:00:00Z"
  }
}
```

**PATCH /api/announcements/{id}/status 请求**:
```json
{
  "status": "offline"
}
```

**GET /api/announcements/active 响应**（用户端调用，只返回1条）:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "title": "系统维护通知",
    "content": "系统将于本周六凌晨进行维护...",
    "type": "warning"
  }
}
```

无生效公告时返回:
```json
{
  "success": true,
  "data": null
}
```

### 23.2 数据模型

```sql
CREATE TABLE announcements (
    id VARCHAR(36) PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    type VARCHAR(20) DEFAULT 'info',        -- info / warning / urgent
    status VARCHAR(20) DEFAULT 'published', -- published / offline
    published_at TIMESTAMP DEFAULT NOW(),
    created_by VARCHAR(36) REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### 23.3 前端交互规范

**管理后台 — 公告管理页面**:
- 侧边栏新增"公告管理"导航项
- 公告列表：标题 + 类型标签 + 状态 + 发布时间 + 操作(编辑/上线/下线)
- 发布表单：标题 + 类型选择(info/warning/urgent) + 内容textarea
- 不做草稿，点击发布直接上线

**用户端 — 顶部Banner组件**:
```html
<!-- 公告Banner（动态插入到页面顶部） -->
<div class="announcement-banner" data-type="warning" role="alert">
  <span class="announcement-icon">🔔</span>
  <span class="announcement-text">系统将于本周六进行维护...</span>
  <button class="announcement-close" aria-label="关闭通知">&times;</button>
</div>
```

**Banner样式规范**:
```css
.announcement-banner { padding: 10px 16px; display: flex; align-items: center; gap: 8px; }
.announcement-banner[data-type="info"]    { background: var(--primary-light); color: white; }
.announcement-banner[data-type="warning"] { background: var(--warning); color: #1a1a1a; }
.announcement-banner[data-type="urgent"]  { background: var(--error); color: white; }
.announcement-banner[data-type="urgent"] .announcement-close { display: none; }
```

**关闭逻辑**:
- info/warning: 点击关闭 → `sessionStorage.setItem('announcement_closed_{id}', 'true')` → 隐藏Banner
- urgent: 不渲染关闭按钮
- 页面加载时：调用 `GET /api/announcements/active` → 检查sessionStorage是否已关闭 → 决定是否显示
