# Bot A 知识库检索测试

## 环境信息

| 项目 | 值 |
|------|-----|
| Dify 版本 | 1.13.3 |
| Embedding 模型 | nomic-embed-text |
| 向量数据库 | Qdrant v1.17.1 |
| 检索方式 | 混合检索（语义 0.7 + 关键词 0.3） |
| 知识库 | Bot A - 工单与PRD |
| 测试日期 | 2026-04-22 |
| 测试人 | ________ |

## 数据概览

| 文件 | 类型 | 条数 |
|------|------|------|
| dict.txt | 数据字典 | 32 条 |
| prd.txt | PRD 章节 | 47 个 |
| tickets_part1~7.txt | 工单 | 3326 条 |

## 操作步骤

1. 打开 Dify：`http://localhost:3001`，登录
2. 左侧导航栏点击 **知识库**
3. 进入 `Bot A - 工单与PRD`
4. 点击 **命中测试**（Hit Test）
5. 逐条输入下方测试问题
6. 每条观察：是否返回相关结果、Top3 是否准确
7. 记录结果到下方表格

## 评判标准

| 等级 | 说明 |
|------|------|
| PASS | Top3 结果中有明确相关的命中 |
| PARTIAL | Top5 结果中有相关命中，但 Top3 不准确 |
| FAIL | Top5 结果中无相关命中 |

## 测试用例

### 一、英文工单检索

| # | 测试问题 | 期望命中内容 | 实际结果 | 等级 |
|---|---------|------------|---------|------|
| 1 | `shelftag cannot print` | Shelftag Printing 相关工单 | | |
| 2 | `POS offline` | POS 离线相关工单 | | |
| 3 | `uncaptured sales` | Uncaptured Sales 工单 | | |
| 4 | `GCASH payment issue` | GCASH 支付相关工单 | | |
| 5 | `SAP integration error movement type 101` | IBMS Integration 工单，Movement type 101 | | |
| 6 | `EOD files missing` | NO EOD FILES / INCOMPLETE EOD FILES 工单 | | |
| 7 | `scanner not working` | Defective POS Scanner 工单 | | |
| 8 | `password reset` | Password Reset / Authorization Setup 工单 | | |

### 二、中文 PRD 检索

| # | 测试问题 | 期望命中内容 | 实际结果 | 等级 |
|---|---------|------------|---------|------|
| 9 | `押金退款流程` | 押金系统 PRD 相关章节 | | |
| 10 | `POS 收银员登录授权` | [4.28] 收银员登录及强制密码更新及阶梯授权 | | |
| 11 | `磅秤系统` | [4.12] 磅秤系统 | | |
| 12 | `小票打印格式` | [4.26] 小票 | | |
| 13 | `SMAC 会员登录促销` | [4.24] SMAC 会员 | | |

### 三、数据字典检索

| # | 测试问题 | 期望命中内容 | 实际结果 | 等级 |
|---|---------|------------|---------|------|
| 14 | `什么是 UOM` | UOM: Unit of Measurement | | |
| 15 | `PLU 是什么意思` | PLU: Weight article's barcode | | |
| 16 | `Value Pack 的定义` | Value Pack: Similar to bundle | | |

### 四、中英混合检索

| # | 测试问题 | 期望命中内容 | 实际结果 | 等级 |
|---|---------|------------|---------|------|
| 17 | `SMAC INT 支付怎么处理` | [4.4] SMAC INT 支付 | | |
| 18 | `RPO 商品发货错误` | RPO / Goods Dispatch 相关工单 | | |
| 19 | `磁盘空间不足 POS` | Insufficient disk space at Dmall POS | | |

## 测试总结

| 统计项 | 数量 |
|--------|------|
| 总用例数 | 19 |
| PASS | |
| PARTIAL | |
| FAIL | |
| 通过率 | % |

## 问题记录

| 用例编号 | 问题描述 | 原因分析 | 优化建议 |
|---------|---------|---------|---------|
| | | | |
