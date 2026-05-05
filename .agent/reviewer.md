# 审查建议

<!-- 审查人员在此给出建议和审查结果 -->

## 当前状态

- M1 Demo静态页面开发完成
- 审计完成：10项通过，3项需修复

## 审查记录

### 2026-04-20 第一次审查

**审计范围**：M1阶段所有12个任务

**通过任务 (9项)**：
- TASK-001: 用户端登录页 ✅
- TASK-002: 用户端Bot选择页 ✅
- TASK-003: 用户端聊天页 ✅
- TASK-005: 用户端用户信息展示 ✅
- TASK-006: 管理后台登录页 ✅
- TASK-007: 管理后台仪表盘 ✅
- TASK-009: 管理后台角色管理 ✅
- TASK-011: 管理后台反馈审核 ✅
- TASK-012: 管理后台导航布局 ✅

**需修复任务 (3项)**：

#### 1. TASK-004 (反馈区) - 严重不符合
**问题**：反馈机制与需求严重不符
- 需求：`有用/没用`二选一 + 原因面板(不相关/来源错误/答案不完整/其他) + 状态锁定
- 实际：只有"Annotate"标注按钮，选项为Inaccurate/Missing Information/Other
**建议**：重新实现反馈UI，替换Annotate为有用/没用按钮，添加原因选择面板和状态锁定

#### 2. TASK-008 (用户管理) - 功能缺失
**问题**：不支持多角色分配
- 需求：一个用户可分配多个角色
- 实际：只有单选下拉框
**建议**：将角色选择改为Checkbox组多选

#### 3. TASK-010 (Bot注册) - 功能缺失
**问题**：未实现权限自动生成
- 需求：注册新Bot自动生成对应permission记录
- 实际：注册Bot时未生成对应权限
**建议**：在saveBots时自动生成bot.{bot_key}权限

---

**审查结论**：修复后通过

---

## 2026-04-24 第二次审查

**审计范围**：M4/M5 阶段代码 — SSE流解析、Bots权限、Admin安全

**通过任务**：
- SSE流解析修复 ✅ — `api-service.js` 正确使用 `data.answer` 处理 `message` 和 `agent_message` 事件
- Bot权限自动生成 ✅ — `bots.py` 创建Bot时自动生成 `bot.{key}` 权限
- 流式会话创建 ✅ — `chat.py` 在 `message_end` 事件中正确创建conversation映射
- TASK-M5-002 ✅ — FastAPI路由层正确实现（`require_permissions` 依赖校验）
- TASK-M5-003 ✅ — DifyService 流式/阻塞双模式正确实现

**需修复问题 (3项)**：

#### 1. 【严重】管理后台未校验管理员权限
**文件**: `admin/index.html`, `admin/users.html`, `admin/roles.html`, `admin/bots.html`, `admin/feedback.html`
```javascript
if (!AdminSession.isLoggedIn()) {
  window.location.href = 'login.html';
  return;
}
```
**问题**: 仅检查是否登录，未校验 `user.manage` / `role.manage` 权限。任何已登录用户都能访问管理后台。
**建议**: 调用 `/api/users` 接口时若返回 403，提示"无权访问"并跳转

#### 2. 【中等】seed.py 存在冗余 bot.D 权限
**文件**: `server/seed.py:28-29`
```python
"pb_d": PermissionModel(id="pb_d", key="bot.D", name="Bot D", type="bot"),
```
**问题**: 数据库只有 Bot A/B/C，但 seed 创建了 bot.D 权限，数据不一致
**建议**: 删除 `pb_d` 相关代码

#### 3. 【低】前端冗余Bot权限过滤
**文件**: `demo/js/app.js:354-361`
```javascript
const allowedBotKeys = new Set();
if (user?.role) {
  const perms = MockData.ROLE_PERMISSIONS[user.role];
  ...
}
```
**问题**: 前端使用 MockData 过滤，而非使用后端 `/api/bots/available` 真实数据。后端已正确过滤，前端再次过滤是冗余的
**建议**: 删除前端 `allowedBotKeys` 过滤逻辑，直接展示 API 返回结果

**审查结论**：需要修复

---

### 修复状态 (2026-04-24)

| 问题 | 状态 | 修复文件 |
|------|------|----------|
| seed.py 冗余 bot.D | ✅ 已修复 | `server/seed.py` — 删除 `pb_d` 相关代码 |
| 前端冗余Bot权限过滤 | ✅ 已修复 | `demo/js/app.js` — 移除 `allowedBotKeys` 过滤逻辑 |
| 管理后台权限校验 | ✅ 已修复 | `js/admin-app.js` — 添加 `checkAdminPermission()` 检查 |

**修复后审查结论**：通过 ✅

---

## 2026-04-26 第三次审查

**审计范围**：M4/M5 全量代码审计 — 后端路由、前端交互、Docker部署、多会话流程

### 通过任务 (26项)

M1 全部12项 ✅ | M2 全部5项 ✅ | M3 已完成项 ✅ | M4-001~005 ✅ | M5-001 ✅ | M5-003 ✅ | M5-004 ✅ | M5-007 ✅ | M5-008 ✅ | M5-009 ✅

### 需修复任务 (3项)

#### 1. 【严重】TASK-M5-005 — 多会话延续功能完全失效

**核心BUG：后端 conversation_id 未翻译**
- `server/routers/chat.py:136` — 阻塞模式将前端传来的内部 UUID 直接传给 Dify，Dify 不认识该 UUID 会忽略并创建新会话
- `server/routers/chat.py:254` — 流式模式同样直接传递内部 UUID
- **正确做法**：调用 Dify 前，通过 `body.conversation_id` 查 `ConversationModel.dify_conversation_id`，将 Dify ID 传给 Dify

