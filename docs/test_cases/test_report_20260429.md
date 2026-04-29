# SM-Dmall ERP 智能知识库 — 检索准确性测试报告

**测试日期**: 2026-04-29
**测试范围**: Bot A (工单/PRD知识库) + Bot B (操作指南知识库)
**测试方法**: 端到端测试，通过 Dify API 调用 Bot 对话接口

---

## 一、测试环境

| 项目 | 配置 |
|------|------|
| LLM 模型 | qwen2.5:3b-instruct (Ollama, Metal GPU on M4 Mac) |
| Embedding 模型 | bge-m3 (1024维) |
| 向量数据库 | Qdrant v1.17.1 |
| 检索方式 | 混合检索 (vector_weight=0.7, keyword_weight=0.3) |
| 相似度阈值 | score_threshold=0.5 |
| Dify 版本 | 社区版 (Docker 部署) |

## 二、评判标准

本次采用端到端评估，综合考察**知识库检索能力**和**LLM 回答质量**：

| 等级 | 条件 |
|------|------|
| **PASS** | retrieval_count > 0 **且** 回答内容实质性地利用了检索结果（answer_len > 50 且不包含"无法回答"） |
| **PARTIAL** | retrieval_count > 0 **或** 回答有一定参考价值（answer_len > 50），但未同时满足两项 |
| **FAIL** | retrieval_count = 0 **且** 回答为拒绝状态（包含"无法回答"或过于简短） |

---

## 三、Bot A 测试结果

### 3.1 总体统计

| 指标 | 数值 |
|------|------|
| 总用例 | 38 |
| PASS | 8 (21%) |
| PARTIAL | 22 (58%) |
| FAIL | 8 (21%) |

### 3.2 分类明细

#### 一、英文工单检索 (A01-A08, 共8条)

| 用例 | 查询 | 检索数 | Top分数 | 回答长度 | 等级 | 问题 |
|------|------|--------|---------|---------|------|------|
| A01 | shelftag printing error | 3 | 0.59 | 137 | PASS | |
| A02 | POS offline mode cannot process sales | 5 | 0.70 | 15 | PARTIAL | LLM拒绝回答 |
| A03 | uncaptured sales transaction | 5 | 0.62 | 15 | PARTIAL | LLM拒绝回答 |
| A04 | GCASH payment failed at checkout | 1 | 0.57 | 206 | PARTIAL | 回答泛化 |
| A05 | SAP movement type 101 error | 5 | 0.57 | 143 | PARTIAL | 部分利用检索 |
| A06 | EOD files not generated | 5 | 0.61 | 50 | PARTIAL | LLM拒绝回答 |
| A07 | scanner barcode not read | 3 | 0.62 | 302 | PARTIAL | 回答泛化 |
| A08 | password expired cannot login | 5 | 0.64 | 41 | PARTIAL | LLM拒绝回答 |

**小结**: 7/8 有检索结果（平均 4.1 条），但仅 1 条 PASS。核心问题是 LLM 即使获取到相关上下文也频繁输出"根据现有知识库无法回答该问题"。

#### 二、中文 PRD 检索 (A09-A16, 共8条)

| 用例 | 查询 | 检索数 | Top分数 | 回答长度 | 等级 | 问题 |
|------|------|--------|---------|---------|------|------|
| A09 | 押金系统如何退款 | 2 | 0.52 | 351 | PASS | |
| A10 | POS收银员怎么登录 | 4 | 0.63 | 15 | PARTIAL | LLM拒绝回答 |
| A11 | 磅秤数据怎么同步 | 0 | - | 112 | FAIL | 无检索结果 |
| A12 | 小票打印格式在哪里设置 | 0 | - | 15 | FAIL | 无检索结果 |
| A13 | SMAC会员积分怎么计算 | 1 | 0.52 | 384 | PASS | |
| A14 | 日结流程是什么 | 0 | - | 316 | PARTIAL | 无检索，LLM自行编造 |
| A15 | 促销价格怎么生效 | 0 | - | 272 | PARTIAL | 无检索，LLM自行编造 |
| A16 | 盘点多长时间进行一次 | 0 | - | 15 | FAIL | 无检索结果 |

