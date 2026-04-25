# Bot B 问答测试用例

## 使用说明
在 Dify Bot B 对话界面逐一输入 Question，对比 Answer 是否包含 Expected Key Points 中的关键信息。
评分标准：完全命中=Pass，部分命中=Partial，未命中=Fail。

---

## POS Module (8 questions)

### QA-POS-001
**Question:** How do I suspend an order and recall it later?
**Type:** Operation
**Expected Key Points:**
- Click suspend/recall button
- Order is saved and can be recalled on same or different terminal
- Network connection required for cross-terminal recall
- Suspended orders appear in the recall list

### QA-POS-002
**Question:** What payment methods are available at POS?
**Type:** Operation
**Expected Key Points:**
- Cash (with quick-pay denominations)
- EFT (BDO Debit/Credit)
- Online tender: GCASH, QRPH, SMAC point
- Offline tender supported
- Multiple tenders in single transaction

### QA-POS-003
**Question:** How does the End of Day (EOD) process work?
**Type:** Business Design
**Expected Key Points:**
- EOD trigger time is configurable
- System reconciles between client (POS) and cloud data
- If reconciliation fails, EOD posting fails
- Failed records can be viewed in backend
- Data is posted to SAP after reconciliation

### QA-POS-004
**Question:** POS怎么处理退货?
**Type:** Operation (Chinese)
**Expected Key Points:**
- Return with receipt or without receipt
- Return process from left menu or sales page
- Refund to original payment method
- Manager authorization may be required

### QA-POS-005
**Question:** What is the Govt Deduction (SC/PWD discount) process at POS?
**Type:** Business Design
**Expected Key Points:**
- Senior citizen or government entity discount
- Cashier confirms customer eligibility offline
- Additional info required for certain sale types
- Govt sales payment is automatically added

### QA-POS-006
**Question:** How do I void an item or cancel an entire order?
**Type:** Operation
**Expected Key Points:**
- Item void removes single item
- Cancel order removes entire transaction
- Authorization required (based on configuration)
- Void reason may be required

### QA-POS-007
**Question:** What happens when POS is in offline mode?
**Type:** Business Design
**Expected Key Points:**
- All transactions based on offline service and local DB
- Used when store network is unstable
- Points, e-vouchers, promotions not available offline
- Data syncs when back online

### QA-POS-008
**Question:** How to handle pre-order transactions at POS?
**Type:** Business Design
**Expected Key Points:**
- Pre-paid orders created via HQ system
- Deposit orders should not be considered as sales
- Finance creates "Deposit Order" type
- Customer pays deposit first, balance upon pickup

---

## Inventory Module (8 questions)

### QA-INV-001
**Question:** How do I receive goods from a vendor with a single PO using PDA?
**Type:** Operation
**Expected Key Points:**
- Select Goods Receiving function
- Input or scan PO number
- Scan article barcodes
- Input received quantity (Scan1 Qty)
- Confirm and submit

### QA-INV-002
**Question:** What is the stock transfer process between stores?
**Type:** Business Design
**Expected Key Points:**
- Source store creates dispatch order (STO/IBT)
- Receiving store confirms receipt
- Status flow: Created → Dispatched → Received
- Supports both desktop and PDA

### QA-INV-003
**Question:** How does the stocktake (inventory counting) work?
**Type:** Operation
**Expected Key Points:**
- Create counting plan (Regular or Periodic)
- Assign counting tasks to staff
- Staff counts via PDA or desktop
- System compares count vs system quantity
- Post adjustment after approval

### QA-INV-004
**Question:** What is TPS (Third Party Sales)?
**Type:** Business Design
**Expected Key Points:**
- TPS handles third-party article sales within store
- Separate inventory tracking
- BOM relationship maintenance required
- Sales and inventory recorded separately

### QA-INV-005
**Question:** 库存调拨怎么操作? (How to do stock transfer?)
**Type:** Operation (Chinese)
**Expected Key Points:**
- Goods Dispatch function
- Select dispatch type (to store, to DC, returns)
- Input receiving site and STO number
- Scan or select articles
- Confirm and deliver

