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

Demo静态页面：HTML/CSS/JS，localStorage模拟数据
```

### 5.2 技术栈

- 前端：HTML + CSS + JavaScript（纯静态）
- 后端（Demo阶段）：localStorage模拟
- 部署：Docker Compose

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