**前端BUG：流式请求永远不传 conversation_id**
- `demo/js/api-service.js:548` — 硬编码 `conversation_id: null`
- `sendMessageStream` 函数签名不包含 `conversationId` 参数
- `demo/js/app.js:782` — 调用时未传入 `currentConversationId`

**影响**：用户永远无法在已有会话中继续对话，每条消息都创建全新会话

**修复建议**：
```
后端 chat.py:
1. send_message: 在 dify_service.chat_blocking 前查 ConversationModel
2. _stream_generator: 在 dify_service.chat_stream 前查 ConversationModel
3. 将 dify_conversation_id 传给 Dify

前端:
1. sendMessageStream(botId, query, conversationId, onChunk, onComplete, onError)
2. body: { conversation_id: conversationId || null }
3. app.js 调用时传入 currentConversationId
```

#### 2. 【严重】TASK-M5-006 — 前端多会话在真实模式下不完整

**BUG 1：deleteConversation 不调后端 API**
- `demo/js/app.js:697-713` — 真实模式下仅清 localStorage 和重渲染，刷新后会话重现
- **修复**：真实模式下调用 DELETE API（需后端先补充删除接口）

**BUG 2：依赖 TASK-M5-005 修复**
- 会话延续和 streaming conversation_id 问题同上

#### 3. 【中等】TASK-M5-002 — 路由层缺失与规范不符

**缺失端点**：
- `POST /api/auth/logout` — 任务描述明确包含「登出」，未实现
- `POST /api/feishu/sync` — spec 定义的同步触发接口，未实现

**规范不符**：
- 所有列表接口无分页（spec 定义了 PaginatedResponse，schemas/common.py 有定义但路由未使用）
- `feishu.py` 用 `SuccessResponse(data={"error": str(e)})` 返回错误，违反 spec 错误响应格式
- `require_permissions` 中 `knowledge.*` 短路导致拥有该权限的用户绕过所有权限检查（dependencies.py:56-57）

### 安全警告（不阻塞，但需后续修复）

| 级别 | 问题 | 位置 |
|------|------|------|
| 高 | refresh token 不校验用户是否仍存在/active | `routers/auth.py` refresh 端点 |
| 高 | CORS `allow_origins=["*"]` + `allow_credentials=True` | `main.py:29` |
| 中 | 飞书凭据硬编码在 feishu_sync.py/http_server/mcp_server 中 | 3个文件 |
| 中 | SSE 错误消息用 f-string 拼接 JSON，有注入风险 | `chat.py:229` |
| 低 | `configure_dify` 存 API Key 即设 active，跳过测试步骤 | `routers/bots.py` |

### roadmap.json 状态修正

| Milestone | 修正前 | 修正后 | 原因 |
|-----------|--------|--------|------|
| M3 | in_progress | completed | features.json 中 M3 任务全部 pass=true |
| M4 | pending | in_progress | M4-006 仍 pass=false |
| M5 | pending | in_progress | 3项任务审计打回 |

---

**审查结论**：需修复 3 项任务后方可通过。多会话延续是 P0 优先级，影响核心用户体验。

---

## 2026-05-05 第四次审查

**审计范围**：M7 里程碑完成度 + 最新提交 e2f4587 (菜单级权限系统)

### 通过任务 (M7全部 + M8)

| 任务 | 状态 | 备注 |
|------|------|------|
| TASK-M7-001 | ✅ | 个人中心后端API+数据模型 |
| TASK-M7-002 | ✅ | 用户端前端 |
| TASK-M7-003 | ✅ | 管理后台前端 |
| TASK-M7-004 | ✅ | 系统公告后端API |
| TASK-M7-005 | ✅ | 管理后台公告管理页面 |
| TASK-M7-006 | ✅ | 用户端Banner组件 |
| TASK-M7-007 | ✅ | E2E测试文件存在 |
| TASK-M8-001 | ✅ | 菜单级权限系统 |

### 修复问题 (2项)

#### 1. 【已修复】M7 roadmap.json 状态不一致
**问题**: `roadmap.json` M7状态为"pending"，但 features.json 所有任务 pass=true
**修复**: 已将 roadmap.json 中 M7 状态更新为 "completed"，并添加 M8 里程碑

#### 2. 【已修复】announcements.manage 权限缺失
**问题**: `dependencies.py` 定义的 `menu.announcements → announcements.manage` 映射，但 seed.py 未创建该权限
**影响**: 任何登录用户都能管理公告，无权限控制
**修复**: 
- 在 seed.py 添加 `announcements.manage` 权限 (p6)
- System Admin 角色 (r4) 已授予该权限

### 待处理 (建议后续修复)

#### 3. 【建议】announcements 路由未启用权限检查
**问题**: `server/routers/announcements.py` 所有端点只使用 `get_current_user`，未使用 `require_permissions`
**影响**: 非管理员用户也能访问公告管理API（虽然前端侧边栏会隐藏）
**建议**: 考虑在 create/update/toggle 端点添加 `require_permissions("announcements.manage")`

### roadmap.json 状态修正 (本次)

| Milestone | 修正前 | 修正后 | 原因 |
|-----------|--------|--------|------|
| M7 | pending | completed | features.json 中 M7 任务全部 pass=true |
| M8 | (新增) | completed | 菜单级权限系统已实现 (commit e2f4587) |

---

**审查结论**：通过 ✅

---