### QA-INV-006
**Question:** What is the dismantle function?
**Type:** Business Design
**Expected Key Points:**
- Used for BOM article breakdown
- Raw material → processed article conversion
- Two GI documents in AS-IS (SAP)
- Simplified in DMALL TO-BE
- Affects inventory of both parent and child articles

### QA-INV-007
**Question:** How does expiry date management work?
**Type:** Business Design
**Expected Key Points:**
- Monitoring rules set by merchant level
- Relies on receiving data for expiry dates
- Alerts for near-expiry items
- Supports manual expiry date input
- End-to-end process from receiving to monitoring

### QA-INV-008
**Question:** How to handle goods return to vendor (RTV)?
**Type:** Operation
**Expected Key Points:**
- Create RTV request
- Move stock to designated location
- Bad order handling
- Seal items for return
- SAP generates RPO based on DMALL RPO item lines

---

## Master Data Module (6 questions)

### QA-MD-001
**Question:** How is site master data created and maintained?
**Type:** Business Design
**Expected Key Points:**
- AS-IS: Managed in SAP
- TO-BE: Managed in DMALL system
- Site hierarchy maintenance process
- Includes site creation, update, and inventory location setup

### QA-MD-002
**Question:** What are the 7 inventory locations in a store?
**Type:** Business Design
**Expected Key Points:**
- Each store divided into 7 inventory locations
- Each location serves specific operation functions
- Locations include: selling area, receiving, returns, bad order, etc.

### QA-MD-003
**Question:** What is a BOM article and how does it work?
**Type:** Business Design
**Expected Key Points:**
- BOM = Bill of Materials
- Parent-child article relationship
- Used for raw material → processed article conversion
- Supports in-store bundle, processing, etc.
- Affects both inventory deduction and sales recording

### QA-MD-004
**Question:** 商品主数据怎么导入系统? (How to import article master data?)
**Type:** Operation (Chinese)
**Expected Key Points:**
- Articles integrated from SAP to DMALL
- User can upload store article list via Import
- PLU by request change flow
- Real-time interface available for price changes

### QA-MD-005
**Question:** How does vendor master data integrate from SAP?
**Type:** Business Design
**Expected Key Points:**
- Vendor data includes: vendor info, purchase info, source info
- Integration from SAP to DMALL
- Vendor return maintenance process
- Read-only for certain fields

### QA-MD-006
**Question:** How to manage article groups?
**Type:** Operation
**Expected Key Points:**
- Click Add Group to create new group
- Input group name and query
- Export group information
- Groups used for article categorization

---

## Promotion Module (7 questions)

### QA-PROMO-001
**Question:** What types of promotions does DMALL support?
**Type:** Business Design
**Expected Key Points:**
- Regular Promotion
- Additional Points Reward
- Bank Promotion Barcode
- E-voucher
- Next Purchase Coupon
- Double Receipt Freebie

### QA-PROMO-002
**Question:** How does the promotion approval process work?
**Type:** Business Design
**Expected Key Points:**
- Creator submits promotion → Approval flow
- Promotion modification process (only in Draft status)
- Promotion termination process
- Statuses: Draft → Pending Approval → Approved → Active

### QA-PROMO-003
**Question:** How does pricing work when promotion vouchers are applied?
**Type:** Business Design
**Expected Key Points:**
- Voucher, E-voucher, next purchase coupon correspond to specific promotions
- Pricing logic applies voucher discount
- Stacking rules determine if promotions can combine
- Priority levels affect which promotion applies first

### QA-PROMO-004
**Question:** 促销活动在POS端怎么执行? (How are promotions executed at POS?)
**Type:** Operation (Chinese)
**Expected Key Points:**
- Promotions triggered automatically based on article and conditions
- Cashier can see applied promotions
- Offline: promotions may not work
- Abnormal handling when promotion fails to apply

