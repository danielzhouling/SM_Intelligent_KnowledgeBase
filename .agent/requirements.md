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

- [ ] 环境部署（Dify + Qdrant + Ollama） ✅ M2已完成
- [ ] 知识库建设（文档处理 + Embedding） ✅ M3已完成
- [ ] Bot配置（Dify智能体 + MCP） ✅ M4已完成
- [ ] 真实API对接 ✅ M5已完成
- [ ] 个人中心 + 系统公告 — M7进行中

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
- **决策**: 使用 `bge-m3` (BAAI) 替代 `nomic-embed-text`
- **原因**: nomic-embed-text 仅支持英文，中文检索完全失效；bge-m3 支持100+语言、中英混合检索、8K长上下文，且在MTEB检索榜单排名第一
- **验证结果**: 替换后通过率从 42.1% 提升至 84.2%（中文PRD从0%提升至60%，数据字典从0%提升至100%，中英混合从16.7%提升至100%）
- **规格**: 567M参数，1024维向量，8K上下文，MIT协议
- **日期**: 2026-04-22

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

### 9.14 后端技术栈
- **决策**: Python/FastAPI 替代 Node.js/Express
- **原因**: 项目预处理脚本已用Python，AI/ML生态（微调/Embedding）均为Python原生，FastAPI自动生成API文档，async/await原生支持SSE流式
- **日期**: 2026-04-22

### 9.15 数据库选型
- **决策**: 独立PostgreSQL实例（Docker Compose部署，与Dify的PostgreSQL隔离）
- **原因**: 正式商用需生产级数据库；SQLite并发弱不适合商用；复用Dify的PostgreSQL会耦合升级风险
- **日期**: 2026-04-22

### 9.16 账号体系
- **决策**: 系统自建用户表，管理后台创建/管理账号，不依赖外部SSO/LDAP
- **原因**: 系统用户量可控（SM IT + Dmall Helpdesk），自建足够满足需求，无外部系统对接成本
- **日期**: 2026-04-22

### 9.17 会话历史保存
- **决策**: 保存会话历史，利用Dify存储 + 后端仅存映射关系（user_id ↔ bot_id ↔ dify_conversation_id）
- **原因**: 主流产品均保存会话；Dify已持久化conversation和message，无需重复存储；前端侧边栏展示历史会话列表
- **日期**: 2026-04-22

### 9.18 反馈闭环流程
- **决策**: 用户提交反馈 → 后台审核（有效/无效/来源错误/重复）→ 有效反馈分类标记 → 导出微调数据集
- **原因**: 反馈数据最终用于微调，需审核过滤噪声；来源错误类反馈进知识库维护队列而非微调
- **状态机**: pending → approved / rejected / source_error / duplicate
- **审核字段**: 审核员可补充"正确答案"，直接作为微调训练数据
- **日期**: 2026-04-22

### 9.19 Bot注册与Dify关联方案

- **决策**: 两步走生命周期管理 + 无类型分类
- **原因**:
  - Dify无论是Chatbot（知识库型）还是Agent（工具型），API接口完全一致（`/v1/chat-messages`），后端路由无差异，无需后端类型分类
  - 差异化展示通过Bot的description和welcome_message自然体现，不需要硬性type字段
  - 创建和配置API Key分离，允许先注册Bot再后续关联Dify，降低操作耦合
- **两步走流程**:
  1. 管理员在Dify Studio创建App并获取API Key（Dify负责AI逻辑）
  2. 管理员在系统管理后台注册Bot，填入API Key完成关联（系统负责权限与展示）
- **Bot状态机制**:
  - `draft`: 已创建但未配置Dify API Key，不可用（仅管理后台可见）
  - `active`: 已配置API Key且通过连接测试，用户端可见可用
  - `disabled`: 管理员手动禁用，用户端不可见
- **简化原则**:
  - 去掉Bot type分类（knowledge/agent），Dify API统一处理
  - 去掉tags标签系统，用description直接展示
  - dify_api_key字段允许为空，未配置时Bot处于draft状态
- **日期**: 2026-04-23

### 9.20 多会话管理方案

- **决策**: 同一用户可对同一Bot创建多个独立会话，侧边栏切换，历史可查可续聊（方案A）
- **原因**: 主流AI产品（ChatGPT、Kimi）的标准体验，用户习惯已建立
- **会话特性**:
  - 上下文独立：每个会话对应一个Dify conversation_id，互不干扰
  - 历史可查：点开任意历史会话可查看完整对话记录
  - 可继续聊：在历史会话中继续提问，Dify保持上下文
  - 标题自动生成：取第一条消息前20字作为会话标题
- **数据流**: 前端使用后端conversation ID → 后端内部映射到Dify conversation_id → 调用Dify API
- **日期**: 2026-04-23

### 9.21 Bot禁用时进行中会话处理

- **决策**: 立即断开方案 — 用户发下一条消息时提示"该Bot已下线"
- **原因**: 实现简单，用户能理解；已有历史会话仍可通过会话列表查看（只读）
- **处理逻辑**:
  - Bot禁用后，用户端Bot选择页不再显示该Bot
  - 已打开的聊天页，用户发消息时后端校验Bot状态 → 返回错误提示
  - 历史会话列表中该Bot的会话仍可见，可查看历史消息（只读）
