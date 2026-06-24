const state = {
  route: "dashboard",
  page: 1,
  pageSize: 5,
  filters: {},
  chartType: "bar",
  overviewQuerySeed: 0,
  deepfakeQuerySeed: 0,
  selectedOverviewBusinessId: "all",
  securityTab: "请求趋势",
  riskListTab: "活体黑名单",
  systemTab: "账号管理",
  collapsedGroups: new Set(),
  selectedBusinessIds: new Set(),
  data: JSON.parse(JSON.stringify(window.MockData))
};

const navGroups = [
  { title: "业务概览", items: [
    { route: "dashboard", label: "业务请求概览", icon: "" },
    { route: "faceDeepfakeOverview", label: "安全态势概览", icon: "" }
  ]},
  { title: "产品中心", items: [
    { route: "product", label: "产品管理", icon: "" },
    { route: "business", label: "业务管理", icon: "" }
  ]},
  { title: "策略中心", items: [
    { route: "financialLivenessRisk", label: "策略配置", icon: "" }
  ]},
  { title: "人脸信息库", items: [
    { route: "risk-list", label: "人脸黑名单库", icon: "" }
  ]},
  { title: "系统设置", items: [
    { route: "operationrecord", label: "操作日志", icon: "" },
    { route: "system", label: "系统管理", icon: "" }
  ]}
];

const app = document.querySelector("#app");
const nav = document.querySelector("#nav");
const breadcrumb = document.querySelector("#breadcrumb");
const modalOverlay = document.querySelector("#modalOverlay");
const drawerOverlay = document.querySelector("#drawerOverlay");
const toastStack = document.querySelector("#toastStack");

function init() {
  renderNav();
  routeFromHash();
  window.addEventListener("hashchange", routeFromHash);
  document.addEventListener("keydown", event => {
    if (event.key === "Escape") closeLayer();
  });
}

