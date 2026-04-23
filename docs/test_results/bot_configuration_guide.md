# Bot 配置指南 — Dify 与系统管理后台对接

> 本指南指导如何完成 Bot 的 Dify API Key 配置，使 Bot 从 draft 状态变为 active
> 配置完成后用户端才能正常使用聊天功能

---

## 前置条件

- Dify 平台运行中: http://localhost:3001
- Bot A（故障处理）已在 Dify 中创建并关联知识库 ✅
- Bot C（版本指南）已在 Dify 中创建并配置飞书插件 ✅
- 系统管理后台可访问: http://localhost/admin/login.html（admin/admin123）

---

## 配置步骤

### 第一步：在 Dify 中获取 API Key

1. 打开 Dify 管理后台: http://localhost:3001
2. 登录 Dify 管理员账号
3. 进入目标 Bot 的应用页面

**获取 API Key:**
- 点击左侧菜单 **"访问 API"**（或顶部 "API Access"）
- 在页面右上角找到 **API 密钥** 区域
- 点击 **"创建密钥"** 或复制已有的密钥
- 密钥格式: `app-xxxxxxxxxxxxxxxx`

**需要获取的密钥:**
| Bot | Dify 应用名 | 需要记录的 API Key |
|-----|------------|-------------------|
| Bot A | Bot A - 故障处理 | `app-xxx...` |
| Bot C | Bot C - 版本指南 | `app-xxx...` |

> 注意：Bot B 暂无知识库文档，跳过配置

---

### 第二步：在系统管理后台配置 API Key

1. 打开系统管理后台: http://localhost/admin/login.html
2. 使用 **admin / admin123** 登录
3. 左侧菜单点击 **"Bot 注册"**
4. 你会看到 3 个 Bot 记录（A/B/C），状态均为 **draft**

**配置 Bot A:**
1. 找到 **Bot A - 故障处理** 行
2. 点击 **"配置"** 或 **"编辑"** 按钮
3. 找到 **Dify API Key** 输入框
4. 粘贴从 Dify 获取的 API Key（`app-xxx...`）
5. 点击 **"测试连接"** 按钮
   - 成功：提示"连接成功"，Bot 状态自动变为 **active**
   - 失败：检查 API Key 是否正确，Dify 服务是否正常
6. 保存配置

**配置 Bot C（同样步骤）:**
1. 找到 **Bot C - 版本指南**
2. 配置 Dify API Key
3. 测试连接
4. 保存

---

### 第三步：验证配置

**管理后台验证:**
- Bot A 状态: draft → **active** ✅
- Bot C 状态: draft → **active** ✅
- Bot B 状态: draft（暂不配置，等待文档）

**用户端验证:**
1. 打开 http://localhost/demo/index.html
2. 用 hq-admin / password123 登录
3. Bot 选择页应显示 **active** 状态的 Bot（可点击）
4. 点击 Bot A → 进入聊天页
5. 发送测试问题: "SAP upload failed"
6. 应收到 AI 回复（流式显示）

**API 验证（可选）:**
```bash
# 登录获取 Token
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"hq-admin","password":"password123"}'

# 用返回的 access_token 查看可用 Bot
curl http://localhost:8000/api/bots/available \
  -H "Authorization: Bearer <access_token>"
```

---

## 两步走流程图

```
┌─────────────────────┐     ┌──────────────────────┐
│   Dify Studio       │     │   系统管理后台         │
│                     │     │                      │
│  1. 创建/编辑 Bot    │     │  3. 管理后台注册 Bot   │
│  2. 获取 API Key ───┼────▶│  4. 粘贴 API Key      │
│     app-xxx...      │     │  5. 测试连接           │
│                     │     │  6. 状态 → active     │
└─────────────────────┘     └──────────────────────┘
                                      │
                                      ▼
                            ┌──────────────────────┐
                            │   用户端              │
                            │                      │
                            │  7. Bot 卡片可点击     │
                            │  8. 正常聊天          │
                            └──────────────────────┘
```

---

## 故障排除

| 问题 | 排查方法 |
|------|---------|
| 测试连接失败 | 1. 确认 Dify 运行正常: `curl http://localhost:3001`<br>2. 确认 API Key 以 `app-` 开头<br>3. 检查后端日志: `docker logs sm-app-backend` |
| Bot 状态不变 | 测试连接必须成功，状态才会自动从 draft → active |
| 用户端看不到 Bot | 1. 确认 Bot 状态是 active（非 draft/disabled）<br>2. 确认用户有对应 Bot 权限 |
| 聊天无回复 | 1. 检查 Ollama 是否运行: `ollama list`<br>2. 检查 Dify Bot 是否关联知识库<br>3. 查看后端日志 |
| 后端 unhealthy | `docker logs sm-app-backend --tail 50` 查看错误 |

---

## 当前系统中的 Dify 配置信息

| 项目 | 值 |
|------|-----|
| Dify 地址 | http://localhost:3001 |
| 后端 Dify API Base URL | http://sm-dify-nginx:80/v1 (容器内) |
| Bot A 知识库 | Bot A - 工单与PRD（已导入） |
| Bot A 模型 | qwen2.5:3b-instruct (Ollama) |
| Bot A Embedding | bge-m3 (Ollama) |
| Bot C 插件 | langgenius/feishu_spreadsheet:0.0.2 |
| Bot C 数据源 | 飞书电子表格 YASaso15NhaPfQt4JTkcgKvYneY |
