# Bot B 检索准确性测试用例 V2

## 环境信息

| 项目 | 值 |
|------|-----|
| Embedding 模型 | bge-m3 (1024维，支持中英文) |
| 向量数据库 | Qdrant v1.17.1 |
| 知识库 | Bot B - 操作指南（蓝图+手册） |
| 知识单元数 | 626个 |
| 测试日期 | 2026-04-29 |

## 知识库来源

| 来源 | 内容 |
|------|------|
| 蓝图文档 | 6个模块的操作蓝图 |
| 操作手册 | 5个操作手册 |

## 测试方法

1. 直接通过 Qdrant API 检索（绕过 Dify）
2. 使用 bge-m3 生成查询向量
3. 检索 Top-K 结果并评估相关性

---

## 模块一：POS（12条）

### 基础操作（8条）

| # | 测试问题 | 语言 | 期望命中模块 |
|---|---------|------|------------|
| B01 | `How does POS handle cashier login and logout?` | EN | Cashier Login/logout |
| B02 | `What payment methods are supported at POS?` | EN | Payment methods |
| B03 | `How to suspend and recall an order in POS?` | EN | Suspend/recall order |
| B04 | `What happens during End of Day (EOD) process?` | EN | EOD reconciliation |
| B05 | `How does POS handle void items and cancel orders?` | EN | Item Void & Cancel |
| B06 | `POS怎么处理预订单?` | ZH | Pre-order process |
| B07 | `What is the offline mode in POS?` | EN | Offline mode |
| B08 | `How to add an article in POS sales page?` | EN | Adding article |

### 边缘场景（4条）

| # | 测试问题 | 语言 | 测试目的 |
|---|---------|------|---------|
| B09 | `cashier forgot password怎么办` | ZH-EN | 混合场景 |
| B10 | `POS screen frozen what to do` | EN | 异常场景 |
| B11 | `how to print receipt again` | EN | 常用操作 |
| B12 | `void transaction after EOD` | EN | 边界条件 |

---

## 模块二：Inventory（10条）

### 基础操作（6条）

| # | 测试问题 | 语言 | 期望命中模块 |
|---|---------|------|------------|
| B13 | `How does goods receiving from vendor work?` | EN | Goods Receiving |
| B14 | `What is the stock adjustment process?` | EN | Stock adjustment |
| B15 | `How to perform stock transfer between stores?` | EN | Stock transfer |
| B16 | `How does the inventory counting work?` | EN | Stock counting |
| B17 | `What is TPS in inventory?` | EN | TPS Third Party Sales |
| B18 | `库存调拨怎么操作?` | ZH | Stock transfer |

### 边缘场景（4条）

| # | 测试问题 | 语言 | 测试目的 |
|---|---------|------|---------|
| B19 | `PDA scanning not working during receiving` | EN | 异常场景 |
| B20 | `goods received but quantity wrong` | EN | 差异处理 |
| B21 | `can I cancel goods receipt after confirm` | EN | 边界条件 |
| B22 | `怎么查询库存台账` | ZH | 常用查询 |

---

## 模块三：Master Data（8条）

### 基础操作（5条）

| # | 测试问题 | 语言 | 期望命中模块 |
|---|---------|------|------------|
| B23 | `How is site master data created?` | EN | Site master |
| B24 | `What is a BOM article?` | EN | BOM article |
| B25 | `How does vendor master integrate from SAP?` | EN | Vendor integration |
| B26 | `商品主数据如何管理?` | ZH | Article master |
| B27 | `What are inventory locations by site?` | EN | Store locations |

### 边缘场景（3条）

| # | 测试问题 | 语言 | 测试目的 |
|---|---------|------|---------|
| B28 | `article price update batch process` | EN | 批量操作 |
| B29 | `vendor code changed in SAP` | EN | 同步问题 |
| B30 | `BOM component missing how to add` | EN | 异常处理 |

---

## 模块四：Promotion（10条）

### 基础操作（6条）

| # | 测试问题 | 语言 | 期望命中模块 |
|---|---------|------|------------|
| B31 | `What types of promotions are supported?` | EN | Promotion types |
| B32 | `How does promotion approval process work?` | EN | Approval workflow |
| B33 | `How does pricing work with vouchers?` | EN | Pricing with voucher |
| B34 | `What is the E-voucher process?` | EN | E-voucher |
| B35 | `促销活动如何在POS执行?` | ZH | POS execution |
| B36 | `What is the stacking rule for promotions?` | EN | Stacking rule |

### 边缘场景（4条）

| # | 测试问题 | 语言 | 测试目的 |
|---|---------|------|---------|
| B37 | `promotion not applied at checkout` | EN | 异常排查 |
| B38 | `multiple promotions at same time` | EN | 优先级 |
| B39 | `怎么创建满减活动` | ZH | 常用操作 |
| B40 | `voucher expired can still use` | EN | 边界条件 |

---

## 模块五：Data Dashboard（6条）

### 基础操作（4条）

| # | 测试问题 | 语言 | 期望命中模块 |
|---|---------|------|------------|
| B41 | `What reports are available in Data Dashboard?` | EN | Standard reports |
| B42 | `How does drill down work in reports?` | EN | Drill down |
| B43 | `What is HQ Real-time Sales big screen?` | EN | Big screen |
| B44 | `销售报表怎么导出` | ZH | 常用操作 |

### 边缘场景（2条）

| # | 测试问题 | 语言 | 测试目的 |
|---|---------|------|---------|
| B45 | `report data not updated` | EN | 异常排查 |
| B46 | `can I customize report layout` | EN | 定制功能 |