function routeFromHash() {
  const raw = location.hash.replace(/^#\/?/, "") || "dashboard";
  const [route, query = ""] = raw.split("?");
  state.route = route;
  state.page = 1;
  state.filters = Object.fromEntries(new URLSearchParams(query).entries());
  render();
}

function renderNav() {
  nav.innerHTML = navGroups.map((group, index) => `
    <button class="menu-group-title" type="button" data-group-index="${index}" aria-expanded="${!state.collapsedGroups.has(index)}"><span>${group.title}</span><span class="menu-arrow">${state.collapsedGroups.has(index) ? "▶" : "▼"}</span></button>
    <div class="sub-menu ${state.collapsedGroups.has(index) ? "collapsed" : ""}">
      ${group.items.map(item => `<button class="menu-item" type="button" data-nav="${item.route}" aria-label="${item.label}"><span class="menu-text">${item.label}</span></button>`).join("")}
    </div>
  `).join("");
  nav.querySelectorAll("[data-group-index]").forEach(button => {
    button.addEventListener("click", () => {
      const index = Number(button.dataset.groupIndex);
      state.collapsedGroups.has(index) ? state.collapsedGroups.delete(index) : state.collapsedGroups.add(index);
      renderNav();
      renderActiveNav();
    });
  });
  nav.querySelectorAll("[data-nav]").forEach(button => {
    button.addEventListener("click", () => { location.hash = `#/${button.dataset.nav}`; });
  });
}

function render() {
  const item = findNavItem(state.route) || findNavItem("dashboard");
  state.route = item.route;
  const activeGroupIndex = navGroups.findIndex(group => group.items.some(navItem => navItem.route === state.route));
  if (state.collapsedGroups.has(activeGroupIndex)) {
    state.collapsedGroups.delete(activeGroupIndex);
    renderNav();
  }
  renderActiveNav();
  breadcrumb.innerHTML = `<span>${findGroupTitle(state.route)}</span><span>/</span><span class="breadcrumb-current">${item.label}</span>`;
  const views = {
    dashboard: renderDashboard,
    faceDeepfakeOverview: renderDeepfakeOverview,
    product: renderProduct,
    business: renderBusiness,
    "risk-list": renderRiskList,
    financialLivenessRisk: renderFinancialRisk,
    operationrecord: renderOperationRecord,
    system: renderSystem
  };
  app.innerHTML = views[state.route]();
  bindActions();
}

function renderActiveNav() {
  nav.querySelectorAll(".menu-item").forEach(button => button.classList.toggle("active", button.dataset.nav === state.route));
}

function findNavItem(route) {
  return navGroups.flatMap(group => group.items).find(item => item.route === route);
}

function findGroupTitle(route) {
  return navGroups.find(group => group.items.some(item => item.route === route))?.title || "业务概览";
}

function pageHeader(title, desc, actions = "") {
  return `<div class="page-header"><div><h1 class="page-title">${title}</h1><p class="page-desc">${desc}</p></div><div class="button-row">${actions}</div></div>`;
}

function renderDashboard() {
  const overview = getOverviewViewData();
  return `${pageHeader("业务请求概览", "按产品、业务和时间维度查看检测量与通过量趋势。")}
    ${overviewFilters()}
    <section class="stat-grid compact-stat-grid">${overview.metrics.map(statCard).join("")}</section>
    <section class="overview-split">
      <aside class="business-list-card">
        <div class="chart-title"><span>业务列表</span></div>
        ${overview.businessList.length ? `<div class="business-select-list">${overview.businessList.map(item => `<button class="business-list-item ${item.id === state.selectedOverviewBusinessId ? "active" : ""}" type="button" data-overview-business="${item.id}"><span>${item.label}</span><small>${item.countLabel}</small></button>`).join("")}</div>` : emptyState("暂无匹配业务", "请调整筛选条件后重新查询。")}
      </aside>
      ${trendChartCard("业务请求趋势", overview.labels, [{ name: "检测量", values: overview.detectionSeries, tone: "primary" }, { name: "通过量", values: overview.passSeries, tone: "success" }], overview.selectedLabel)}
    </section>`;
}

function renderDeepfakeOverview() {
  const overview = getSecurityViewData();
  return `${pageHeader("安全态势概览", "围绕产品和业务展示请求、通过、拦截与风险标签态势。")}
    ${securityFilters(overview)}
    <section class="section-stack trend-module">
      <h2 class="module-title">安全态势概览</h2>
      ${tabsHtml(["请求趋势", "拦截趋势"], state.securityTab, "securityTab")}
      ${state.securityTab === "请求趋势" ? renderSecurityRequestTrend(overview) : renderSecurityInterceptTrend(overview)}
    </section>
    ${renderSecurityPersistentDetail(overview)}`;
}

function renderProduct() {
  const rows = filterProductRows(state.data.productRows);
  return `${pageHeader("产品管理", "管理产品基础信息，并跳转查看归属业务和操作日志。", `<button class="btn btn-primary" type="button" data-form="product">创建</button>`)}
    ${productFilters()}
    ${tableWrap("产品列表", renderPagedTable(rows, ["产品编号", "产品名称", "业务数量", "创建时间", "备注", "操作日志", "操作"], productRow))}`;
}

function renderBusiness() {
  const rows = filterBusinessRows(state.data.businessRows);
  return `${pageHeader("业务管理", "完成业务查询、创建、编辑、配置、批量模拟、操作记录和监控报警。", `<button class="btn btn-primary" type="button" data-form="business">创建业务</button>${batchDropdown()}`)}
    ${businessFilters()}
    ${tableWrap("业务列表", renderPagedTable(rows, ["选择", "业务 ID", "业务名称", "关联产品", "业务类型", "配置摘要", "更新时间", "操作"], businessRow))}`;
}

function renderRiskList() {
  const tabs = ["活体黑名单", "人脸库查询"];
  const sourceRows = state.riskListTab === "活体黑名单" ? state.data.riskListRows : state.data.faceLibraryReadonlyRows;
  const rows = filterRiskListRows(sourceRows);
  const action = state.riskListTab === "活体黑名单" ? `<button class="btn btn-primary" type="button" data-form="riskList">创建</button>` : "";
  return `${pageHeader("人脸黑名单库", "维护活体黑名单，并提供人脸库只读查询。", action)}
    ${tabsHtml(tabs, state.riskListTab, "riskListTab")}
    ${riskListFilters()}
    ${tableWrap(state.riskListTab, renderPagedTable(rows, riskListHeaders(), riskListRow))}`;
}

function renderFinancialRisk() {
  const rows = filterStrategyConfigRows(state.data.strategyConfigRows);
  return `${pageHeader("策略配置", "查询、创建、编辑和删除策略规则，展示命中表现与最后更新信息。", `<button class="btn btn-primary" type="button" data-form="strategyConfig">创建</button>`)}
    ${strategyConfigFilters()}
    ${tableWrap("策略规则表格", renderPagedTable(rows, ["动作/策略类型", "作用对象", "规则名称", "风控条件关系", "客户端风控检测", "规则状态", "今日命中量/命中率", "更新时间", "最后更新人", "备注", "操作"], strategyConfigRow))}`;
}

function renderOperationRecord() {
  const rows = filterOperationRows(state.data.operationLogs);
  return `${pageHeader("操作日志", "查询操作日志，支撑配置、策略和账号管理审计追溯。")}
    ${operationFilters()}
    ${tableWrap("操作日志", renderPagedTable(rows, ["日志编号", "操作人", "操作对象", "描述", "结果", "IP", "操作时间"], logRow))}`;
}

function renderSystem() {
  return `${pageHeader("系统管理", "管理账号创建、编辑和删除模拟，并展示角色权限摘要。", state.systemTab === "账号管理" ? `<button class="btn btn-primary" type="button" data-form="account">创建</button>` : "")}
    ${tabsHtml(["账号管理", "角色权限摘要"], state.systemTab, "systemTab")}
    ${state.systemTab === "账号管理" ? `${systemFilters()}${tableWrap("账号列表", renderPagedTable(filterSystemRows(state.data.systemAccounts), ["账号", "姓名", "手机号码", "角色", "产品管理权限", "状态", "最近登录", "创建时间", "操作"], accountRow))}` : tableWrap("角色权限摘要", table(["角色名称", "角色说明", "可访问模块", "成员数", "更新时间"], state.data.rolePermissionSummary.map(row => [row.roleName, row.description, row.modules.map(item => tag(item, "blue")).join(" "), row.memberCount, row.updatedAt])))} `;
}

function overviewFilters() {
  const placeholderMap = { 产品编号: "请输入产品编号", 产品名称: "请输入产品名称", 客户账号: "请输入客户账号", 客户名称: "请输入客户名称", "业务ID": "请输入业务 ID" };
  const findType = state.filters.findType || "产品编号";
  return filterBar([selectField("findType", "查找方式", ["产品编号", "产品名称", "客户账号", "客户名称", "业务ID"]), textField("keyword", "关键字", placeholderMap[findType] || "请输入关键字"), businessTypeField(), selectField("timeType", "时间类型", ["日", "月"]), dateField("时间范围")]);
}

function securityFilters(overview) {
  const products = state.data.productRows.map(row => row.productName);
  const productName = state.filters.productName || products[0];
  const businesses = state.data.businessRows.filter(row => row.productName === productName).map(row => row.businessName);
  return `<section class="filter-card">${filterBar([selectField("productName", "产品名称", products), selectField("businessName", "业务名称", businesses.length ? businesses : ["全部"], state.filters.businessName), dateField("查询时间")])}<div class="status-line"><span class="status-dot"></span>产品状态：${overview.productStatus}</div></section>`;
}

function productFilters() {
  return filterBar([textField("productNumber", "产品编号", "PRD-LIVE-01"), textField("productName", "产品名称", "金融人脸核验平台"), textField("startTime", "开始时间", "2026-05-01"), textField("endTime", "结束时间", "2026-06-30")]);
}

function deepfakeFilters() {
  return filterBar([dateField(), textField("channel", "通道名称", "手机银行 APP"), selectField("strategy", "命中策略类型", ["全部", "深伪高置信拦截", "屏幕翻拍识别", "视频重放识别"]), businessTypeField()], true);
}

function businessFilters() {
  return filterBar([textField("businessId", "业务 ID", "BIZ-1001"), textField("keyword", "业务名称", "远程开户"), textField("product", "产品名称", "金融人脸核验平台"), businessTypeField()]);
}

function riskListFilters() {
  return filterBar([textField("businessId", "业务 ID", "BIZ-1003"), textField("faceId", "FaceId", "FACE-"), selectField("status", "状态", ["全部", "enabled", "disabled"]), selectField("type", "类型", ["全部", "活体黑名单"])]);
}

function strategyConfigFilters() {
  return filterBar([textField("ruleName", "规则名称", "静默风险"), selectField("strategyType", "动作/策略类型", ["全部", "人脸伪造检测", "环境风险拦截"]), selectField("jobType", "作用对象", ["全部", "全局", "产品", "业务"])]);
}

function financialFilters() {
  return strategyConfigFilters();
}

function operationFilters() {
  return filterBar([textField("operator", "操作人", "ops_admin"), textField("objectName", "操作对象", "业务管理"), textField("opDetail", "描述", "创建"), selectField("result", "操作结果", ["全部", "success", "failed"]), dateField(), textField("keyword", "关键词", "创建")]);
}

function systemFilters() {
  return filterBar([textField("keyword", "账号/姓名", "admin"), selectField("status", "账号状态", ["全部", "enabled", "disabled"])]);
}

function filterBar(fields, extraActions = "") {
  const extraActionHtml = typeof extraActions === "string" && extraActions.trim() ? `<div class="filter-extra-actions">${extraActions}</div>` : "";
  return `<div class="filter-bar">${fields.join("")}<div class="filter-actions"><div class="filter-query-actions"><button class="btn btn-primary" type="button" data-query>查询</button><button class="btn" type="button" data-reset>重置</button></div>${extraActionHtml}</div></div>`;
}

function textField(name, label, placeholder) {
  return `<div class="form-group filter-field"><label class="form-label" for="${name}">${label}</label><input id="${name}" name="${name}" class="form-input" placeholder="${placeholder}" value="${state.filters[name] || ""}" /></div>`;
}

function dateField(label = "时间范围") {
  return `<div class="form-group filter-date"><label class="form-label" for="dateRange">${label} <span class="required">*</span></label><input id="dateRange" name="dateRange" class="form-input" value="${state.filters.dateRange || "2026-06-14 至 2026-06-20"}" /></div>`;
}

function selectField(name, label, options, explicitValue) {
  const current = explicitValue !== undefined ? explicitValue : state.filters[name];
  return `<div class="form-group filter-field"><label class="form-label" for="${name}">${label}</label><select id="${name}" name="${name}" class="form-select">${options.map((option, index) => `<option ${current === option || (!current && index === 0) ? "selected" : ""}>${option}</option>`).join("")}</select></div>`;
}

function businessTypeField() {
  return selectField("businessType", "业务类型", ["全部", ...state.data.businessTypes]);
}

function chartActions(toastText) {
  return `<div class="segmented"><button type="button" class="${state.chartType === "line" ? "active" : ""}" data-chart="line">折线图</button><button type="button" class="${state.chartType === "bar" ? "active" : ""}" data-chart="bar">柱状图</button></div><button class="btn" type="button" data-toast="${toastText}">下载图表</button>`;
}

function chartExportActions(toastText = "导出任务已创建，演示环境不下载真实文件。") {
  return `<button class="btn" type="button" data-toast="${toastText}">导出</button>`;
}

function statCard(item) {
  return `<article class="stat-card"><div class="stat-label">${item.label}</div><div class="stat-value">${item.value}</div><div class="stat-change">${item.change}</div></article>`;
}

function chartCard(title, values, labels = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"], actions = "") {
  const body = state.chartType === "line" ? `<div class="chart-stage"><div class="chart-line">${values.map(value => `<span class="line-point chart-opacity-${bucket(value)}"></span>`).join("")}</div></div>` : `<div class="chart-stage">${values.map((value, index) => `<div class="chart-bar-item"><div class="chart-bar chart-h-${bucket(value)}"></div><span>${labels[index] || `项${index + 1}`}</span></div>`).join("")}</div>`;
  return `<section class="chart-card"><div class="chart-title"><span>${title}</span><div class="button-row">${actions}</div></div>${body}</section>`;
}

function trendChartCard(title, labels, series, subtitle = "") {
  const max = Math.max(...series.flatMap(item => item.values), 1);
  const ticks = chartTicks(max);
  return `<section class="chart-card trend-chart-card">
    <div class="chart-title"><span>${title}${subtitle ? ` · ${subtitle}` : ""}</span><div class="button-row">${chartExportActions()}</div></div>
    <div class="trend-chart" role="img" aria-label="${title}">
      <div class="trend-y-axis" aria-hidden="true">${ticks.map(tick => `<span>${formatCompactNumber(tick)}</span>`).join("")}</div>
      <div class="trend-plot">
        ${trendLinesSvg(labels, series, max)}
        ${trendPointLayer(labels, series, max)}
        <div class="trend-hit-layer">${labels.map((label, index) => `<div class="trend-hit" tabindex="0" aria-label="${chartTooltipText(label, series, index)}">
          <div class="chart-tooltip"><strong>${label}</strong>${series.map(item => `<span class="tooltip-row ${item.tone}"><em></em>${item.name}<b>${formatNumber(item.values[index])}</b></span>`).join("")}</div>
        </div>`).join("")}</div>
        <div class="trend-x-axis">${labels.map(label => `<small>${label}</small>`).join("")}</div>
      </div>
    </div>
    <div class="chart-legend chart-legend-bottom">${series.map(item => `<span class="legend-item ${item.tone}">${item.name}</span>`).join("")}</div>
  </section>`;
}

function trendLinesSvg(labels, series, max) {
  const total = Math.max(labels.length, 1);
  return `<svg class="trend-lines" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">${[0, 25, 50, 75, 100].map(y => `<line class="trend-grid-line" x1="0" y1="${y}" x2="100" y2="${y}" />`).join("")}${series.map(item => {
    const points = item.values.map((value, index) => `${chartX(index, total)},${chartY(value, max)}`).join(" ");
    return `<polyline class="trend-polyline ${item.tone}" points="${points}" />`;
  }).join("")}</svg>`;
}

function trendPointLayer(labels, series, max) {
  const total = Math.max(labels.length, 1);
  return `<div class="trend-point-layer" aria-hidden="true">${series.map(item => item.values.map((value, index) => `<span class="trend-dot ${item.tone}" style="left:${chartX(index, total)}%;top:${chartY(value, max)}%"></span>`).join("")).join("")}</div>`;
}

function chartX(index, total) {
  return ((index + 0.5) / total) * 100;
}

function chartY(value, max) {
  return 100 - (Number(value || 0) / Math.max(max, 1)) * 100;
}

function chartTicks(max) {
  return [max, max * 0.75, max * 0.5, max * 0.25, 0].map(value => Math.round(value));
}

function formatCompactNumber(value) {
  const number = Number(value || 0);
  if (number >= 10000) return `${(number / 10000).toFixed(number >= 100000 ? 0 : 1)}万`;
  if (number >= 1000) return `${Math.round(number / 1000)}k`;
  return String(Math.round(number));
}

function chartTooltipText(label, series, index) {
  return `${label}，${series.map(item => `${item.name}${formatNumber(item.values[index])}`).join("，")}`;
}

function donutCard(title, items, actions = chartExportActions()) {
  const total = items.reduce((sum, item) => sum + Number(item.value || 0), 0) || 1;
  return `<section class="chart-card donut-card"><div class="chart-title"><span>${title}</span><div class="button-row">${actions}</div></div><div class="donut-layout"><div class="donut-visual ${donutToneClass(items.length)}" aria-hidden="true"></div><div class="donut-list">${items.map((item, index) => `<div class="donut-row tone-${(index % 5) + 1}" title="${item.name}：${item.value}，占比 ${((item.value / total) * 100).toFixed(1)}%"><span>${item.name}</span><strong>${((item.value / total) * 100).toFixed(1)}%</strong></div>`).join("")}</div></div></section>`;
}

function donutToneClass(count) {
  return count <= 2 ? "donut-tone-2" : count === 3 ? "donut-tone-3" : count === 4 ? "donut-tone-4" : "donut-tone-5";
}

function barListCard(title, items, actions = chartExportActions()) {
  const max = Math.max(...items.map(item => Number(item.value || 0)), 1);
  const total = items.reduce((sum, item) => sum + Number(item.value || 0), 0) || 1;
  return `<section class="chart-card bar-distribution-card"><div class="chart-title"><span>${title}</span><div class="button-row">${actions}</div></div><div class="bar-list">${items.map((item, index) => {
    const percent = ((Number(item.value || 0) / total) * 100).toFixed(2);
    return `<div class="bar-list-row tone-${(index % 5) + 1}" title="${item.name}：${item.value}，占比 ${percent}%"><span>${item.name}</span><div><i class="chart-h-${bucket((item.value / max) * 100)}"></i></div><strong>${percent}%</strong></div>`;
  }).join("")}</div><div class="bar-list-legend">${items.map((item, index) => `<span class="bar-legend-item tone-${(index % 5) + 1}">${item.name} ${((Number(item.value || 0) / total) * 100).toFixed(2)}%</span>`).join("")}</div></section>`;
}

function bucket(value) {
  return Math.max(10, Math.min(100, Math.round(Number(value) / 10) * 10));
}

function getOverviewViewData() {
  const seed = state.overviewQuerySeed;
  const timeType = state.filters.timeType || "日";
  const labels = timeType === "月" ? state.data.businessRequestOverviewMock.monthlyLabels : state.data.businessRequestOverviewMock.dailyLabels;
  const factor = queryFactor(seed, state.filters.businessType, state.filters.dateRange);
  const keyword = state.filters.keyword || "";
  const businessList = [{ id: "all", label: "所有业务", countLabel: "汇总" }, ...state.data.businessRows.filter(row =>
    matchSelect(row.businessType, state.filters.businessType) &&
    (includesText(row.productCode, keyword) || includesText(row.productName, keyword) || includesText(row.businessId, keyword) || includesText(row.businessName, keyword))
  ).map(row => ({ id: row.businessId, label: `${row.productName}-${row.businessName}`, countLabel: row.businessType }))];
  if (!businessList.some(item => item.id === state.selectedOverviewBusinessId)) state.selectedOverviewBusinessId = "all";
  const selectedRawSeries = getBusinessRequestSeries(state.selectedOverviewBusinessId, timeType);
  const detectionSeries = scaleRawSeries(selectedRawSeries.detection.slice(0, labels.length), factor, seed);
  const passSeries = scaleRawSeries(selectedRawSeries.pass.slice(0, labels.length), factor, seed);
  const total = detectionSeries.reduce((sum, value) => sum + value, 0) * 100;
  const pass = passSeries.reduce((sum, value) => sum + value, 0) * 100;
  const average = Math.round(total / labels.length);
  const selectedLabel = businessList.find(item => item.id === state.selectedOverviewBusinessId)?.label || "所有业务";
  return {
    labels,
    businessList,
    selectedLabel,
    detectionSeries,
    passSeries,
    metrics: [
      { label: "总检测量", value: formatNumber(total), change: `查询批次 #${seed || 1}` },
      { label: `${timeType === "月" ? "月均" : "日均"}检测量`, value: formatNumber(average), change: "随时间类型切换" },
      { label: "总通过量", value: formatNumber(pass), change: selectedLabel },
      { label: "通过率", value: `${((pass / Math.max(total, 1)) * 100).toFixed(2)}%`, change: state.filters.businessType && state.filters.businessType !== "全部" ? "按业务类型重算" : "全量业务" }
    ]
  };
}

function getBusinessRequestSeries(businessId, timeType) {
  const source = state.data.businessRequestOverviewMock;
  const isMonth = timeType === "月";
  if (businessId !== "all") {
    const row = source.businessSeries?.[businessId];
    if (row) return { detection: isMonth ? row.monthlyDetection : row.dailyDetection, pass: isMonth ? row.monthlyPass : row.dailyPass };
  }
  const rows = Object.values(source.businessSeries || {});
  if (!rows.length) return { detection: source.detectionSeries, pass: source.passSeries };
  const detectionKey = isMonth ? "monthlyDetection" : "dailyDetection";
  const passKey = isMonth ? "monthlyPass" : "dailyPass";
  return { detection: sumSeries(rows.map(row => row[detectionKey])), pass: sumSeries(rows.map(row => row[passKey])) };
}

function sumSeries(seriesList) {
  const length = Math.max(...seriesList.map(series => series.length), 0);
  return Array.from({ length }, (_, index) => seriesList.reduce((sum, series) => sum + Number(series[index] || 0), 0));
}

function scaleRawSeries(series, factor, seed) {
  return series.map((value, index) => Math.round((value + ((seed + index) % 4) * Math.max(1, value * 0.015)) * factor));
}

function getSecurityViewData() {
  const seed = state.deepfakeQuerySeed;
  const productName = state.filters.productName || state.data.productRows[0]?.productName || "金融人脸核验平台";
  const businessName = state.filters.businessName || state.data.businessRows.find(row => row.productName === productName)?.businessName || "全部";
  const factor = 1 + seed * 0.08 + Math.max(0, state.data.productRows.findIndex(row => row.productName === productName)) * 0.05;
  const labels = ["06-14", "06-15", "06-16", "06-17", "06-18", "06-19", "06-20"];
  const requestTrend = scaleRawSeries(state.data.securitySituationOverviewMock.requestTrend, factor, seed);
  const passTrend = scaleRawSeries(state.data.securitySituationOverviewMock.passTrend, factor, seed);
  const interceptTrend = scaleRawSeries(state.data.securitySituationOverviewMock.interceptTrend, factor, seed);
  const requestTotal = requestTrend.reduce((sum, value) => sum + value, 0);
  const passTotal = passTrend.reduce((sum, value) => sum + value, 0);
  const interceptTotal = interceptTrend.reduce((sum, value) => sum + value, 0);
  return {
    labels,
    productName,
    businessName,
    productStatus: productName.includes("鉴伪") ? "试用开通中" : "正式已开通",
    requestMetrics: [
      { label: "总请求量", value: formatNumber(requestTotal), change: "当前筛选范围" },
      { label: "通过量", value: formatNumber(passTotal), change: "较上期 +3.2%" },
      { label: "通过率", value: `${((passTotal / Math.max(requestTotal, 1)) * 100).toFixed(2)}%`, change: "按产品业务重算" }
    ],
    interceptMetrics: [
      { label: "总过检量", value: formatNumber(requestTotal), change: "当前筛选范围" },
      { label: "拦截量", value: formatNumber(interceptTotal), change: "较上期 +1.8%" },
      { label: "拦截率", value: `${((interceptTotal / Math.max(requestTotal, 1)) * 100).toFixed(2)}%`, change: "按产品业务重算" }
    ],
    requestTrend,
    passTrend,
    interceptTrend,
    clientDistribution: distribution(["Android", "iOS"], state.data.securitySituationOverviewMock.clientDistribution, factor),
    deviceRiskLevels: distribution(["正常", "低风险", "中风险", "高风险"], state.data.securitySituationOverviewMock.deviceRiskLevels, factor),
    deviceRiskTags: distribution(["云真机设备", "疑似 ROOT/越狱设备", "模拟器环境", "自动脚本"], state.data.securitySituationOverviewMock.deviceRiskTags, factor),
    deviceInterceptTrend: scaleRawSeries(state.data.securitySituationOverviewMock.deviceInterceptTrend, factor, seed),
    silentRiskTrend: scaleRawSeries(state.data.securitySituationOverviewMock.silentRiskTrend, factor, seed),
    silentRiskTags: distribution(["疑似深度合成人脸", "疑似 AI 换脸视频攻击", "疑似假人脸"], state.data.securitySituationOverviewMock.silentRiskTags, factor),
    interceptReasons: distribution(["设备风险拦截", "人脸伪造拦截", "人脸情报库拦截"], state.data.securitySituationOverviewMock.interceptReasons, factor)
  };
}

function distribution(names, values, factor) {
  return names.map((name, index) => ({ name, value: Math.round(values[index] * factor * 100) }));
}

function renderSecurityRequestTrend(overview) {
  return `<section class="stat-grid three-col">${overview.requestMetrics.map(statCard).join("")}</section>
    <section class="overview-chart-grid">${trendChartCard("请求量趋势", overview.labels, [{ name: "请求量", values: overview.requestTrend, tone: "primary" }, { name: "通过量", values: overview.passTrend, tone: "success" }])}${donutCard("客户端类型分布", overview.clientDistribution)}</section>`;
}

function renderSecurityInterceptTrend(overview) {
  return `<section class="stat-grid three-col">${overview.interceptMetrics.map(statCard).join("")}</section>
    <section class="overview-chart-grid">${trendChartCard("拦截量趋势", overview.labels, [{ name: "拦截量", values: overview.interceptTrend, tone: "danger" }])}${donutCard("拦截原因分布", overview.interceptReasons)}</section>`;
}

function renderSecurityPersistentDetail(overview) {
  return `<section class="section-stack"><h2 class="section-title">安全态势详情</h2>
    <div class="drawer-section-title">设备风险详情</div>
    <div class="overview-chart-grid risk-device-grid">${donutCard("设备风险等级分布", overview.deviceRiskLevels)}${trendChartCard("设备风险拦截趋势", overview.labels, [{ name: "拦截量", values: overview.deviceInterceptTrend, tone: "danger" }])}</div>
    ${barListCard("设备风险标签分布", overview.deviceRiskTags)}
    <div class="drawer-section-title">人脸深伪风险详情</div>
    <div class="overview-chart-grid">${trendChartCard("人脸深伪风险趋势", overview.labels, [{ name: "拦截量", values: overview.silentRiskTrend, tone: "danger" }])}${donutCard("人脸照风险标签分布", overview.silentRiskTags)}</div>
  </section>`;
}

function getDeepfakeViewData() {
  const seed = state.deepfakeQuerySeed;
  const factor = queryFactor(seed, state.filters.businessType, state.filters.dateRange) * (state.filters.channel ? 0.78 : 1);
  const callCount = Math.round(286900 * factor);
  const blockedCount = Math.round(callCount * (0.055 + (seed % 5) * 0.004));
  const channelRows = state.data.channelShareRows.map((row, index) => {
    const call = Math.round(row.callCount * factor * (1 + index * 0.03));
    return { ...row, callCount: call, blockedCount: Math.round(call * (0.05 + index * 0.01)), callRatio: `${(call / Math.max(callCount, 1) * 100).toFixed(2)}%` };
  });
  return {
    metrics: [
      { label: "人脸深伪调用量", value: formatNumber(callCount), change: `查询批次 #${seed || 1}` },
      { label: "拦截量", value: formatNumber(blockedCount), change: "按条件重算" },
      { label: "拦截率", value: `${((blockedCount / Math.max(callCount, 1)) * 100).toFixed(2)}%`, change: "疑似攻击" },
      { label: "命中策略数", value: String(10 + (seed % 4)), change: state.filters.strategy || "策略覆盖" }
    ],
    trend: scaleSeries(state.data.deepfakeTrendSeries, factor, seed),
    channelRows
  };
}

function queryFactor(seed, businessType, dateRange) {
  const typeIndex = state.data.businessTypes.indexOf(businessType);
  const typeFactor = typeIndex >= 0 ? 0.62 + typeIndex * 0.08 : 1;
  const dateFactor = dateRange && dateRange.includes("20") ? 1 + (seed % 3) * 0.05 : 0.9;
  return typeFactor * dateFactor * (1 + seed * 0.03);
}

function scaleSeries(series, factor, seed) {
  return series.map((value, index) => bucket(value * factor + ((seed + index) % 4) * 5));
}

function formatNumber(value) {
  return Number(value).toLocaleString("zh-CN");
}

function tableWrap(title, content) {
  return `<section class="table-wrap"><div class="table-top"><span>${title}</span></div>${content}</section>`;
}

function table(headers, rows) {
  return `<div class="table-scroll"><table><thead><tr>${headers.map(head => `<th scope="col">${head}</th>`).join("")}</tr></thead><tbody>${rows.map(row => `<tr>${row.map(cell => `<td>${cell}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
}

function renderPagedTable(rows, headers, mapper) {
  if (!rows.length) return `${emptyState("暂无匹配数据", "当前筛选条件下没有结果，请重置筛选或创建新记录。")} ${table(headers, [])}`;
  const total = rows.length;
  const pages = Math.max(1, Math.ceil(total / state.pageSize));
  const current = Math.min(state.page, pages);
  const pageRows = rows.slice((current - 1) * state.pageSize, current * state.pageSize);
  return `${table(headers, pageRows.map(mapper))}<div class="pagination"><span>共 ${total} 条</span><button class="pagination-btn" type="button" data-page="${Math.max(1, current - 1)}" ${current === 1 ? "disabled" : ""}>上一页</button><button class="pagination-btn current" type="button">${current}</button><button class="pagination-btn" type="button" data-page="${Math.min(pages, current + 1)}" ${current === pages ? "disabled" : ""}>下一页</button><select class="form-select page-size-select"><option>5 条/页</option></select></div>`;
}

function businessRow(row) {
  return [`<input type="checkbox" data-select-business="${row.businessId}" ${state.selectedBusinessIds.has(row.businessId) ? "checked" : ""} aria-label="选择 ${row.businessName}" />`, row.businessId, clickable(row.businessName, `data-drawer="business" data-id="${row.businessId}"`), row.productName, row.businessType, `<span class="cell-ellipsis" title="${row.configSummary}">${row.configSummary}</span>`, row.updatedAt, businessMoreMenu(row)];
}

function productRow(row) {
  return [row.productNumber, row.productName, row.businessCount, row.createdAt, `<span class="cell-ellipsis" title="${row.remark || "-"}">${row.remark || "-"}</span>`, action("查看日志", `data-product-log="${row.productNumber}"`), `${action("编辑", `data-form="product" data-id="${row.productNumber}"`)}${action("查看业务", `data-product-business="${row.productName}"`)}`];
}

function businessMoreMenu(row) {
  return `<div class="dropdown row-actions"><button class="action-link" type="button" data-dropdown aria-haspopup="menu">更多</button><div class="dropdown-menu dropdown-menu-right" role="menu">
    <button class="dropdown-item" type="button" data-form="business" data-id="${row.businessId}" role="menuitem">编辑</button>
    <button class="dropdown-item" type="button" data-drawer="config" data-id="${row.businessId}" role="menuitem">试用/正式配置</button>
    ${businessTypeMenuItems(row)}
    <button class="dropdown-item" type="button" data-form="alarm" data-id="${row.businessId}" role="menuitem">监控报警</button>
    <button class="dropdown-item" type="button" data-drawer="records" data-id="${row.businessId}" role="menuitem">操作记录</button>
    <button class="dropdown-item danger" type="button" data-close-business="${row.businessId}" role="menuitem">关闭</button>
  </div></div>`;
}

function businessTypeMenuItems(row) {
  if (row.businessType === "人脸核验-活体检测") return `<button class="dropdown-item" type="button" data-drawer="config" data-id="${row.businessId}" role="menuitem">动作配置</button><button class="dropdown-item" type="button" data-drawer="config" data-id="${row.businessId}" role="menuitem">接口定制</button>`;
  if (row.businessType === "人脸核验-人脸检索") return `<button class="dropdown-item" type="button" data-drawer="config" data-id="${row.businessId}" role="menuitem">人脸库</button>`;
  if (row.businessType === "人脸核验-人脸比对") return `<button class="dropdown-item" type="button" data-drawer="config" data-id="${row.businessId}" role="menuitem">阈值设置</button>`;
  return "";
}

function riskListHeaders() {
  return state.riskListTab === "活体黑名单" ? ["业务 ID", "业务名称", "FaceId", "状态", "类型", "有效期", "图片数量", "创建时间", "操作"] : ["FaceId", "业务 ID", "注册时间", "状态", "最近调用时间", "备注"];
}

function riskListRow(row) {
  if (state.riskListTab !== "活体黑名单") return [row.faceId, row.businessId, row.registeredAt, statusTag(row.status), row.latestCallAt, row.remark];
  return [row.businessId, row.businessName, row.faceId, statusTag(row.status), row.type, `${row.validFrom} 至 ${row.validTo}`, row.imageCount, row.createdAt, `${action("编辑", `data-form="riskList" data-id="${row.id}"`)}${action("删除", `data-delete="riskList:${row.id}"`, "danger")}`];
}

function strategyConfigRow(row) {
  const tags = row.clientRiskTags.map(item => tag(item, "purple")).join(" ");
  return [row.strategyType, row.jobType, row.ruleName, row.conditionRelation, `<span class="cell-ellipsis" title="${row.clientRiskTags.join("、")}">${tags}</span>`, row.ruleStatus === "有效" ? tag("有效", "green") : tag("无效", "gray"), `${formatNumber(row.todayHitCount)}/${row.todayHitRate}`, row.updatedAt, row.updatedBy, row.remark || "-", `${action("编辑", `data-form="strategyConfig" data-id="${row.id}"`)}${action(row.ruleStatus === "有效" ? "停用" : "启用", `data-toggle="strategyConfig:${row.id}"`, row.ruleStatus === "有效" ? "danger" : "")}${action("删除", `data-delete="strategyConfig:${row.id}"`, "danger")}`];
}

function financialRow(row) {
  return strategyConfigRow(row);
}

function logRow(row) {
  return [clickable(row.logId, `data-drawer="log" data-id="${row.logId}"`), row.operator, row.objectName, row.opDetail || row.actionSummary, resultTag(row.result), row.ip, row.opTime || row.createdAt];
}

function accountRow(row) {
  return [row.username, row.displayName, row.phone || "-", row.roleName, (row.permissions || []).includes("产品管理") ? tag("产品管理", "blue") : tag("未开通", "gray"), statusTag(row.status), row.latestLoginAt, row.createdAt, `${action("编辑", `data-form="account" data-id="${row.accountId}"`)}${action("删除", `data-delete="account:${row.accountId}"`, "danger")}`];
}

function batchDropdown() {
  const disabled = state.selectedBusinessIds.size === 0 ? "disabled" : "";
  return `<div class="dropdown" id="batchDropdown"><button class="btn" type="button" data-dropdown ${disabled}>批量操作</button><div class="dropdown-menu"><button class="dropdown-item" type="button" data-batch="批量编辑">批量编辑</button><button class="dropdown-item" type="button" data-batch="批量试用配置">批量试用配置</button><button class="dropdown-item danger" type="button" data-batch-close="批量试用关闭">批量试用关闭</button><button class="dropdown-item" type="button" data-batch="批量正式配置">批量正式配置</button><button class="dropdown-item danger" type="button" data-batch-close="批量正式关闭">批量正式关闭</button></div></div>`;
}

function bindActions() {
  app.querySelectorAll("[data-query]").forEach(button => button.addEventListener("click", applyFilters));
  app.querySelectorAll("[data-reset]").forEach(button => button.addEventListener("click", () => { state.filters = {}; render(); }));
  app.querySelectorAll("[data-chart]").forEach(button => button.addEventListener("click", () => { state.chartType = button.dataset.chart; render(); }));
  app.querySelectorAll("[data-toast]").forEach(button => button.addEventListener("click", () => toast(button.dataset.toast)));
  app.querySelectorAll("[data-page]").forEach(button => button.addEventListener("click", () => { state.page = Number(button.dataset.page); render(); }));
  app.querySelectorAll("[data-tab]").forEach(button => button.addEventListener("click", () => { state[button.dataset.tabKey] = button.dataset.tab; state.page = 1; render(); }));
  app.querySelectorAll("[data-form]").forEach(button => button.addEventListener("click", () => openForm(button.dataset.form, button.dataset.id)));
  app.querySelectorAll("[data-drawer]").forEach(button => button.addEventListener("click", () => openDrawer(button.dataset.drawer, button.dataset.id)));
  app.querySelectorAll("[data-delete]").forEach(button => button.addEventListener("click", () => confirmDelete(button.dataset.delete)));
  app.querySelectorAll("[data-toggle]").forEach(button => button.addEventListener("click", () => confirmToggle(button.dataset.toggle)));
  app.querySelectorAll("[data-close-business]").forEach(button => button.addEventListener("click", () => confirmBusinessClose(button.dataset.closeBusiness)));
  app.querySelectorAll("[data-select-business]").forEach(input => input.addEventListener("change", () => { input.checked ? state.selectedBusinessIds.add(input.dataset.selectBusiness) : state.selectedBusinessIds.delete(input.dataset.selectBusiness); render(); }));
  app.querySelectorAll("[data-dropdown]").forEach(button => button.addEventListener("click", () => button.closest(".dropdown").classList.toggle("open")));
  app.querySelectorAll("[data-batch]").forEach(button => button.addEventListener("click", () => openBatchForm(button.dataset.batch)));
  app.querySelectorAll("[data-batch-close]").forEach(button => button.addEventListener("click", () => confirmModal(button.dataset.batchClose, `将对 ${state.selectedBusinessIds.size} 条业务执行关闭模拟，不调用真实后端。`, "确认关闭", () => applyBatchClose())));
  app.querySelectorAll("[data-close-preview]").forEach(button => button.addEventListener("click", () => closePreview(button)));
  app.querySelectorAll("[data-overview-business]").forEach(button => button.addEventListener("click", () => { state.selectedOverviewBusinessId = button.dataset.overviewBusiness; render(); }));
  app.querySelectorAll("[data-product-business]").forEach(button => button.addEventListener("click", () => { location.hash = `#/business?product=${encodeURIComponent(button.dataset.productBusiness)}`; }));
  app.querySelectorAll("[data-product-log]").forEach(button => button.addEventListener("click", () => {
    const product = state.data.productRows.find(row => row.productNumber === button.dataset.productLog);
    location.hash = `#/operationrecord?objectName=${encodeURIComponent(product?.productName || button.dataset.productLog)}`;
  }));
}

function applyFilters() {
  const formData = new FormData();
  app.querySelectorAll(".filter-bar input, .filter-bar select").forEach(input => formData.set(input.name, input.value));
  const nextFilters = Object.fromEntries(formData.entries());
  if (state.route === "product" && nextFilters.startTime && nextFilters.endTime && new Date(nextFilters.startTime).getTime() > new Date(nextFilters.endTime).getTime()) {
    return toast("开始时间不能晚于结束时间。", "error");
  }
  state.filters = nextFilters;
  state.page = 1;
  if (state.route === "dashboard") state.overviewQuerySeed += 1;
  if (state.route === "faceDeepfakeOverview") state.deepfakeQuerySeed += 1;
  if (state.route === "dashboard") state.selectedOverviewBusinessId = "all";
  toast("查询条件已应用。演示环境使用 mock 数据。")
  render();
}

function filterRows(rows, keys) {
  return rows.filter(row => keys.some(key => includesText(row[key], state.filters.keyword)));
}

function filterBusinessRows(rows) {
  return rows.filter(row =>
    includesText(row.businessId, state.filters.businessId) &&
    includesText(row.businessName, state.filters.keyword) &&
    includesText(row.productName, state.filters.product) &&
    matchSelect(row.businessType, state.filters.businessType)
  );
}

function filterProductRows(rows) {
  return rows.filter(row =>
    includesText(row.productNumber, state.filters.productNumber) &&
    includesText(row.productName, state.filters.productName) &&
    matchDate(row.createdAt, dateRangeFromPair(state.filters.startTime, state.filters.endTime))
  );
}

function filterRiskListRows(rows) {
  return rows.filter(row =>
    includesText(row.businessId, state.filters.businessId) &&
    includesText(row.faceId, state.filters.faceId) &&
    matchSelect(row.status, state.filters.status) &&
    matchSelect(row.type, state.filters.type)
  );
}

function filterFinancialRows(rows) {
  return rows.filter(row =>
    includesText(row.strategyName, state.filters.keyword) &&
    matchSelect(row.status, state.filters.status) &&
    matchSelect(row.riskType, state.filters.riskType) &&
    matchSelect(row.businessType, state.filters.businessType)
  );
}

function filterStrategyConfigRows(rows) {
  return rows.filter(row =>
    includesText(row.ruleName, state.filters.ruleName) &&
    matchSelect(row.strategyType, state.filters.strategyType) &&
    matchSelect(row.jobType, state.filters.jobType)
  );
}

function filterRiskRuleRows(rows) {
  return rows.filter(row =>
    includesText(row.ruleName, state.filters.keyword) &&
    matchSelect(row.status, state.filters.status) &&
    matchSelect(row.target, state.filters.target) &&
    matchSelect(row.businessType, state.filters.businessType)
  );
}

function filterOperationRows(rows) {
  return rows.filter(row =>
    includesText(row.operator, state.filters.operator) &&
    includesText(row.objectName, state.filters.objectName) &&
    matchSelect(row.result, state.filters.result) &&
    includesText(row.opDetail || row.actionSummary, state.filters.opDetail) &&
    matchDate(row.opTime || row.createdAt, state.filters.dateRange) &&
    includesText(row.actionSummary, state.filters.keyword)
  );
}

function filterSystemRows(rows) {
  return rows.filter(row =>
    (includesText(row.username, state.filters.keyword) || includesText(row.displayName, state.filters.keyword)) &&
    matchSelect(row.status, state.filters.status)
  );
}

function includesText(value, keyword) {
  return !keyword || String(value || "").includes(keyword);
}

function matchSelect(value, selected) {
  return !selected || selected === "全部" || value === selected;
}

function matchDate(date, range) {
  if (!range || !date) return true;
  const [start, end] = parseDateRange(range);
  if (!start || !end) return true;
  const time = new Date(date).getTime();
  return time >= new Date(start).getTime() && time <= new Date(end).getTime();
}

function dateRangeFromPair(start, end) {
  return start || end ? `${start || "1970-01-01"} 至 ${end || "2999-12-31"}` : "";
}

function tabsHtml(items, active, key) {
  return `<div class="tabs">${items.map(item => `<button class="tab ${item === active ? "active" : ""}" type="button" data-tab="${item}" data-tab-key="${key}">${item}</button>`).join("")}</div>`;
}

function openForm(type, id) {
  const config = getFormConfig(type, id);
  modalOverlay.innerHTML = `<section class="modal ${config.large ? "modal-lg" : ""}" aria-labelledby="modalTitle"><header class="modal-header"><h2 id="modalTitle">${config.title}</h2><button class="modal-close" type="button" aria-label="关闭" data-close>×</button></header><form class="modal-body" id="activeForm">${config.body}</form><footer class="modal-footer"><button class="btn" type="button" data-close>取消</button><button class="btn btn-primary" type="button" data-submit="${type}" data-id="${id || ""}">确定</button></footer></section>`;
  modalOverlay.classList.add("active");
  modalOverlay.querySelectorAll("[data-close]").forEach(button => button.addEventListener("click", closeLayer));
  modalOverlay.querySelector("[data-submit]").addEventListener("click", submitForm);
  modalOverlay.querySelectorAll("[data-upload]").forEach(button => button.addEventListener("click", () => {
    const box = button.closest(".upload-box").querySelector(".form-help");
    box.textContent = "demo-face-image.jpg 已加入模拟上传队列。";
    toast("照片已加入模拟上传队列。")
  }));
  modalOverlay.querySelectorAll("[data-close-preview]").forEach(button => button.addEventListener("click", () => closePreview(button)));
  bindDynamicForm(modalOverlay);
  bindStrategyJobType(modalOverlay, Boolean(config.editing));
  const businessTypeSelect = modalOverlay.querySelector('[name="businessType"]');
  const configTarget = modalOverlay.querySelector("#businessConfigFields");
  if (businessTypeSelect && configTarget) {
    businessTypeSelect.addEventListener("change", () => {
      configTarget.innerHTML = businessConfigFields(businessTypeSelect.value);
      bindDynamicForm(configTarget);
    });
  }
}

function getFormConfig(type, id) {
  if (type === "product") {
    const row = state.data.productRows.find(item => item.productNumber === id) || {};
    return { title: id ? "产品编辑" : "产品创建", large: false, body: formStack([field("产品名称", "productName", row.productName, true), field(id ? "产品备注" : "备注", "remark", row.remark, false, "textarea")]) };
  }
  if (type === "business") {
    const row = state.data.businessRows.find(item => item.businessId === id) || {};
    return { title: id ? "编辑业务" : "创建业务", large: true, body: businessForm(row) };
  }
  if (type === "alarm") {
    const row = state.data.businessRows.find(item => item.businessId === id) || {};
    const setting = state.data.alarmSettings.find(item => item.businessId === id) || {};
    return { title: "监控报警配置", large: false, body: formGrid([readonlyBlock("告警对象", row.businessName || setting.objectName || "当前业务", "保存后仅更新前端告警 mock。"), selectFieldForModal("通知方式", "notifyMethod", ["站内通知", "短信通知", "邮件通知"], setting.notifyMethod || "站内通知", true), field("调用失败率阈值", "failRateThreshold", setting.failRateThreshold || "5", true), field("成功率阈值", "successRateThreshold", setting.successRateThreshold || "95", true), toggleField("通知开关", setting.notifyEnabled !== false)]) };
  }
  if (type === "riskList") {
    const row = state.data.riskListRows.find(item => item.id === id) || {};
    return { title: id ? "编辑黑名单" : "创建黑名单", large: true, body: formStack([field("业务ID", "businessKey", row.businessId, false), readonlyBlock("业务名称", row.businessName || "选择业务 ID 后回填", "根据业务 ID 回填业务名称。"), field("有效期", "limitDuration", "6", false), selectFieldForModal("有效期单位", "limitUnit", ["天", "月", "年", "不限时间"], "月", false), field("图片地址列表", "urls", "https://mock.local/face-001.jpg", false, "textarea"), uploadField()]) };
  }
  if (type === "strategyConfig") {
    const row = state.data.strategyConfigRows.find(item => item.id === id) || {};
    return { title: id ? "编辑规则" : "创建规则", large: true, editing: Boolean(id), body: strategyConfigForm(row, Boolean(id)) };
  }
  if (type === "financial") {
    const row = state.data.financialLivenessStrategies.find(item => item.strategyId === id) || {};
    return { title: id ? "编辑金融活体风险策略" : "创建金融活体风险策略", large: true, body: financialRiskForm(row) };
  }
  if (type === "account") {
    const row = state.data.systemAccounts.find(item => item.accountId === id) || {};
    return { title: id ? "编辑账号" : "创建账号", large: false, body: formStack([field("账号", "username", row.username, true), field("姓名", "displayName", row.displayName, true), field("手机号码", "phone", row.phone, true), selectFieldForModal("角色", "roleName", ["业务管理员", "风控策略管理员", "审计员"], row.roleName, true), cascaderField("权限列表 / 产品管理权限", "permissions", row.permissions || ["产品管理"], { help: "field_key: privileges.1；产品管理为源字段要求权限项。", options: [["产品权限", "产品管理"], ["业务权限", "业务管理"], ["概览权限", "业务请求概览"], ["审计权限", "操作日志"]] }), toggleField("状态", row.status !== "disabled"), field("备注", "remark", "演示账号备注。", false, "textarea")]) };
  }
  return { title: type, large: false, body: formGrid([field("配置说明", "note", "批量配置已模拟提交", true, "textarea")]) };
}

function businessForm(row = {}) {
  const type = row.businessType || state.data.businessTypes[0];
  return `<div class="form-grid">
    <div class="form-group full"><div class="drawer-section-title">基础信息</div><div class="form-help">字段来自 source-form-fields.csv，当前业务类型使用独立 schema。</div></div>
    <div class="full" id="businessConfigFields">${businessConfigFields(type, row)}</div>
  </div>`;
}

function businessConfigFields(type, row = {}) {
  const schema = businessConfigSchema(type);
  return `${configEntryMapping(type)}${schema.sections.map(section => `<div class="form-group full config-section" data-section="${section.title}"><div class="drawer-section-title">${section.title}</div><div class="form-grid">${section.fields.map(fieldConfig => configControl(fieldConfig, row, type)).join("")}</div></div>`).join("")}`;
}

function configEntryMapping(type) {
  const map = {
    "人脸核验-活体检测": "更多菜单中的“试用/正式配置”统一进入配置抽屉，映射到基础开通、活体配置、风险配置与降级配置。",
    "人脸核验-人脸比对": "更多菜单中的“试用/正式配置”统一进入配置抽屉，映射到比对阈值、前置检测、限流和时间字段。",
    "人脸核验-人脸检索": "更多菜单中的“试用/正式配置”统一进入配置抽屉，映射到检索质量、活体控制、分数控制与图片预览。",
    "人脸核验-人脸检测": "更多菜单中的“试用/正式配置”映射到检测开关、性别识别阈值、限流和时间字段。",
    "人脸核验-人脸深伪检测": "更多菜单中的“试用/正式配置”映射到深伪阈值、视频截帧数、过检人脸照数和风险配置。"
  };
  return `<div class="form-group full"><div class="alert">源站下钻入口映射：${map[type] || map["人脸核验-活体检测"]}</div></div>`;
}

function businessConfigSchema(type) {
  const schemas = {
    "人脸核验-活体检测": {
      summaryFields: ["authSolutionType", "actionSwitch", "silentCheck", "deepfakeEnable", "reduceCheck"],
      sections: [
        { title: "基础信息", fields: [
          { label: "产品ID", name: "productNumber", control: "input", required: true, placeholder: "请输入", submitBehavior: "create/edit" },
          { label: "产品名称", name: "displayName", control: "readonly", placeholder: "请选择", submitBehavior: "readonly" },
          { label: "业务ID名称", name: "businessName", control: "input", required: true, placeholder: "请输入", submitBehavior: "create/edit" },
          { label: "业务类型", name: "businessType", control: "select", required: true, value: "人脸核验-活体检测", options: state.data.businessTypes, submitBehavior: "update-schema" },
          { label: "配置功能", name: "config", control: "select", required: true, value: "活体检测", options: ["活体检测"], submitBehavior: "create/edit" },
          { label: "策略经理", name: "strategyManager", control: "input", placeholder: "请输入", submitBehavior: "create/edit" },
          { label: "备注", name: "mark", control: "textarea", full: true, placeholder: "请输入", submitBehavior: "create/edit" }
        ]},
        { title: "活体配置", fields: [
          { label: "认证方案", name: "authSolutionType", control: "radio", value: "普通认证", options: ["普通认证", "增强认证"], submitBehavior: "updateConfig" },
          { label: "RGB开关", name: "rgbCheck", control: "radio", value: "关闭", options: ["关闭", "开启"], submitBehavior: "updateConfig" },
          { label: "活体动作", name: "actionSwitch", control: "radio", value: "开启", options: ["关闭", "开启"], submitBehavior: "updateConfig" },
          { label: "动作内容", name: "actions", control: "checkbox", value: ["1右转头", "3张嘴"], options: ["1右转头", "2左转头", "3张嘴", "4眨眼"], showWhen: { name: "actionSwitch", value: "开启" }, submitBehavior: "updateConfig" },
          { label: "下发动作个数", name: "actionCount", control: "number", value: "2", options: ["1", "2", "3", "4", "5", "随机"], showWhen: { name: "actionSwitch", value: "开启" }, validation: "actionCount", submitBehavior: "updateConfig" },
          { label: "RGB动作内容", name: "rgbActions", control: "checkbox", value: ["r", "g"], options: ["r", "g", "b"], showWhen: { name: "rgbCheck", value: "开启" }, submitBehavior: "updateConfig" },
          { label: "下发RGB动作个数", name: "rgbActionCount", control: "number", value: "1", showWhen: { name: "rgbCheck", value: "开启" }, validation: "rgbActionCount", submitBehavior: "updateConfig" },
          { label: "两种动作顺序", name: "sequenceType", control: "radio", value: "随机", options: ["RGB在前", "RGB在后", "随机"], showWhen: { name: "rgbCheck", value: "开启" }, submitBehavior: "updateConfig" },
          { label: "返照", name: "needSample", control: "radio", value: "开启", options: ["关闭", "开启"], submitBehavior: "updateConfig" },
          { label: "云端检测需要通过的动作个数", name: "acPassCount", control: "number", value: "1", showWhen: { name: "actionSwitch", value: "开启" }, validation: "positiveNumber", submitBehavior: "updateConfig" },
          { label: "静默活体检测", name: "silentCheck", control: "radio", value: "开启", options: ["关闭", "开启"], submitBehavior: "updateConfig" },
          { label: "分数阈值", name: "silentCheckThreshold", control: "number", value: "0.30", showWhen: { name: "silentCheck", value: "开启" }, validation: "zeroToOne", submitBehavior: "updateConfig" },
          { label: "视频截帧数", name: "videoFrameCount", control: "number", value: "8", placeholder: "默认8", showWhen: { name: "silentCheck", value: "开启" }, validation: "frameCount", submitBehavior: "updateConfig" },
          { label: "过检人脸照数", name: "silentPicCount", control: "number", value: "2", placeholder: "默认2", showWhen: { name: "silentCheck", value: "开启" }, validation: "positiveNumber", submitBehavior: "updateConfig" },
          { label: "活体人脸黑名单", name: "blackListTypes", control: "checkbox", value: ["人脸黑名单"], options: ["人脸黑名单", "背景库"], submitBehavior: "updateConfig" },
          { label: "人脸鉴伪", name: "deepfakeEnable", control: "switch", value: "开启", options: ["关闭", "开启"], help: "源字段为“DeepGuard版人脸鉴伪”，原型按产品命名统一展示为“人脸鉴伪”。", submitBehavior: "updateConfig" },
          { label: "图片加密开关（增强版）", name: "antiCheatCheck", control: "radio", value: "开启", options: ["关闭", "开启"], submitBehavior: "updateConfig" },
          { label: "返回清晰照片", name: "hdImage", control: "radio", value: "开启", options: ["关闭", "开启"], submitBehavior: "updateConfig" },
          { label: "动作失败排查", name: "sampleTime", control: "number", value: "3", validation: "positiveNumber", submitBehavior: "updateConfig" },
          { label: "返回人脸属性", name: "attributeSwitch", control: "switch", value: "关闭", options: ["关闭", "开启"], submitBehavior: "updateConfig" },
          { label: "未成年保护开关", name: "nonageCheck", control: "switch", value: "开启", options: ["关闭", "开启"], submitBehavior: "updateConfig" },
          { label: "口罩检测开关", name: "maskCheck", control: "switch", value: "开启", options: ["关闭", "开启"], submitBehavior: "updateConfig" },
          { label: "云端活体检测类型", name: "checkTypes", control: "checkbox", value: ["动作活体", "静默活体"], options: ["动作活体", "静默活体", "RGB活体"], submitBehavior: "updateConfig" }
        ]},
        { title: "降级配置", fields: [
          { label: "接口调用失败降级开关", name: "reduceCheck", control: "switch", value: "开启", options: ["关闭", "开启"], submitBehavior: "updateConfig" },
          { label: "客户端本地检测降级开关", name: "reduceNetCheck", control: "switch", value: "关闭", options: ["关闭", "开启"], showWhen: { name: "reduceCheck", value: "开启" }, submitBehavior: "updateConfig" },
          { label: "降级阈值", name: "reduceCount", control: "number", value: "3", showWhen: { name: "reduceCheck", value: "开启" }, validation: "positiveNumber", submitBehavior: "updateConfig" },
          { label: "云端检测降级开关", name: "reduceCloudCheck", control: "switch", value: "开启", options: ["关闭", "开启"], showWhen: { name: "reduceCheck", value: "开启" }, submitBehavior: "updateConfig" },
          { label: "跳过云端检测开关", name: "skipCloudCheck", control: "switch", value: "关闭", options: ["关闭", "开启"], submitBehavior: "updateConfig" },
          { label: "二次校验降级开关", name: "reduceReCheck", control: "switch", value: "关闭", options: ["关闭", "开启"], submitBehavior: "updateConfig" }
        ]}
      ]
    },
    "人脸核验-人脸比对": {
      summaryFields: ["faceRecgThreshold", "faceCompleteCheck", "quality", "liveness", "hdImage"],
      sections: [
        { title: "基础信息", fields: [
          { label: "产品ID", name: "productNumber", control: "input", required: true, placeholder: "请输入", submitBehavior: "create/edit" },
          { label: "产品名称", name: "displayName", control: "readonly", placeholder: "请选择", submitBehavior: "readonly" },
          { label: "业务ID名称", name: "businessName", control: "input", required: true, placeholder: "请输入", submitBehavior: "create/edit" },
          { label: "业务类型", name: "businessType", control: "select", required: true, value: "人脸核验-人脸比对", options: state.data.businessTypes, submitBehavior: "update-schema" },
          { label: "配置功能", name: "config", control: "select", required: true, value: "人脸比对", options: ["人脸比对"], submitBehavior: "create/edit" },
          { label: "策略经理", name: "strategyManager", control: "input", placeholder: "请输入", submitBehavior: "create/edit" },
          { label: "备注", name: "mark", control: "textarea", full: true, placeholder: "请输入", submitBehavior: "create/edit" }
        ]},
        { title: "阈值配置", fields: [
          { label: "人脸比对阈值", name: "faceRecgThreshold", control: "number", value: "0.86", validation: "zeroToOne", submitBehavior: "updateFaceCompareThreshold" },
          { label: "返照", name: "needSample", control: "radio", value: "开启", options: ["关闭", "开启"], submitBehavior: "updateConfig" },
          { label: "人脸质量", name: "quality", control: "switch", value: "开启", options: ["关闭", "开启"], submitBehavior: "updateConfig" },
          { label: "活体检测", name: "liveness", control: "switch", value: "开启", options: ["关闭", "开启"], submitBehavior: "updateConfig" },
          { label: "返回清晰照片", name: "hdImage", control: "radio", value: "开启", options: ["关闭", "开启"], submitBehavior: "updateConfig" }
        ]},
        { title: "试用/正式配置", fields: [
          { label: "试用/正式开始时间", name: "startTime", control: "date", value: "2026-06-20", required: true, validation: "date", submitBehavior: "updateConfig" },
          { label: "试用结束时间", name: "endTime", control: "date", value: "2026-06-21", required: true, validation: "dateAfterStart", submitBehavior: "updateConfig" },
          { label: "限流周期", name: "limitUnit", control: "select", value: "秒", required: true, options: ["秒", "分钟", "小时", "日", "周"], submitBehavior: "updateConfig" },
          { label: "时间间隔", name: "limitDuration", control: "number", value: "1", required: true, validation: "positiveNumber", submitBehavior: "updateConfig" },
          { label: "最大次数", name: "limitCount", control: "number", value: "10", required: true, validation: "positiveNumber", submitBehavior: "updateConfig" },
          { label: "前置人脸照完整度识别", name: "faceCompleteCheck", control: "radio", value: "打开", options: ["打开", "关闭"], submitBehavior: "updateConfig" }
        ]}
      ]
    },
    "人脸核验-人脸检索": {
      summaryFields: ["quality", "liveness", "faceRecgThreshold", "status"],
      sections: [
        { title: "基础信息", fields: [
          { label: "产品ID", name: "productNumber", control: "input", required: true, placeholder: "请输入", submitBehavior: "create/edit" },
          { label: "产品名称", name: "displayName", control: "readonly", placeholder: "请选择", submitBehavior: "readonly" },
          { label: "业务ID名称", name: "businessName", control: "input", required: true, placeholder: "请输入", submitBehavior: "create/edit" },
          { label: "业务类型", name: "businessType", control: "select", required: true, value: "人脸核验-人脸检索", options: state.data.businessTypes, submitBehavior: "update-schema" },
          { label: "配置功能", name: "config", control: "select", required: true, value: "人脸检索", options: ["人脸检索"], submitBehavior: "create/edit" },
          { label: "策略经理", name: "strategyManager", control: "input", placeholder: "请输入", submitBehavior: "create/edit" },
          { label: "备注", name: "mark", control: "textarea", full: true, placeholder: "请输入", submitBehavior: "create/edit" }
        ]},
        { title: "试用/正式配置", fields: [
          { label: "试用/正式开始时间", name: "startTime", control: "date", value: "2026-06-20", required: true, validation: "date", submitBehavior: "updateConfig" },
          { label: "试用结束时间", name: "endTime", control: "date", value: "2026-06-21", required: true, validation: "dateAfterStart", submitBehavior: "updateConfig" },
          { label: "限流周期", name: "limitUnit", control: "select", value: "秒", required: true, options: ["秒", "分钟", "小时", "日", "周"], submitBehavior: "updateConfig" },
          { label: "时间间隔", name: "limitDuration", control: "number", value: "1", required: true, validation: "positiveNumber", submitBehavior: "updateConfig" },
          { label: "最大次数", name: "limitCount", control: "number", value: "10", required: true, validation: "positiveNumber", submitBehavior: "updateConfig" }
        ]},
        { title: "人脸检索配置", fields: [
          { label: "人像质量控制", name: "quality", control: "radio", value: "不控制", options: ["不控制", "低", "中", "高"], submitBehavior: "updateConfig" },
          { label: "活体检测控制", name: "liveness", control: "radio", value: "低", options: ["不控制", "低", "中", "高"], submitBehavior: "updateConfig" },
          { label: "人像分数控制", name: "faceRecgThreshold", control: "number", value: "80", validation: "percent", submitBehavior: "updateConfig" }
        ]},
        { title: "人脸库筛选", fields: [
          { label: "业务Id", name: "businessKey", control: "input", placeholder: "路由带入", submitBehavior: "queryFaceLibrary" },
          { label: "姓名", name: "personName", control: "input", submitBehavior: "queryFaceLibrary" },
          { label: "FaceId", name: "personId", control: "textarea", full: true, help: "支持多个 FaceId，使用英文逗号、空格或换行分隔，最多 100 个。", validation: "faceIds", submitBehavior: "queryFaceLibrary" },
          { label: "状态", name: "status", control: "select", value: "全部", options: ["全部", "入库中", "已入库", "入库失败"], submitBehavior: "queryFaceLibrary" },
          { label: "图片预览", name: "facePreview", control: "image-preview", value: "mock-face-preview", submitBehavior: "previewOnly" },
          { label: "人脸预览关闭", name: "operation.closePreview", control: "preview-close", value: "关闭预览", submitBehavior: "operation.closePreview" }
        ]}
      ]
    },
    "人脸核验-人脸检测": {
      summaryFields: ["attributeSwitch", "nonageCheck", "maskCheck", "faceCheck", "genderRateThreshold"],
      sections: [
        { title: "基础信息", fields: [
          { label: "产品ID", name: "productNumber", control: "input", required: true, placeholder: "请输入", submitBehavior: "create/edit" },
          { label: "产品名称", name: "displayName", control: "readonly", placeholder: "请选择", submitBehavior: "readonly" },
          { label: "业务ID名称", name: "businessName", control: "input", required: true, placeholder: "请输入", submitBehavior: "create/edit" },
          { label: "业务类型", name: "businessType", control: "select", required: true, value: "人脸核验-人脸检测", options: state.data.businessTypes, submitBehavior: "update-schema" },
          { label: "配置功能", name: "config", control: "select", required: true, value: "人脸检测", options: ["人脸检测"], submitBehavior: "create/edit" },
          { label: "策略经理", name: "strategyManager", control: "input", placeholder: "请输入", submitBehavior: "create/edit" },
          { label: "备注", name: "mark", control: "textarea", full: true, placeholder: "请输入", submitBehavior: "create/edit" }
        ]},
        { title: "检测配置", fields: [
          { label: "返回人脸属性", name: "attributeSwitch", control: "switch", value: "开启", options: ["关闭", "开启"], submitBehavior: "updateConfig" },
          { label: "未成年保护开关", name: "nonageCheck", control: "switch", value: "开启", options: ["关闭", "开启"], submitBehavior: "updateConfig" },
          { label: "口罩检测开关", name: "maskCheck", control: "switch", value: "关闭", options: ["关闭", "开启"], submitBehavior: "updateConfig" },
          { label: "算法测人脸检测开关（勿动）", name: "faceCheck", control: "switch", value: "开启", options: ["关闭", "开启"], submitBehavior: "updateConfig" },
          { label: "返回清晰照片", name: "hdImage", control: "radio", value: "开启", options: ["关闭", "开启"], submitBehavior: "updateConfig" },
          { label: "检测失败降级", name: "reduceCheck", control: "switch", value: "关闭", options: ["关闭", "开启"], submitBehavior: "updateConfig" }
        ]},
        { title: "试用/正式配置", fields: [
          { label: "试用/正式开始时间", name: "startTime", control: "date", value: "2026-06-20", required: true, validation: "date", submitBehavior: "updateConfig" },
          { label: "试用结束时间", name: "endTime", control: "date", value: "2026-06-21", required: true, validation: "dateAfterStart", submitBehavior: "updateConfig" },
          { label: "限流周期", name: "limitUnit", control: "select", value: "秒", required: true, options: ["秒", "分钟", "小时", "日", "周"], submitBehavior: "updateConfig" },
          { label: "时间间隔", name: "limitDuration", control: "number", value: "1", required: true, validation: "positiveNumber", submitBehavior: "updateConfig" },
          { label: "最大次数", name: "limitCount", control: "number", value: "10", required: true, validation: "positiveNumber", submitBehavior: "updateConfig" },
          { label: "性别识别阈值设置", name: "genderRateThreshold", control: "number", value: "0.5", validation: "zeroToOne", submitBehavior: "updateGenderRateThreshold" }
        ]}
      ]
    },
    "人脸核验-人脸深伪检测": {
      summaryFields: ["deepfakeGuardSwitch", "deepFakeCheckThreshold", "silentCheckThreshold", "videoFrameCount", "videoTopK"],
      sections: [
        { title: "基础信息", fields: [
          { label: "产品ID", name: "productNumber", control: "input", required: true, placeholder: "请输入", submitBehavior: "create/edit" },
          { label: "产品名称", name: "displayName", control: "readonly", placeholder: "请选择", submitBehavior: "readonly" },
          { label: "业务ID名称", name: "businessName", control: "input", required: true, placeholder: "请输入", submitBehavior: "create/edit" },
          { label: "业务类型", name: "businessType", control: "select", required: true, value: "人脸核验-人脸深伪检测", options: state.data.businessTypes, submitBehavior: "update-schema" },
          { label: "配置功能", name: "config", control: "select", required: true, value: "人脸深伪检测", options: ["人脸深伪检测"], submitBehavior: "create/edit" },
          { label: "策略经理", name: "strategyManager", control: "input", placeholder: "请输入", submitBehavior: "create/edit" },
          { label: "备注", name: "mark", control: "textarea", full: true, placeholder: "请输入", submitBehavior: "create/edit" }
        ]},
        { title: "风险配置", fields: [
          { label: "人脸鉴伪", name: "deepfakeGuardSwitch", control: "switch", value: "开启", options: ["关闭", "开启"], help: "源字段为“DeepGuard版人脸鉴伪”，原型按产品命名统一展示为“人脸鉴伪”。", submitBehavior: "updateConfig" },
          { label: "风控拦截策略", name: "riskDeviceTypes", control: "checkbox", value: ["深伪高置信拦截"], options: ["深伪高置信拦截", "屏幕翻拍识别", "视频重放识别"], showWhen: { name: "deepfakeGuardSwitch", value: "开启" }, submitBehavior: "updateConfig" },
          { label: "深伪通道切换策略", name: "deepfakeChannel", control: "select", value: "优先自研通道", options: ["优先自研通道", "自动择优", "仅备用通道"], showWhen: { name: "deepfakeGuardSwitch", value: "开启" }, submitBehavior: "updateConfig" },
          { label: "遮挡检测", name: "deepfakeOcclusionDetection", control: "switch", value: "开启", options: ["关闭", "开启"], submitBehavior: "updateConfig" },
          { label: "人脸清晰度检测", name: "deepfakeFaceClarityEnabled", control: "switch", value: "开启", options: ["关闭", "开启"], submitBehavior: "updateConfig" },
          { label: "人脸清晰度阈值", name: "deepfakeFaceClarityThreshold", control: "number", value: "0.72", showWhen: { name: "deepfakeFaceClarityEnabled", value: "开启" }, validation: "zeroToOne", submitBehavior: "updateConfig" }
        ]},
        { title: "试用/正式配置", fields: [
          { label: "试用/正式开始时间", name: "startTime", control: "date", value: "2026-06-20", required: true, validation: "date", submitBehavior: "updateConfig" },
          { label: "试用结束时间", name: "endTime", control: "date", value: "2026-06-21", required: true, validation: "dateAfterStart", submitBehavior: "updateConfig" },
          { label: "限流周期", name: "limitUnit", control: "select", value: "秒", required: true, options: ["秒", "分钟", "小时", "日", "周"], submitBehavior: "updateConfig" },
          { label: "时间间隔", name: "limitDuration", control: "number", value: "1", required: true, validation: "positiveNumber", submitBehavior: "updateConfig" },
          { label: "最大次数", name: "limitCount", control: "number", value: "10", required: true, validation: "positiveNumber", submitBehavior: "updateConfig" }
        ]},
        { title: "人脸深伪配置", fields: [
          { label: "静默活体阈值设置（自研）", name: "silentCheckThreshold", control: "number", value: "0.85", validation: "zeroToOne", submitBehavior: "updateConfig" },
          { label: "DeepFake阈值设置（自研）", name: "deepFakeCheckThreshold", control: "number", value: "0.5", validation: "zeroToOne", submitBehavior: "updateConfig" },
          { label: "人脸黑名单背景库开关", name: "deepFakeFaceBackgroundCheck", control: "radio", value: "打开", options: ["打开", "关闭"], submitBehavior: "updateConfig" },
          { label: "视频人脸深伪检测", name: "videoDeepfakeDetect", control: "readonly", value: "开启该分组", submitBehavior: "readonly" },
          { label: "视频截帧数", name: "videoFrameCount", control: "number", value: "8", placeholder: "默认8", validation: "frameCount", submitBehavior: "updateConfig" },
          { label: "过检人脸照数", name: "videoTopK", control: "number", value: "2", placeholder: "默认2", validation: "topK", submitBehavior: "updateConfig" }
        ]}
      ]
    }
  };
  return schemas[type] || schemas["人脸核验-活体检测"];
}

function configControl(fieldConfig, row = {}, currentType = "") {
  const stored = row.configData || {};
  const rawValue = stored[fieldConfig.name] ?? row[fieldConfig.name] ?? row[fieldConfig.alias] ?? fieldConfig.value ?? defaultBusinessValue(fieldConfig.name, row, currentType);
  const value = Array.isArray(rawValue) ? rawValue : String(rawValue || "");
  const inputId = `${fieldConfig.name}-${Math.random().toString(16).slice(2)}`;
  const full = fieldConfig.full || ["checkbox", "image-preview"].includes(fieldConfig.control) ? " full" : "";
  const required = fieldConfig.required ? ` <span class="required">*</span>` : "";
  const placeholder = fieldConfig.placeholder ? ` placeholder="${fieldConfig.placeholder}"` : "";
  const meta = `data-field-name="${fieldConfig.name}" data-control="${fieldConfig.control}" data-validation="${fieldConfig.validation || ""}" data-submit-behavior="${fieldConfig.submitBehavior || "write"}"${fieldConfig.showWhen ? ` data-visible-if="${fieldConfig.showWhen.name}:${fieldConfig.showWhen.value}"` : ""}`;
  let control = "";
  if (fieldConfig.control === "select") {
    control = `<select id="${inputId}" name="${fieldConfig.name}" class="form-select">${fieldConfig.options.map(option => `<option ${value === option ? "selected" : ""}>${option}</option>`).join("")}</select>`;
  } else if (fieldConfig.control === "radio") {
    control = `<div class="check-row segmented">${fieldConfig.options.map(option => `<label><input type="radio" name="${fieldConfig.name}" value="${option}" ${value === option ? "checked" : ""} />${option}</label>`).join("")}</div>`;
  } else if (fieldConfig.control === "checkbox") {
    const values = Array.isArray(rawValue) ? rawValue : String(rawValue || "").split(/[、,，]/).filter(Boolean);
    control = `<div class="check-row">${fieldConfig.options.map(option => `<label><input type="checkbox" name="${fieldConfig.name}" value="${option}" ${values.includes(option) ? "checked" : ""} />${option}</label>`).join("")}</div>`;
  } else if (fieldConfig.control === "switch") {
    const checked = value !== "关闭" && value !== "disabled";
    control = `<button class="toggle ${checked ? "checked" : ""}" type="button" aria-label="${fieldConfig.label}"></button><input type="hidden" name="${fieldConfig.name}" value="${checked ? "开启" : "关闭"}" />`;
  } else if (fieldConfig.control === "readonly") {
    control = `<div class="form-input readonly-field">${value || row.productName || "选择产品后回填"}</div><input type="hidden" name="${fieldConfig.name}" value="${value || row.productName || ""}" />`;
  } else if (fieldConfig.control === "textarea") {
    control = `<textarea id="${inputId}" name="${fieldConfig.name}" class="form-textarea"${placeholder}>${value}</textarea>`;
  } else if (fieldConfig.control === "number") {
    control = `<input id="${inputId}" name="${fieldConfig.name}" class="form-input" type="number" value="${value}"${placeholder} />`;
  } else if (fieldConfig.control === "date") {
    control = `<input id="${inputId}" name="${fieldConfig.name}" class="form-input" type="date" value="${value}"${placeholder} />`;
  } else if (fieldConfig.control === "upload") {
    control = `<div class="upload-box"><button class="btn" type="button" data-upload>点击上传</button><div class="form-help">只展示文件名和 mock 进度，不处理真实文件。</div></div>`;
  } else if (fieldConfig.control === "image-preview") {
    control = `<div class="image-preview-card"><div class="preview-avatar">人脸</div><div><strong>mock-face-preview.jpg</strong><p class="form-help">点击人脸库记录时展示预览，不提供删除操作。</p></div></div><input type="hidden" name="${fieldConfig.name}" value="${value}" />`;
  } else if (fieldConfig.control === "preview-close") {
    control = `<button class="btn" type="button" data-close-preview="operation.closePreview">关闭预览</button><input type="hidden" name="${fieldConfig.name}" value="${value}" /><div class="form-help">field_key: operation.closePreview；点击后仅关闭预览态。</div>`;
  } else {
    control = `<input id="${inputId}" name="${fieldConfig.name}" class="form-input" value="${value}"${placeholder} />`;
  }
  const help = fieldConfig.help ? `<div class="form-help">${fieldConfig.help}</div>` : "";
  return `<div class="form-group${full}" ${meta}><label class="form-label" for="${inputId}">${fieldConfig.label}${required}</label>${control}${help}<div class="field-error" id="${inputId}-error"></div></div>`;
}

function defaultBusinessValue(name, row, type) {
  if (name === "productNumber") return row.productCode || row.productNumber || "PRD-MOCK";
  if (name === "displayName") return row.productName || row.displayName || "金融人脸核验平台";
  if (name === "businessName") return row.businessName || "";
  if (name === "businessType") return row.businessType || type;
  if (name === "businessKey") return row.businessId || "";
  if (name === "strategyManager") return row.strategyManager || "strategy_admin";
  if (name === "mark") return row.mark || `按 ${type} 字段矩阵配置`;
  return "";
}

function bindDynamicForm(root) {
  root.querySelectorAll(".toggle").forEach(button => button.addEventListener("click", () => {
    syncToggle(button);
    applyVisibility(root);
  }));
  root.querySelectorAll("input, select, textarea").forEach(control => {
    control.addEventListener("change", () => {
      applyVisibility(root);
      const group = control.closest(".form-group");
      if (group) setFieldError(group, "");
    });
    control.addEventListener("input", () => {
      const group = control.closest(".form-group");
      if (group) setFieldError(group, "");
    });
  });
  applyVisibility(root);
}

function applyVisibility(root) {
  root.querySelectorAll("[data-visible-if]").forEach(group => {
    const [name, expected] = group.dataset.visibleIf.split(":");
    const visible = getControlValue(root, name) === expected;
    group.hidden = !visible;
    group.querySelectorAll("input, select, textarea").forEach(control => { control.disabled = !visible; });
    if (!visible) setFieldError(group, "");
  });
}

function getControlValue(root, name) {
  const checked = root.querySelector(`[name="${name}"]:checked`);
  if (checked) return checked.value;
  const control = root.querySelector(`[name="${name}"]`);
  return control ? control.value : "";
}

function closePreview(button) {
  const group = button.closest(".form-group");
  const section = button.closest(".config-section") || button.closest(".table-wrap") || button.closest("form");
  section?.querySelectorAll(".image-preview-card").forEach(card => card.classList.add("hidden"));
  if (group) setFieldError(group, "预览已关闭");
  toast("人脸预览已关闭。", "success");
}

function financialRiskForm(row = {}) {
  return formGrid([
    field("规则名称", "ruleName", row.strategyName, true),
    selectFieldForModal("动作/策略类型", "strategyType", ["环境风险拦截", "人脸伪造检测"], row.riskType || "环境风险拦截", true),
    selectFieldForModal("作用对象", "targetType", ["全局", "产品", "业务"], row.target || "全局", false),
    field("产品编号/业务ID", "targetValue", row.targetValue || "", false),
    selectFieldForModal("规则状态", "status", ["有效", "无效"], row.status === "disabled" ? "无效" : "有效", true),
    field("备注", "description", row.description || "", false, "textarea"),
    `<div class="form-group full"><div class="drawer-section-title">条件配置</div></div>`,
    selectFieldForModal("风控条件关系", "conditionType", ["且", "或"], row.conditionType || "且", false),
    cascaderField("客户端风控检测", "riskTags", row.riskTags || ["人脸质量检测"], { help: "源控件类型：cascader；此处用两级级联选择模拟。", options: [["人脸质量", "人脸质量检测"], ["环境风险", "多次失败重试"], ["深伪风险", "AI深伪"]] }),
    field("需排除业务ID", "excludeBusinessIds", row.excludeBusinessIds || "", false),
    `<div class="form-group full"><div class="drawer-section-title">检测开关</div></div>`,
    namedToggleField("人脸质量检测", "faceQualitySwitch", row.detectionSwitches?.faceQuality !== false),
    namedToggleField("遮挡检测", "occlusionSwitch", row.detectionSwitches?.occlusion !== false),
    field("人脸清晰度阈值", "faceClarityThreshold", row.threshold || "0.80", false)
  ]);
}

function strategyConfigForm(row = {}, editing = false) {
  return formStack([
    groupTitle("基础信息"),
    selectFieldForModal("动作/策略类型", "strategyType", ["", "人脸伪造检测", "环境风险拦截"], row.strategyType || "", true),
    field("规则名称", "ruleName", row.ruleName, true, "input", editing),
    selectFieldForModal("规则状态", "ruleStatus", ["有效", "无效"], row.ruleStatus || "有效", true),
    groupTitle("作用范围"),
    selectFieldForModal("作业类型", "jobType", ["全局", "产品", "业务"], row.jobType || "全局", true),
    field("产品编号/业务ID", "targetValue", row.targetValue || "", false, "input", editing),
    field("需排除业务ID", "excludeBusinessIds", row.excludeBusinessIds || "", false),
    groupTitle("风控条件"),
    selectFieldForModal("风控条件关系", "conditionRelation", ["且", "或"], row.conditionRelation || "且", true),
    strategyRiskTreeField(row.clientRiskTags || []),
    groupTitle("处置动作"),
    field("备注", "remark", row.remark || "", false, "textarea")
  ]);
}

function groupTitle(text) {
  return `<div class="form-group full"><div class="drawer-section-title">${text}</div></div>`;
}

function strategyRiskTreeField(values = []) {
  const tree = [
    ["deviceToken风险一级"],
    ["外挂风险", "加速器", "X8加速大师"],
    ["外挂风险", "加速器", "其他加速器"],
    ["外挂风险", "加速器", "光环助手"],
    ["外挂风险", "修改器_安装"],
    ["外挂风险", "模拟点击"],
    ["外挂风险", "越狱通用工具"],
    ["外挂风险", "自动脚本"],
    ["外挂风险", "定制外挂"],
    ["环境风险", "云真机设备"],
    ["环境风险", "模拟器环境"],
    ["其它风险", "屏幕翻拍"],
    ["业务风险", "视频重放"]
  ];
  const selected = Array.isArray(values) ? values : splitTags(values);
  return `<div class="form-group full"><label class="form-label">客户端风控检测 <span class="required">*</span></label><div class="risk-tree" data-field-key="clientRiskTags">${tree.map(path => {
    const value = path[path.length - 1];
    const depth = `depth-${path.length}`;
    return `<label class="${depth}" title="${path.join(" / ")}"><input type="checkbox" name="clientRiskTags" value="${value}" ${selected.includes(value) ? "checked" : ""} /><span>${path.join(" / ")}</span></label>`;
  }).join("")}</div><div class="form-help">支持一级 / 二级 / 三级风险标签多选，已选结果保存为标签摘要。</div><div class="field-error"></div></div>`;
}

function bindStrategyJobType(root, editing) {
  const jobType = root.querySelector('[name="jobType"]');
  const target = root.querySelector('[name="targetValue"]');
  if (!jobType || !target) return;
  const sync = () => {
    const global = jobType.value === "全局";
    target.disabled = editing || global;
    target.placeholder = global ? "全局作用，无需填写" : jobType.value === "产品" ? "请输入产品编号" : "请输入业务ID";
    if (global && !editing) target.value = "";
  };
  jobType.addEventListener("change", sync);
  sync();
}

function openBatchForm(title) {
  const body = formGrid([readonlyBlock("影响范围", `${state.selectedBusinessIds.size} 条已选业务`, "保存后仅更新前端 mock 数据。"), field("配置摘要", "batchSummary", `${title}已更新`, true, "textarea")]);
  modalOverlay.innerHTML = `<section class="modal" aria-labelledby="modalTitle"><header class="modal-header"><h2 id="modalTitle">${title}</h2><button class="modal-close" type="button" aria-label="关闭" data-close>×</button></header><form class="modal-body" id="activeForm">${body}</form><footer class="modal-footer"><button class="btn" type="button" data-close>取消</button><button class="btn btn-primary" type="button" data-submit-batch="${title}">确定</button></footer></section>`;
  modalOverlay.classList.add("active");
  modalOverlay.querySelectorAll("[data-close]").forEach(button => button.addEventListener("click", closeLayer));
  modalOverlay.querySelector("[data-submit-batch]").addEventListener("click", submitBatchForm);
}

function submitForm(event) {
  const form = modalOverlay.querySelector("#activeForm");
  const values = collectFormValues(form);
  const type = event.currentTarget.dataset.submit;
  const id = event.currentTarget.dataset.id;
  if (!validateForm(form, type)) return toast("请检查表单错误。", "error");
  const now = currentTime();
  if (type === "product") {
    const productNumber = id || `PRD-${Date.now().toString().slice(-6)}`;
    const previous = state.data.productRows.find(item => item.productNumber === id);
    upsert("productRows", "productNumber", id, { productNumber, productName: values.productName, businessCount: previous?.businessCount || 0, createdAt: previous?.createdAt || `${now}:00`, remark: values.remark || "" });
    appendOperation(values.productName, id ? `编辑产品：${productNumber} / ${values.productName}` : `创建产品：${productNumber} / ${values.productName}`);
  }
  if (type === "business") {
    const configSummary = summarizeBusinessConfig(values);
    const businessId = id || `BIZ-${Date.now()}`;
    upsert("businessRows", "businessId", id, { businessId, businessName: values.businessName, productName: values.displayName || "金融人脸核验平台", productCode: values.productNumber, businessType: values.businessType, status: "formal", configSummary, updatedAt: now, productNumber: values.productNumber, displayName: values.displayName, config: values.config, strategyManager: values.strategyManager, mark: values.mark, configData: values });
    appendOperation(values.businessName, id ? `编辑业务配置：${configSummary}` : `创建业务：${configSummary}`);
  }
  if (type === "alarm") {
    upsert("alarmSettings", "businessId", id, { businessId: id || "BIZ-MOCK", objectName: findBusiness(id)?.businessName || "当前业务", failRateThreshold: Number(values.failRateThreshold), successRateThreshold: Number(values.successRateThreshold), notifyMethod: values.notifyMethod, notifyEnabled: values["通知开关"] === "enabled" });
  }
  if (type === "riskList") upsert("riskListRows", "id", id, { id: id || `RL-${Date.now()}`, businessId: values.businessKey, businessName: "远程开户活体核验", faceId: `FACE-${Date.now().toString().slice(-6)}`, status: "enabled", type: "人脸黑名单", validFrom: now.slice(0, 10), validTo: values.limitUnit === "不限时间" ? "不限时间" : "2026-12-31", imageCount: 1, createdAt: now });
  if (type === "strategyConfig") {
    const previous = state.data.strategyConfigRows.find(item => item.id === id);
    upsert("strategyConfigRows", "id", id, {
      id: id || `SC-${Date.now()}`,
      strategyType: values.strategyType,
      jobType: values.jobType,
      targetValue: values.jobType === "全局" ? "" : (values.targetValue || previous?.targetValue || ""),
      ruleName: previous?.ruleName || values.ruleName,
      conditionRelation: values.conditionRelation,
      clientRiskTags: Array.isArray(values.clientRiskTags) ? values.clientRiskTags : splitTags(values.clientRiskTags),
      ruleStatus: values.ruleStatus,
      todayHitCount: previous?.todayHitCount || 0,
      todayHitRate: previous?.todayHitRate || "0.00%",
      updatedAt: now,
      updatedBy: "ops_admin",
      excludeBusinessIds: values.excludeBusinessIds || "",
      remark: values.remark || ""
    });
    appendOperation(values.ruleName, id ? `编辑策略规则：${values.ruleName}` : `创建策略规则：${values.ruleName}`);
  }
  if (type === "financial") upsert("financialLivenessStrategies", "strategyId", id, { strategyId: id || `FLR-${Date.now()}`, strategyName: values.ruleName, businessType: values.targetType === "业务" ? "人脸核验-活体检测" : "全局", riskType: values.strategyType, threshold: Number(values.faceClarityThreshold || 0.8), thresholdSummary: `${values.conditionType || "且"} / ${values.riskTags || "风控检测"}`, status: values.status === "有效" ? "enabled" : "disabled", target: values.targetType || "全局", targetValue: values.targetValue || "", riskTags: splitTags(values.riskTags), detectionSwitches: readDetectionSwitches(form), updatedAt: now });
  if (type === "account") upsert("systemAccounts", "accountId", id, { accountId: id || `AC-${Date.now()}`, username: values.username, displayName: values.displayName, phone: values.phone, roleName: values.roleName, permissions: Array.isArray(values.permissions) ? values.permissions : splitTags(values.permissions), status: values["状态"] === "disabled" ? "disabled" : "enabled", latestLoginAt: "尚未登录", createdAt: now });
  closeLayer();
  toast(type === "business" ? "业务配置已更新，演示环境仅更新 mock 数据。" : "保存成功。");
  render();
}

function collectFormValues(form) {
  const values = {};
  const data = new FormData(form);
  for (const [key, value] of data.entries()) {
    if (values[key] === undefined) values[key] = value;
    else if (Array.isArray(values[key])) values[key].push(value);
    else values[key] = [values[key], value];
  }
  return values;
}

function upsert(collection, key, id, value) {
  const index = state.data[collection].findIndex(item => item[key] === id);
  if (index >= 0) state.data[collection][index] = { ...state.data[collection][index], ...value };
  else state.data[collection].push(value);
}

function validateForm(form, type) {
  let valid = true;
  form.querySelectorAll(".form-group").forEach(group => {
    if (group.hidden) return;
    const required = group.querySelector(".required");
    const controls = Array.from(group.querySelectorAll("input, select, textarea")).filter(control => !control.disabled);
    const hasValue = controls.some(control => control.type === "checkbox" || control.type === "radio" ? control.checked : String(control.value || "").trim());
    if (required && !hasValue) {
      setFieldError(group, "该字段不能为空");
      valid = false;
    } else {
      setFieldError(group, "");
    }
  });
  const values = collectFormValues(form);
  ["qualityThreshold", "compareThreshold", "searchThreshold", "blockThreshold", "threshold", "failRateThreshold", "successRateThreshold", "faceRecgThreshold"].forEach(name => {
    if (values[name] !== undefined && !isNumberInAllowedRange(form, name, values[name])) {
      setNamedError(form, name, rangeErrorMessage(form, name));
      valid = false;
    }
  });
  form.querySelectorAll("[data-validation]").forEach(group => {
    if (group.hidden || !group.dataset.validation) return;
    const name = group.dataset.fieldName;
    const rule = group.dataset.validation;
    if (!validateFieldRule(rule, values[name], values, form)) {
      setFieldError(group, validationMessage(rule));
      valid = false;
    }
  });
  if (values.topN !== undefined && (!Number.isInteger(Number(values.topN)) || Number(values.topN) <= 0)) {
    setNamedError(form, "topN", "请输入大于 0 的整数");
    valid = false;
  }
  if (type === "riskList" && values.faceId && !/^FACE-[A-Za-z0-9-]{3,}$/.test(values.faceId)) {
    setNamedError(form, "faceId", "FaceId 格式应类似 FACE-890126");
    valid = false;
  }
  if (type === "riskList" && values.valid && !isValidDateRange(values.valid)) {
    setNamedError(form, "valid", "结束日期不能早于开始日期");
    valid = false;
  }
  if (type === "financial" && values.riskTags && !splitTags(values.riskTags).length) {
    setNamedError(form, "riskTags", "请至少选择一个风险标签");
    valid = false;
  }
  if (type === "strategyConfig") {
    const submitId = modalOverlay.querySelector("[data-submit]")?.dataset.id;
    const previous = state.data.strategyConfigRows.find(item => item.id === submitId);
    const targetValue = values.targetValue || previous?.targetValue || "";
    if (!["人脸伪造检测", "环境风险拦截"].includes(values.strategyType)) {
      setNamedError(form, "strategyType", "请选择动作/策略类型");
      valid = false;
    }
    if (!["有效", "无效"].includes(values.ruleStatus)) {
      setNamedError(form, "ruleStatus", "请选择规则状态");
      valid = false;
    }
    if (!["全局", "产品", "业务"].includes(values.jobType)) {
      setNamedError(form, "jobType", "请选择作业类型");
      valid = false;
    }
    if (["产品", "业务"].includes(values.jobType) && !String(targetValue).trim()) {
      setNamedError(form, "targetValue", values.jobType === "产品" ? "请输入产品编号" : "请输入业务ID");
      valid = false;
    }
    if (!["且", "或"].includes(values.conditionRelation)) {
      setNamedError(form, "conditionRelation", "请选择风控条件关系");
      valid = false;
    }
    const selectedTags = Array.isArray(values.clientRiskTags) ? values.clientRiskTags : splitTags(values.clientRiskTags);
    if (!selectedTags.length) {
      setNamedError(form, "clientRiskTags", "请至少选择一个风险标签");
      valid = false;
    }
    if (values.excludeBusinessIds && !/^[A-Za-z0-9_-]+(,[A-Za-z0-9_-]+)*$/.test(values.excludeBusinessIds.replace(/\s/g, ""))) {
      setNamedError(form, "excludeBusinessIds", "请使用英文逗号分隔业务ID");
      valid = false;
    }
  }
  if (type === "account" && values.username) {
    const submitId = modalOverlay.querySelector("[data-submit]")?.dataset.id;
    const duplicate = state.data.systemAccounts.some(account => account.username === values.username && account.accountId !== submitId);
    if (duplicate) {
      setNamedError(form, "username", "账号已存在，请更换账号名");
      valid = false;
    }
  }
  if (type === "account" && values.phone && !/^1[3-9]\d{9}$/.test(values.phone)) {
    setNamedError(form, "phone", "请输入 11 位中国大陆手机号");
    valid = false;
  }
  return valid;
}

function validateFieldRule(rule, value, values, form) {
  if (value === undefined || value === "") return true;
  if (["percent"].includes(rule)) return isPercent(value);
  if (["zeroToOne"].includes(rule)) return isZeroToOne(value);
  if (["positiveNumber"].includes(rule)) return Number(value) > 0;
  if (["frameCount"].includes(rule)) return Number(value) >= 1 && Number(value) <= 30;
  if (["topK"].includes(rule)) return Number(value) >= 1 && Number(value) <= 10;
  if (rule === "dateAfterStart") return !values.startTime || new Date(value).getTime() > new Date(values.startTime).getTime();
  if (rule === "faceIds") return validateFaceIds(value, values.businessKey);
  if (rule === "actionCount") return validateCountAgainstChecked(value, form, "actions");
  if (rule === "rgbActionCount") return validateCountAgainstChecked(value, form, "rgbActions");
  return true;
}

function validationMessage(rule) {
  const messages = {
    percent: "请输入 0-100 的数值",
    zeroToOne: "请输入 0-1 的数值",
    positiveNumber: "请输入大于 0 的数值",
    frameCount: "请输入 1-30 的整数",
    topK: "请输入 1-10 的整数",
    dateAfterStart: "结束时间必须晚于开始时间",
    faceIds: "多个 FaceId 最多 100 个，且批量查询需填写业务Id",
    actionCount: "下发动作个数不能超过动作内容个数",
    rgbActionCount: "下发RGB动作个数不能超过RGB动作内容个数"
  };
  return messages[rule] || "字段格式不正确";
}

function validateCountAgainstChecked(value, form, name) {
  if (value === "随机") return true;
  const selected = form.querySelectorAll(`[name="${name}"]:checked`).length;
  return Number.isInteger(Number(value)) && Number(value) > 0 && Number(value) <= Math.max(selected, 1);
}

function validateFaceIds(value, businessKey) {
  const ids = String(value || "").split(/[\s,，]+/).filter(Boolean);
  if (!ids.length) return true;
  return ids.length <= 100 && Boolean(String(businessKey || "").trim());
}

function isNumberInAllowedRange(form, name, value) {
  const rule = form.querySelector(`[data-field-name="${name}"]`)?.dataset.validation;
  if (rule === "zeroToOne") return isZeroToOne(value);
  return isPercent(value);
}

function rangeErrorMessage(form, name) {
  const rule = form.querySelector(`[data-field-name="${name}"]`)?.dataset.validation;
  return rule === "zeroToOne" ? "请输入 0-1 的数值" : "请输入 0-100 的数值";
}

function isZeroToOne(value) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 && number <= 1;
}

function setFieldError(group, message) {
  group.classList.toggle("error", Boolean(message));
  const error = group.querySelector(".field-error");
  if (error) error.textContent = message;
}

function setNamedError(form, name, message) {
  const control = form.querySelector(`[name="${name}"]`);
  if (control) setFieldError(control.closest(".form-group"), message);
}

function isPercent(value) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 && number <= 100;
}

function parseDateRange(value) {
  return String(value || "").split("至").map(item => item.trim());
}

function isValidDateRange(value) {
  const [start, end] = parseDateRange(value);
  if (!start || !end) return false;
  return new Date(start).getTime() <= new Date(end).getTime();
}

function summarizeBusinessConfig(values) {
  const type = values.businessType;
  const summaryMap = {
    "人脸核验-活体检测": [
      `认证${values.authSolutionType || "未设"}`,
      `动作${values.actionSwitch || "未设"}`,
      `静默${values.silentCheck || "未设"}`,
      `鉴伪${values.deepfakeEnable || "未设"}`,
      `降级${values.reduceCheck || "未设"}`
    ],
    "人脸核验-人脸比对": [
      `比对阈值 ${values.faceRecgThreshold || "未设"}`,
      `前置完整度${values.faceCompleteCheck || "未设"}`,
      `活体${values.liveness || "未设"}`,
      `清晰照${values.hdImage || "未设"}`
    ],
    "人脸核验-人脸检索": [
      `质量${values.quality || "未设"}`,
      `活体${values.liveness || "未设"}`,
      `分数 ${values.faceRecgThreshold || "未设"}`,
      `人脸库${values.status || "全部"}`
    ],
    "人脸核验-人脸检测": [
      `属性${values.attributeSwitch || "未设"}`,
      `未成年${values.nonageCheck || "未设"}`,
      `口罩${values.maskCheck || "未设"}`,
      `性别阈值 ${values.genderRateThreshold || "未设"}`
    ],
    "人脸核验-人脸深伪检测": [
      `鉴伪${values.deepfakeGuardSwitch || "未设"}`,
      `DeepFake阈值 ${values.deepFakeCheckThreshold || "未设"}`,
      `静默阈值 ${values.silentCheckThreshold || "未设"}`,
      `截帧 ${values.videoFrameCount || "未设"}`,
      `过检照 ${values.videoTopK || "未设"}`
    ]
  };
  return (summaryMap[type] || [`${values.config || "配置功能"}`, `产品ID ${values.productNumber || "未填"}`]).join(" / ");
}

function readDetectionSwitches(form) {
  return {
    faceQuality: getToggleEnabled(form, "faceQualitySwitch"),
    occlusion: getToggleEnabled(form, "occlusionSwitch"),
    clarity: getToggleEnabled(form, "claritySwitch")
  };
}

function getToggleEnabled(root, name) {
  const control = root.querySelector(`[name="${name}"]`);
  return control ? !["disabled", "关闭"].includes(control.value) : false;
}

function splitTags(value) {
  return String(value || "").split(/[、,，]/).map(item => item.trim()).filter(Boolean);
}

function submitBatchForm(event) {
  const form = modalOverlay.querySelector("#activeForm");
  if (!validateForm(form, "batch")) return toast("请检查表单错误。", "error");
  const summary = new FormData(form).get("batchSummary");
  state.data.businessRows.forEach(row => {
    if (state.selectedBusinessIds.has(row.businessId)) {
      row.configSummary = summary;
      row.updatedAt = currentTime();
      appendOperation(row.businessName, event.currentTarget.dataset.submitBatch);
    }
  });
  closeLayer();
  toast("批量配置已模拟提交。");
  render();
}

function applyBatchClose() {
  state.data.businessRows.forEach(row => {
    if (state.selectedBusinessIds.has(row.businessId)) {
      row.status = "closed";
      row.updatedAt = currentTime();
      appendOperation(row.businessName, "批量关闭业务");
    }
  });
  toast("批量关闭已模拟提交。");
  render();
}

function submitBusinessConfig(id) {
  const form = drawerOverlay.querySelector("#drawerConfigForm");
  if (!validateForm(form, "business")) return toast("请检查表单错误。", "error");
  const values = collectFormValues(form);
  const row = findBusiness(id);
  row.configData = { ...(row.configData || {}), ...values };
  row.configSummary = values.note || summarizeBusinessConfig({ ...row.configData, businessType: row.businessType });
  row.updatedAt = currentTime();
  appendOperation(row.businessName, `更新单业务配置：${row.configSummary}`);
  closeLayer();
  toast("业务配置已更新，演示环境仅更新 mock 数据。");
  render();
}

function appendOperation(objectName, actionSummary) {
  state.data.businessOperationRecords.unshift({ operator: "ops_admin", objectName, actionSummary, result: "success", ip: "10.18.4.21", createdAt: currentTime() });
  state.data.operationLogs.unshift({ logId: `LOG-${Date.now()}`, operator: "ops_admin", objectName, opDetail: actionSummary, actionSummary, result: "success", ip: "10.18.4.21", opTime: currentTime(), createdAt: currentTime() });
}

function findBusiness(id) {
  return state.data.businessRows.find(row => row.businessId === id);
}

function syncToggle(button) {
  button.classList.toggle("checked");
  const input = button.parentElement.querySelector("input[type='hidden']");
  if (!input) return;
  const usesChineseState = ["开启", "关闭"].includes(input.value);
  input.value = button.classList.contains("checked") ? (usesChineseState ? "开启" : "enabled") : (usesChineseState ? "关闭" : "disabled");
}

function currentTime() {
  return "2026-06-20 12:00";
}

function openDrawer(type, id) {
  const titleMap = { business: "业务详情", records: "操作记录", config: "更新配置", log: "日志详情" };
  const bodyMap = { business: businessDetail(id), records: recordsDetail(id), config: configDetail(id), log: logDetail(id) };
  drawerOverlay.innerHTML = `<aside class="drawer ${type === "config" ? "drawer-lg" : ""}" aria-labelledby="drawerTitle"><header class="drawer-header"><h2 id="drawerTitle">${titleMap[type]}</h2><button class="drawer-close" type="button" aria-label="关闭" data-close>×</button></header><div class="drawer-body">${bodyMap[type]}</div></aside>`;
  drawerOverlay.classList.add("active");
  drawerOverlay.querySelectorAll("[data-close]").forEach(button => button.addEventListener("click", closeLayer));
  bindDynamicForm(drawerOverlay);
  drawerOverlay.querySelectorAll("[data-submit-config]").forEach(button => button.addEventListener("click", () => submitBusinessConfig(id)));
}

function businessDetail(id) {
  const row = state.data.businessRows.find(item => item.businessId === id);
  return `<div class="drawer-section-title">基础信息</div>${infoGrid([["业务 ID", row.businessId], ["业务名称", row.businessName], ["关联产品", row.productName], ["产品编码", row.productCode], ["业务类型", row.businessType]])}`;
}

function recordsDetail() {
  return `${table(["操作人", "对象", "操作内容", "结果", "IP", "时间"], state.data.businessOperationRecords.map(row => [row.operator, row.objectName, row.actionSummary, resultTag(row.result), row.ip, row.createdAt]))}`;
}

function configDetail(id) {
  const row = state.data.businessRows.find(item => item.businessId === id);
  return `<div class="alert">配置抽屉只更新演示数据，不调用真实接口。</div><form id="drawerConfigForm">${formGrid([readonlyBlock("业务类型", row.businessType, "按当前业务类型展示配置差异。"), `<div class="full">${businessConfigFields(row.businessType, row)}</div>`, field("配置备注", "note", row.configSummary, false, "textarea")])}</form><footer class="drawer-footer"><button class="btn" type="button" data-close>取消</button><button class="btn btn-primary" type="button" data-submit-config>确定</button></footer>`;
}

function logDetail(id) {
  const row = state.data.operationLogs.find(item => item.logId === id);
  return `<div class="drawer-section-title">审计详情</div>${infoGrid([["日志编号", row.logId], ["操作人", row.operator], ["操作对象", row.objectName], ["描述 opDetail", row.opDetail || row.actionSummary], ["结果", resultTag(row.result)], ["IP", row.ip], ["操作时间 opTime", row.opTime || row.createdAt]])}<div class="alert">变更摘要：${row.actionSummary}</div>`;
}

function confirmDelete(payload) {
  const [type, id] = payload.split(":");
  const titles = { riskList: "确定删除该黑名单记录？", financial: "确定删除该风险策略？", strategyConfig: "确定删除该策略规则？", account: "确定删除该账号？" };
  confirmModal(titles[type], "该操作仅从 mock 数据中移除，不调用真实后端。", "删除", () => {
    const map = { riskList: ["riskListRows", "id"], financial: ["financialLivenessStrategies", "strategyId"], strategyConfig: ["strategyConfigRows", "id"], account: ["systemAccounts", "accountId"] };
    const [collection, key] = map[type];
    state.data[collection] = state.data[collection].filter(item => item[key] !== id);
    toast("记录已删除，演示环境仅更新 mock 数据。");
    render();
  });
}

function confirmToggle(payload) {
  const [type, id] = payload.split(":");
  confirmModal("确认切换状态？", "状态切换仅更新 mock 数据，请确认影响范围。", "确认", () => {
    if (type === "strategyConfig") {
      const row = state.data.strategyConfigRows.find(item => item.id === id);
      row.ruleStatus = row.ruleStatus === "有效" ? "无效" : "有效";
      row.updatedAt = currentTime();
      appendOperation(row.ruleName, `切换策略规则状态：${row.ruleStatus}`);
      toast("状态已更新。");
      render();
      return;
    }
    const map = { financial: ["financialLivenessStrategies", "strategyId"] };
    const [collection, key] = map[type];
    const row = state.data[collection].find(item => item[key] === id);
    row.status = row.status === "enabled" ? "disabled" : "enabled";
    toast("状态已更新。");
    render();
  });
}

function confirmBusinessClose(id) {
  confirmModal("确认关闭业务？", "该操作仅 mock 切换状态，不调用后端状态接口。", "确认关闭", () => {
    state.data.businessRows.find(row => row.businessId === id).status = "closed";
    toast("业务已模拟关闭。");
    render();
  });
}

function confirmModal(title, text, okText, onOk) {
  modalOverlay.innerHTML = `<section class="modal" aria-labelledby="modalTitle"><header class="modal-header"><h2 id="modalTitle">${title}</h2><button class="modal-close" type="button" aria-label="关闭" data-close>×</button></header><div class="modal-body"><p>${text}</p></div><footer class="modal-footer"><button class="btn" type="button" data-close>取消</button><button class="btn btn-danger" type="button" data-ok>${okText}</button></footer></section>`;
  modalOverlay.classList.add("active");
  modalOverlay.querySelectorAll("[data-close]").forEach(button => button.addEventListener("click", closeLayer));
  modalOverlay.querySelector("[data-ok]").addEventListener("click", () => { closeLayer(); onOk(); });
}

function closeLayer() {
  modalOverlay.classList.remove("active");
  drawerOverlay.classList.remove("active");
  modalOverlay.innerHTML = "";
  drawerOverlay.innerHTML = "";
}

function field(label, name, value = "", required = false, type = "input", disabled = false) {
  const inputId = `${name}-${Math.random().toString(16).slice(2)}`;
  const disabledAttr = disabled ? " disabled" : "";
  const control = type === "textarea" ? `<textarea id="${inputId}" name="${name}" class="form-textarea"${disabledAttr}>${value || ""}</textarea>` : `<input id="${inputId}" name="${name}" class="form-input" value="${value || ""}"${disabledAttr} />`;
  return `<div class="form-group"><label class="form-label" for="${inputId}">${label}${required ? ` <span class="required">*</span>` : ""}</label>${control}<div class="field-error" id="${inputId}-error"></div></div>`;
}

function selectFieldForModal(label, name, options, value = "", required = false) {
  const inputId = `${name}-${Math.random().toString(16).slice(2)}`;
  return `<div class="form-group"><label class="form-label" for="${inputId}">${label}${required ? ` <span class="required">*</span>` : ""}</label><select id="${inputId}" name="${name}" class="form-select">${options.map(option => `<option ${value === option ? "selected" : ""}>${option}</option>`).join("")}</select><div class="field-error"></div></div>`;
}

function readonlyBlock(label, value, help) {
  return `<div class="form-group"><label class="form-label">${label}</label><div class="form-input readonly-field">${value}</div><div class="form-help">${help}</div></div>`;
}

function cascaderField(label, name, values = [], config = {}) {
  const selected = Array.isArray(values) ? values : splitTags(values);
  const options = config.options || [];
  return `<div class="form-group full"><label class="form-label">${label}</label><div class="cascader-like" data-field-key="${name}"><div class="form-help">级联选择：${config.help || "按源字段层级选择。"}</div>${options.map(([parent, child]) => `<label><input type="checkbox" name="${name}" value="${child}" ${selected.includes(child) ? "checked" : ""} /><span>${parent}</span><strong>${child}</strong></label>`).join("")}</div><div class="field-error"></div></div>`;
}

function toggleField(label, checked) {
  return namedToggleField(label, label, checked);
}

function namedToggleField(label, name, checked) {
  return `<div class="form-group"><label class="form-label">${label}</label><button class="toggle ${checked ? "checked" : ""}" type="button" aria-label="${label}"></button><input type="hidden" name="${name}" value="${checked ? "enabled" : "disabled"}" /><div class="field-error"></div></div>`;
}

function switchGroup() {
  return `<div class="form-group full"><label class="form-label">检测开关</label><div class="check-row"><label><input type="checkbox" name="faceQualitySwitch" checked />人脸质量检测</label><label><input type="checkbox" name="occlusionSwitch" checked />遮挡检测</label><label><input type="checkbox" name="claritySwitch" checked />清晰度检测</label></div></div>`;
}

function uploadField() {
  return `<div class="form-group full"><label class="form-label">上传照片</label><div class="upload-box"><button class="btn" type="button" data-upload>点击上传</button><div class="form-help">只展示文件名和 mock 进度，不处理真实文件。</div></div></div>`;
}

function formGrid(fields) {
  return `<div class="form-grid">${fields.join("")}</div>`;
}

function formStack(fields) {
  return `<div class="form-stack">${fields.join("")}</div>`;
}

function infoGrid(items) {
  return `<div class="drawer-info-grid">${items.map(([label, value]) => `<div class="info-item"><div class="label">${label}</div><div class="value">${value}</div></div>`).join("")}</div>`;
}

function action(text, attrs, danger = "") {
  return `<button class="action-link ${danger}" type="button" ${attrs}>${text}</button>`;
}

function clickable(text, attrs) {
  return `<button class="action-link" type="button" ${attrs}>${text}</button>`;
}

function statusTag(status) {
  const map = { enabled: ["启用", "green"], disabled: ["停用", "gray"], trial: ["试用", "blue"], formal: ["正式", "green"], closed: ["关闭", "gray"], error: ["异常", "red"] };
  const [text, type] = map[status] || [status, "gray"];
  return tag(text, type);
}

function resultTag(result) {
  return result === "success" ? tag("成功", "green") : tag("失败", "red");
}

function tag(text, type) {
  return `<span class="tag tag-${type}">${text}</span>`;
}

function loadingBlock(text) {
  return `<section class="table-wrap"><div class="table-top"><span>${text}</span></div><div class="skeleton-table"><div class="skeleton-row"></div><div class="skeleton-row"></div><div class="skeleton-row"></div><div class="skeleton-row"></div></div></section>`;
}

function emptyState(title, desc) {
  return `<section class="empty-state"><div><h2>${title}</h2><p>${desc}</p><button class="btn" type="button" data-reset>重置筛选</button></div></section>`;
}

function errorState(title, desc) {
  return `<section class="error-state"><div><h2>${title}</h2><p>${desc}</p><button class="btn btn-primary" type="button" data-query>重新查询</button></div></section>`;
}

function toast(message, type = "success") {
  const item = document.createElement("div");
  item.className = `toast ${type}`;
  item.textContent = message;
  toastStack.appendChild(item);
  window.setTimeout(() => item.remove(), 2600);
}

init();
