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

# 前端获取历史消息流程：
# 1. GET /api/chat/conversations → 返回当前用户的所有会话列表
# 2. GET /api/chat/conversations/{id}/messages → 后端通过Dify API拉取历史
```

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

-- Bot表
CREATE TABLE bots (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    key VARCHAR(50) UNIQUE NOT NULL,     -- 例: A, B, C
    description TEXT,
    dify_api_key VARCHAR(255) NOT NULL,
    status VARCHAR(20) DEFAULT 'active', -- active / disabled
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
