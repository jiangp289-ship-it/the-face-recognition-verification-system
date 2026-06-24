const BUSINESS_TYPES = [
  "人脸核验-活体检测",
  "人脸核验-人脸比对",
  "人脸核验-人脸检索",
  "人脸核验-人脸检测",
  "人脸核验-人脸深伪检测"
];

window.MockData = {
  businessTypes: BUSINESS_TYPES,
  productRows: [
    { productNumber: "PRD-LIVE-01", productName: "金融人脸核验平台", businessCount: 1, createdAt: "2026-05-18 09:20:00", remark: "用于远程开户与身份核验场景。" },
    { productNumber: "PRD-CMP-02", productName: "账号安全增强", businessCount: 1, createdAt: "2026-05-20 11:12:00", remark: "用于高风险登录二次核验。" },
    { productNumber: "PRD-SEARCH-03", productName: "人脸名单服务", businessCount: 1, createdAt: "2026-05-22 14:35:00", remark: "用于名单检索与风险拦截。" },
    { productNumber: "PRD-DET-04", productName: "柜面辅助核验", businessCount: 1, createdAt: "2026-05-28 16:08:00", remark: "柜面业务辅助检测。" },
    { productNumber: "PRD-DF-05", productName: "人脸鉴伪产品", businessCount: 1, createdAt: "2026-06-01 10:30:00", remark: "用于深度伪造风险识别。" }
  ],
  businessRequestOverviewMock: {
    dailyLabels: ["06-07", "06-08", "06-09", "06-10", "06-11", "06-12", "06-13", "06-14"],
    monthlyLabels: ["2026-01", "2026-02", "2026-03", "2026-04", "2026-05", "2026-06"],
    detectionSeries: [62, 72, 68, 84, 79, 93, 88, 96],
    passSeries: [58, 67, 63, 78, 74, 86, 83, 90],
    businessSeries: {
      "BIZ-1001": { dailyDetection: [5200, 5680, 6100, 5920, 6480, 7020, 7360, 7810], dailyPass: [4930, 5420, 5820, 5630, 6190, 6690, 7040, 7480], monthlyDetection: [142000, 156800, 168900, 182400, 196300, 214800], monthlyPass: [135400, 149200, 161100, 174300, 188200, 206500] },
      "BIZ-1002": { dailyDetection: [2860, 3180, 3040, 3520, 3690, 3980, 4210, 4460], dailyPass: [2740, 3060, 2930, 3410, 3560, 3830, 4050, 4310], monthlyDetection: [78200, 84600, 90200, 96300, 102800, 109600], monthlyPass: [75400, 81700, 87300, 93400, 99800, 106400] },
      "BIZ-1003": { dailyDetection: [1640, 1880, 2020, 2160, 2390, 2520, 2680, 2840], dailyPass: [1510, 1730, 1860, 1980, 2190, 2320, 2470, 2620], monthlyDetection: [43800, 49200, 54800, 58600, 63200, 68400], monthlyPass: [40400, 45600, 50900, 54400, 58800, 63900] },
      "BIZ-1004": { dailyDetection: [960, 1040, 1180, 1260, 1220, 1350, 1420, 1510], dailyPass: [900, 978, 1110, 1190, 1150, 1270, 1340, 1430], monthlyDetection: [25600, 28200, 31100, 33800, 35600, 39200], monthlyPass: [24100, 26600, 29400, 32100, 33700, 37400] },
      "BIZ-1005": { dailyDetection: [1320, 1460, 1580, 1720, 1840, 1960, 2140, 2380], dailyPass: [1190, 1310, 1420, 1540, 1640, 1760, 1910, 2130], monthlyDetection: [36400, 40200, 43800, 47600, 51900, 56800], monthlyPass: [32600, 36100, 39400, 42900, 46800, 51400] }
    }
  },
  securitySituationOverviewMock: {
    requestTrend: [48600, 52300, 56800, 59200, 64100, 68800, 73500],
    passTrend: [46100, 49700, 53800, 56300, 61100, 65600, 70100],
    interceptTrend: [2480, 2630, 3020, 2860, 3210, 3560, 3920],
    deviceInterceptTrend: [620, 740, 690, 810, 960, 1040, 1180],
    silentRiskTrend: [860, 920, 1080, 1010, 1260, 1380, 1520],
    clientDistribution: [58, 42],
    deviceRiskLevels: [72, 14, 9, 5],
    deviceRiskTags: [86, 64, 42, 28],
    faceRiskTags: [44, 31, 25],
    silentRiskTags: [52, 34, 14],
    interceptReasons: [46, 34, 20]
  },
  overviewMetrics: [
    { label: "总检测量", value: "1,286,420", change: "较上周 +8.2%" },
    { label: "总计费量", value: "1,104,380", change: "计费占比 85.8%" },
    { label: "通过率", value: "96.42%", change: "稳定" },
    { label: "召回率", value: "91.70%", change: "较上周 +1.6%" }
  ],
  overviewTrendSeries: [52, 68, 74, 61, 88, 93, 76],
  overviewBusinessTypeSeries: [36, 24, 14, 12, 14],
  deepfakeMetrics: [
    { label: "人脸深伪调用量", value: "286,900", change: "近 7 天" },
    { label: "拦截量", value: "18,642", change: "疑似攻击" },
    { label: "拦截率", value: "6.50%", change: "较上周 +0.7%" },
    { label: "命中策略数", value: "12", change: "策略覆盖" }
  ],
  deepfakeTrendSeries: [32, 46, 48, 57, 71, 67, 82],
  channelShareRows: [
    { channelName: "手机银行 APP", callCount: 128600, callRatio: "44.82%", blockedCount: 8240, strategyType: "深伪高置信拦截" },
    { channelName: "远程开户 API", callCount: 76200, callRatio: "26.56%", blockedCount: 5318, strategyType: "屏幕翻拍识别" },
    { channelName: "柜面辅助 API", callCount: 82100, callRatio: "28.62%", blockedCount: 5084, strategyType: "视频重放识别" }
  ],
  strategyHitRows: [
    { name: "深伪高置信拦截", hit: 8420, ratio: "45.17%" },
    { name: "屏幕翻拍识别", hit: 5294, ratio: "28.40%" },
    { name: "视频重放识别", hit: 4928, ratio: "26.43%" }
  ],
  businessRows: [
    { businessId: "BIZ-1001", businessName: "远程开户活体核验", productName: "金融人脸核验平台", productCode: "PRD-LIVE-01", businessType: BUSINESS_TYPES[0], status: "formal", configSummary: "动作活体 / 攻击检测 / 失败降级", updatedAt: "2026-06-20 10:18" },
    { businessId: "BIZ-1002", businessName: "高风险登录人脸比对", productName: "账号安全增强", productCode: "PRD-CMP-02", businessType: BUSINESS_TYPES[1], status: "trial", configSummary: "比对阈值 86 / 活体前置", updatedAt: "2026-06-20 09:44" },
    { businessId: "BIZ-1003", businessName: "黑名单检索拦截", productName: "人脸名单服务", productCode: "PRD-SEARCH-03", businessType: BUSINESS_TYPES[2], status: "formal", configSummary: "TopN 5 / 黑名单命中拒绝", updatedAt: "2026-06-19 18:20" },
    { businessId: "BIZ-1004", businessName: "柜面人脸检测", productName: "柜面辅助核验", productCode: "PRD-DET-04", businessType: BUSINESS_TYPES[3], status: "closed", configSummary: "质量 / 遮挡 / 清晰度", updatedAt: "2026-06-18 16:05" },
    { businessId: "BIZ-1005", businessName: "贷款面签深伪检测", productName: "人脸鉴伪产品", productCode: "PRD-DF-05", businessType: BUSINESS_TYPES[4], status: "error", configSummary: "深伪阈值 82 / 命中策略拦截", updatedAt: "2026-06-20 11:02" }
  ],
  businessOperationRecords: [
    { operator: "ops_admin", objectName: "远程开户活体核验", actionSummary: "更新活体模式为动作活体", result: "success", ip: "10.18.4.21", createdAt: "2026-06-20 10:20" },
    { operator: "risk_admin", objectName: "贷款面签深伪检测", actionSummary: "调整深伪拦截阈值", result: "success", ip: "10.18.4.35", createdAt: "2026-06-20 09:52" }
  ],
  alarmSettings: [
    { businessId: "BIZ-1001", objectName: "远程开户活体核验", failRateThreshold: 5, successRateThreshold: 95, notifyMethod: "站内通知", notifyEnabled: true },
    { businessId: "BIZ-1005", objectName: "贷款面签深伪检测", failRateThreshold: 8, successRateThreshold: 92, notifyMethod: "短信通知", notifyEnabled: true }
  ],
  statRows: [
    { id: "ST-01", statTime: "2026-06-20", date: "2026-06-20", businessName: "远程开户活体核验", businessType: BUSINESS_TYPES[0], clientAccountId: "CUST-8801", clientAccountName: "华东银行", callCount: 126842, feeCount: 116200, billingCount: 116200, nonBillingCount: 10642, mobileCount: 78200, telecomCount: 22100, unicomCount: 18420, broadcastCount: 8122, successCount: 121880, failedCount: 4962, passRate: "96.09%" },
    { id: "ST-02", statTime: "2026-06-20", date: "2026-06-20", businessName: "高风险登录人脸比对", businessType: BUSINESS_TYPES[1], clientAccountId: "CUST-8802", clientAccountName: "远程银行", callCount: 84530, feeCount: 80122, billingCount: 80122, nonBillingCount: 4408, mobileCount: 56320, telecomCount: 12800, unicomCount: 10120, broadcastCount: 5290, successCount: 82290, failedCount: 2240, passRate: "97.35%" },
    { id: "ST-03", statTime: "2026-06-19", date: "2026-06-19", businessName: "贷款面签深伪检测", businessType: BUSINESS_TYPES[4], clientAccountId: "CUST-8803", clientAccountName: "普惠金融", callCount: 39280, feeCount: 36018, billingCount: 36018, nonBillingCount: 3262, mobileCount: 21040, telecomCount: 7620, unicomCount: 6880, broadcastCount: 3740, successCount: 36100, failedCount: 3180, passRate: "91.90%" }
  ],
  productCallRows: [
    { productId: "PRD-LIVE-01", productName: "金融人脸核验平台", businessCount: 8, callCount: 386200, billingCount: 342900, nonBillingCount: 43300, successRate: "96.40%" },
    { productId: "PRD-DF-05", productName: "人脸鉴伪产品", businessCount: 4, callCount: 119830, billingCount: 109450, nonBillingCount: 10380, successRate: "92.76%" }
  ],
  interfaceCallRows: [
    { apiName: "live-detect/verify", businessType: BUSINESS_TYPES[0], successCount: 121880, failedCount: 4962, avgLatencyMs: 286, errorRate: "3.91%" },
    { apiName: "face-deepfake/check", businessType: BUSINESS_TYPES[4], successCount: 36100, failedCount: 3180, avgLatencyMs: 342, errorRate: "8.10%" }
  ],
  riskListRows: [
    { id: "RL-001", businessId: "BIZ-1003", businessName: "黑名单检索拦截", faceId: "FACE-890126", status: "enabled", type: "活体黑名单", validFrom: "2026-06-01", validTo: "2026-12-31", imageCount: 3, createdAt: "2026-06-01 10:22" },
    { id: "RL-002", businessId: "BIZ-1001", businessName: "远程开户活体核验", faceId: "FACE-771204", status: "disabled", type: "活体黑名单", validFrom: "2026-05-10", validTo: "2026-11-10", imageCount: 2, createdAt: "2026-05-10 14:08" }
  ],
  faceLibraryReadonlyRows: [
    { faceId: "FACE-660018", businessId: "BIZ-1001", registeredAt: "2026-06-12 11:20", status: "enabled", latestCallAt: "2026-06-20 10:44", remark: "开户留存样本" },
    { faceId: "FACE-660019", businessId: "BIZ-1002", registeredAt: "2026-06-13 15:30", status: "enabled", latestCallAt: "2026-06-20 09:22", remark: "登录比对样本" }
  ],
  financialLivenessStrategies: [
    { strategyId: "FLR-001", strategyName: "高频开户拦截策略", businessType: BUSINESS_TYPES[0], riskType: "多次失败重试", threshold: 82, thresholdSummary: "失败次数 ≥ 3 且质量分 < 80", status: "enabled", updatedAt: "2026-06-20 09:18" },
    { strategyId: "FLR-002", strategyName: "深伪强拦截策略", businessType: BUSINESS_TYPES[4], riskType: "AI 深伪命中", threshold: 88, thresholdSummary: "深伪分 ≥ 88 直接拦截", status: "enabled", updatedAt: "2026-06-19 17:30" }
  ],
  strategyConfigRows: [
    { id: "SC-001", strategyType: "人脸伪造检测", jobType: "全局", targetValue: "", ruleName: "静默风险识别策略", conditionRelation: "且", clientRiskTags: ["疑似深度合成人脸", "疑似 AI 换脸视频攻击"], ruleStatus: "有效", todayHitCount: 1280, todayHitRate: "6.20%", updatedAt: "2026-06-20 11:20", updatedBy: "运营员A", excludeBusinessIds: "", remark: "全局拦截高风险静默攻击。" },
    { id: "SC-002", strategyType: "环境风险拦截", jobType: "产品", targetValue: "PRD-LIVE-01", ruleName: "异常设备环境拦截", conditionRelation: "或", clientRiskTags: ["云真机设备", "X8加速大师", "模拟点击"], ruleStatus: "有效", todayHitCount: 642, todayHitRate: "3.10%", updatedAt: "2026-06-20 10:05", updatedBy: "风控员B", excludeBusinessIds: "BIZ-1004", remark: "产品级环境风险策略。" },
    { id: "SC-003", strategyType: "人脸伪造检测", jobType: "业务", targetValue: "BIZ-1005", ruleName: "面签深伪拦截策略", conditionRelation: "且", clientRiskTags: ["屏幕翻拍", "视频重放"], ruleStatus: "无效", todayHitCount: 86, todayHitRate: "0.80%", updatedAt: "2026-06-19 16:30", updatedBy: "运营员C", excludeBusinessIds: "", remark: "业务试运行后暂停。" }
  ],
  riskRules: [
    { ruleId: "RR-001", ruleName: "遮挡与清晰度联合检测", businessType: BUSINESS_TYPES[3], status: "enabled", target: "全部", conditionSummary: "清晰度低且遮挡命中时标记高风险", riskTags: ["遮挡", "清晰度低"], detectionSwitches: { faceQuality: true, occlusion: true, clarity: true }, updatedAt: "2026-06-20 09:33" },
    { ruleId: "RR-002", ruleName: "深伪命中复合规则", businessType: BUSINESS_TYPES[4], status: "disabled", target: "指定业务", conditionSummary: "深伪分高且视频重放命中", riskTags: ["AI深伪", "视频重放"], detectionSwitches: { faceQuality: true, occlusion: false, clarity: true }, updatedAt: "2026-06-19 16:41" }
  ],
  operationLogs: [
    { logId: "LOG-9001", operator: "ops_admin", objectName: "业务管理", opDetail: "创建业务：远程开户活体核验", actionSummary: "创建业务：远程开户活体核验", result: "success", ip: "10.18.4.21", opTime: "2026-06-20 10:21", createdAt: "2026-06-20 10:21" },
    { logId: "LOG-9002", operator: "risk_admin", objectName: "策略配置", opDetail: "关闭规则：深伪命中复合规则", actionSummary: "关闭规则：深伪命中复合规则", result: "success", ip: "10.18.4.35", opTime: "2026-06-20 09:48", createdAt: "2026-06-20 09:48" },
    { logId: "LOG-9003", operator: "sys_admin", objectName: "系统管理", opDetail: "编辑账号：audit_viewer", actionSummary: "编辑账号：audit_viewer", result: "failed", ip: "10.18.4.12", opTime: "2026-06-19 18:08", createdAt: "2026-06-19 18:08" }
  ],
  systemAccounts: [
    { accountId: "AC-001", username: "ops_admin", displayName: "运营管理员", phone: "13800010001", roleName: "业务管理员", status: "enabled", permissions: ["产品管理", "业务管理", "业务请求概览"], latestLoginAt: "2026-06-20 10:50", createdAt: "2026-05-01 09:00" },
    { accountId: "AC-002", username: "risk_admin", displayName: "风控管理员", phone: "13800010002", roleName: "风控策略管理员", status: "enabled", permissions: ["产品管理", "人脸黑名单库", "策略配置"], latestLoginAt: "2026-06-20 09:30", createdAt: "2026-05-03 10:00" },
    { accountId: "AC-003", username: "audit_viewer", displayName: "审计查看员", phone: "13800010003", roleName: "审计员", status: "disabled", permissions: ["操作日志"], latestLoginAt: "2026-06-18 16:20", createdAt: "2026-05-05 11:00" }
  ],
  rolePermissionSummary: [
    { roleName: "业务管理员", description: "管理产品、业务接入和概览查看", modules: ["业务请求概览", "产品管理", "业务管理"], memberCount: 4, updatedAt: "2026-06-20 09:00" },
    { roleName: "风控策略管理员", description: "维护人脸名单与策略", modules: ["人脸黑名单库", "策略配置"], memberCount: 3, updatedAt: "2026-06-19 15:30" },
    { roleName: "审计员", description: "查看操作日志", modules: ["操作日志"], memberCount: 2, updatedAt: "2026-06-18 12:10" }
  ]
};
