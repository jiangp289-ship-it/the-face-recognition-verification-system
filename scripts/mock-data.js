const BUSINESS_TYPES = [
  "活体检测",
  "人脸深伪检测"
];

function buildListLibraryRows(values) {
  const subjectTypes = ["全局", "产品", "业务"];
  const productIds = ["PRD-LIVE-01", "PRD-CMP-02", "PRD-DF-05"];
  const businessIds = ["BIZ-1001", "BIZ-1005"];
  return values.map((value, index) => {
    const subjectType = subjectTypes[index % subjectTypes.length];
    const automatic = index % 4 === 0;
    const releaseType = automatic || index % 4 === 1 || index % 4 === 3 ? "限期" : "永久";
    const createMethod = automatic ? "自动" : "手动";
    const minute = String(58 - index * 3).padStart(2, "0");
    const releaseDate = releaseType === "限期" ? `2026-12-${String(8 + index).padStart(2, "0")}` : "";
    return {
      id: index + 1,
      value,
      listType: automatic ? "黑名单" : index % 3 === 0 ? "白名单" : "黑名单",
      subjectType,
      targetProductId: subjectType === "产品" ? productIds[index % productIds.length] : "",
      targetBusinessIds: subjectType === "业务" ? [businessIds[index % businessIds.length]] : [],
      status: automatic || index % 3 === 0 ? "online" : "offline",
      releaseType,
      releaseDate,
      releaseAt: automatic ? `${releaseDate} 23:59:59` : "",
      createdAt: `2026-07-${String(20 - Math.floor(index / 2)).padStart(2, "0")} 10:${minute}:00`,
      updatedAt: `2026-07-${String(20 - Math.floor(index / 2)).padStart(2, "0")} 11:${minute}:00`,
      createMethod,
      operator: createMethod === "自动" ? "risk_engine" : index % 2 ? "ops_admin" : "risk_admin",
      sourcePolicyId: automatic ? "SC-002" : "",
      sourcePolicyName: automatic ? "异常设备环境拦截" : "",
      remark: index % 2 ? "风险拦截名单，按业务范围生效。" : "名单库自动沉淀记录。"
    };
  });
}

const IP_LIBRARY_ROWS = buildListLibraryRows([
  "10.18.4.21", "2001:db8:85a3::8a2e:370:7334", "192.168.11.8", "fe80::a4b2:ccff:fe12:8877",
  "172.16.4.99", "203.0.113.72", "198.51.100.33", "10.88.0.7", "2001:db8:abcd:12::1",
  "172.20.19.10", "2001:db8::200", "10.20.8.15"
]);

const DATA_ID_LIBRARY_ROWS = buildListLibraryRows([
  "DATA-7A93-4412", "USER-009821", "CUST-882001", "DATA-82FE-1390", "UID-750024", "ACCOUNT-100682",
  "DATA-D0A1-9018", "USER-200781", "CUST-330945", "DATA-6F11-0827", "UID-909613", "ACCOUNT-781524"
]);

const DEVICE_ID_LIBRARY_ROWS = buildListLibraryRows([
  "DEV-6C9A-1D28-FF00", "A1B2C3D4E5F60102", "DEVICE-9B82-10F4", "DFP-77A2-C0E9-4B8F",
  "AND-62EF-9130", "IOS-17C4-2B8D", "DEV-44F0-3D99-AC10", "DFP-090A-FF72-3E16",
  "DEVICE-811C-2A66", "AND-73B1-9F20", "IOS-5E90-B7D3", "DEV-1A8C-EF24-7B19"
]);