---

## 模块六：System Integration（6条）

### 基础操作（4条）

| # | 测试问题 | 语言 | 期望命中模块 |
|---|---------|------|------------|
| B47 | `How does SAP integration with DMALL work?` | EN | SAP integration |
| B48 | `What is the EOD data posting process?` | EN | EOD posting |
| B49 | `How does EIS integration work?` | EN | EIS integration |
| B50 | `接口日志怎么查看` | ZH | 运维操作 |

### 边缘场景（2条）

| # | 测试问题 | 语言 | 测试目的 |
|---|---------|------|---------|
| B51 | `SAP connection timeout` | EN | 异常处理 |
| B52 | `data sync failed between SAP and DMALL` | EN | 同步问题 |

---

## 模块七：中英混合场景（6条）

| # | 测试问题 | 期望模块 |
|---|---------|---------|
| B53 | `POS机怎么进行日结` | POS + EOD |
| B54 | `E-voucher在收银台怎么用` | Promotion + POS |
| B55 | `SAP接口数据传输失败怎么办` | Integration |
| B56 | `库存盘点PDA扫描不到` | Inventory +异常 |
| B57 | `促销价格POS不显示` | Promotion + POS |
| B58 | `会员积分怎么兑换` | SMAC + Promotion |

---

## 模块八：边缘异常场景（6条）

| # | 测试问题 | 测试目的 |
|---|---------|---------|
| B59 | `system hang what to do` | 异常处理 |
| B60 | `forgot the steps can you remind me` | 泛化查询 |
| B61 | `昨天还好好的今天就不行了` | 时间相关 |
| B62 | `这是哪个模块的功能` | 导航查询 |
| B63 | `帮我完整操作一遍` | 泛化请求 |
| B64 | `和另一个系统有什么区别` | 对比查询 |

---

## 评判标准

| 等级 | 说明 | 条件 |
|------|------|------|
| PASS | 完全准确 | Top3中有直接相关结果 |
| PARTIAL | 部分准确 | Top5中有相关结果，但Top3不精准 |
| FAIL | 失败 | Top10中无相关结果 |

---

## 测试结果记录表

| # | 问题 | Top1相似度 | Top3命中 | 等级 | 备注 |
|---|-----|-----------|---------|------|------|
| B01 | cashier login | | | | |
| B02 | payment methods | | | | |
| B03 | suspend recall | | | | |
| B04 | EOD process | | | | |
| B05 | void cancel | | | | |
| B06 | 预订单 | | | | |
| B07 | offline mode | | | | |
| B08 | add article | | | | |
| B09 | cashier password | | | | |
| B10 | POS frozen | | | | |
| B11 | print receipt | | | | |
| B12 | void after EOD | | | | |
| B13 | goods receiving | | | | |
| B14 | stock adjustment | | | | |
| B15 | stock transfer | | | | |
| B16 | inventory counting | | | | |
| B17 | TPS | | | | |
| B18 | 库存调拨 | | | | |
| B19 | PDA scanning | | | | |
| B20 | quantity wrong | | | | |
| B21 | cancel receipt | | | | |
| B22 | 库存台账 | | | | |
| B23 | site master | | | | |
| B24 | BOM article | | | | |
| B25 | vendor SAP | | | | |
| B26 | 商品主数据 | | | | |
| B27 | inventory locations | | | | |
| B28 | article price batch | | | | |
| B29 | vendor code changed | | | | |
| B30 | BOM component | | | | |
| B31 | promotion types | | | | |
| B32 | promotion approval | | | | |
| B33 | pricing voucher | | | | |
| B34 | E-voucher | | | | |
| B35 | POS促销 | | | | |
| B36 | stacking rule | | | | |
| B37 | promotion not applied | | | | |
| B38 | multiple promotions | | | | |
| B39 | 满减活动 | | | | |
| B40 | voucher expired | | | | |
| B41 | reports dashboard | | | | |
| B42 | drill down | | | | |
| B43 | big screen | | | | |
| B44 | 销售报表导出 | | | | |
| B45 | report not updated | | | | |
| B46 | customize report | | | | |
| B47 | SAP integration | | | | |
| B48 | EOD posting | | | | |
| B49 | EIS integration | | | | |
| B50 | 接口日志 | | | | |
| B51 | SAP timeout | | | | |
| B52 | data sync failed | | | | |
| B53 | POS日结 | | | | |
| B54 | E-voucher收银台 | | | | |
| B55 | SAP接口失败 | | | | |
| B56 | PDA扫描不到 | | | | |
| B57 | 促销价格不显示 | | | | |
| B58 | 积分兑换 | | | | |
| B59 | system hang | | | | |
| B60 | forgot steps | | | | |
| B61 | 昨天还好好的 | | | | |
| B62 | 哪个模块 | | | | |
| B63 | 完整操作一遍 | | | | |
| B64 | 和另一个系统区别 | | | | |

---

## 统计汇总

| 指标 | POS | Inventory | Master Data | Promotion | Dashboard | Integration | Mixed | Edge | 合计 |
|------|-----|-----------|-------------|-----------|-----------|------------|-------|------|------|
| 用例数 | 12 | 10 | 8 | 10 | 6 | 6 | 6 | 6 | 64 |
| PASS | | | | | | | | | |
| PARTIAL | | | | | | | | | |
| FAIL | | | | | | | | | |
| 通过率 | | | | | | | | | |

---

## 调优建议记录

| 用例 | 模块 | 问题 | 原因分析 | 调优建议 |
|-----|------|------|---------|---------|
| | | | | |