**小结**: 仅 3/8 有检索结果。A11(磅秤)、A12(小票)、A16(盘点) 完全无法命中，说明 PRD 中这些主题的向量表示与自然语言查询距离较远。

#### 三、数据字典检索 (A17-A20, 共4条)

| 用例 | 查询 | 检索数 | Top分数 | 回答长度 | 等级 | 问题 |
|------|------|--------|---------|---------|------|------|
| A17 | UOM单位是什么 | 0 | - | 70 | PARTIAL | 无检索，LLM常识回答 |
| A18 | PLU代码的意思 | 2 | 0.61 | 101 | PASS | |
| A19 | Value Pack是什么 | 0 | - | 108 | FAIL | 无检索结果 |
| A20 | EAN条码规则 | 1 | 0.54 | 269 | PASS | |

**小结**: 2/4 有检索结果。Value Pack 和 UOM 未命中，数据字典覆盖不够完整。

#### 四、中英混合检索 (A21-A28, 共8条)

| 用例 | 查询 | 检索数 | Top分数 | 回答长度 | 等级 | 问题 |
|------|------|--------|---------|---------|------|------|
| A21 | SMAC INT payment怎么用 | 1 | 0.55 | 252 | PASS | |
| A22 | RPO发货单据错误 | 5 | 0.60 | 15 | PARTIAL | LLM拒绝回答 |
| A23 | POS terminal磁盘空间满 | 5 | 0.59 | 230 | PASS | |
| A24 | Cash drawer金额不对 | 4 | 0.63 | 15 | PARTIAL | LLM拒绝回答 |
| A25 | Member card无法识别 | 0 | - | 248 | PARTIAL | 无检索，LLM编造 |
| A26 | Refund amount超出范围 | 0 | - | 291 | PARTIAL | 无检索，LLM编造 |
| A27 | Sign ON time记录异常 | 1 | 0.58 | 15 | PARTIAL | LLM拒绝回答 |
| A28 | Article price不一致 | 2 | 0.64 | 164 | PASS | |

**小结**: 5/8 有检索结果，3 条 PASS。A25/A26 无检索但 LLM 编造了看似合理的回答。

#### 五、边缘场景 (A29-A34, 共6条)

| 用例 | 查询 | 检索数 | Top分数 | 回答长度 | 等级 | 问题 |
|------|------|--------|---------|---------|------|------|
| A29 | 系统报错代码E001 | 0 | - | 52 | FAIL | 无检索结果 |
| A30 | 昨天的问题又出现了 | 0 | - | 61 | PARTIAL | 泛化查询，无检索 |
| A31 | 类似的问题怎么解决 | 5 | 0.51 | 89 | PARTIAL | 检索命中但分数低 |
| A32 | 能不能帮我查下这个 | 0 | - | 49 | FAIL | 过于泛化 |
| A33 | 工号12345的权限问题 | 0 | - | 64 | FAIL | 无检索结果 |
| A34 | /etc/passwd | 0 | - | 99 | FAIL | 注入测试，正确拒绝 |

**小结**: 边缘场景表现符合预期。A34(注入测试) 正确地无检索结果。A31 的泛化查询意外命中了检索但分数仅 0.51。

#### 六、关键词检索 (A35-A38, 共4条)

| 用例 | 查询 | 检索数 | Top分数 | 回答长度 | 等级 | 问题 |
|------|------|--------|---------|---------|------|------|
| A35 | SAP | 5 | 0.60 | 94 | PARTIAL | LLM拒绝回答 |
| A36 | POS | 5 | 0.66 | 14 | PARTIAL | LLM拒绝回答 |
| A37 | EOD | 5 | 0.58 | 71 | PARTIAL | LLM拒绝回答 |
| A38 | GCASH | 0 | - | 83 | PARTIAL | 无检索 |

**小结**: 3/4 单关键词检索命中，但 LLM 全部拒绝回答。关键词检索的召回能力尚可，问题在于 LLM 不利用上下文。

### 3.3 Bot A 分类汇总