### QA-PROMO-005
**Question:** How to create a Reward Upon POS Order marketing activity?
**Type:** Operation
**Expected Key Points:**
- Navigate to Marketing > Marketing Toolset
- Click Create for Reward Upon POS Order
- Configure conditions (purchase amount, article, etc.)
- Set reward type and quantity
- Submit for approval

### QA-PROMO-006
**Question:** What is the E-voucher management process?
**Type:** Business Design
**Expected Key Points:**
- E-voucher creation and configuration
- Distribution to customers
- Redemption at POS
- Validity period management
- POS offline: e-vouchers not available

### QA-PROMO-007
**Question:** What are the promotion stacking rules?
**Type:** Business Design
**Expected Key Points:**
- Unit promotion default can be stacked with other activities
- Stacking rules configured per promotion
- Priority levels (very high to very low)
- Some promotions are mutually exclusive

---

## Data Dashboard Module (3 questions)

### QA-DD-001
**Question:** How to use the drill-down function in reports?
**Type:** Operation
**Expected Key Points:**
- Blue highlighted data is clickable
- Click to drill down for detailed analysis
- Supports multiple dimensions
- Can go back to higher level

### QA-DD-002
**Question:** What is the HQ Real-time Sales Monitoring big screen?
**Type:** Business Design
**Expected Key Points:**
- Real-time sales data visualization
- HQ level monitoring
- Key metrics and KPIs displayed
- Data refresh frequency

### QA-DD-003
**Question:** How to set up email push for reports?
**Type:** Operation
**Expected Key Points:**
- Configure email recipients
- Set schedule (frequency and time)
- Preview attachment before sending
- Save as task template or send immediately

---

## System Integration Module (3 questions)

### QA-SI-001
**Question:** How does master data integration between SAP and DMALL work?
**Type:** Business Design
**Expected Key Points:**
- SAP sends master data to DMALL OS
- Real-time and batch interfaces
- Summary check for data validation
- Error handling and retry mechanism

### QA-SI-002
**Question:** What happens during EOD data posting?
**Type:** Business Design
**Expected Key Points:**
- POS sales data posted to SAP
- Reconciliation between POS and cloud
- Failed postings can be viewed and retried
- Integration frequency (daily scheduled job)

### QA-SI-003
**Question:** What is the EIS (Electronic Invoice System) integration?
**Type:** Business Design
**Expected Key Points:**
- Data sent to BIR (Bureau of Internal Revenue)
- JSON format transmission
- Philippine government compliance
- Invoice data from POS transactions

---

## Cross-Module / Edge Cases (5 questions)

### QA-EDGE-001
**Question:** What is SMAC and how is it used at POS?
**Type:** Operation
**Expected Key Points:**
- SMAC = loyalty/membership card
- SMAC login at POS for points
- SMAC point can be used as tender
- SMAC Express Kit
- SMAC Only Promo

### QA-EDGE-002
**Question:** How does a store manager check real-time inventory?
**Type:** Operation
**Expected Key Points:**
- Data Dashboard reports
- Real-time Inventory report
- Inventory Flow report
- Filter by site/article

### QA-EDGE-003
**Question:** 一个商品可以同时参与多个促销活动吗? (Can an article participate in multiple promotions?)
**Type:** Business Design (Chinese)
**Expected Key Points:**
- Depends on stacking rules
- Unit promotion can be stacked by default
- Priority levels determine order
- Some promotions are mutually exclusive

### QA-EDGE-004
**Question:** What legacy systems are being replaced by DMALL?
**Type:** Business Design
**Expected Key Points:**
- Legacy POS replaced by DMALL POS
- FRS replaced by DMALL Store Ops
- SM POS Service integration deleted
- Other legacy systems to be retired in phases

### QA-EDGE-005
**Question:** 收货时发现商品数量和PO不一致怎么办? (What to do if received quantity doesn't match PO?)
**Type:** Operation (Chinese)
**Expected Key Points:**
- Can receive partial quantity
- Difference recorded in system
- Vendor discrepancy handling
- May need to contact vendor/purchasing team
