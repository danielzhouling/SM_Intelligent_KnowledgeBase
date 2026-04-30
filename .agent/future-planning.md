# 未来规划 / Future Planning

> 本文档记录已讨论但未纳入当前迭代的功能需求，作为后续版本规划的参考。
> 个人中心、系统公告已确认纳入M7，从本文档移除。

**文档更新日期**: 2026-04-30

---

## 一、待实现功能清单（按优先级）

### P0 — 安全与合规

| 功能 | 描述 | 优先级 |
|------|------|--------|
| **数据库备份策略** | pg_dump定时备份 + 恢复验证流程，保障数据安全 | P0 |
| **登录失败锁定** | 密码连续错误5次锁定账号15分钟（PostgreSQL实现，不引入Redis） | P0 |
| **操作审计日志** | 管理员操作留痕，FastAPI中间件拦截器自动记录 | P0 |

### P1 — 运营与体验

| 功能 | 描述 | 优先级 |
|------|------|--------|
| **Bot用量统计** | 各Bot对话次数/用户数/平均响应时间统计面板（需引入图表库） | P1 |
| **会话管理** | 管理员查看活跃会话、支持强制下线（JWT黑名单） | P1 |
| **反馈统计分析** | 汇总统计：按Bot/按月/按评分分布的Dashboard | P1 |

### P2 — 长期价值

| 功能 | 描述 | 优先级 |
|------|------|--------|
| **知识库文档管理界面** | 在系统内管理Dify知识库文档，上传/删除/版本对比（依赖Dify Knowledge API） | P2 |
| **头像上传** | 用户上传自定义头像（存储到本地或OSS） | P2 |
| **WebHook通知** | 反馈审核通过/新用户注册等事件触发WebHook回调 | P2 |
| **登录历史** | 用户查看自己的登录设备、时间、地点（IP） | P2 |

### 按需 — 生产环境上线后

| 功能 | 说明 |
|------|------|
| **LLM模型升级** | Bot A PASS率仅26.3%（3B模型限制），生产环境需升级至7B/14B或接入云端API |
| **邮件通知** | 密码过期提醒、审计日志汇总邮件（需SMTP配置） |
| **API速率限制** | 如系统暴露公网则需添加（本地部署暂不需要） |

---

## 二、功能详细说明

### 2.1 数据库备份策略

**备份工具**: `pg_dump` + `crontab` 定时执行

**备份策略**:
| 类型 | 频率 | 保留 | 存储位置 |
|------|------|------|---------|
| 全量备份 | 每日凌晨2:00 | 保留最近7天 | 宿主机 `/opt/backups/postgres/` |
| 手动备份 | 系统升级/数据迁移前 | 手动管理 | 同上 |

**备份脚本**:
```bash
#!/bin/bash
# /opt/scripts/backup-postgres.sh
BACKUP_DIR="/opt/backups/postgres"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/sm_kb_${TIMESTAMP}.sql.gz"

docker exec sm-app-postgres pg_dump -U kb_app knowledge_base_app | gzip > "$BACKUP_FILE"
find "$BACKUP_DIR" -name "sm_kb_*.sql.gz" -mtime +7 -delete

echo "[$TIMESTAMP] Backup completed: $BACKUP_FILE"
```

**恢复流程**:
```bash
docker stop sm-app-backend
gunzip -c /opt/backups/postgres/sm_kb_YYYYMMDD_HHMMSS.sql.gz > restore.sql
docker exec -i sm-app-postgres psql -U kb_app knowledge_base_app < restore.sql
docker start sm-app-backend
```

**定期验证**: 每月手动执行一次恢复到测试库，确认备份文件可用。

---

### 2.2 登录失败锁定

**策略**:
| 条件 | 动作 |
|------|------|
| 连续5次密码错误 | 锁定账号15分钟 |
| 连续10次密码错误 | 锁定账号1小时，管理后台显示警告 |

**实现方案（PostgreSQL，不引入Redis）**:

`users` 表新增字段：
```sql
ALTER TABLE users ADD COLUMN failed_login_count INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN locked_until TIMESTAMP;
```

**说明**:
- 仅做账号级别锁定，不做IP级别锁定（企业内网共享NAT出口IP）
- 系统为本地部署、用户量小，PostgreSQL方案完全满足需求

---

### 2.3 操作审计日志

