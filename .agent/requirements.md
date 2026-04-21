# SM-Dmall ERP 智能知识库系统 - 需求文档

## 一、项目概述

基于 RAG 架构构建多 Bot 智能知识库问答系统，为 SM-Dmall ERP 提供智能问答服务。

## 二、Bot 场景设计

| Bot | 定位 | 面向用户 | 知识来源 |
|-----|------|----------|----------|
| Bot A - 故障处理 | 历史工单沉淀，快速查找解决方案 | Dmall Helpdesk + SM IT | 工单、问题记录 |
| Bot B - 操作指南 | 系统蓝图、手册，正确使用指导 | 全体用户 | 用户手册、蓝图 |
| Bot C - 版本指南 | 版本发布信息查询 | 仅 HQ IT + Dmall Helpdesk | MCP 飞书多维表格（实时） |

## 三、用户端功能

### 3.1 页面结构

- 登录页 → Bot选择页 → 聊天页
- 反馈区：每条AI回复后可提交反馈

### 3.2 Demo账号

| 账号 | 密码 | 可用Bot |
|------|------|---------|
| hq-admin | password123 | A + B + C |
| store-manager | password123 | B |
| helpdesk | password123 | A + B |

### 3.3 反馈机制

- 反馈选项：有 用 / 没 用
- 没用时可选择原因：不相关 / 来源错误 / 答案不完整 / 其他
- 可选补充说明
- 提交后状态锁定

## 四、管理后台功能

### 4.1 页面结构

- 登录页 → 仪表盘 / 用户管理 / 角色管理 / Bot注册 / 反馈审核

### 4.2 用户管理

- 用户列表：账号、姓名、角色（多标签）、状态、操作
- 创建/编辑/删除用户
- 一个用户可分配多个角色

### 4.3 角色管理

- 角色列表：角色名、权限数量、用户数
- 创建/编辑/删除角色
- 权限分组分配

### 4.4 权限类型

**功能权限**：
- user.manage - 用户管理
- role.manage - 角色管理
- feedback.view - 反馈查看
- feedback.review - 反馈审核
- knowledge.* - 知识库管理

**Bot权限**（动态生成）：
- bot.* - 所有Bot
- bot.{bot_key} - 特定Bot

### 4.5 Bot注册

- 注册新Bot → 自动生成对应permission记录
- 编辑Bot信息
- 启用/禁用Bot

### 4.6 反馈审核

- 反馈列表：问题、Bot、评分、状态、审核人
- 筛选：按Bot、评分、审核状态
- 审核结果：有效/无效/来源错误/重复
- 审核记录：审核人、时间、结果、备注

## 五、技术架构

### 5.1 部署架构

```
宿主机 (Mac Mini M4)
├── Ollama（直接安装，Metal运行）
└── Docker Desktop
    ├── Dify（官方镜像）
    ├── Qdrant（官方镜像）
    └── 管理后端（自开发）

前端：HTML/CSS/JS，API调用后端代理
```

### 5.2 技术栈

- 前端：HTML + CSS + JavaScript（纯静态）
- 后端代理：Node.js/Express 或 Python/FastAPI
- 部署：Docker Compose

### 5.3 M5阶段系统架构（API对接）

```
┌─────────────────────────────────────────────────────────────────┐
│                         用户端浏览器                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐   │
│  │  login.html │  │  bots.html   │  │     chat.html       │   │
│  └──────┬──────┘  └──────┬──────┘  └──────────┬──────────┘   │
│         │                 │                     │              │
│         └────────────────┬┴─────────────────────┘              │
│                          │                                      │
│                   ┌──────▼──────┐                               │
│                   │ api-service │  (前端API服务层)                │
│                   │   .js      │                               │
│                   └──────┬──────┘                               │
└──────────────────────────┼──────────────────────────────────────┘
                           │ HTTP/HTTPS
                    ┌──────▼──────┐
                    │  后端代理服务 │
                    │  (Node.js)  │
                    └──────┬──────┘
                           │
         ┌──────────────────┼──────────────────┐
         │                  │                  │
    ┌────▼────┐      ┌─────▼─────┐    ┌──────▼──────┐
    │ Dify    │      │  用户管理   │    │  反馈管理    │
    │ API     │      │  API       │    │  API        │
    │ (Bot)   │      │            │    │             │
    └────┬────┘      └─────┬─────┘    └──────┬──────┘
         │                  │                  │
         ▼                  ▼                  ▼
    ┌─────────┐      ┌──────────┐      ┌──────────┐
    │ Ollama   │      │  数据库   │      │  数据库   │
    │ +Qdrant  │      │(用户/角色)│      │ (反馈)   │
    └─────────┘      └──────────┘      └──────────┘
```

### 5.4 后端代理服务职责

| 职责 | 说明 |
|------|------|
| API Key保护 | Dify API Key仅在后端存储，不暴露给前端 |
| 路由转发 | 统一路由管理，前端不直接访问Dify |
| 会话管理 | 维护conversation_id，支持多轮对话 |
| 流式处理 | 支持SSE流式响应，转发给前端 |
| 权限校验 | 验证用户Bot访问权限 |
| 日志记录 | 记录API调用日志，便于排查 |

### 5.5 Dify API对接要点

**认证**:
```http
Authorization: Bearer {API_KEY}
```