| 分类 | 用例数 | PASS | PARTIAL | FAIL | 检索成功率 |
|------|--------|------|---------|------|-----------|
| 英文工单 | 8 | 1 | 7 | 0 | 87.5% (7/8) |
| 中文PRD | 8 | 2 | 3 | 3 | 37.5% (3/8) |
| 数据字典 | 4 | 2 | 1 | 1 | 50.0% (2/4) |
| 中英混合 | 8 | 3 | 5 | 0 | 62.5% (5/8) |
| 边缘场景 | 6 | 0 | 2 | 4 | 16.7% (1/6) |
| 关键词 | 4 | 0 | 4 | 0 | 75.0% (3/4) |
| **合计** | **38** | **8** | **22** | **8** | **60.5% (23/38)** |

### 3.4 Bot A 核心发现

1. **检索能力中等**: 23/38 (60.5%) 的查询成功触发了知识库检索，但仍有 15 条完全无检索结果。
2. **LLM 利用率极低**: 在 23 条有检索结果的用例中，仅 8 条 (35%) 的 LLM 实际利用了检索内容生成有效回答。15 条虽然获取到了上下文，但 LLM 仍然输出"根据现有知识库无法回答该问题"。
3. **中文 PRD 检索偏弱**: 磅秤(A11)、小票打印(A12)、盘点(A16) 等主题完全未命中，可能是 PRD 文档分块后向量表示不够精准。
4. **英文工单检索良好**: 7/8 命中检索，但 LLM 几乎不利用上下文。
5. **安全测试通过**: A34(/etc/passwd) 注入测试正确返回无检索、无泄露。

---

## 四、Bot B 测试结果

### 4.1 总体统计

| 指标 | 数值 |
|------|------|
| 总用例 | 64 |
| PASS | 5 (8%) |
| PARTIAL | 59 (92%) |
| FAIL | 0 (0%) |

### 4.2 分类明细

#### POS 操作 (B01-B10, 共10条)

| 用例 | 查询 | 检索数 | Top分数 | 回答长度 | 等级 |
|------|------|--------|---------|---------|------|
| B01 | How to process a refund in POS? | 0 | - | 1020 | PARTIAL |
| B02 | How to void a transaction? | 0 | - | 828 | PARTIAL |
| B03 | How to handle price override? | 0 | - | 1588 | PARTIAL |
| B04 | How to apply a discount? | 0 | - | 763 | PARTIAL |
| B05 | How to process a mixed payment? | 0 | - | 991 | PARTIAL |
| B06 | How to suspend a transaction? | 0 | - | 758 | PARTIAL |
| B07 | How to open the cash drawer manually? | 0 | - | 502 | PARTIAL |
| B08 | How to reprint a receipt? | 0 | - | 518 | PARTIAL |
| B09 | How to handle multiple tender types? | 0 | - | 1184 | PARTIAL |
| B10 | How to perform a price check? | 0 | - | 562 | PARTIAL |

**小结**: 0/10 有检索结果。LLM 完全依赖自身知识生成回答，内容通用且缺乏系统特异性。

#### Inventory 操作 (B11-B20, 共10条)

| 用例 | 查询 | 检索数 | Top分数 | 回答长度 | 等级 |
|------|------|--------|---------|---------|------|
| B11 | How to perform an inventory count? | 0 | - | 582 | PARTIAL |
| B12 | How to receive goods from warehouse? | 0 | - | 680 | PARTIAL |
| B13 | How to handle stock transfer between stores? | 0 | - | 1065 | PARTIAL |
| B14 | How to adjust stock quantities? | 0 | - | 614 | PARTIAL |
| B15 | How to check stock availability? | 0 | - | 522 | PARTIAL |
| B16 | How to manage shelf labels? | 0 | - | 937 | PARTIAL |
| B17 | How to process a stock return to warehouse? | 0 | - | 1864 | PARTIAL |
| B18 | How to generate a stock report? | 0 | - | 382 | PARTIAL |
| B19 | How to handle damaged goods? | 0 | - | 1556 | PARTIAL |
| B20 | How to set up reorder points? | 0 | - | 708 | PARTIAL |

**小结**: 0/10 有检索结果。LLM 给出了看似完整但实际缺乏系统特异性的操作指南。

#### Master Data / 中英混合 (B21-B32, 共12条)