**记录范围**:
| 操作类型 | 触发条件 | 记录内容 |
|----------|----------|----------|
| 用户管理 | 创建/编辑/删除/启用/禁用用户 | 操作人、目标用户、操作内容、时间 |
| 角色管理 | 创建/编辑/删除角色、分配权限 | 操作人、角色、操作前后权限变化 |
| Bot管理 | 创建/编辑/删除Bot、配置API Key、启用/禁用 | 操作人、Bot、操作内容 |
| 反馈审核 | 审核反馈、标注结果 | 操作人、反馈ID、审核结果 |
| 登录 | 管理员登录/登出 | 操作人、IP、时间、结果 |

**数据模型**:
```sql
CREATE TABLE audit_logs (
    id VARCHAR(36) PRIMARY KEY,
    operator_id VARCHAR(36) REFERENCES users(id),
    operator_name VARCHAR(100),
    action VARCHAR(50) NOT NULL,
    target_type VARCHAR(50),
    target_id VARCHAR(36),
    target_name VARCHAR(200),
    detail JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);
```

**实现方案**: FastAPI中间件拦截器，自动记录所有写操作（POST/PUT/PATCH/DELETE），无需每个路由手动埋点。

---

### 2.4 会话管理

**功能点**:
- 管理员查看当前活跃会话列表
- 强制下线指定会话（JWT黑名单）
- 会话详情查看（仅元数据）

**数据模型**:
```sql
CREATE TABLE user_sessions (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) REFERENCES users(id),
    refresh_token_hash VARCHAR(255),
    device_info VARCHAR(200),
    ip_address VARCHAR(45),
    last_active_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP
);

CREATE TABLE token_blacklist (
    id VARCHAR(36) PRIMARY KEY,
    token_jti VARCHAR(100) UNIQUE NOT NULL,
    user_id VARCHAR(36) REFERENCES users(id),
    reason VARCHAR(50),
    created_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP NOT NULL
);
```

---

### 2.5 Bot用量统计

**统计维度**:
| 维度 | 指标 |
|------|------|
| 全局 | 总对话次数、日活用户数、总消息数、平均响应时间 |
| 按Bot | 对话次数、独立用户数、平均对话轮次、知识库检索命中率 |
| 按用户 | 个人对话次数、使用了哪些Bot、最后一次活跃时间 |

**实现要点**:
- 后端从 conversations 表聚合统计数据
- 前端引入图表库（Chart.js 或 ECharts）
- 管理后台新增"统计分析"页面
- 支持 CSV 导出

---

### 2.6 反馈统计分析

- 后端从 feedbacks 表聚合统计（按Bot/按月/按评分分布）
- 前端统计图表（饼图：有用/没用比例，柱状图：按Bot分布）
- 与Bot用量统计共用"统计分析"页面，Tab切换展示

---

## 三、技术债务与优化项

### 3.1 安全性待优化项

| 问题 | 当前状态 | 建议方案 |
|------|----------|----------|
| JWT Secret硬编码 | 环境变量但未强制校验 | 启动时检查JWT_SECRET是否存在，不存在则拒绝启动 |
| CORS配置 | 读取环境变量但值可疑 | 限制为明确的前端域名列表 |
| 敏感日志 | 错误信息可能包含堆栈 | 生产环境关闭DEBUG，错误响应脱敏 |

### 3.2 性能优化项

| 问题 | 当前状态 | 建议方案 |
|------|----------|----------|
| PostgreSQL连接池 | 默认配置 | 根据容器规格调整 `pool_size` 和 `max_overflow` |
| Dify API超时 | 30s硬编码 | 可配置化，支持按Bot设置不同超时 |
| 前端资源 | 无CDN/压缩 | Nginx配置gzip_static，Brotli压缩 |

### 3.3 可观测性

| 功能 | 当前状态 | 建议 |
|------|----------|------|
| 日志聚合 | 仅文件日志 | 接入ELK或云监控 |
| 性能监控 | 无 | 接入Sentry或类似APM |
| 健康检查 | 基础存活检查 | 增加DB/Dify依赖检查 |

---

## 四、技术决策记录

| 决策项 | 方案 | 原因 |
|--------|------|------|
| 登录锁定存储 | PostgreSQL users表字段 | 系统用户量小、本地部署，无需引入Redis |
| IP级别锁定 | 不做 | 企业内网共享NAT出口IP，IP锁定可能影响整个办公室 |
| API速率限制 | 暂不做 | 本地部署，Ollama天然串行排队，用户量极小 |
| 审计日志实现 | FastAPI中间件拦截器 | 自动记录所有写操作，避免路由遗漏 |
| 强制下线 | JWT黑名单表 | 本地部署无需Redis，PostgreSQL表即可 |
| 密码策略 | 随个人中心一起实现 | 个人中心是密码修改的前端入口，后端能力需同步到位 |

---

*本文档为规划参考，具体实现顺序需根据业务需求和资源情况调整。*
