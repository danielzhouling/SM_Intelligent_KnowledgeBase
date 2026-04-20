/**
 * SM-Dmall ERP Knowledge Base Demo
 * Mock Data - Bot QA pairs and configuration
 */

// ============================================
// User Roles & Permissions
// ============================================

const ROLE_PERMISSIONS = {
  'hq-admin': {
    name: 'HQ IT Admin',
    bots: ['A', 'B', 'C'],
    description: 'Full access to all bots'
  },
  'store-manager': {
    name: 'Store Manager',
    bots: ['B'],
    description: 'Access to Bot B only'
  },
  'helpdesk': {
    name: 'Helpdesk',
    bots: ['A', 'B'],
    description: 'Access to Bot A and B'
  }
};

// Demo accounts with passwords
const DEMO_ACCOUNTS = {
  'hq-admin': { password: 'password123', role: 'hq-admin' },
  'store-manager': { password: 'password123', role: 'store-manager' },
  'helpdesk': { password: 'password123', role: 'helpdesk' }
};

// ============================================
// Bot Configuration
// ============================================

const BOT_CONFIG = {
  'A': {
    id: 'A',
    name: 'System Issues',
    nameCn: '系统问题',
    description: 'Handles system errors, configuration issues, and troubleshooting for ERP modules',
    icon: '🔧',
    knowledge: ['Work Orders', 'Blueprints', 'Problem Records', 'Feishu Docs'],
    defaultPrompt: 'Hello! I\'m the System Issues Bot. Ask me about SAP upload failures, POS errors, permission issues, and more.'
  },
  'B': {
    id: 'B',
    name: 'Usage Knowledge',
    nameCn: '使用知识',
    description: 'Guides on how to use ERP modules, standard operating procedures, and best practices',
    icon: '📚',
    knowledge: ['User Manuals', 'Blueprints', 'Feishu Wiki'],
    defaultPrompt: 'Hello! I\'m the Usage Knowledge Bot. Ask me about standard procedures, module usage, and operational guidelines.'
  },
  'C': {
    id: 'C',
    name: 'Version Content',
    nameCn: '版本内容',
    description: 'Provides information about system releases, updates, and version-specific changes',
    icon: '📋',
    knowledge: ['Feishu Release Notes', 'Version History'],
    defaultPrompt: 'Hello! I\'m the Version Content Bot. Ask me about system updates, new features, and version release notes.'
  }
};

// ============================================
// Mock QA Data - Bot A (System Issues)
// Based on realistic work order scenarios
// ============================================