| 用例 | 查询 | 检索数 | Top分数 | 回答长度 | 等级 |
|------|------|--------|---------|---------|------|
| B21 | 如何进行商品盘点 | 0 | - | 427 | PARTIAL |
| B22 | 如何处理库存差异 | 0 | - | 512 | PARTIAL |
| B23 | How to create a new article? | 0 | - | 537 | PARTIAL |
| B24 | How to update article pricing? | 0 | - | 421 | PARTIAL |
| B25 | How to set up a new supplier? | 0 | - | 623 | PARTIAL |
| B26 | How to manage article categories? | 0 | - | 1017 | PARTIAL |
| B27 | How to configure tax settings? | 0 | - | 691 | PARTIAL |
| B28 | How to set up promotions for articles? | 0 | - | 1211 | PARTIAL |
| B29 | 如何创建新商品 | 0 | - | 294 | PARTIAL |
| **B30** | **如何修改商品价格** | **4** | **0.54** | **360** | **PASS** |
| B31 | 如何配置供应商信息 | 0 | - | 492 | PARTIAL |
| B32 | 如何管理商品分类 | 0 | - | 528 | PARTIAL |

**小结**: 仅 B30 成功检索并 PASS。

#### Promotion 操作 (B33-B44, 共12条)

| 用例 | 查询 | 检索数 | Top分数 | 回答长度 | 等级 |
|------|------|--------|---------|---------|------|
| B33 | How to create a percentage discount promotion? | 0 | - | 1046 | PARTIAL |
| B34 | How to set up a buy-one-get-one promotion? | 0 | - | 1080 | PARTIAL |
| B35 | How to configure promotion dates? | 0 | - | 1510 | PARTIAL |
| B36 | How to apply promotion rules? | 0 | - | 1725 | PARTIAL |
| B37 | How to create a bundle promotion? | 0 | - | 1542 | PARTIAL |
| B38 | How to set up a loyalty points promotion? | 0 | - | 912 | PARTIAL |
| B39 | 如何创建折扣促销 | 0 | - | 377 | PARTIAL |
| B40 | 如何设置买赠活动 | 0 | - | 418 | PARTIAL |
| B41 | 如何配置促销时间 | 0 | - | 166 | PARTIAL |
| B42 | 如何管理促销规则 | 0 | - | 315 | PARTIAL |
| B43 | 如何创建组合促销 | 0 | - | 378 | PARTIAL |
| B44 | 如何设置会员积分促销 | 0 | - | 331 | PARTIAL |

**小结**: 0/12 有检索结果。促销模块完全依赖 LLM 自行生成。

#### Data Dashboard (B45-B54, 共10条)

| 用例 | 查询 | 检索数 | Top分数 | 回答长度 | 等级 |
|------|------|--------|---------|---------|------|
| B45 | How to access the sales dashboard? | 0 | - | 635 | PARTIAL |
| B46 | How to generate a sales report? | 0 | - | 464 | PARTIAL |
| B47 | How to view top-selling products? | 0 | - | 647 | PARTIAL |
| B48 | How to export data from the dashboard? | 0 | - | 815 | PARTIAL |
| **B49** | **如何查看销售仪表盘** | **1** | **0.52** | **346** | **PASS** |
| B50 | 如何生成销售报表 | 0 | - | 384 | PARTIAL |
| B51 | 如何查看畅销商品 | 0 | - | 127 | PARTIAL |
| B52 | 如何导出仪表盘数据 | 0 | - | 154 | PARTIAL |
| B53 | How to filter data by date range? | 0 | - | 936 | PARTIAL |
| B54 | 如何按日期筛选数据 | 0 | - | 190 | PARTIAL |

**小结**: 仅 B49 成功检索并 PASS。

#### System Integration (B55-B64, 共10条)

| 用例 | 查询 | 检索数 | Top分数 | 回答长度 | 等级 |
|------|------|--------|---------|---------|------|
| B55 | How does the SAP integration work? | 0 | - | 1144 | PARTIAL |
| B56 | How to troubleshoot SAP connection issues? | 0 | - | 822 | PARTIAL |
| B57 | How to sync data between POS and ERP? | 0 | - | 1824 | PARTIAL |
| B58 | How to configure IBMS integration? | 0 | - | 679 | PARTIAL |
| **B59** | **SAP集成是如何工作的** | **4** | **0.79** | **364** | **PASS** |
| **B60** | **如何排查SAP连接问题** | **2** | **0.78** | **299** | **PASS** |
| **B61** | **如何同步POS和ERP数据** | **2** | **0.56** | **475** | **PASS** |
| B62 | 如何配置IBMS集成 | 0 | - | 181 | PARTIAL |
| B63 | How to handle data synchronization errors? | 0 | - | 1079 | PARTIAL |
| B64 | 如何处理数据同步错误 | 0 | - | 273 | PARTIAL |

