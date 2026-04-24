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