const BOT_A_DATA = [
  {
    id: 'A001',
    question: 'SAP upload failed, how to handle?',
    answer: `SAP upload failures are usually caused by the following reasons:

1. **Network Connection Timeout**
   - Check if the network to SAP server is stable
   - Try again during off-peak hours

2. **File Format Mismatch**
   - Ensure the file follows the standard SAP template
   - Check for special characters or encoding issues
   - File must be in UTF-8 format

3. **Insufficient Permissions**
   - Contact administrator to verify your SAP user role
   - Required permission: "Upload Authorization"

**Resolution Steps:**
1. First, check the error code in the upload log
2. Verify file format with your local IT
3. If error persists, submit a ticket with error screenshot`,
    sources: [
      { id: 'SOP-SAP-001', title: 'SAP Upload Standard Procedure', snippet: 'SAP上传失败处理流程：首先检查网络连接是否稳定，确认文件格式符合UTF-8编码要求。' },
      { id: 'WO-2024-0521', title: 'Work Order #2024-0521', snippet: 'SAP文件上传失败，问题原因：文件编码格式错误，解决方法：重新导出为UTF-8格式。' }
    ],
    keywords: ['sap', 'upload', 'failed', 'file', 'error']
  },
  {
    id: 'A002',
    question: 'EOD file is missing, what should I do?',
    answer: `Missing EOD (End of Day) files can cause data synchronization issues. Here's what to do:

**Step 1: Check File Location**
- Default path: \\\\Server\\EOD\\Daily\\
- Verify if file exists in archive folder

**Step 2: Regenerate EOD File**
- Go to POS Management → End of Day → Regenerate
- Select the missing date
- Click "Generate EOD Report"

**Step 3: If Regeneration Fails**
- Check if daily transactions were completed
- Verify POS terminal status
- Ensure all stores closed properly

**Prevention:**
- Always verify EOD completion at closing
- Set up automated backup to secondary server`,
    sources: [
      { id: 'SOP-EOD-001', title: 'EOD Process Guide', snippet: 'EOD文件生成后会自动保存至指定路径，如文件缺失请检查当日交易是否完整。' },
      { id: 'WO-2024-0318', title: 'Work Order #2024-0318', snippet: '门店反映EOD文件缺失，经检查是当日结账未完成导致，重新结账后文件正常生成。' }
    ],
    keywords: ['eod', 'missing', 'file', 'end of day', 'pos']
  },
  {
    id: 'A003',
    question: 'PVT test process',
    answer: `**PVT (Payment Validation Test) Process:**

PVT testing is required before each major release or significant configuration change.

**Prerequisites:**
- All POS terminals updated to test version
- Test cards prepared (Visa, Mastercard, UnionPay)
- Network connectivity verified

**Test Steps:**

1. **Pre-Test Setup**
   - Login to PVT portal with admin credentials
   - Select test environment (UAT/Staging)
   - Choose test store/terminal

2. **Execute Test Cases**
   - Test 1: Card read success rate
   - Test 2: Transaction authorization
   - Test 3: Refund processing
   - Test 4: Network timeout handling

3. **Record Results**
   - Log each test result in PVT portal
   - Take screenshots of any failures
   - Calculate success rate

**Pass Criteria:** Minimum 99% success rate required

**Contact:** pvt-support@sm-dmall.com for issues`,
    sources: [
      { id: 'SOP-PVT-001', title: 'PVT Test Standard', snippet: 'PVT测试标准：每次测试需覆盖所有支付类型，成功率需达到99%以上方可上线。' },
      { id: 'BLUEPRINT-V2.3', title: 'Blueprint V2.3 - Testing Chapter', snippet: '测试流程：准备→执行→记录→评估，每个阶段都有明确的交付物要求。' }
    ],
    keywords: ['pvt', 'test', 'payment', 'validation', 'process']
  },
  {
    id: 'A004',
    question: 'POS online failed, how to fix?',
    answer: `**POS Online Connection Failure - Troubleshooting:**

**Level 1: Quick Checks (Do First)**
1. Check POS terminal network cable
2. Verify router/AP is working
3. Try restarting the terminal

**Level 2: Network Configuration**
1. Check if static IP is configured correctly
2. Verify gateway and subnet mask
3. Test ping to central server

**Level 3: Server Side**
1. Check if POS service is running on server
2. Verify firewall rules allow POS traffic
3. Check server load and connection limits

**Level 4: Escalation**
If issue persists after Level 3, contact HQ IT with:
- Terminal ID
- Error timestamp
- Screenshots of any error messages

**Emergency Mode:**
- Enable offline mode for temporary operation
- All transactions will be stored locally and synced later`,
    sources: [
      { id: 'TROUBLESHOOT-POS', title: 'POS Troubleshooting Guide', snippet: 'POS联机失败排查顺序：本地网络→配置检查→服务器状态→升级处理。' },
      { id: 'WO-2024-0612', title: 'Work Order #2024-0612', snippet: '门店POS大面积联机失败，原因为服务器连接数达到上限，重启服务后恢复。' }
    ],
    keywords: ['pos', 'online', 'failed', 'connection', 'network']
  },
  {
    id: 'A005',
    question: 'How to apply for user permissions?',
    answer: `**User Permission Application Process:**

**Step 1: Submit Request**
- Go to: https://admin.sm-dmall.com/permissions
- Click "New Permission Request"
- Fill in required fields:
  - User ID / Employee ID
  - Department
  - Required module(s)
  - Justification

**Step 2: Manager Approval**
- Request goes to direct manager
- Approval typically takes 1-2 business days
- Manager will receive email notification

**Step 3: IT Verification**
- HQ IT reviews technical feasibility
- May request additional documentation
- Sets up role-based permissions

**Step 4: Activation**
- Permissions activated within 24 hours of approval
- User receives confirmation email
- Please logout and login again for changes to take effect

**Standard Permission Levels:**
| Level | Description |
|-------|-------------|
| View | Read-only access |
| Operate | Can perform transactions |
| Admin | Full system configuration |

**Urgent Requests:** Contact IT Helpdesk directly`,
    sources: [
      { id: 'SOP-PERM-001', title: 'Permission Application Guide', snippet: '权限申请标准流程：提交→审批→技术审核→激活，整个流程通常需要2-3个工作日。' },
      { id: 'FAQ-PERM-001', title: 'Permission FAQ', snippet: '常见问题：权限激活时间、审批流程、权限类型说明。' }
    ],
    keywords: ['permission', 'apply', 'access', 'user', 'role']
  },
  {
    id: 'A006',
    question: 'Data sync error between stores',
    answer: `**Data Synchronization Error Resolution:**

**Symptom:** Store A's data not visible at Store B, or central data delayed

**Diagnostic Steps:**

1. **Check Sync Status**
   - Open Central Dashboard
   - Look at "Sync Status" panel
   - Identify which data type is affected

2. **Common Causes & Solutions:**

   **Network Issue:**
   - Check VPN connection between stores
   - Verify firewall not blocking sync ports
   - Default sync port: 5433

   **Data Conflict:**
   - Check for duplicate records
   - Look for NULL values in key fields
   - May need manual conflict resolution

   **Server Overload:**
   - Check server CPU/memory usage
   - Sync queue may be backed up
   - Wait or restart sync service

3. **Force Resync (Last Resort)**
   - Only for critical data issues
   - Go to Admin → Sync → Force Full Sync
   - This may take 15-30 minutes

**Prevention:**
- Schedule sync during off-peak hours
- Monitor sync logs daily
- Keep server well-provisioned`,
    sources: [
      { id: 'SOP-SYNC-001', title: 'Data Sync Guide', snippet: '数据同步标准流程：定期同步为每小时一次，紧急同步需手动触发。' },
      { id: 'TROUBLESHOOT-SYNC', title: 'Sync Troubleshooting', snippet: '同步异常排查：检查网络→验证端口→查看队列状态→必要时强制同步。' }
    ],
    keywords: ['sync', 'data', 'error', 'store', 'synchronization']
  },
  {
    id: 'A007',
    question: 'System runs very slowly',
    answer: `**System Performance Issues - Quick Diagnosis:**

**Step 1: Identify the Scope**
- Is it one user, one store, or everyone?
- Is it specific module or entire system?
- When did it start? After what action?

**Step 2: Common Causes:**

| Cause | Symptom | Quick Fix |
|-------|---------|-----------|
| High server load | All users affected | Check server CPU/Memory |
| Network latency | Specific store affected | Run speed test |
| Large data query | Specific reports slow | Optimize query or add index |
| Database fragmentation | Gradual slowdown | Run DB maintenance |
| Too many concurrent users | Peak hours worse | Implement load balancing |

**Step 3: Immediate Actions:**
1. Clear browser cache
2. Close unused browser tabs
3. Try incognito/private mode
4. Restart application

**Step 4: If Issue Persists:**
- Collect performance logs: Ctrl+Alt+P
- Note exact time and actions
- Submit ticket with logs attached

**Prevention:**
- Regular server maintenance schedule
- Monitor performance dashboards
- Keep software updated`,
    sources: [
      { id: 'SOP-PERF-001', title: 'Performance Troubleshooting', snippet: '系统性能问题排查流程：识别范围→定位原因→快速修复→预防措施。' },
      { id: 'ADMIN-MONITOR', title: 'System Monitoring Guide', snippet: '日常监控指标：CPU使用率、内存占用、响应时间、并发用户数。' }
    ],
    keywords: ['slow', 'performance', 'system', 'lag', 'speed']
  },
  {
    id: 'A008',
    question: 'Printer not working at POS',
    answer: `**POS Printer Troubleshooting:**

**Step 1: Basic Checks**
- Is printer powered on? (check LED light)
- Is paper loaded? (check paper roll)
- Cable connected properly?

**Step 2: Test Print**
- Go to POS → Settings → Test Print
- If test works, issue is in transaction flow
- If test fails, hardware issue

**Step 3: Common Issues & Solutions:**

**Issue: Paper Jam**
- Turn off printer
- Open cover carefully
- Remove jammed paper
- Check paper sensor

**Issue: Not Recognized**
- Check USB cable
- Try different USB port
- Update printer driver
- Restart POS terminal

**Issue: Print Quality Poor**
- Replace paper roll (low quality paper can cause this)
- Clean print head with alcohol wipe
- Check ribbon/cartridge if applicable

**Step 4: Replace Printer**
If issues persist, request replacement:
- Contact store manager
- Submit IT ticket with photos
- Backup printer configuration

**Emergency:** If receipt printer critical, enable email receipt option`,
    sources: [
      { id: 'SOP-PRINTER-001', title: 'POS Printer Guide', snippet: 'POS打印机常见问题处理：卡纸、无法识别、打印质量差等问题排查步骤。' },
      { id: 'HARDWARE-MANUAL', title: 'POS Hardware Manual', snippet: 'POS打印机型号及驱动下载链接，日常维护说明。' }
    ],
    keywords: ['printer', 'pos', 'not working', 'receipt', 'hardware']
  },
  {
    id: 'A009',
    question: 'How to backup system data?',
    answer: `**System Data Backup Procedures:**

**Automatic Backup (Enabled by Default)**
- Full backup: Daily at 2:00 AM
- Incremental backup: Every 6 hours
- Backup retention: 30 days

**Manual Backup Steps:**

1. **Full System Backup**
   \`\`\`
   Admin Panel → Maintenance → Backup
   Click "Create Full Backup"
   Wait for completion (typically 10-30 min)
   Download or transfer to secure location
   \`\`\`

2. **Database Backup**
   \`\`\`
   -- Using pg_dump
   pg_dump -h localhost -U admin -d sm_erp > backup_YYYYMMDD.sql
   \`\`\`

3. **File Backup**
   - Knowledge base documents
   - Configuration files
   - Uploaded files/images

**Backup Storage:**
| Type | Location | Retention |
|------|----------|-----------|
| Local | Server /backup | 7 days |
| Network | NAS \\backup | 30 days |
| Cloud | AWS S3 | 90 days |

**Restore Procedure:**
1. Stop application service
2. Create fresh backup of current state
3. Drop existing database
4. Restore from backup file
5. Verify data integrity
6. Restart service

**Important:** Test restore quarterly!`,
    sources: [
      { id: 'SOP-BACKUP-001', title: 'Backup & Restore Guide', snippet: '系统备份标准流程：自动备份每日执行，手动备份用于大版本更新前。' },
      { id: 'ADMIN-BACKUP', title: 'Admin Backup Panel', snippet: '备份管理面板使用说明：创建、下载、恢复、验证备份文件。' }
    ],
    keywords: ['backup', 'data', 'restore', 'database', 'recovery']
  },
  {
    id: 'A010',
    question: 'Cash register reconciliation mismatch',
    answer: `**Cash Register Reconciliation Issues:**

**Step 1: Gather Information**
- Terminal ID and date
- System total vs Physical cash count
- EOD report from POS
- Manual transaction log if available

**Step 2: Common Causes:**

| Issue | Possible Cause | Investigation |
|-------|---------------|---------------|
| Small variance (<$1) | Rounding, coin handling | Acceptable variance |
| Medium variance ($1-10) | Missed transaction | Review void/refund log |
| Large variance (>$10) | System error or fraud | Immediate escalation |

**Step 3: Investigation Steps:**
1. Export transaction log from POS
2. Compare with EOD report
3. Check all voids and refunds
4. Verify no skipped transactions
5. Review security camera if needed

**Step 4: Resolution:**
- If system error: Submit ticket to fix
- If human error: Retrain staff
- If suspected fraud: Escalate to security team

**Prevention:**
- Daily reconciliation by two people
- Surprise cash counts
- Clear void/refund authorization rules
- Regular training on procedures`,
    sources: [
      { id: 'SOP-RECON-001', title: 'Cash Reconciliation SOP', snippet: '收银对账标准流程：每日对账需双人核对，小额差异需登记，大额差异需上报。' },
      { id: 'FINANCE-GUIDE', title: 'Finance Reference', snippet: '财务核对指南：差异处理流程、权限要求、报告要求。' }
    ],
    keywords: ['cash', 'reconciliation', 'mismatch', 'count', 'variance']
  }
];