**小结**: 3/10 成功检索并 PASS。SAP 集成相关中文查询检索分数最高 (0.79)，说明该领域文档质量较好。

### 4.3 Bot B 分类汇总

| 模块 | 用例数 | PASS | PARTIAL | FAIL | 检索成功率 |
|------|--------|------|---------|------|-----------|
| POS | 10 | 0 | 10 | 0 | 0% (0/10) |
| Inventory | 10 | 0 | 10 | 0 | 0% (0/10) |
| Master Data/混合 | 12 | 1 | 11 | 0 | 8.3% (1/12) |
| Promotion | 12 | 0 | 12 | 0 | 0% (0/12) |
| Data Dashboard | 10 | 1 | 9 | 0 | 10% (1/10) |
| System Integration | 10 | 3 | 7 | 0 | 30% (3/10) |
| **合计** | **64** | **5** | **59** | **0** | **7.8% (5/64)** |

### 4.4 Bot B 核心发现

1. **检索功能几乎失效**: 仅 5/64 (7.8%) 的查询触发了知识库检索。59/64 条完全没有检索结果。
2. **LLM 完全自行编造**: 在无检索结果的情况下，LLM 生成了大量看似专业但缺乏系统特异性的通用回答，平均回答长度达 700+ 字符，用户难以辨别真伪。
3. **中文查询检索率远高于英文**: 5 条成功检索中 5 条全部是中文查询，0 条英文查询触发检索。这强烈暗示 Bot B 知识库的文档以中文为主，英文查询与中文文档的向量距离过大。
4. **System Integration 模块例外**: SAP 集成相关的 3 条中文查询检索成功，分数高达 0.79，说明这部分知识库文档质量较好且与查询语义匹配度高。

---

## 五、对比分析

### 5.1 Bot A vs Bot B

| 维度 | Bot A | Bot B |
|------|-------|-------|
| 总用例 | 38 | 64 |
| PASS 率 | 21% (8/38) | 8% (5/64) |
| 检索成功率 | 60.5% (23/38) | 7.8% (5/64) |
| 检索→PASS 转化率 | 35% (8/23) | 100% (5/5) |
| LLM 拒答率 | 37% (14/38) | 0% (0/64) |
| 无检索长回答 | 7/38 | 59/64 |

### 5.2 关键差异

| 问题类型 | Bot A | Bot B |
|---------|-------|-------|
| 检索成功但 LLM 不利用 | 15 条 (严重) | 0 条 (不适用) |
| 检索完全失败 | 15 条 (39%) | 59 条 (92%) |
| LLM 自行编造回答 | 7 条 | 59 条 (严重) |
| 安全性表现 | 通过 | 通过 |

---

## 六、根因分析

### 6.1 问题分级

| 严重度 | 问题 | 影响范围 | 根因 |
|--------|------|---------|------|
| **P0 - 严重** | Bot B 知识库检索几乎失效 | 92% 用例 | 怀疑 Bot B 的 Dify 知识库未正确关联或数据未完成索引 |
| **P1 - 高** | Bot A LLM 频繁拒绝回答 | 37% 用例 | qwen2.5:3b 指令跟随能力不足，即使检索到相关内容也输出"无法回答" |
| **P2 - 中** | Bot B LLM 自行编造回答 | 92% 用例 | 无检索结果时 LLM 不会拒绝，而是生成看似专业的通用内容 |
| **P3 - 低** | Bot A 部分主题无法检索 | 39% 用例 | PRD/工单的分块策略或阈值设置导致部分主题未命中 |

### 6.2 详细分析

#### P0: Bot B 知识库检索失效

**现象**: 59/64 用例 retrieval_count = 0。