**发送消息**:
```http
POST /v1/chat-messages
{
  "inputs": {},
  "query": "用户问题",
  "response_mode": "blocking",  // 或 streaming
  "conversation_id": "",
  "user": "user-123"
}
```

**响应数据结构**:
```json
{
  "event": "message_end",
  "task_id": "xxx",
  "conversation_id": "xxx",
  "message_id": "xxx",
  "answer": "AI回答",
  "metadata": {
    "citations": [
      {"position": 1, "document_id": "xxx", "content": "引用片段"}
    ]
  }
}
```

### 5.6 前端API服务层设计

**api-service.js 核心接口**:

```javascript
// 对话服务
ApiService.sendMessage(botId, query, conversationId)
ApiService.getConversations(botId)
ApiService.getMessages(conversationId)

// 用户服务
ApiService.login(username, password)
ApiService.getUserInfo()

// 反馈服务
ApiService.submitFeedback(messageId, rating, reason, comment)
ApiService.getFeedbackList(filters)

// 管理服务
ApiService.getUsers()
ApiService.createUser(userData)
ApiService.updateUser(userId, userData)
ApiService.deleteUser(userId)

// Bot服务
ApiService.getBots()
ApiService.createBot(botData)
ApiService.toggleBot(botId, enabled)
```

## 六、Demo账号

### 用户端Demo账号

| 账号 | 密码 | 角色 | 可用Bot |
|------|------|------|---------|
| hq-admin | password123 | HQ IT Admin | A + B + C |
| store-manager | password123 | Store Manager | B |
| helpdesk | password123 | Helpdesk | A + B |

### 管理后台Demo账号

| 账号 | 密码 | 权限 |
|------|------|------|
| admin | admin123 | 超级管理员（全权限） |

## 七、交付物

1. 用户端静态页面（完整流程）
2. 管理后台静态页面（完整功能）
3. Docker Compose部署配置

## 八、待后续阶段完成

- [ ] 环境部署（Dify + Qdrant + Ollama）
- [ ] 知识库建设（文档处理 + Embedding）
- [ ] Bot配置（Dify智能体 + MCP）
- [ ] 真实API对接

## 九、技术决策记录

### 9.1 前端架构
- **决策**: 使用纯HTML/CSS/JavaScript，不依赖前端框架
- **原因**: Demo阶段快速迭代，预留API接口便于后续对接
- **日期**: 2026-04-20

### 9.2 数据模拟
- **决策**: 使用localStorage模拟后端数据
- **原因**: Demo阶段无需真实后端，支持完整功能演示
- **日期**: 2026-04-20

### 9.3 登录验证
- **决策**: 用户端Demo账号+密码+角色三重验证
- **原因**: 确保Demo账号只能选择其对应角色，保证权限演示准确性
- **日期**: 2026-04-20

### 9.4 Demo账号快捷登录
- **决策**: 点击Demo账号卡片自动填充登录信息
- **原因**: 提升演示体验，降低用户试用门槛
- **日期**: 2026-04-20

### 9.5 管理后台账号
- **决策**: 独立admin账号体系，与用户端分离
- **原因**: 管理后台需要独立的超级管理员权限体系
- **日期**: 2026-04-20

### 9.6 反馈机制
- **决策**: 注释(Annotate)模式，非即时反馈
- **原因**: Demo阶段反馈数据用于评估AI回答质量，非实时处理
- **日期**: 2026-04-20

### 9.7 后端代理架构
- **决策**: 前端不直接调用Dify API，通过后端代理转发
- **原因**: 保护API Key安全、统一路由、权限校验、日志记录
- **日期**: 2026-04-21

### 9.8 API服务层分离
- **决策**: 前端封装独立的api-service.js服务层
- **原因**: 统一API调用入口、方便切换Mock/真实API、代码维护性
- **日期**: 2026-04-21

### 9.9 会话上下文管理
- **决策**: 后端代理维护conversation_id支持多轮对话
- **原因**: Dify基于conversation_id区分不同对话线程
- **日期**: 2026-04-21

### 9.10 流式响应方案
- **决策**: 支持SSE流式传输，实时展示AI回答
- **原因**: 长回答需等待，采用流式提升用户体验
- **日期**: 2026-04-21

### 9.11 Embedding模型选择
- **决策**: 使用Ollama本地部署，推荐模型 `m2-bert-base-multilingual-sentence-embedding` 或 `nomic-embed-text`
- **原因**: 本地部署降低成本，多语言支持好（中文），Ollama官方推荐
- **日期**: 2026-04-21

### 9.12 Bot C（版本指南）同步策略
- **决策**: 飞书多维表格定时同步（每小时，可配置）+ 支持手动触发
- **原因**: 数据量小（几百行），全量删除重建更简单可靠；手动触发便于测试
- **同步方式**: 定时同步（crontab表达式）+ `/api/feishu/sync` 手动触发接口
- **日期**: 2026-04-21

### 9.13 Qdrant Collection设计
- **决策**: Bot A/B/C分别使用独立的Collection
- **原因**: 不同Bot的问题场景和数据结构不同，独立Collection便于管理和优化
- **Collection命名**: `bot_a_knowledge`, `bot_b_knowledge`, `bot_c_versions`
- **日期**: 2026-04-21
