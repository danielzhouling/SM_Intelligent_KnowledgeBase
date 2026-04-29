# Bot A/B 检索准确性测试计划

## 概述

本测试计划用于验证 Bot A（故障处理）和 Bot B（操作指南）的知识库检索准确性。

## 测试文件

| 文件 | 用途 |
|------|------|
| `bot_a_retrieval_test_v2.md` | Bot A 测试用例 (38条) |
| `bot_b_retrieval_test_v2.md` | Bot B 测试用例 (64条) |
| `run_retrieval_test.py` | 自动化测试脚本 |

---

## 执行方式

### 方式一：自动化测试（推荐）

```bash
# 安装依赖
pip install httpx qdrant-client

# 测试 Bot A
python3 run_retrieval_test.py --bot a --top-k 5

# 测试 Bot B
python3 run_retrieval_test.py --bot b --top-k 5

# 指定测试用例
python3 run_retrieval_test.py --bot a --test-id A01 --test-id A09
```

### 方式二：手动测试（Dify 界面）

1. 打开 Dify：`http://localhost:3001`
2. 进入知识库 → 对应 Bot 的知识库
3. 点击 **命中测试**
4. 输入测试问题，查看 Top-K 结果

---

## 测试用例概览

### Bot A - 故障处理（38条）

| 类别 | 数量 | 说明 |
|------|------|------|
| 英文工单检索 | 8条 | 常见工单关键词 |
| 中文PRD检索 | 8条 | PRD文档章节 |
| 数据字典检索 | 4条 | 术语定义 |
| 中英混合检索 | 8条 | 混合语言场景 |
| 边缘场景 | 6条 | 模糊查询、注入测试 |
| 关键词检索 | 4条 | 单一关键词 |

### Bot B - 操作指南（64条）

| 模块 | 数量 | 说明 |
|------|------|------|
| POS | 12条 | 收银台操作 |
| Inventory | 10条 | 库存管理 |
| Master Data | 8条 | 主数据管理 |
| Promotion | 10条 | 促销管理 |
| Data Dashboard | 6条 | 数据报表 |
| System Integration | 6条 | 系统集成 |
| 中英混合 | 6条 | 混合场景 |
| 边缘异常 | 6条 | 异常处理 |

---

## 评判标准

| 等级 | 说明 | 条件 |
|------|------|------|
| PASS | 完全准确 | Top3 结果中有直接相关命中 |
| PARTIAL | 部分准确 | Top5 结果中有相关命中 |
| FAIL | 失败 | Top10 结果中无相关命中 |

---

## 测试结果分析

### 通过标准

| Bot | 目标通过率 |
|-----|-----------|
| Bot A | ≥ 85% |
| Bot B | ≥ 90% |

### 调优方向

如果通过率低于目标，按以下方向调优：

#### 1. Embedding 模型调优

| 问题 | 调优方案 |
|------|---------|
| 语义相似但关键词不匹配 | 调整混合检索权重 (semantic/keyword ratio) |
| 短文本检索效果差 | 增加 query expansion |
| 专有名词不敏感 | 增加同义词词典 |

#### 2. 知识库切分策略

| 问题 | 调优方案 |
|------|---------|
| 上下文丢失 | 增大 chunk size |
| 关键信息被切断 | 调整切分边界（按段落/标题） |
| 召回太多无关内容 | 增加 overlap 或减少 top-k |

#### 3. Prompt 优化

如果通过 Dify 测试：

| 问题 | 调优方案 |
|------|---------|
| 答案不相关 | 优化 Dify App 的 Prompt |
| 引用不准确 | 调整召回后 rerank 策略 |

---

## 测试结果记录

测试完成后，将结果记录到以下文件：

- `bot_a_retrieval_test_v2.md` 中的结果记录表
- `bot_b_retrieval_test_v2.md` 中的结果记录表
- 自动化脚本输出的 JSON 文件

---

## 调优后的验证流程

```
调优实施
    │
    ↓
重新执行测试脚本
    │
    ↓
对比调优前后通过率
    │
    ├── 通过率提升 → 验证通过
    │
    └── 通过率未提升 → 进一步分析
            │
            ↓
        问题定位
            │
            ├── Embedding 问题 → 换模型
            ├── 切分问题 → 重新切分
            └── Prompt 问题 → 优化 Prompt
```