// ============================================
// Mock QA Data - Bot B (Usage Knowledge)
// ============================================

const BOT_B_DATA = [
  {
    id: 'B001',
    question: 'How to process a refund?',
    answer: `**Refund Processing Procedure:**

**Standard Refund (Within 30 days):**

1. **Customer approaches counter**
   - Verify original receipt
   - Check return policy compliance

2. **POS操作步骤**
   \`\`\`
   1. Login to POS with your credentials
   2. Press [Refund] button (or F4)
   3. Scan original receipt barcode
   4. Select refund items
   5. Choose refund method (original payment / store credit)
   6. Get manager approval (if amount > $100)
   7. Print refund receipt
   8. Process cash/card if needed
   \`\`\`

3. **After Refund**
   - Update inventory if applicable
   - File receipt copy
   - Log in daily report

**No Receipt Refund:**
- ID verification required
- Store credit only (no cash)
- Check system for original transaction

**Exceptions:**
- Final sale items: No refund
- After 30 days: Manager approval needed
- Damaged items: Inspection required`,
    sources: [
      { id: 'SOP-REFUND-001', title: 'Refund Processing SOP', snippet: '退款处理标准流程：30天内凭票退款，超过30天需经理审批，特殊商品除外。' },
      { id: 'MANUAL-POS-OP', title: 'POS Operation Manual', snippet: 'POS操作手册：退款功能使用说明及权限说明。' }
    ],
    keywords: ['refund', 'return', 'process', 'pos', 'receipt']
  },
  {
    id: 'B002',
    question: 'How to generate daily sales report?',
    answer: `**Daily Sales Report Generation:**

**Method 1: POS Terminal (Real-time)**
1. Go to POS → Reports → Daily Sales
2. Select date (defaults to today)
3. Click "Generate Report"
4. Preview on screen or print

**Method 2: Admin Dashboard (Comprehensive)**
1. Login to Admin Panel
2. Navigate to: Reports → Sales → Daily Summary
3. Select store and date range
4. Click "Export" for PDF/Excel

**Report Contents:**
| Section | Description |
|---------|-------------|
| Total Sales | Gross revenue for the day |
| Transactions | Number of completed sales |
| Refunds | Total refunded amount |
| Tax | GST/VAT collected |
| Payment Methods | Cash vs Card breakdown |
| Top Items | Best selling products |

**Scheduled Reports:**
- Set up auto-email reports
- Go to: Settings → Reports → Schedule
- Configure daily/weekly/monthly

**Troubleshooting:**
- If report missing data: Check EOD completed?
- If numbers don't match: Verify all terminals synced`,
    sources: [
      { id: 'SOP-REPORTS-001', title: 'Report Generation Guide', snippet: '报表生成指南：支持实时报表和定时报表，可导出PDF和Excel格式。' },
      { id: 'ADMIN-REPORTS', title: 'Admin Report Module', snippet: '管理后台报表模块使用说明，包含销售、库存、会员等各类报表。' }
    ],
    keywords: ['report', 'sales', 'daily', 'generate', 'export']
  },
  {
    id: 'B003',
    question: 'How to manage inventory?',
    answer: `**Inventory Management Guide:**

**Access:** Admin Panel → Inventory

**Key Functions:**

1. **Stock Inquiry**
   - Search by SKU, name, or barcode
   - View current stock levels
   - See reorder history

2. **Stock Adjustment**
   \`\`\`
   Steps to adjust stock:
   1. Find item in inventory
   2. Click "Adjust Stock"
   3. Select reason:
      - Received (purchase)
      - Damaged
      - Lost/Theft
      - Return to warehouse
      - Cycle count correction
   4. Enter quantity (+/-)
   5. Add notes
   6. Submit for approval
   \`\`\`

3. **Reorder Point Setup**
   - Set minimum stock level per item
   - System auto-alerts when below threshold
   - Link to purchase order system

4. **Cycle Count**
   - Scheduled physical counts
   - Random spot checks
   - Variance investigation

**Best Practices:**
- Weekly stock level review
- Monthly cycle counts
- Quarterly full inventory audit
- Train all staff on proper handling`,
    sources: [
      { id: 'SOP-INVENTORY-001', title: 'Inventory Management SOP', snippet: '库存管理标准流程：定期盘点、及时补货、差异追溯。' },
      { id: 'BLUEPRINT-INV', title: 'Inventory Blueprint', snippet: '库存管理蓝图：库存预警、补货策略、周转率分析。' }
    ],
    keywords: ['inventory', 'stock', 'manage', 'warehouse', 'quantity']
  },
  {
    id: 'B004',
    question: 'How to setup a new product?',
    answer: `**New Product Setup Procedure:**

**Step 1: Create Product Master**
   \`\`\`
Admin → Products → Add New

Required Fields:
- Product Code (unique)
- Product Name (local + English)
- Category
- SKU
- Barcode (if applicable)
- Unit Price
- Tax Code
   \`\`\`

**Step 2: Configure Pricing**
- Set base price
- Add pricing tiers (if applicable)
- Configure discounts/promotions
- Set member vs non-member prices

**Step 3: Inventory Settings**
- Initial stock quantity
- Reorder point
- Reorder quantity
- Preferred supplier

**Step 4: POS Settings**
- Map to POS button (if needed)
- Set age restriction (if applicable)
- Configure weight-based vs unit-based

**Step 5: Quality Check**
- Verify all information
- Test barcode scan
- Check price display
- Enable for sale

**Activation:**
- Product goes live immediately after save
- May take 5 minutes to sync to all POS terminals`,
    sources: [
      { id: 'SOP-PRODUCT-001', title: 'Product Setup Guide', snippet: '新品上架流程：创建商品档案→配置价格→设置库存→同步至POS。' },
      { id: 'ADMIN-PRODUCT', title: 'Product Module', snippet: '商品管理模块：支持批量导入、快速编辑、系列管理。' }
    ],
    keywords: ['product', 'new', 'setup', 'add', 'create']
  },
  {
    id: 'B005',
    question: 'Employee attendance and overtime',
    answer: `**Attendance Management Guide:**

**Access:** HR Module → Attendance

**Daily Clock In/Out:**
   \`\`\`
Method 1: POS Terminal
- Scan employee card at designated terminal
- Or enter employee ID + PIN

Method 2: Mobile App
- Open SM HR app
- Tap "Clock In/Out"
- Confirm location (if required)
   \`\`\`

**View Attendance Records:**
1. Go to: HR → Attendance → My Records
2. Select date range
3. View clock in/out times
4. See overtime hours

**Overtime:**
- Pre-approval required for OT > 2 hours
- Submit request via HR portal
- Manager approval needed
- Auto-calculated based on actual clock times

**Leave Application:**
1. HR → Leave → New Request
2. Select leave type
3. Select dates
4. Submit for approval
5. Check status in "My Requests"

**Common Issues:**
- Forgot to clock: Submit correction request
- Card not working: Contact HR for re-registration
- System shows wrong hours: Check with supervisor`,
    sources: [
      { id: 'HR-ATTEND-001', title: 'Attendance Guide', snippet: '考勤管理指南：打卡方式、请假流程、加班规定。' },
      { id: 'HR-POLICY', title: 'HR Policy Manual', snippet: '人力资源政策：考勤规定、请假制度、加班补偿标准。' }
    ],
    keywords: ['attendance', 'overtime', 'leave', 'hr', 'clock']
  },
  {
    id: 'B006',
    question: 'How to handle customer complaints?',
    answer: `**Customer Complaint Handling:**

**Step 1: Receive Complaint**
- Listen actively without interruption
- Show empathy (USE SOFT words)
- Note key details
- Stay calm and professional

**Step 2: Categorize Issue**
| Category | Examples | Escalation |
|----------|----------|------------|
| Product Quality | Defect, expiry | Store Manager |
| Service Issue | Long wait, rude staff | Store Manager |
| Billing Error | Wrong charge | IT/Finance |
| System Problem | POS error, sync issue | HQ IT |

**Step 3: Resolve Immediately (If Possible)**
   \`\`\`
Quick Resolution Steps:
1. Apologize sincerely
2. Explain what you'll do
3. Take action immediately
4. Follow up to ensure satisfaction
5. Document the issue
   \`\`\`

**Step 4: If Cannot Resolve**
- Escalate to Store Manager
- Provide complaint reference number
- Set expectation for callback time
- Log in complaint system

**Step 5: Follow Up**
- Contact customer within 24 hours
- Provide resolution or status update
- Document final outcome
- Use feedback to improve

**Documentation:**
- Fill complaint form
- Take photos if applicable
- Get customer contact if not provided
- Submit to HQ within 24 hours`,
    sources: [
      { id: 'SOP-COMPLAINT-001', title: 'Complaint Handling SOP', snippet: '客诉处理标准流程：接收→分类→解决→升级→跟进→归档。' },
      { id: 'MANUAL-CX', title: 'Customer Experience Guide', snippet: '客户体验指南：处理客诉的技巧和话术参考。' }
    ],
    keywords: ['complaint', 'customer', 'handle', 'service', 'issue']
  }
];

