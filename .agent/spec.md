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