- **日期**: 2026-04-23

### 9.22 会话创建时机

- **决策**: 首条消息响应后创建（方案A）
- **原因**: 不产生空记录，数据干净；Dify首条消息响应中返回conversation_id，后端此时创建映射
- **流程**:
  1. 用户发送首条消息 → 后端转发到Dify（不带conversation_id）
  2. Dify返回answer + conversation_id + message_id
  3. 后端创建conversations表记录（our_id ↔ dify_conversation_id）
  4. 前端收到响应中的our_conversation_id，更新侧边栏
- **日期**: 2026-04-23

### 9.23 反馈与流式消息关联

- **决策**: 流式输出过程中反馈按钮禁用，message_end事件后启用
- **原因**: message_id（反馈提交必需）仅在Dify的message_end事件中返回，流式过程中不可用
- **前端交互**:
  - AI回复流式输出中：反馈按钮灰色禁用
  - 流式完成（收到message_end）：启用反馈按钮，此时持有message_id
  - 用户点击反馈：提交时携带message_id + conversation_id
- **日期**: 2026-04-23

### 9.24 知识库检索模式优化

- **决策**: Bot A/B 知识库检索模式从"混合检索"切换为"纯语义检索"
- **原因**:
  - 系统使用场景以英文为主（文档英文、用户英文），中文占比极低
  - Dify 混合检索的关键词组件使用 Jieba 分词器，Jieba 是纯中文分词器，对英文关键词得分为零
  - 混合检索权重为 语义0.7 + 关键词0.3，关键词部分 30% 权重完全浪费，反而拖低总分
  - bge-m3 是多语言语义模型，英文语义能力是其强项，中文语义能力已验证（Bot B 中文检索 100% 通过）
  - 纯语义检索将 100% 权重给到 bge-m3 向量匹配，对英文为主场景是最优选择
- **预期效果**: 检索得分不再被零分关键词拖低，边界查询命中率提升
- **操作**: Dify 知识库设置页，Bot A/B 各将检索模式从"混合检索"改为"语义检索"
- **验证**: 重跑已有测试用例（Bot A 38条 + Bot B 64条），对比优化前后 PASS 率
- **日期**: 2026-04-29

### 9.25 UI全面改造方案

- **决策**: 基于 style-a-tech 设计风格，全面改造用户端 + 管理后台 UI，同时补充移动端适配和无障碍支持
- **原因**:
  - 当前生产 UI 存在三套配色冲突、15+硬编码颜色、无排版比例尺、间距无标准等视觉问题
  - 移动端仅一个 768px 断点，侧边栏直接隐藏无替代方案，功能残缺
  - 零 ARIA 无障碍支持
  - 用户对 style-a-tech 设计风格满意，作为改造基准
- **改造范围**: 9个页面（用户端3页 + 管理后台6页）+ 2个CSS文件 + JS DOM适配
- **改造深度**: 视觉改造 + 响应式 + 无障碍，保持现有 JS 业务逻辑不变
- **设计系统改进**:
  - 补齐缺失 CSS 变量（`--radius-full`, `--bg-sidebar-hover`）
  - Bot 渐变色变量化（`--bot-a/b/c-gradient`），消除8处硬编码重复
  - 三断点体系：mobile(<768px) / tablet(768-1024px) / desktop(>1024px)
  - 移动端侧边栏：汉堡菜单 + overlay 抽屉式
- **Bot头像变更**: 从 CSS 机器人脸（div堆叠 + emoji叠加）改为渐变字母徽章（蓝A/绿B/紫C）
- **关键原则**:
  - JS 业务逻辑不改，只做 DOM 选择器和适配
  - 每个页面完成后独立可测
  - 用户端和管理后台可并行开发
- **里程碑**: M6（共15个任务，5个Phase）
- **日期**: 2026-04-29

### 9.26 个人中心方案

- **决策**: Modal弹窗形式，不新增独立页面；用户端和管理后台都需要
- **入口**: 导航栏用户名点击 → 下拉菜单 → "个人设置" → 打开Modal弹窗
- **可编辑字段**: display_name（可编辑）、email/phone（预留字段，UI可编辑但系统暂不使用）、username/roles（不可编辑）
- **修改密码流程**: 当前密码验证 → 新密码复杂度校验(8位+大小写+数字+特殊字符) → 历史密码比对(最近5次bcrypt) → 更新密码 → 签发新JWT Token → 前端替换本地Token
- **密码强度提示**: 前端实时显示弱/中/强
- **数据模型**: users表新增email/phone/password_changed_at/must_change_password字段，新增password_history表
- **日期**: 2026-04-30

### 9.27 系统公告方案

- **决策**: 管理员发布/下线，用户端顶部Banner展示，全员广播不区分角色
- **公告类型**: info(蓝色)/warning(黄色)/urgent(红色+不可关闭)
- **状态**: 只有发布(published)和下线(offline)两种，不做草稿
- **展示规则**: 只展示最新1条生效公告；bots选择页+chat页面展示，login页不展示
- **关闭行为**: info和warning可关闭(session内不显示，刷新重新出现)，urgent不可关闭
- **数据模型**: announcements表(id, title, content, type, status, published_at, expires_at, created_by)
- **日期**: 2026-04-30