// ============================================
// Mock QA Data - Bot C (Version Content)
// ============================================

const BOT_C_DATA = [
  {
    id: 'C001',
    question: 'What new features in version 3.5?',
    answer: `**Version 3.5 Release Notes - New Features:**

**Release Date:** March 2026
**Status:** Production (Live since March 15, 2026)

---

**🚀 New Features:**

1. **Multi-language Support**
   - Added Chinese (Simplified/Traditional)
   - Added Filipino language option
   - User can switch in profile settings

2. **Enhanced POS Interface**
   - New quick action buttons
   - Improved receipt preview
   - Better error messages

3. **Inventory Alerts**
   - Real-time low stock notifications
   - Push to mobile app
   - Configurable alert thresholds

4. **Reporting Dashboard**
   - New executive summary view
   - Drag-and-drop report builder
   - Export to Google Sheets

5. **API Rate Limit Increase**
   - From 100 to 500 requests/minute
   - Better for integration projects

---

**📈 Improvements:**
- Login speed improved by 40%
- Search results now show in < 500ms
- Reduced memory usage on POS terminals
- Better offline mode stability

---

**🔧 Bug Fixes:**
- Fixed: EOD file sometimes not generated
- Fixed: Cash reconciliation mismatch
- Fixed: Mobile app crashes on Android 14`,
    sources: [
      { id: 'REL-NOTES-3.5', title: 'Release Notes V3.5', snippet: 'V3.5版本发布说明：新增多语言支持、增强POS界面、库存预警功能。' },
      { id: 'FEISHU-RELEASE', title: 'Feishu Release Doc', snippet: '飞书在线文档：V3.5详细发布记录，包含功能截图和测试报告。' }
    ],
    keywords: ['version', '3.5', 'new', 'feature', 'release', 'update']
  },
  {
    id: 'C002',
    question: 'Version 3.4 known issues',
    answer: `**Version 3.4 - Known Issues (Resolved in V3.5):**

The following issues were identified in V3.4 and have been resolved in V3.5:

---

**🔴 Previously Active Issues:**

1. **Login Intermittent Failures**
   - **Impact:** ~2% of users experienced random logout
   - **Cause:** Session token refresh race condition
   - **Resolution:** Fixed in V3.5

2. **POS Print Queue Delay**
   - **Impact:** Receipts printing 10-30 seconds late
   - **Cause:** Print spooler memory leak
   - **Resolution:** Fixed in V3.5

3. **Inventory Sync Stalled**
   - **Impact:** Store data not syncing for up to 2 hours
   - **Cause:** Deadlock in sync service
   - **Resolution:** Fixed in V3.5

---

**⚠️ Minor Issues (No User Impact):**

- Admin dashboard shows incorrect "last login" for some users
- API returns extra null field in JSON response
- Mobile app notification badge slow to update

---

**📋 Upgrade Path:**
- All stores should upgrade to V3.5
- Contact IT if you encounter any issues during upgrade
- V3.4 support ended: April 30, 2026`,
    sources: [
      { id: 'REL-NOTES-3.4', title: 'Release Notes V3.4', snippet: 'V3.4版本说明：已知问题列表及解决状态。' },
      { id: 'SUPPORT-KB-344', title: 'Support Knowledge Base', snippet: '技术支持知识库：V3.4问题排查和解决方案汇总。' }
    ],
    keywords: ['version', '3.4', 'known', 'issues', 'problems', 'bugs']
  },
  {
    id: 'C003',
    question: 'When will version 4.0 be released?',
    answer: `**Version 4.0 Release Timeline:**

**Current Status:** In Development

---

**📅 Release Schedule:**

| Milestone | Target Date | Status |
|-----------|------------|--------|
| Feature Freeze | May 15, 2026 | Upcoming |
| Internal Testing | May 15 - June 15, 2026 | Upcoming |
| User Acceptance Testing (UAT) | June 15 - July 1, 2026 | Upcoming |
| Pilot Rollout | July 15, 2026 | Upcoming |
| General Availability (GA) | August 1, 2026 | Upcoming |

---

**🎯 V4.0 Major Features (Planned):**

1. **AI-Powered Search**
   - Natural language queries
   - Smart recommendations
   - Semantic understanding

2. **Cloud-Native Architecture**
   - Better scalability
   - Automatic updates
   - Enhanced security

3. **Advanced Analytics**
   - Real-time business intelligence
   - Predictive insights
   - Custom dashboards

4. **Mobile-First Design**
   - Redesigned mobile app
   - Better offline support
   - Touch-optimized interface

---

**⚠️ Important Notes:**

- V3.5 will be the last major version before V4.0
- V3.x support will continue until Dec 2026
- Migration guide will be published in June 2026

**Contact:** product@sm-dmall.com for questions`,
    sources: [
      { id: 'ROADMAP-2026', title: 'Product Roadmap 2026', snippet: '2026产品路线图：V4.0发布时间表及主要功能规划。' },
      { id: 'FEISHU-ROADMAP', title: 'Feishu Roadmap Doc', snippet: '飞书在线文档：产品路线图详细版本，包含功能设计稿。' }
    ],
    keywords: ['version', '4.0', 'release', 'when', 'timeline', 'roadmap']
  },
  {
    id: 'C004',
    question: 'How to upgrade POS version?',
    answer: `**POS Version Upgrade Procedure:**

**Prerequisites:**
- Current version must be V3.0 or higher
- Backup completed
- Store Manager notified
- Upgrade window: Off-peak hours recommended

---

**Automatic Upgrade (Recommended):**

1. **Enable Auto-Upgrade**
   \`\`\`
   Admin → POS Management → Settings
   Enable "Automatic Updates"
   Set upgrade window (e.g., 2:00 AM - 4:00 AM)
   \`\`\`

2. **System handles everything:**
   - Downloads update
   - Schedules installation
   - Notifies when complete

---

**Manual Upgrade:**

1. **Download Update Package**
   - Go to: Admin → System → Updates
   - Download V3.5 installer

2. **Deploy to POS Terminals**
   \`\`\`
   Method A: USB Drive
   - Copy installer to USB
   - Plug into each POS terminal
   - Run installer manually

   Method B: Network Push
   - Admin → POS Management → Batch Update
   - Select terminals
   - Click "Deploy"
   \`\`\`

3. **Verify Installation**
   - Check version number on each terminal
   - Run basic transaction test
   - Confirm EOD functions work

---

**Rollback Procedure (If Needed):**
1. Admin → System → Backup
2. Select "Create Pre-Upgrade Backup"
3. To rollback: Restore from backup

**Support:** Contact IT helpdesk if issues occur`,
    sources: [
      { id: 'SOP-UPGRADE-001', title: 'POS Upgrade Guide', snippet: 'POS版本升级指南：自动升级和手动升级操作步骤。' },
      { id: 'ADMIN-UPDATE', title: 'Admin Update Module', snippet: '管理后台更新模块：批量部署和回滚功能说明。' }
    ],
    keywords: ['upgrade', 'pos', 'version', 'update', 'install']
  },
  {
    id: 'C005',
    question: 'What changed in version 3.3?',
    answer: `**Version 3.3 Change Log:**

**Release Date:** January 2026

---

**Major Changes:**

1. **User Interface Refresh**
   - New color scheme and icons
   - Simplified navigation menu
   - Better mobile responsiveness

2. **Permission System Overhaul**
   - New role-based access control (RBAC)
   - Granular permission settings
   - Audit log for all permission changes

3. **Performance Optimization**
   - Database query optimization
   - Reduced API response time by 60%
   - Better handling of peak loads

---

**Minor Updates:**

| Module | Change |
|--------|--------|
| POS | Added quick void button |
| Inventory | Batch import now supports 10,000+ items |
| Reports | New profit margin report |
| HR | Overtime calculation rule update |
| Admin | Bulk user import from CSV |

---

**Deprecations:**
- Legacy API V1 (please migrate to V2)
- Internet Explorer 11 support discontinued
- Old report formats deprecated (use new templates)

---

**Migration Notes:**
- No database changes required
- All V3.2 data compatible
- Run migration script for new permission features`,
    sources: [
      { id: 'REL-NOTES-3.3', title: 'Release Notes V3.3', snippet: 'V3.3版本说明：UI更新、权限系统重构、性能优化。' },
      { id: 'MIGRATION-33', title: 'V3.3 Migration Guide', snippet: 'V3.3迁移指南：兼容说明和配置变更。' }
    ],
    keywords: ['version', '3.3', 'changes', 'update', 'what new']
  },
  {
    id: 'C006',
    question: 'Is there a mobile app version?',
    answer: `**SM ERP Mobile Application:**

**Platforms Available:**
| Platform | Version | Status |
|----------|---------|--------|
| iOS | 14.0+ | ✅ Available |
| Android | 10.0+ | ✅ Available |
| Huawei | EMUI 10+ | ✅ Available |

---

**Download Links:**

**iOS (App Store):**
- Search: "SM ERP"
- Direct: [App Store Link]
- QR Code available in admin panel

**Android (Google Play):**
- Search: "SM ERP Business"
- Direct: [Play Store Link]

**Android (APK - Alternative):**
- Download from: internal.sm-dmall.com/app
- For stores without Play Store access

---

**Features (Mobile App):**

| Feature | iOS | Android |
|---------|-----|---------|
| Dashboard | ✅ | ✅ |
| Inventory Lookup | ✅ | ✅ |
| Sales Reports | ✅ | ✅ |
| Leave Application | ✅ | ✅ |
| Push Notifications | ✅ | ✅ |
| Offline Mode | ✅ | ✅ |
| Attendance Clock In | ✅ | ✅ |
| POS Operations | ❌ | ❌ |

*Note: Full POS operations require dedicated POS terminal*

---

**Installation Support:**
- Contact IT for managed deployment
- User self-service via app stores
- Store managers can bulk deploy via MDM

**App Version:** Currently V3.5.2 (matches desktop)`,
    sources: [
      { id: 'MOBILE-FEATURES', title: 'Mobile App Feature List', snippet: '移动应用功能清单：各平台支持的功能对比。' },
      { id: 'FEISHU-MOBILE', title: 'Feishu Mobile Guide', snippet: '飞书在线文档：移动应用下载和安装指南。' }
    ],
    keywords: ['mobile', 'app', 'ios', 'android', 'phone', 'download']
  }
];