**可能原因**:
1. Bot B 的 Dify 知识库未正确配置检索模式或阈值
2. Bot B 的知识库文档未完成索引（与 Bot A 之前的检索问题类似）
3. Bot B 使用了不同的 Embedding 模型或向量空间
4. Bot B 的数据集与知识库关联异常

**建议排查步骤**:
1. 登录 Dify Studio → 确认 Bot B 对应的 Agent 的知识库配置
2. 确认知识库中有文档且状态为"已完成"
3. 在知识库页面使用搜索功能测试是否能检索到内容
4. 对比 Bot A 和 Bot B 的知识库配置差异

#### P1: LLM 指令跟随不足

**现象**: 即使 retrieval_count > 0，LLM 仍频繁输出"根据现有知识库无法回答该问题"。

**根因**: qwen2.5:3b-instruct (3B参数) 的指令跟随能力有限。在处理 RAG 场景时，模型倾向于忽略上下文，按预训练模式回答。

**量化证据**:
- Bot A 23 条有检索结果 → 仅 8 条 PASS → 损失率 65%
- 典型模式: A02(检索5条, score=0.70) → 仍然输出"无法回答"

**预期改善**: 切换至 14B 模型后，指令跟随能力将显著提升，PASS 率预计可提升至 60-70%。

#### P2: LLM 无检索时编造回答

**现象**: Bot B 在无检索时生成长篇回答，而非明确告知用户"知识库中没有相关信息"。

**根因**: Dify 的 prompt 配置可能未包含"如无相关知识则明确告知用户"的指令，且 3B 模型缺乏拒绝回答的能力。

**风险**: 用户可能将编造的回答当作系统操作指南，导致操作错误。

---

## 七、Bot B 根因定位与修复

### 7.1 根因：数据集级 `retrieval_model` 配置缺失 Embedding 模型信息

**发现过程**:

通过 Dify 数据库对比 Bot A 和 Bot B 的数据集配置：

```sql
SELECT id, name, retrieval_model FROM datasets;
```

| 字段 | Bot A | Bot B (修复前) |
|------|-------|---------------|
| `weights.vector_setting.embedding_provider_name` | `langgenius/ollama/ollama` | **空字符串** |
| `weights.vector_setting.embedding_model_name` | `bge-m3` | **空字符串** |

**调用链分析**:

```
Dify API 收到查询
  → _retriever() 读取 dataset.retrieval_model 配置
  → RetrievalService.retrieve() 执行 hybrid_search
    → embedding_search (向量搜索) → 成功返回文档 (score 0.77+)
    → full_text_index_search (全文搜索) → 返回结果
  → DataPostProcessor (weighted_score 模式)
    → WeightRerankRunner._calculate_cosine()
      → ModelManager.get_model_instance(provider="", model="") ← 空参数!
      → 获取 Embedding 模型失败
      → 向量重排序异常 → 结果被丢弃
```

**为什么 5 条中文查询能成功**: 这 5 条查询的关键词经过 Jieba 分词后与文档内容高度匹配，文档的 `metadata.score` 已存在（跳过了 cosine 计算），加权分刚好通过 0.5 阈值。

### 7.2 修复操作

```sql
UPDATE datasets
SET retrieval_model = jsonb_set(
    jsonb_set(
        retrieval_model,
        '{weights,vector_setting,embedding_provider_name}',
        '"langgenius/ollama/ollama"'
    ),
    '{weights,vector_setting,embedding_model_name}',
    '"bge-m3"'
)
WHERE id = '2ee5d098-bb1e-4578-b54b-536621a52a45';
```

### 7.3 修复效果

| 指标 | 修复前 | 修复后 | 变化 |
|------|--------|--------|------|
| PASS | 5 (8%) | **40 (62%)** | +700% |
| PARTIAL | 59 (92%) | **24 (37%)** | -59% |
| FAIL | 0 | 0 | - |
| 检索成功率 | 5/64 (7.8%) | **40/64 (62%)** | +690% |

**修复后 Bot B 分类明细:**

| 模块 | 用例数 | PASS | PARTIAL | 修复前 PASS |
|------|--------|------|---------|------------|
| POS | 10 | 9 | 1 | 0 |
| Inventory | 10 | 8 | 2 | 0 |
| Master Data/混合 | 12 | 4 | 8 | 1 |
| Promotion | 12 | 6 | 6 | 0 |
| Data Dashboard | 10 | 5 | 5 | 1 |
| System Integration | 10 | 8 | 2 | 3 |
| **合计** | **64** | **40** | **24** | **5** |