window.MockData = {
  businessTypes: BUSINESS_TYPES,
  businessSceneOptions: [
    { name: "默认", locked: true },
    { name: "账户开立", locked: false },
    { name: "登录核验", locked: false },
    { name: "敏感操作", locked: false }
  ],
  productRows: [
    { productNumber: "PRD-LIVE-01", productName: "金融人脸核验平台", businessCount: 1, updatedAt: "2026-06-20 10:18:00", updatedBy: "ops_admin", remark: "用于远程开户与身份核验场景。" },
    { productNumber: "PRD-CMP-02", productName: "账号安全增强", businessCount: 0, updatedAt: "2026-06-18 11:12:00", updatedBy: "product_admin", remark: "用于高风险登录二次核验。" },
    { productNumber: "PRD-SEARCH-03", productName: "人脸名单服务", businessCount: 0, updatedAt: "2026-06-17 14:35:00", updatedBy: "risk_admin", remark: "用于名单检索与风险拦截。" },
    { productNumber: "PRD-DET-04", productName: "柜面辅助核验", businessCount: 0, updatedAt: "2026-06-16 16:08:00", updatedBy: "ops_admin", remark: "柜面业务辅助核验。" },
    { productNumber: "PRD-DF-05", productName: "人脸鉴伪产品", businessCount: 1, updatedAt: "2026-06-20 11:02:00", updatedBy: "risk_admin", remark: "用于深度伪造风险识别。" }
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
    clientDistribution: [46, 28, 16, 10],
    deviceRiskLevels: [72, 14, 9, 5],
    deviceRiskTags: [86, 74, 68, 57, 49, 41, 35, 28, 22],
    faceRiskTags: [44, 31, 25],
    picRiskTags: [52, 0, 34],
    hittype: [46, 34, 20]
  },
  aiForgeryFaceSamples: {
    permission: "allowed",
    loading: false,
    error: "",
    groups: [
      {
        riskType: "疑似AI换脸模板攻击",
        description: "过检人脸照与黑产换脸模板存在异常相似，疑似复用换脸模板攻击。",
        explanation: "当前暂不支持，仅作为预留位。",
        samples: [
        ]
      },
      {
        riskType: "疑似深度合成人脸",
        description: "面部纹理、光照或五官边界存在合成痕迹。",
        explanation: "系统识别到面部纹理、五官边界与光照一致性存在异常，疑似由AI合成生成。",
        samples: [
          { id: "AFS-101", confidenceScore: 98.7, detectedAt: "2026-06-22 15:42:18", logId: "LOG-20260622-8F31A9", dataId: "DATA-7A93-4412", images: [{ label: "过检人脸照", processedUrl: "mock://face-a", visualClass: "face-a" }] },
          { id: "AFS-102", confidenceScore: 97.9, detectedAt: "2026-06-22 14:08:33", logId: "LOG-20260622-71C0D4", dataId: "DATA-82FE-1390", images: [{ label: "过检人脸照", processedUrl: "mock://face-b", visualClass: "face-b" }] },
          { id: "AFS-103", confidenceScore: 95.6, detectedAt: "2026-06-21 20:11:09", logId: "LOG-20260621-15C9BE", dataId: "DATA-D0A1-9018", images: [{ label: "过检人脸照", processedUrl: "mock://face-d", visualClass: "face-d" }] },
          { id: "AFS-104", confidenceScore: 94.2, detectedAt: "2026-06-21 18:27:45", logId: "LOG-20260621-9BE640", dataId: "DATA-6F11-0827", images: [{ label: "过检人脸照", processedUrl: "mock://face-e", visualClass: "face-e" }] },
          { id: "AFS-105", confidenceScore: 92.8, detectedAt: "2026-06-20 12:16:04", logId: "LOG-20260620-80AB2F", dataId: "DATA-1F9A-6520", images: [{ label: "过检人脸照", processedUrl: "mock://face-a", visualClass: "face-a" }] },
          { id: "AFS-106", confidenceScore: 91.4, detectedAt: "2026-06-19 09:31:52", logId: "LOG-20260619-C71192", dataId: "DATA-3C92-7841", images: [{ label: "过检人脸照", processedUrl: "mock://face-b", visualClass: "face-b" }] },
          { id: "AFS-107", confidenceScore: 89.1, detectedAt: "2026-06-18 22:09:11", logId: "LOG-20260618-LOWER", dataId: "DATA-HIDDEN-001", images: [{ label: "过检人脸照", processedUrl: "mock://face-d", visualClass: "face-d" }] }
        ]
      },
      {
        riskType: "疑似翻拍人脸",
        description: "存在屏幕边缘、反光、摩尔纹等翻拍介质特征。",
        explanation: "系统识别到屏幕边缘、反光、摩尔纹或拍摄介质痕迹，疑似使用翻拍方式绕过活体检测。",
        samples: []
      }
    ]
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
    { businessId: "BIZ-1001", businessName: "远程开户活体核验", productName: "金融人脸核验平台", productCode: "PRD-LIVE-01", businessType: BUSINESS_TYPES[0], businessStatus: "enabled", businessScenes: ["默认", "账户开立"], concurrencyControl: { unit: "秒", interval: "1", maxCount: "100" }, accessConfig: { secretId: "SID-BIZ-1001-LIVE", secretKey: "sk_live_BIZ1001_7nQ2xL9p" }, status: "formal", configSummary: "空间活体关闭 / RGB关闭 / 交互式活体开启 / 动作4项", strategySummary: "动作照检测开启 / 欺诈检测开启 / 深伪检测开启", updatedAt: "2026-06-20 10:18", updatedBy: "ops_admin", mark: "远程开户场景，启用动作活体与欺诈检测。", configData: { spatialLiveness: "关闭", rgbLiveness: "关闭", interactiveLiveness: "开启", actionOrder: "随机顺序", actionSet: ["右转头", "左转头", "张嘴", "眨眼"], returnPhotoTypes: [] }, strategyData: { actionPhotoDetect: "开启", actionDetectItems: ["活体人脸比对", "图像交互式活体"], actionRequirementMode: "随机", actionRequirementCount: "2", fixedActionSet: [], fraudDetect: "开启", fraudRequirement: "人脸照", fraudConfidence: "0.85", deepfakeDetect: "开启", deepfakeConfidence: "0.5" } },
    { businessId: "BIZ-1005", businessName: "贷款面签深伪检测", productName: "人脸鉴伪产品", productCode: "PRD-DF-05", businessType: BUSINESS_TYPES[1], businessStatus: "disabled", businessScenes: ["默认", "敏感操作"], concurrencyControl: { unit: "分钟", interval: "1", maxCount: "60" }, accessConfig: { secretId: "SID-BIZ-1005-DF", secretKey: "sk_live_BIZ1005_m4K8vT2r" }, status: "formal", configSummary: "截帧 8 / 过检照 2 / 欺诈检测开启 / 深伪检测开启", strategySummary: "欺诈检测开启 / 深伪检测开启", updatedAt: "2026-06-20 11:02", updatedBy: "risk_admin", mark: "贷款面签场景，关注深伪和翻拍风险。", configData: {}, strategyData: { videoFrameCount: "8", videoTopK: "2", fraudDetect: "开启", fraudConfidence: "0.85", deepfakeDetect: "开启", deepfakeConfidence: "0.5" } }
  ],
  businessOperationRecords: [
    { operator: "ops_admin", objectName: "远程开户活体核验", actionSummary: "更新活体模式为动作活体", result: "success", ip: "10.18.4.21", createdAt: "2026-06-20 10:20" },
    { operator: "risk_admin", objectName: "贷款面签深伪检测", actionSummary: "调整深伪检测策略", result: "success", ip: "10.18.4.35", createdAt: "2026-06-20 09:52" }
  ],
  alarmSettings: [
    { businessId: "BIZ-1001", objectName: "BIZ-1001", businessName: "远程开户活体核验", requestVolumeOperator: "", requestVolumeThreshold: "", passRateOperator: "", passRateThreshold: "", interceptRateOperator: "", interceptRateThreshold: "", thresholdRelation: "AND", notifyMethod: "站内通知", notifyEnabled: false, detectWindowHours: "" },
    { businessId: "BIZ-1005", objectName: "BIZ-1005", businessName: "贷款面签深伪检测", requestVolumeOperator: "", requestVolumeThreshold: "", passRateOperator: "", passRateThreshold: "", interceptRateOperator: "", interceptRateThreshold: "", thresholdRelation: "AND", notifyMethod: "邮件通知", notifyEnabled: false, detectWindowHours: "" }
  ],
  alarmNotificationSamples: [
    { id: "NT-1001", read: false, title: "远程开户活体核验触发请求量告警", businessId: "BIZ-1001", requestTime: "2026-06-20 10:30", productCode: "PRD-LIVE-01", productName: "金融人脸核验平台", businessName: "远程开户活体核验", requestVolume: 128600, passRate: "96.09%", interceptRate: "3.91%", summary: "近 1 小时请求量超过监控阈值，请关注开户流量波动。" },
    { id: "NT-1002", read: false, title: "贷款面签深伪检测拦截率升高", businessId: "BIZ-1005", requestTime: "2026-06-20 11:00", productCode: "PRD-DF-05", productName: "人脸鉴伪产品", businessName: "贷款面签深伪检测", requestVolume: 39280, passRate: "91.90%", interceptRate: "8.10%", summary: "深伪检测拦截率高于预期，请复核近期风险样本。" },
    { id: "NT-1003", read: false, title: "远程开户活体核验通过率低于阈值", businessId: "BIZ-1001", requestTime: "2026-06-20 09:45", productCode: "PRD-LIVE-01", productName: "金融人脸核验平台", businessName: "远程开户活体核验", requestVolume: 86420, passRate: "93.50%", interceptRate: "6.50%", summary: "检测时间窗口内通过率低于配置阈值，请关注用户认证体验。" }
  ],
  statRows: [
    { id: "ST-01", statTime: "2026-06-20", date: "2026-06-20", businessName: "远程开户活体核验", businessType: BUSINESS_TYPES[0], clientAccountId: "CUST-8801", clientAccountName: "华东银行", callCount: 126842, feeCount: 116200, billingCount: 116200, nonBillingCount: 10642, mobileCount: 78200, telecomCount: 22100, unicomCount: 18420, broadcastCount: 8122, successCount: 121880, failedCount: 4962, passRate: "96.09%" },
    { id: "ST-02", statTime: "2026-06-19", date: "2026-06-19", businessName: "贷款面签深伪检测", businessType: BUSINESS_TYPES[1], clientAccountId: "CUST-8803", clientAccountName: "普惠金融", callCount: 39280, feeCount: 36018, billingCount: 36018, nonBillingCount: 3262, mobileCount: 21040, telecomCount: 7620, unicomCount: 6880, broadcastCount: 3740, successCount: 36100, failedCount: 3180, passRate: "91.90%" }
  ],
  productCallRows: [
    { productId: "PRD-LIVE-01", productName: "金融人脸核验平台", businessCount: 8, callCount: 386200, billingCount: 342900, nonBillingCount: 43300, successRate: "96.40%" },
    { productId: "PRD-DF-05", productName: "人脸鉴伪产品", businessCount: 4, callCount: 119830, billingCount: 109450, nonBillingCount: 10380, successRate: "92.76%" }
  ],
  interfaceCallRows: [
    { apiName: "live-detect/verify", businessType: BUSINESS_TYPES[0], successCount: 121880, failedCount: 4962, avgLatencyMs: 286, errorRate: "3.91%" },
    { apiName: "face-deepfake/check", businessType: BUSINESS_TYPES[1], successCount: 36100, failedCount: 3180, avgLatencyMs: 342, errorRate: "8.10%" }
  ],
  riskListRows: [
    { id: "RL-001", businessId: "BIZ-1001", businessName: "远程开户活体核验", faceId: "FACE-890126", status: "enabled", type: "活体黑名单", validFrom: "2026-06-01", validTo: "2026-12-31", imageCount: 3, createdAt: "2026-06-01 10:22" },
    { id: "RL-002", businessId: "BIZ-1001", businessName: "远程开户活体核验", faceId: "FACE-771204", status: "disabled", type: "活体黑名单", validFrom: "2026-05-10", validTo: "2026-11-10", imageCount: 2, createdAt: "2026-05-10 14:08" }
  ],
  ipLibraryRows: IP_LIBRARY_ROWS,
  dataIdLibraryRows: DATA_ID_LIBRARY_ROWS,
  deviceIdLibraryRows: DEVICE_ID_LIBRARY_ROWS,
  faceLibraryReadonlyRows: [
    { faceId: "FACE-660018", businessId: "BIZ-1001", registeredAt: "2026-06-12 11:20", status: "enabled", latestCallAt: "2026-06-20 10:44", remark: "开户留存样本" },
    { faceId: "FACE-660019", businessId: "BIZ-1005", registeredAt: "2026-06-13 15:30", status: "enabled", latestCallAt: "2026-06-20 09:22", remark: "面签鉴伪样本" }
  ],
  financialLivenessStrategies: [
    { strategyId: "FLR-001", strategyName: "高频开户拦截策略", businessType: BUSINESS_TYPES[0], riskType: "多次失败重试", threshold: 82, thresholdSummary: "失败次数 ≥ 3 且质量分 < 80", status: "enabled", updatedAt: "2026-06-20 09:18" },
    { strategyId: "FLR-002", strategyName: "深伪强拦截策略", businessType: BUSINESS_TYPES[1], riskType: "AI 深伪命中", threshold: 88, thresholdSummary: "深伪分 ≥ 88 直接拦截", status: "enabled", updatedAt: "2026-06-19 17:30" }
  ],
  strategyConfigRows: [
    { id: "SC-001", businessType: BUSINESS_TYPES[0], actionType: "直接拦截", businessScene: "默认", subjectType: "全局", targetProductId: "", targetBusinessIds: [], ruleName: "静默风险识别策略", conditionRelation: "且", filterConditions: [{ field: "风控引擎标签", fieldLabel: "风控引擎标签", fieldKey: "riskEngineTag", operator: "命中", values: ["4cb6964c300c45c193c8cba7d860dcd7"], valueLabels: ["IOS / 云真机 / 云真机设备"] }], statisticsConfig: { enabled: true, period: "5", unit: "分钟", dimensions: ["deviceId"], function: "频次计数", dedupeField: "", threshold: "3" }, blacklistConfig: { enabled: false, libraries: [], period: "", unit: "分钟" }, ruleStatus: "enabled", todayHitCount: 1280, todayHitRate: "6.20%", updatedAt: "2026-06-20 11:20", updatedBy: "运营员A", remark: "全局拦截高风险静默攻击。" },
    { id: "SC-002", businessType: BUSINESS_TYPES[0], actionType: "拦截并加入黑名单", businessScene: "登录核验", subjectType: "产品", targetProductId: "PRD-LIVE-01", targetBusinessIds: [], ruleName: "异常设备环境拦截", conditionRelation: "或", filterConditions: [{ field: "设备风险标签", fieldLabel: "设备风险标签", fieldKey: "deviceRiskTag", operator: "命中", values: ["ROOT/越狱", "HOOK框架"], valueLabels: ["ROOT/越狱", "HOOK框架"] }], statisticsConfig: { enabled: false, period: "", unit: "分钟", dimensions: [], function: "", dedupeField: "", threshold: "" }, blacklistConfig: { enabled: true, libraries: ["设备指纹名单库"], period: "30", unit: "分钟" }, ruleStatus: "disabled", todayHitCount: 642, todayHitRate: "3.10%", updatedAt: "2026-06-20 10:05", updatedBy: "运营员B", remark: "产品级环境风险策略。" },
    { id: "SC-003", businessType: BUSINESS_TYPES[1], actionType: "加入黑名单", businessScene: "敏感操作", subjectType: "业务", targetProductId: "", targetBusinessIds: ["BIZ-1005"], ruleName: "面签深伪黑名单策略", conditionRelation: "且", filterConditions: [], statisticsConfig: { enabled: true, period: "1", unit: "小时", dimensions: ["dataId"], function: "去重统计", dedupeField: "riskTag", threshold: "10" }, blacklistConfig: { enabled: true, libraries: ["用户IP名单库", "用户标识名单库"], period: "2", unit: "小时" }, ruleStatus: "disabled", todayHitCount: 86, todayHitRate: "0.80%", updatedAt: "2026-06-19 16:30", updatedBy: "运营员C", remark: "业务试运行后暂停。" },
    { id: "SC-004", businessType: BUSINESS_TYPES[1], actionType: "加入黑名单", businessScene: "账户开立", subjectType: "全局", targetProductId: "", targetBusinessIds: [], ruleName: "开户深伪风险黑名单策略", conditionRelation: "且", filterConditions: [], statisticsConfig: { enabled: false, period: "", unit: "分钟", dimensions: [], function: "", dedupeField: "", threshold: "" }, blacklistConfig: { enabled: true, libraries: ["设备指纹名单库"], period: "45", unit: "分钟" }, ruleStatus: "enabled", todayHitCount: 214, todayHitRate: "1.14%", updatedAt: "2026-06-20 08:40", updatedBy: "ops_admin", remark: "开户场景命中后沉淀设备指纹名单。" },
    { id: "SC-005", businessType: BUSINESS_TYPES[1], actionType: "加入黑名单", businessScene: "登录核验", subjectType: "产品", targetProductId: "PRD-DF-05", targetBusinessIds: [], ruleName: "登录深伪风险黑名单策略", conditionRelation: "且", filterConditions: [], statisticsConfig: { enabled: true, period: "10", unit: "分钟", dimensions: ["productNumber", "dataId"], function: "频次计数", dedupeField: "", threshold: "5" }, blacklistConfig: { enabled: true, libraries: ["用户IP名单库", "设备指纹名单库"], period: "1", unit: "小时" }, ruleStatus: "enabled", todayHitCount: 367, todayHitRate: "2.37%", updatedAt: "2026-06-20 09:15", updatedBy: "risk_admin", remark: "登录场景识别疑似深伪后加入风险名单。" }
  ],
  riskRules: [
    { ruleId: "RR-001", ruleName: "活体遮挡与清晰度联合策略", businessType: BUSINESS_TYPES[0], status: "enabled", target: "全部", conditionSummary: "清晰度低且遮挡命中时标记高风险", riskTags: ["遮挡", "清晰度低"], detectionSwitches: { faceQuality: true, occlusion: true, clarity: true }, updatedAt: "2026-06-20 09:33" },
    { ruleId: "RR-002", ruleName: "深伪命中复合规则", businessType: BUSINESS_TYPES[1], status: "disabled", target: "指定业务", conditionSummary: "深伪分高且视频重放命中", riskTags: ["AI深伪", "视频重放"], detectionSwitches: { faceQuality: true, occlusion: false, clarity: true }, updatedAt: "2026-06-19 16:41" }
  ],
  operationLogs: [
    { logId: "LOG-9001", operator: "ops_admin", objectName: "业务管理", opDetail: "创建业务：远程开户活体核验", actionSummary: "创建业务：远程开户活体核验", result: "success", ip: "10.18.4.21", opTime: "2026-06-20 10:21", createdAt: "2026-06-20 10:21" },
    { logId: "LOG-9002", operator: "risk_admin", objectName: "策略编排", opDetail: "关闭策略：深伪命中复合规则", actionSummary: "关闭策略：深伪命中复合规则", result: "success", ip: "10.18.4.35", opTime: "2026-06-20 09:48", createdAt: "2026-06-20 09:48" },
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