// ============================================
// Helper Functions
// ============================================

function getBotData(botId) {
  switch(botId) {
    case 'A': return BOT_A_DATA;
    case 'B': return BOT_B_DATA;
    case 'C': return BOT_C_DATA;
    default: return [];
  }
}

function findMatchingQA(botId, userQuestion) {
  const qaList = getBotData(botId);
  const normalizedQuestion = userQuestion.toLowerCase().trim();

  // First, try exact keyword matching
  for (const qa of qaList) {
    for (const keyword of qa.keywords) {
      if (normalizedQuestion.includes(keyword)) {
        return qa;
      }
    }
  }

  // If no keyword match, try fuzzy match on question
  const words = normalizedQuestion.split(/\s+/);
  let bestMatch = null;
  let bestScore = 0;

  for (const qa of qaList) {
    const qWords = qa.question.toLowerCase().split(/\s+/);
    let score = 0;
    for (const word of words) {
      if (qWords.some(q => q.includes(word) || word.includes(q))) {
        score++;
      }
    }
    if (score > bestScore) {
      bestScore = score;
      bestMatch = qa;
    }
  }

  return bestMatch || qaList[0]; // Default to first Q&A if no match
}

// Export for use in app.js
window.MockData = {
  ROLE_PERMISSIONS,
  DEMO_ACCOUNTS,
  BOT_CONFIG,
  BOT_A_DATA,
  BOT_B_DATA,
  BOT_C_DATA,
  getBotData,
  findMatchingQA
};