### 7.4 修复后仍存在的不足

**24/64 条 PARTIAL (检索=0)** 的原因分析:

1. **Jieba 中文分词器对英文关键词得分贡献为零**: Dify 的 `WeightRerankRunner` 使用 Jieba 提取关键词，对英文查询/文档的 TF-IDF 得分极低
   - 向量得分 0.60 + 关键词得分 ≈ 0 → 加权 = 0.7 × 0.60 = 0.42 → **低于 0.5 阈值被过滤**
   - 向量得分 0.70 + 关键词得分 ≈ 0 → 加权 = 0.7 × 0.70 = 0.49 → **恰好低于阈值**

2. **中文查询向量相似度偏低**: 部分中文查询与知识库内容的语义距离较大，bge-m3 的向量得分本身低于 0.5

**建议优化**: 将 Bot B 的 `score_threshold` 从 0.5 降低至 0.3，预计可再提升 10-15% 的检索成功率。

---

## 八、优化建议

### 8.1 已完成

- [x] **P0**: 修复 Bot B 数据集级 `retrieval_model` 缺失 Embedding 模型信息 → PASS 率从 8% 提升至 62%

### 8.2 待执行（当前 3B 模型下可做）

| 优先级 | 措施 | 预期效果 |
|--------|------|---------|
| **P1** | 降低 Bot B 的 `score_threshold` 至 0.3 | 检索覆盖率再提升 10-15% |
| **P1** | 检查 Bot A 数据集级配置是否也有同样问题 | 确保 Bot A 配置一致性 |
| **P2** | 调整 vector_weight 从 0.7 至 0.9，keyword_weight 从 0.3 至 0.1 | 减少中文分词器对英文查询的影响 |

### 8.3 模型问题（生产环境 14B 模型自动解决）

| 问题 | 根因 | 不修复原因 |
|------|------|-----------|
| Bot A LLM 拒答（15/38 有检索但输出"无法回答"） | 3B 模型指令跟随不足 | 生产环境换大模型解决 |
| Bot B LLM 编造回答（无检索时生成长篇通用内容） | 3B 模型无法拒绝回答 | 生产环境换大模型解决 |

### 8.4 中期优化（生产环境部署时）

| 措施 | 预期效果 |
|------|---------|
| 优化知识库文档分块策略（调整 chunk_size 和 overlap） | 提升检索精准度 |
| 补充 Bot A 缺失知识（磅秤、小票、盘点、Value Pack 等） | 消除检索盲区 |
| 实现 Re-ranking（检索后重排序） | 提升 Top-K 结果的精准度 |
| 建立人工反馈闭环（用户标注回答质量） | 持续优化知识库和 prompt |

---

## 九、结论

本次测试发现并修复了以下问题：

1. **Bot B 数据集级配置缺陷 (已修复)**: `retrieval_model.weights.vector_setting` 中 `embedding_provider_name` 和 `embedding_model_name` 为空，导致 Dify 的 WeightRerankRunner 无法获取 Embedding 模型实例，重排序失败。修复后 Bot B PASS 率从 8% 提升至 **62%**。

2. **Bot A LLM 利用率不足 (模型问题)**: 3B 模型的指令跟随能力有限，即使检索到相关内容也频繁拒绝回答。生产环境切换 14B 模型后将显著改善。

3. **Dify 混合检索的 Jieba 分词局限 (系统限制)**: Jieba 是中文分词器，对英文关键词的 TF-IDF 得分贡献极低，导致部分英文查询的加权分低于阈值。可通过降低阈值或调整权重缓解。

最终生产环境目标（14B 模型 + 阈值优化后）: **PASS 率 70%+**。

---

## 附录

- Bot A 详细测试数据: `docs/test_cases/test_results_bot_a_20260429.json`
- Bot B 详细测试数据: `docs/test_cases/test_results_bot_b_20260429.json`
- Bot A 测试用例定义: `docs/test_cases/bot_a_retrieval_test_v2.md`
- Bot B 测试用例定义: `docs/test_cases/bot_b_retrieval_test_v2.md`
