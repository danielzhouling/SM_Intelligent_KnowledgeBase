# Bot A 检索准确性测试用例 V2

## 环境信息

| 项目 | 值 |
|------|-----|
| Embedding 模型 | bge-m3 (1024维，支持中英文) |
| 向量数据库 | Qdrant v1.17.1 |
| 检索方式 | 混合检索（语义 + 关键词） |
| 知识库 | Bot A - 工单与PRD |
| 测试日期 | 2026-04-29 |

## 数据概览

| 文件 | 类型 | 数量 |
|------|------|------|
| tickets.json | 工单 | 3326条 |
| prd.json | PRD章节 | 47个 |
| dict.json | 数据字典 | 32条 |

## 测试方法

1. 直接通过 Qdrant API 检索（绕过 Dify）
2. 使用 bge-m3 生成查询向量
3. 检索 Top-K 结果并评估相关性

## 测试用例

### 一、英文工单检索（8条）

| # | 测试问题 | 关键词 | 期望命中 |
|---|---------|--------|---------|
| A01 | `shelftag printing error` | shelftag, printing | Shelftag Printing 相关工单 |
| A02 | `POS offline mode cannot process sales` | POS, offline | POS离线相关工单 |
| A03 | `uncaptured sales transaction` | uncaptured sales | Uncaptured Sales 工单 |
| A04 | `GCASH payment failed at checkout` | GCASH, payment | GCASH支付相关工单 |
| A05 | `SAP movement type 101 error` | SAP, movement type 101 | IBMS Integration工单 |
| A06 | `EOD files not generated` | EOD files | NO EOD FILES工单 |
| A07 | `scanner barcode not read` | scanner, barcode | Defective POS Scanner工单 |
| A08 | `password expired cannot login` | password, expired | Password Reset工单 |

### 二、中文 PRD 检索（8条）

| # | 测试问题 | 期望命中 |
|---|---------|---------|
| A09 | `押金系统如何退款` | 押金系统PRD相关章节 |
| A10 | `POS收银员怎么登录` | 收银员登录及授权相关章节 |
| A11 | `磅秤数据怎么同步` | 磅秤系统相关章节 |
| A12 | `小票打印格式在哪里设置` | 小票打印相关章节 |
| A13 | `SMAC会员积分怎么计算` | SMAC会员相关章节 |
| A14 | `日结流程是什么` | EOD日结相关章节 |
| A15 | `促销价格怎么生效` | 促销相关章节 |
| A16 | `盘点多长时间进行一次` | 盘点相关章节 |

### 三、数据字典检索（4条）

| # | 测试问题 | 期望命中 |
|---|---------|---------|
| A17 | `UOM单位是什么` | UOM定义 |
| A18 | `PLU代码的意思` | PLU定义 |
| A19 | `Value Pack是什么` | Value Pack定义 |
| A20 | `EAN条码规则` | EAN定义 |

### 四、中英混合检索（8条）

| # | 测试问题 | 期望命中 |
|---|---------|---------|
| A21 | `SMAC INT payment怎么用` | SMAC INT支付章节 |
| A22 | `RPO发货单据错误` | RPO/Goods Dispatch工单 |
| A23 | `POS terminal磁盘空间满` | disk space工单 |
| A24 | `Cash drawer金额不对` | cash drawer工单 |
| A25 | `Member card无法识别` | member card工单 |
| A26 | `Refund amount超出范围` | refund工单 |
| A27 | `Sign ON time记录异常` | sign on工单 |
| A28 | `Article price不一致` | article price工单 |

### 五、边缘场景（6条）

| # | 测试问题 | 测试目的 |
|---|---------|---------|
| A29 | `系统报错代码E001` | 模糊错误码查询 |
| A30 | `昨天的问题又出现了` | 时间相关模糊查询 |
| A31 | `类似的问题怎么解决` | 泛化问题 |
| A32 | `能不能帮我查下这个` | 非常泛化的查询 |
| A33 | `工号12345的权限问题` | 包含数字的查询 |
| A34 | `/etc/passwd` | 注入测试（应返回空或不相关） |

### 六、关键词检索（4条）

| # | 测试问题 | 测试目的 |
|---|---------|---------|
| A35 | `SAP` | 单一关键词 |
| A36 | `POS` | 单一关键词 |
| A37 | `EOD` | 缩写检索 |
| A38 | `GCASH` | 品牌名检索 |

---

## 评判标准

| 等级 | 说明 | 条件 |
|------|------|------|
| PASS | 完全准确 | Top3中有直接相关结果 |
| PARTIAL | 部分准确 | Top5中有相关结果，但Top3不精准 |
| FAIL | 失败 | Top10中无相关结果 |

## 测试结果记录表

| # | 问题 | 相似度Top1 | 相似度Top3 | 等级 | 备注 |
|---|-----|-----------|-----------|------|------|
| A01 | shelftag printing error | | | | |
| A02 | POS offline mode | | | | |
| A03 | uncaptured sales | | | | |
| A04 | GCASH payment failed | | | | |
| A05 | SAP movement type 101 | | | | |
| A06 | EOD files not generated | | | | |
| A07 | scanner barcode error | | | | |
| A08 | password expired | | | | |
| A09 | 押金系统退款 | | | | |
| A10 | POS收银员登录 | | | | |
| A11 | 磅秤数据同步 | | | | |
| A12 | 小票打印格式 | | | | |
| A13 | SMAC会员积分 | | | | |
| A14 | 日结流程 | | | | |
| A15 | 促销价格 | | | | |
| A16 | 盘点多长时间 | | | | |
| A17 | UOM单位 | | | | |
| A18 | PLU代码 | | | | |
| A19 | Value Pack | | | | |
| A20 | EAN条码 | | | | |
| A21 | SMAC INT payment | | | | |
| A22 | RPO发货 | | | | |
| A23 | POS磁盘空间 | | | | |
| A24 | Cash drawer | | | | |
| A25 | Member card | | | | |
| A26 | Refund amount | | | | |
| A27 | Sign ON time | | | | |
| A28 | Article price | | | | |
| A29 | 系统报错E001 | | | | |
| A30 | 昨天的问题 | | | | |
| A31 | 类似问题解决 | | | | |
| A32 | 帮我查下 | | | | |
| A33 | 工号12345 | | | | |
| A34 | /etc/passwd | | | | |
| A35 | SAP | | | | |
| A36 | POS | | | | |
| A37 | EOD | | | | |
| A38 | GCASH | | | | |

## 统计汇总

| 指标 | 值 |
|------|---|
| 总用例数 | 38 |
| PASS | |
| PARTIAL | |
| FAIL | |
| 通过率 | % |

## 调优建议记录

| 用例 | 问题 | 原因分析 | 调优建议 |
|-----|------|---------|---------|
| | | | |
