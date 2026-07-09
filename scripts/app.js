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
  aiSampleExpandedGroups: null,
  collapsedGroups: new Set(),
  openActionPopover: null,
  activeNotificationId: null,
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
    if (event.key === "Escape") {
      if (state.openActionPopover) closeActionMenu();
      else if (modalOverlay.classList.contains("image-preview-overlay")) closeImagePreview();
      else closeLayer();
    }
  });
  document.addEventListener("click", event => {
    if (!state.openActionPopover) return;
    if (event.target.closest(".row-action-popover") || event.target.closest("[data-row-action-menu]")) return;
    closeActionMenu();
  });
  window.addEventListener("scroll", closeActionMenu, true);
  window.addEventListener("resize", closeActionMenu);
  document.querySelector("[data-open-notifications]")?.addEventListener("click", () => openDrawer("notifications"));
}

function routeFromHash() {
  closeActionMenu();
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
  closeActionMenu();
  const item = findNavItem(state.route) || findNavItem("dashboard");
  state.route = item.route;
  const activeGroupIndex = navGroups.findIndex(group => group.items.some(navItem => navItem.route === state.route));
  if (state.collapsedGroups.has(activeGroupIndex)) {
    state.collapsedGroups.delete(activeGroupIndex);
    renderNav();
  }
  renderActiveNav();
  renderNotificationCount();
  breadcrumb.innerHTML = "";
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
  const descMarkup = desc ? `<p class="page-desc">${desc}</p>` : "";
  return `<div class="page-header"><div><h1 class="page-title">${title}</h1>${descMarkup}</div><div class="button-row">${actions}</div></div>`;
}

function renderDashboard() {
  const overview = getOverviewViewData();
  return `${pageHeader("业务请求概览", "按产品和业务追踪请求量、通过量趋势，辅助定位接入表现和流量波动。")}
    ${overviewFilters()}
    <section class="stat-grid compact-stat-grid">${overview.metrics.map(statCard).join("")}</section>
    <section class="overview-split">
      <aside class="business-list-card">
        <div class="chart-title"><span>业务列表</span></div>
        ${overview.businessList.length ? `<div class="business-select-list">${overview.businessList.map(item => `<button class="business-list-item ${item.id === state.selectedOverviewBusinessId ? "active" : ""}" type="button" data-overview-business="${item.id}"><span>${item.label}</span><small>${item.countLabel}</small></button>`).join("")}</div>` : emptyState("暂无匹配业务", "请调整筛选条件后重新查询。")}
      </aside>
      ${trendChartCard("业务请求趋势", overview.labels, [{ name: "检测量", values: overview.detectionSeries, tone: "primary" }, { name: "通过量", values: overview.passSeries, tone: "success" }], overview.selectedLabel, `<button class="btn" type="button" data-export-overview>导出</button>`)}
    </section>`;
}

function renderDeepfakeOverview() {
  const overview = getSecurityViewData();
  return `${pageHeader("安全态势概览", "汇总请求、拦截和风险标签态势，辅助识别业务安全风险变化。")}
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
  return `${pageHeader("产品管理", "维护产品基础信息，并快速查看归属业务与相关操作记录。")}
    ${productFilters()}
    ${tableWrap("产品列表", renderPagedTable(rows, ["产品编号", "产品名称", "业务数量", "更新时间", "更新账号", "备注", "操作日志", "操作"], productRow), `<button class="btn btn-primary" type="button" data-form="product">创建</button>`)}`;
}

function renderBusiness() {
  const rows = filterBusinessRows(state.data.businessRows);
  return `${pageHeader("业务管理", "管理业务接入、配置策略和监控告警，支撑产品下业务的日常运营。")}
    ${businessFilters()}
    ${tableWrap("业务列表", renderPagedTable(rows, ["业务 ID", "业务名称", "关联产品", "业务类型", "业务状态", "配置摘要", "更新时间", "更新账号", "备注", "操作"], businessRow), `<button class="btn btn-primary" type="button" data-form="business">创建业务</button>`)}`;
}

function renderRiskList() {
  const tabs = ["活体黑名单", "人脸库查询"];
  const sourceRows = state.riskListTab === "活体黑名单" ? state.data.riskListRows : state.data.faceLibraryReadonlyRows;
  const rows = filterRiskListRows(sourceRows);
  const action = state.riskListTab === "活体黑名单" ? `<button class="btn btn-primary" type="button" data-form="riskList">创建</button>` : "";
  return `${pageHeader("人脸黑名单库", "维护风险人脸名单并查询人脸库记录，支撑业务风险拦截与核查。")}
    ${tabsHtml(tabs, state.riskListTab, "riskListTab")}
    ${riskListFilters()}
    ${tableWrap(state.riskListTab, renderPagedTable(rows, riskListHeaders(), riskListRow), action)}`;
}

function renderFinancialRisk() {
  const rows = filterStrategyConfigRows(state.data.strategyConfigRows);
  return `${pageHeader("策略配置", "配置风险识别与拦截规则，支撑不同产品和业务的策略治理。")}
    ${strategyConfigFilters()}
    ${tableWrap("策略规则表格", renderPagedTable(rows, ["动作/策略类型", "作用对象", "规则名称", "风控条件关系", "客户端风控检测", "规则状态", "今日命中量/命中率", "更新时间", "最后更新人", "备注", "操作"], strategyConfigRow), `<button class="btn btn-primary" type="button" data-form="strategyConfig">创建</button>`)}`;
}

function renderOperationRecord() {
  const rows = filterOperationRows(state.data.operationLogs);
  return `${pageHeader("操作日志", "查询系统操作记录，支撑配置变更、账号操作和审计追溯。")}
    ${operationFilters()}
    ${tableWrap("操作日志", renderPagedTable(rows, ["日志编号", "操作人", "操作对象", "描述", "结果", "IP", "操作时间"], logRow))}`;
}

function renderSystem() {
  const accountAction = state.systemTab === "账号管理" ? `<button class="btn btn-primary" type="button" data-form="account">创建</button>` : "";
  return `${pageHeader("系统管理", "管理后台账号与权限范围，支撑私有化环境的人员访问控制。")}
    ${tabsHtml(["账号管理", "角色权限摘要"], state.systemTab, "systemTab")}
    ${state.systemTab === "账号管理" ? `${systemFilters()}${tableWrap("账号列表", renderPagedTable(filterSystemRows(state.data.systemAccounts), ["账号", "姓名", "手机号码", "角色", "产品管理权限", "状态", "最近登录", "创建时间", "操作"], accountRow), accountAction)}` : tableWrap("角色权限摘要", table(["角色名称", "角色说明", "可访问模块", "成员数", "更新时间"], state.data.rolePermissionSummary.map(row => [row.roleName, row.description, row.modules.map(item => tag(item, "blue")).join(" "), row.memberCount, row.updatedAt])))} `;
}

function overviewFilters() {
  const placeholderMap = { 产品编号: "请输入产品编号", 产品名称: "请输入产品名称", "业务ID": "请输入业务ID", 业务名称: "请输入业务名称" };
  const findType = state.filters.findType || "产品编号";
  return filterBar([comboSearchField("findType", "查找方式", ["产品编号", "产品名称", "业务ID", "业务名称"], "keyword", placeholderMap[findType] || "请输入产品编号"), businessTypeField(), selectField("timeType", "时间类型", ["日", "月"]), dateField("时间范围")]);
}

function securityFilters(overview) {
  const products = state.data.productRows.map(row => row.productName);
  const productName = state.filters.productName || products[0];
  const businesses = state.data.businessRows.filter(row => row.productName === productName).map(row => row.businessName);
  return `<section class="filter-card">${filterBar([selectField("productName", "产品名称", products), selectField("businessName", "业务名称", businesses.length ? businesses : ["全部"], state.filters.businessName), dateField("查询时间")])}<div class="status-line"><div class="status-meta"><span>业务类型：${overview.businessType}</span><span class="business-status-field"><span>业务状态：</span>${businessStatusTag(overview.businessStatusValue)}</span></div><button class="btn btn-highlight" type="button" data-drawer="aiSamples">查看AI伪造人脸样本</button></div></section>`;
}

function productFilters() {
  return filterBar([textField("productNumber", "产品编号", "PRD-LIVE-01"), textField("productName", "产品名称", "金融人脸核验平台"), textField("startTime", "开始时间", "2026-05-01"), textField("endTime", "结束时间", "2026-06-30")]);
}

function deepfakeFilters() {
  return filterBar([dateField(), textField("channel", "通道名称", "手机银行 APP"), selectField("strategy", "命中策略类型", ["全部", "深伪高置信拦截", "屏幕翻拍识别", "视频重放识别"]), businessTypeField()], true);
}

function businessFilters() {
  return filterBar([textField("businessId", "业务 ID", "BIZ-1001"), textField("keyword", "业务名称", "远程开户"), textField("product", "产品名称", "金融人脸核验平台"), businessTypeField(), selectField("businessStatus", "业务状态", ["全局", "已开通", "未开通"])]);
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
  return `<div class="form-group filter-date"><label class="form-label" for="dateRange">${label}</label><input id="dateRange" name="dateRange" class="form-input" value="${state.filters.dateRange || "2026-06-14 至 2026-06-20"}" /></div>`;
}

function comboSearchField(selectName, label, options, inputName, placeholder) {
  const current = state.filters[selectName];
  const placeholders = { 产品编号: "请输入产品编号", 产品名称: "请输入产品名称", "业务ID": "请输入业务ID", 业务名称: "请输入业务名称" };
  const placeholderAttrs = Object.entries(placeholders).map(([key, value]) => `data-placeholder-${key}="${value}"`).join(" ");
  return `<div class="form-group filter-combo-field"><label class="form-label" for="${selectName}">${label}</label><div class="combo-search-control"><select id="${selectName}" name="${selectName}" class="form-select combo-search-select" data-combo-select="${inputName}">${options.map((option, index) => `<option ${current === option || (!current && index === 0) ? "selected" : ""}>${option}</option>`).join("")}</select><input name="${inputName}" class="form-input combo-search-input" placeholder="${placeholder}" value="${state.filters[inputName] || ""}" ${placeholderAttrs} /></div></div>`;
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
  const change = item.change ? `<div class="stat-change ${item.changeTone || ""}">${item.change}</div>` : "";
  return `<article class="stat-card"><div class="stat-label">${item.label}</div><div class="stat-value">${item.value}</div>${change}</article>`;
}

function chartCard(title, values, labels = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"], actions = "") {
  const body = state.chartType === "line" ? `<div class="chart-stage"><div class="chart-line">${values.map(value => `<span class="line-point chart-opacity-${bucket(value)}"></span>`).join("")}</div></div>` : `<div class="chart-stage">${values.map((value, index) => `<div class="chart-bar-item"><div class="chart-bar chart-h-${bucket(value)}"></div><span>${labels[index] || `项${index + 1}`}</span></div>`).join("")}</div>`;
  return `<section class="chart-card"><div class="chart-title"><span>${title}</span><div class="button-row">${actions}</div></div>${body}</section>`;
}

function trendChartCard(title, labels, series, subtitle = "", actions = chartExportActions()) {
  const max = Math.max(...series.flatMap(item => item.values), 1);
  const ticks = chartTicks(max);
  return `<section class="chart-card trend-chart-card">
    <div class="chart-title"><span>${title}${subtitle ? ` · ${subtitle}` : ""}</span><div class="button-row">${actions}</div></div>
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
  const businessRows = overviewFilteredBusinessRows();
  const businessList = [{ id: "all", label: "所有业务", countLabel: "汇总" }, ...businessRows.map(row => ({ id: row.businessId, label: `${row.productName}-${row.businessName}`, countLabel: row.businessType }))];
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
      { label: "总检测量", value: formatNumber(total) },
      { label: `${timeType === "月" ? "月均" : "日均"}检测量`, value: formatNumber(average) },
      { label: "总通过量", value: formatNumber(pass) },
      { label: "通过率", value: `${((pass / Math.max(total, 1)) * 100).toFixed(2)}%` }
    ]
  };
}

function overviewFilteredBusinessRows() {
  const findType = state.filters.findType || "产品编号";
  const keyword = state.filters.keyword || "";
  return state.data.businessRows.filter(row =>
    matchSelect(row.businessType, state.filters.businessType) &&
    matchesOverviewKeyword(row, findType, keyword)
  );
}

function matchesOverviewKeyword(row, findType, keyword) {
  if (!keyword) return true;
  const fieldMap = {
    产品编号: "productCode",
    产品名称: "productName",
    "业务ID": "businessId",
    业务名称: "businessName"
  };
  const key = fieldMap[findType];
  return includesText(row[key], keyword);
}

function getBusinessRequestSeries(businessId, timeType) {
  const source = state.data.businessRequestOverviewMock;
  const isMonth = timeType === "月";
  if (businessId !== "all") {
    const row = source.businessSeries?.[businessId];
    if (row) return { detection: isMonth ? row.monthlyDetection : row.dailyDetection, pass: isMonth ? row.monthlyPass : row.dailyPass };
  }
  const retainedBusinessIds = new Set(overviewFilteredBusinessRows().map(row => row.businessId));
  const rows = Object.entries(source.businessSeries || {}).filter(([id]) => retainedBusinessIds.has(id)).map(([, series]) => series);
  if (!rows.length) return { detection: source.detectionSeries, pass: source.passSeries };
  const detectionKey = isMonth ? "monthlyDetection" : "dailyDetection";
  const passKey = isMonth ? "monthlyPass" : "dailyPass";
  return { detection: sumSeries(rows.map(row => row[detectionKey])), pass: sumSeries(rows.map(row => row[passKey])) };
}

function exportBusinessRequestTrend() {
  const rows = businessRequestExportRows();
  if (!rows.length) return toast("暂无可导出数据。", "error");
  downloadCsv(`业务请求趋势_${state.filters.timeType || "日"}.csv`, rows);
  toast("业务请求趋势已导出。");
}

function businessRequestExportRows() {
  const overview = getOverviewViewData();
  const timeType = state.filters.timeType || "日";
  const selectedBusiness = state.selectedOverviewBusinessId === "all" ? null : state.data.businessRows.find(row => row.businessId === state.selectedOverviewBusinessId);
  return overview.labels.map((label, index) => {
    const dateLabel = formatRequestTime(label, timeType);
    return {
      请求时间: dateLabel,
      产品编码: selectedBusiness?.productCode || "全部",
      产品名称: selectedBusiness?.productName || "全部产品",
      业务名称: selectedBusiness?.businessName || "所有业务",
      检测量: overview.detectionSeries[index] || 0,
      通过量: overview.passSeries[index] || 0
    };
  });
}

function formatRequestTime(label, timeType) {
  const text = String(label || "");
  if (timeType === "月") {
    const match = text.match(/(\d{4})[-/.年](\d{1,2})/);
    return match ? `${match[1]}-${match[2].padStart(2, "0")}` : text;
  }
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : `2026-${text}`;
}

function downloadCsv(filename, rows) {
  const headers = ["请求时间", "产品编码", "产品名称", "业务名称", "检测量", "通过量"];
  const csv = [headers.join(","), ...rows.map(row => headers.map(header => csvCell(row[header])).join(","))].join("\n");
  const blob = new Blob([`\ufeff${csv}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function csvCell(value) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
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
  const productBusinesses = state.data.businessRows.filter(row => row.productName === productName);
  const selectedBusiness = productBusinesses.find(row => row.businessName === state.filters.businessName) || productBusinesses[0];
  const businessName = selectedBusiness?.businessName || state.filters.businessName || "全部";
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
    businessType: selectedBusiness?.businessType || "-",
    businessStatusValue: selectedBusiness?.businessStatus || "disabled",
    businessStatus: selectedBusiness ? businessStatusLabel(selectedBusiness.businessStatus) : "未开通",
    requestMetrics: [
      { label: "总请求量", value: formatNumber(requestTotal), change: "↓ 8.01% 环比", changeTone: "down" },
      { label: "通过量", value: formatNumber(passTotal), change: "↓ 10.91% 环比", changeTone: "down" },
      { label: "通过率", value: `${((passTotal / Math.max(requestTotal, 1)) * 100).toFixed(2)}%`, change: "↓ 3.05% 环比", changeTone: "down" }
    ],
    interceptMetrics: [
      { label: "总过检量", value: formatNumber(requestTotal), change: "↓ 8.01% 环比", changeTone: "down" },
      { label: "拦截量", value: formatNumber(interceptTotal), change: "↑ 76.47% 环比", changeTone: "down" },
      { label: "拦截率", value: `${((interceptTotal / Math.max(requestTotal, 1)) * 100).toFixed(2)}%`, change: "↑ 3.05% 环比", changeTone: "down" }
    ],
    requestTrend,
    passTrend,
    interceptTrend,
    clientDistribution: distribution(["Android", "iOS", "鸿蒙", "Web/H5"], state.data.securitySituationOverviewMock.clientDistribution, factor),
    deviceRiskLevels: distribution(["正常", "低风险", "中风险", "高风险"], state.data.securitySituationOverviewMock.deviceRiskLevels, factor),
    deviceRiskTags: distribution(["设备疑似为黑灰产", "设备疑似被注入", "云真机设备", "设备疑似被自动点击操作", "摄像头疑似被外部流注入", "疑似为模拟器设备", "设备疑似被ROOT/越狱", "Token类数据异常", "命中设备/IP黑名单"], state.data.securitySituationOverviewMock.deviceRiskTags, factor),
    deviceInterceptTrend: scaleRawSeries(state.data.securitySituationOverviewMock.deviceInterceptTrend, factor, seed),
    silentRiskTrend: scaleRawSeries(state.data.securitySituationOverviewMock.silentRiskTrend, factor, seed),
    picRiskTags: distribution(["疑似深度合成人脸", "疑似AI换脸模板攻击", "疑似翻拍人脸攻击"], state.data.securitySituationOverviewMock.picRiskTags, factor),
    hittype: distribution(["设备风险拦截", "人脸伪造拦截", "人脸情报库拦截"], state.data.securitySituationOverviewMock.hittype, factor)
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
    <section class="overview-chart-grid">${trendChartCard("拦截量趋势", overview.labels, [{ name: "拦截量", values: overview.interceptTrend, tone: "danger" }])}${donutCard("拦截原因分布", overview.hittype)}</section>`;
}

function renderSecurityPersistentDetail(overview) {
  return `<section class="section-stack"><h2 class="section-title">安全态势详情</h2>
    <div class="drawer-section-title">设备风险详情</div>
    <div class="overview-chart-grid risk-device-grid">${donutCard("设备风险等级分布", overview.deviceRiskLevels)}${trendChartCard("设备风险拦截趋势", overview.labels, [{ name: "拦截量", values: overview.deviceInterceptTrend, tone: "danger" }])}</div>
    ${barListCard("设备风险标签分布", overview.deviceRiskTags)}
    <div class="drawer-section-title">人脸深伪风险详情</div>
    <div class="overview-chart-grid">${trendChartCard("人脸深伪风险趋势", overview.labels, [{ name: "拦截量", values: overview.silentRiskTrend, tone: "danger" }])}${donutCard("人脸照风险标签分布", overview.picRiskTags)}</div>
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

function tableWrap(title, content, actions = "") {
  const toolbar = actions ? `<div class="table-top"><div class="table-actions button-row">${actions}</div></div>` : "";
  return `<section class="table-wrap">${toolbar}${content}</section>`;
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
  const mark = row.mark || "-";
  return [row.businessId, row.businessName, row.productName, row.businessType, businessStatusTag(row.businessStatus), `<span class="cell-ellipsis" title="${row.configSummary}">${row.configSummary}</span>`, row.updatedAt, row.updatedBy || "ops_admin", `<span class="cell-ellipsis" title="${mark}">${mark}</span>`, businessMoreMenu(row)];
}

function productRow(row) {
  return [row.productNumber, row.productName, row.businessCount, row.updatedAt || "-", row.updatedBy || "-", `<span class="cell-ellipsis" title="${row.remark || "-"}">${row.remark || "-"}</span>`, action("查看日志", `data-product-log="${row.productNumber}"`), `${action("编辑", `data-form="product" data-id="${row.productNumber}"`)}${action("查看业务", `data-product-business="${row.productName}"`)}`];
}

function businessMoreMenu(row) {
  return `<button class="action-link" type="button" data-row-action-menu="${row.businessId}" aria-haspopup="menu">更多</button>`;
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

function bindActions() {
  app.querySelectorAll("[data-query]").forEach(button => button.addEventListener("click", applyFilters));
  app.querySelectorAll("[data-reset]").forEach(button => button.addEventListener("click", () => { state.filters = {}; render(); }));
  app.querySelectorAll("[data-chart]").forEach(button => button.addEventListener("click", () => { state.chartType = button.dataset.chart; render(); }));
  app.querySelectorAll("[data-toast]").forEach(button => button.addEventListener("click", () => toast(button.dataset.toast)));
  app.querySelectorAll("[data-export-overview]").forEach(button => button.addEventListener("click", exportBusinessRequestTrend));
  app.querySelectorAll("[data-page]").forEach(button => button.addEventListener("click", () => { state.page = Number(button.dataset.page); render(); }));
  app.querySelectorAll("[data-tab]").forEach(button => button.addEventListener("click", () => { state[button.dataset.tabKey] = button.dataset.tab; state.page = 1; render(); }));
  app.querySelectorAll("[data-form]").forEach(button => button.addEventListener("click", () => openForm(button.dataset.form, button.dataset.id)));
  app.querySelectorAll("[data-drawer]").forEach(button => button.addEventListener("click", () => openDrawer(button.dataset.drawer, button.dataset.id)));
  app.querySelectorAll("[data-delete]").forEach(button => button.addEventListener("click", () => confirmDelete(button.dataset.delete)));
  app.querySelectorAll("[data-toggle]").forEach(button => button.addEventListener("click", () => confirmToggle(button.dataset.toggle)));
  app.querySelectorAll("[data-close-business]").forEach(button => button.addEventListener("click", () => confirmBusinessClose(button.dataset.closeBusiness)));
  app.querySelectorAll("[data-row-action-menu]").forEach(button => button.addEventListener("click", event => {
    event.stopPropagation();
    openRowActionMenu(button, button.dataset.rowActionMenu);
  }));
  app.querySelectorAll("[data-dropdown]").forEach(button => button.addEventListener("click", () => button.closest(".dropdown").classList.toggle("open")));
  app.querySelectorAll("[data-close-preview]").forEach(button => button.addEventListener("click", () => closePreview(button)));
  app.querySelectorAll("[data-overview-business]").forEach(button => button.addEventListener("click", () => { state.selectedOverviewBusinessId = button.dataset.overviewBusiness; render(); }));
  app.querySelectorAll("[data-product-business]").forEach(button => button.addEventListener("click", () => { location.hash = `#/business?product=${encodeURIComponent(button.dataset.productBusiness)}`; }));
  app.querySelectorAll("[data-product-log]").forEach(button => button.addEventListener("click", () => {
    const product = state.data.productRows.find(row => row.productNumber === button.dataset.productLog);
    location.hash = `#/operationrecord?objectName=${encodeURIComponent(product?.productName || button.dataset.productLog)}`;
  }));
  bindComboSearchPlaceholders(app);
}

function bindComboSearchPlaceholders(root) {
  root.querySelectorAll("[data-combo-select]").forEach(select => {
    const input = root.querySelector(`[name="${select.dataset.comboSelect}"]`);
    if (!input) return;
    const sync = () => { input.placeholder = input.getAttribute(`data-placeholder-${select.value}`) || `请输入${select.value}`; };
    select.addEventListener("change", sync);
    sync();
  });
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

function openRowActionMenu(anchor, businessId) {
  closeActionMenu();
  const row = findBusiness(businessId);
  if (!row) return;
  const actions = [
    ["编辑", () => openForm("business", businessId)],
    ...(row.businessType === "人脸深伪检测" ? [] : [["业务配置", () => openDrawer("config", businessId)]]),
    ["策略配置", () => openDrawer("strategy", businessId)],
    ["监控告警", () => openForm("alarm", businessId)],
    ["操作记录", () => openDrawer("records", businessId)]
  ];
  const popover = document.createElement("div");
  popover.className = "row-action-popover";
  popover.setAttribute("role", "menu");
  popover.innerHTML = actions.map(([label], index) => `<button class="dropdown-item" type="button" data-row-action-index="${index}" role="menuitem">${label}</button>`).join("");
  document.body.appendChild(popover);
  const rect = anchor.getBoundingClientRect();
  const width = popover.offsetWidth;
  const height = popover.offsetHeight;
  const topCandidate = rect.bottom + 4;
  const top = topCandidate + height > window.innerHeight - 8 ? Math.max(8, rect.top - height - 4) : topCandidate;
  const left = Math.min(Math.max(8, rect.right - width), window.innerWidth - width - 8);
  popover.style.top = `${top}px`;
  popover.style.left = `${left}px`;
  popover.querySelectorAll("[data-row-action-index]").forEach(button => {
    button.addEventListener("click", event => {
      event.stopPropagation();
      const action = actions[Number(button.dataset.rowActionIndex)]?.[1];
      closeActionMenu();
      action?.();
    });
  });
  state.openActionPopover = popover;
}

function closeActionMenu() {
  state.openActionPopover?.remove();
  state.openActionPopover = null;
}

function filterRows(rows, keys) {
  return rows.filter(row => keys.some(key => includesText(row[key], state.filters.keyword)));
}

function filterBusinessRows(rows) {
  return rows.filter(row =>
    includesText(row.businessId, state.filters.businessId) &&
    includesText(row.businessName, state.filters.keyword) &&
    includesText(row.productName, state.filters.product) &&
    matchSelect(row.businessType, state.filters.businessType) &&
    matchBusinessStatus(row.businessStatus, state.filters.businessStatus)
  );
}

function filterProductRows(rows) {
  return rows.filter(row =>
    includesText(row.productNumber, state.filters.productNumber) &&
    includesText(row.productName, state.filters.productName) &&
    matchDate(row.updatedAt, dateRangeFromPair(state.filters.startTime, state.filters.endTime))
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

function matchBusinessStatus(value, selected) {
  return !selected || selected === "全局" || businessStatusLabel(value) === selected;
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
  bindBusinessProductSelect(modalOverlay);
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
    return { title: id ? "编辑业务" : "创建业务", large: false, body: businessForm(row, Boolean(id)) };
  }
  if (type === "alarm") {
    const row = state.data.businessRows.find(item => item.businessId === id) || {};
    const setting = state.data.alarmSettings.find(item => item.businessId === id) || {};
    return { title: "监控告警配置", large: false, body: formStack([
      readonlyBlock("业务ID", row.businessId || id || "BIZ-MOCK", "不可编辑"),
      readonlyBlock("业务名称", row.businessName || setting.businessName || "当前业务", "不可编辑"),
      namedToggleField("通知开关", "通知开关", setting.notifyEnabled === true),
      alarmSelectField("通知方式", "notifyMethod", ["站内通知", "邮件通知"], normalizeAlarmNotifyMethod(setting.notifyMethod), true),
      alarmWindowField(setting.detectWindowHours || ""),
      alarmSelectField("阈值关系", "thresholdRelation", ["AND", "OR"], setting.thresholdRelation || "AND", true),
      alarmThresholdField("请求量阈值", "requestVolumeOperator", "requestVolumeThreshold", setting.requestVolumeOperator || "", setting.requestVolumeThreshold || "", "条", "positiveInteger"),
      alarmThresholdField("通过率阈值", "passRateOperator", "passRateThreshold", setting.passRateOperator || "", setting.passRateThreshold || "", "%", "percentTwoDecimal"),
      alarmThresholdField("拦截率阈值", "interceptRateOperator", "interceptRateThreshold", setting.interceptRateOperator || "", setting.interceptRateThreshold || "", "%", "percentTwoDecimal")
    ]) };
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
  return { title: type, large: false, body: formGrid([field("配置说明", "note", "配置已模拟提交", true, "textarea")]) };
}

function businessForm(row = {}, editing = false) {
  const productNumber = row.productCode || row.productNumber || state.data.productRows[0]?.productNumber || "";
  const product = state.data.productRows.find(item => item.productNumber === productNumber) || state.data.productRows[0] || {};
  const productName = row.productName || row.displayName || product.productName || "";
  const businessType = row.businessType || state.data.businessTypes[0];
  return formStack([
    editing ? readonlyValueField("产品ID", "productNumber", productNumber) : productSelectField("产品ID", "productNumber", productNumber, true),
    readonlyValueField("产品名称", "displayName", productName, "", "data-product-name-display"),
    field("业务名称", "businessName", row.businessName, true),
    editing ? readonlyValueField("业务类型", "businessType", businessType) : selectFieldForModal("业务类型", "businessType", state.data.businessTypes, businessType, true),
    selectFieldForModal("业务状态", "businessStatus", ["已开通", "未开通"], businessStatusLabel(row.businessStatus || "disabled"), true),
    field("备注", "mark", row.mark || "", false, "textarea")
  ]);
}

function businessConfigFields(type, row = {}) {
  const schema = businessConfigSchema(type);
  return schema.sections.map(section => `<div class="config-section config-section-card${section.linked ? " linked-section" : ""}${section.title ? "" : " untitled-section"}" data-section="${section.title || "业务配置"}">${section.title ? `<div class="drawer-section-title">${section.title}</div>` : ""}${section.description ? `<div class="form-help section-help">${section.description}</div>` : ""}<div class="config-stack">${section.fields.map(fieldConfig => configControl(fieldConfig, row, type)).join("")}</div></div>`).join("");
}

function businessStrategyFields(type, row = {}) {
  const strategyRow = { ...row, configData: row.strategyData || {} };
  const schema = businessStrategySchema(type, row);
  return schema.sections.map(section => `<div class="config-section config-section-card" data-section="${section.title}"><div class="drawer-section-title">${section.title}</div>${section.description ? `<div class="form-help section-help">${section.description}</div>` : ""}<div class="config-stack">${section.fields.map(fieldConfig => configControl(fieldConfig, strategyRow, type)).join("")}</div></div>`).join("");
}

function businessContextHeader(row = {}, prefix = "正在配置") {
  return `<div class="business-context-inline"><span>业务名称：</span><strong>${row.businessName || "当前业务"}</strong></div>`;
}

function businessConfigSchema(type) {
  const liveActions = ["右转头", "左转头", "张嘴", "眨眼"];
  const schemas = {
    "活体检测": {
      sections: [
        { title: "", linked: true, fields: [
          { label: "空间活体", name: "spatialLiveness", control: "radio", value: "关闭", required: true, options: ["关闭", "开启"], help: "通过屏幕实时的交互动画提示，引导用户前后移动手机设备，实现对3D头模、AIGC合成图、翻拍等活体攻击的拦截，适合对于安全性要求较高的业务场景。", submitBehavior: "updateLiveConfig" },
          { label: "空间活体动作", name: "spatialLivenessDirections", control: "checkbox", value: [], options: ["从远到近", "从近到远"], showWhen: { name: "spatialLiveness", value: "开启" }, help: "开启空间活体后选择设备移动方向，默认不勾选。", submitBehavior: "updateLiveConfig" },
          { label: "RGB活体", name: "rgbLiveness", control: "radio", value: "关闭", required: true, options: ["关闭", "开启"], help: "屏幕主动打随机光，摄像头抓瞳孔反光 + 皮肤光斑，靠真人的曲面形变、瞳孔生理收缩判定活体。", submitBehavior: "updateLiveConfig" },
          { label: "交互式活体", name: "interactiveLiveness", control: "radio", value: "开启", options: ["关闭", "开启"], help: "系统随机下发眨眼/摇头/张嘴等动作序列，结合关键点跟踪 + 时序一致性判断真人。", submitBehavior: "updateLiveConfig" },
          { label: "动作顺序", name: "actionOrder", control: "radio", value: "随机顺序", required: true, options: ["随机顺序", "固定顺序"], showWhen: { name: "interactiveLiveness", value: "开启" }, submitBehavior: "updateLiveConfig" },
          { label: "动作集", name: "actionSet", control: "sortable-actions", value: liveActions, required: true, options: liveActions, showWhen: { name: "interactiveLiveness", value: "开启" }, help: "勾选后可调整动作顺序，策略配置中的固定动作将按此顺序使用。", submitBehavior: "updateLiveConfig" },
          { label: "返照类型", name: "returnPhotoTypes", control: "checkbox", value: [], options: liveActions, showWhen: { name: "interactiveLiveness", value: "开启" }, help: "选择需要回传的动作照片类型，未选择则不额外回传。", submitBehavior: "updateLiveConfig" }
        ]}
      ]
    },
    "人脸深伪检测": {
      sections: []
    }
  };
  return schemas[type] || schemas["活体检测"];
}

function businessStrategySchema(type, row = {}) {
  const actions = configuredActions(row);
  const schemas = {
    "活体检测": {
      sections: [
        { title: "活体动作检测", description: "检测要求与业务配置中的动作集联动；检测动作数量不能超过已配置动作数。", fields: [
          { label: "动作照检测", name: "actionPhotoDetect", control: "radio", value: "开启", options: ["关闭", "开启"], submitBehavior: "updateLiveStrategy" },
          { label: "检测项", name: "actionDetectItems", control: "checkbox", value: ["活体人脸比对", "图像交互式活体"], required: true, options: ["活体人脸比对", "图像交互式活体"], showWhen: { name: "actionPhotoDetect", value: "开启" }, help: "活体人脸比对：比对动作照和正脸照是否是同一人，防止中间换脸；<br>图片交互式活体：检测交互式动作是否完全做对", submitBehavior: "updateLiveStrategy" },
          { label: "检测模式", name: "actionRequirementMode", control: "radio", value: "随机", required: true, options: ["随机", "固定"], showWhen: { name: "actionPhotoDetect", value: "开启" }, disabledWhenNotChecked: { name: "actionDetectItems", value: "图像交互式活体" }, submitBehavior: "updateLiveStrategy" },
          { label: "检测动作数量", name: "actionRequirementCount", control: "number", value: "2", required: true, validation: "actionRequirementCount", showWhenAll: [{ name: "actionPhotoDetect", value: "开启" }, { name: "actionRequirementMode", value: "随机" }], disabledWhenNotChecked: { name: "actionDetectItems", value: "图像交互式活体" }, help: "配置需要通过的动作数量，满足过检要求，才能够认证通过。", submitBehavior: "updateLiveStrategy" },
          { label: "检测动作类型", name: "fixedActionSet", control: "checkbox", value: [], options: actions, showWhenAll: [{ name: "actionPhotoDetect", value: "开启" }, { name: "actionRequirementMode", value: "固定" }], disabledWhenNotChecked: { name: "actionDetectItems", value: "图像交互式活体" }, submitBehavior: "updateLiveStrategy" }
        ]},
        { title: "人脸欺诈检测", description: "人脸存在屏幕边缘、反光、摩尔纹等翻拍介质特征。", fields: [
          { label: "人脸欺诈检测", name: "fraudDetect", control: "radio", value: "开启", options: ["关闭", "开启"], submitBehavior: "updateLiveStrategy" },
          { label: "检测要求", name: "fraudRequirement", control: "radio", value: "人脸照", required: true, options: ["人脸照", "动作照"], showWhen: { name: "fraudDetect", value: "开启" }, submitBehavior: "updateLiveStrategy" },
          { label: "动作照动作", name: "fraudActionSet", control: "checkbox", value: actions.slice(0, 1), options: actions, showWhenAll: [{ name: "fraudDetect", value: "开启" }, { name: "fraudRequirement", value: "动作照" }], submitBehavior: "updateLiveStrategy" },
          { label: "真人置信度", name: "fraudConfidence", control: "number", value: "0.85", required: true, validation: "zeroToOne", showWhen: { name: "fraudDetect", value: "开启" }, submitBehavior: "updateLiveStrategy" }
        ]},
        { title: "人脸深伪检测", description: "人脸面部纹理、光照或五官边界存在合成痕迹。", fields: [
          { label: "人脸深伪检测", name: "deepfakeDetect", control: "radio", value: "开启", options: ["关闭", "开启"], submitBehavior: "updateLiveStrategy" },
          { label: "真人置信度", name: "deepfakeConfidence", control: "number", value: "0.5", required: true, validation: "zeroToOne", showWhen: { name: "deepfakeDetect", value: "开启" }, submitBehavior: "updateLiveStrategy" }
        ]}
      ]
    },
    "人脸深伪检测": {
      sections: [
        { title: "视频过检配置", fields: [
          { label: "视频截帧数", name: "videoFrameCount", control: "number", value: "8", placeholder: "默认8", validation: "frameCount", submitBehavior: "updateDeepfakeStrategy" },
          { label: "过检人脸照数", name: "videoTopK", control: "number", value: "2", placeholder: "默认2", validation: "topK", submitBehavior: "updateDeepfakeStrategy" }
        ]},
        { title: "人脸欺诈检测", description: "人脸存在屏幕边缘、反光、摩尔纹等翻拍介质特征。", fields: [
          { label: "人脸欺诈检测", name: "fraudDetect", control: "radio", value: "开启", options: ["关闭", "开启"], submitBehavior: "updateDeepfakeStrategy" },
          { label: "真人置信度", name: "fraudConfidence", control: "number", value: "0.85", required: true, validation: "zeroToOne", disabledWhen: { name: "fraudDetect", value: "关闭" }, submitBehavior: "updateDeepfakeStrategy" }
        ]},
        { title: "人脸深伪检测", description: "人脸面部纹理、光照或五官边界存在合成痕迹。", fields: [
          { label: "人脸深伪检测", name: "deepfakeDetect", control: "radio", value: "开启", options: ["关闭", "开启"], submitBehavior: "updateDeepfakeStrategy" },
          { label: "真人置信度", name: "deepfakeConfidence", control: "number", value: "0.5", required: true, validation: "zeroToOne", disabledWhen: { name: "deepfakeDetect", value: "关闭" }, submitBehavior: "updateDeepfakeStrategy" }
        ]}
      ]
    }
  };
  return schemas[type] || schemas["活体检测"];
}

function configuredActions(row = {}) {
  const actions = row.configData?.actionSet;
  const values = Array.isArray(actions) ? actions : splitTags(actions);
  return values.length ? values : ["右转头", "左转头", "张嘴", "眨眼"];
}

function productSelectField(label, name, value = "", required = false) {
  const inputId = `${name}-${Math.random().toString(16).slice(2)}`;
  const current = value || state.data.productRows[0]?.productNumber || "";
  return `<div class="form-group"><label class="form-label" for="${inputId}">${label}${required ? ` <span class="required">*</span>` : ""}</label><select id="${inputId}" name="${name}" class="form-select" data-product-select>${state.data.productRows.map(product => `<option value="${product.productNumber}" ${current === product.productNumber ? "selected" : ""}>${product.productNumber}</option>`).join("")}</select><div class="field-error"></div></div>`;
}

function readonlyValueField(label, name, value = "", help = "", extraAttrs = "") {
  return `<div class="form-group"><label class="form-label">${label}</label><div class="form-input readonly-field" ${extraAttrs}>${value || "-"}</div><input type="hidden" name="${name}" value="${value || ""}" />${help ? `<div class="form-help">${help}</div>` : ""}<div class="field-error"></div></div>`;
}

function hiddenField(name, value = "") {
  return `<input type="hidden" name="${name}" value="${value}" />`;
}

function configControl(fieldConfig, row = {}, currentType = "") {
  const stored = row.configData || {};
  const rawValue = stored[fieldConfig.name] ?? row[fieldConfig.name] ?? row[fieldConfig.alias] ?? fieldConfig.value ?? defaultBusinessValue(fieldConfig.name, row, currentType);
  const value = Array.isArray(rawValue) ? rawValue : String(rawValue || "");
  const inputId = `${fieldConfig.name}-${Math.random().toString(16).slice(2)}`;
  const full = fieldConfig.full || ["checkbox", "sortable-actions", "image-preview"].includes(fieldConfig.control) ? " full" : "";
  const required = fieldConfig.required ? ` <span class="required">*</span>` : "";
  const placeholder = fieldConfig.placeholder ? ` placeholder="${fieldConfig.placeholder}"` : "";
  const numberAttrs = `${fieldConfig.min !== undefined ? ` min="${fieldConfig.min}"` : ""}${fieldConfig.max !== undefined ? ` max="${fieldConfig.max}"` : ""}${fieldConfig.step !== undefined ? ` step="${fieldConfig.step}"` : ""}`;
  const visibilityRules = fieldConfig.showWhenAll || (fieldConfig.showWhen ? [fieldConfig.showWhen] : []);
  const disabledRules = fieldConfig.disabledWhenAll || (fieldConfig.disabledWhen ? [fieldConfig.disabledWhen] : []);
  const disabledUncheckedRules = fieldConfig.disabledWhenNotCheckedAll || (fieldConfig.disabledWhenNotChecked ? [fieldConfig.disabledWhenNotChecked] : []);
  const visibleIf = visibilityRules.length ? ` data-visible-if="${visibilityRules.map(rule => `${rule.name}:${rule.value}`).join(";")}"` : "";
  const disabledIf = disabledRules.length ? ` data-disabled-if="${disabledRules.map(rule => `${rule.name}:${rule.value}`).join(";")}"` : "";
  const disabledIfUnchecked = disabledUncheckedRules.length ? ` data-disabled-if-unchecked="${disabledUncheckedRules.map(rule => `${rule.name}:${rule.value}`).join(";")}"` : "";
  const meta = `data-field-name="${fieldConfig.name}" data-control="${fieldConfig.control}" data-validation="${fieldConfig.validation || ""}" data-submit-behavior="${fieldConfig.submitBehavior || "write"}"${visibleIf}${disabledIf}${disabledIfUnchecked}`;
  let control = "";
  if (fieldConfig.control === "select") {
    control = `<select id="${inputId}" name="${fieldConfig.name}" class="form-select">${fieldConfig.options.map(option => `<option ${value === option ? "selected" : ""}>${option}</option>`).join("")}</select>`;
  } else if (fieldConfig.control === "radio") {
    control = `<div class="check-row segmented">${fieldConfig.options.map(option => `<label><input type="radio" name="${fieldConfig.name}" value="${option}" ${value === option ? "checked" : ""} />${option}</label>`).join("")}</div>`;
  } else if (fieldConfig.control === "checkbox") {
    const values = Array.isArray(rawValue) ? rawValue : String(rawValue || "").split(/[、,，]/).filter(Boolean);
    control = `<div class="check-row">${fieldConfig.options.map(option => `<label><input type="checkbox" name="${fieldConfig.name}" value="${option}" ${values.includes(option) ? "checked" : ""} />${option}</label>`).join("")}</div>`;
  } else if (fieldConfig.control === "sortable-actions") {
    const values = Array.isArray(rawValue) ? rawValue : String(rawValue || "").split(/[、,，]/).filter(Boolean);
    const selected = values.length ? values.filter(item => fieldConfig.options.includes(item)) : [...fieldConfig.options];
    control = `<div class="sortable-actions" data-sortable-actions="${fieldConfig.name}">
      <div class="sortable-action-options"><div class="sortable-column-title">可选动作</div>${fieldConfig.options.map(option => `<label><input type="checkbox" value="${option}" data-sortable-option ${selected.includes(option) ? "checked" : ""} />${option}</label>`).join("")}</div>
      <div class="sortable-action-selected"><div class="sortable-column-title">已选动作顺序</div><div class="sortable-selected-list">${selected.map(action => sortableActionItem(action)).join("")}</div></div>
      <input type="hidden" name="${fieldConfig.name}" value="${selected.join("、")}" data-sortable-value />
    </div>`;
  } else if (fieldConfig.control === "switch") {
    const checked = value !== "关闭" && value !== "disabled";
    control = `<button class="toggle ${checked ? "checked" : ""}" type="button" aria-label="${fieldConfig.label}"></button><input type="hidden" name="${fieldConfig.name}" value="${checked ? "开启" : "关闭"}" />`;
  } else if (fieldConfig.control === "readonly") {
    control = `<div class="form-input readonly-field">${value || row.productName || "选择产品后回填"}</div><input type="hidden" name="${fieldConfig.name}" value="${value || row.productName || ""}" />`;
  } else if (fieldConfig.control === "textarea") {
    control = `<textarea id="${inputId}" name="${fieldConfig.name}" class="form-textarea"${placeholder}>${value}</textarea>`;
  } else if (fieldConfig.control === "number") {
    control = `<input id="${inputId}" name="${fieldConfig.name}" class="form-input" type="number" value="${value}"${placeholder}${numberAttrs} />`;
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
  return `<div class="form-group config-block${full}${visibleIf ? " dependent-block" : ""}" ${meta}><label class="form-label" for="${inputId}">${fieldConfig.label}${required}</label>${control}${help}<div class="field-error" id="${inputId}-error"></div></div>`;
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

function sortableActionItem(action) {
  return `<div class="sortable-action-chip" data-sortable-selected="${action}"><span>${action}</span><div class="button-row"><button class="action-link" type="button" data-sortable-move="up">上移</button><button class="action-link" type="button" data-sortable-move="down">下移</button><button class="action-link danger" type="button" data-sortable-remove>移除</button></div></div>`;
}

function bindDynamicForm(root) {
  bindSortableActions(root);
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

function bindSortableActions(root) {
  root.querySelectorAll("[data-sortable-actions]").forEach(container => {
    if (container.dataset.bound === "true") return;
    container.dataset.bound = "true";
    const sync = () => syncSortableActions(container);
    container.querySelectorAll("[data-sortable-option]").forEach(input => {
      input.addEventListener("change", () => {
        const list = container.querySelector(".sortable-selected-list");
        const existing = list.querySelector(`[data-sortable-selected="${input.value}"]`);
        if (input.checked && !existing) list.insertAdjacentHTML("beforeend", sortableActionItem(input.value));
        if (!input.checked) existing?.remove();
        bindSortableChipActions(container);
        sync();
      });
    });
    bindSortableChipActions(container);
    sync();
  });
}

function bindSortableChipActions(container) {
  container.querySelectorAll("[data-sortable-move]").forEach(button => {
    if (button.dataset.bound === "true") return;
    button.dataset.bound = "true";
    button.addEventListener("click", () => {
      const item = button.closest("[data-sortable-selected]");
      if (button.dataset.sortableMove === "up" && item.previousElementSibling) item.parentElement.insertBefore(item, item.previousElementSibling);
      if (button.dataset.sortableMove === "down" && item.nextElementSibling) item.parentElement.insertBefore(item.nextElementSibling, item);
      syncSortableActions(container);
    });
  });
  container.querySelectorAll("[data-sortable-remove]").forEach(button => {
    if (button.dataset.bound === "true") return;
    button.dataset.bound = "true";
    button.addEventListener("click", () => {
      const item = button.closest("[data-sortable-selected]");
      const value = item.dataset.sortableSelected;
      const option = container.querySelector(`[data-sortable-option][value="${value}"]`);
      if (option) option.checked = false;
      item.remove();
      syncSortableActions(container);
    });
  });
}

function syncSortableActions(container) {
  const selected = Array.from(container.querySelectorAll("[data-sortable-selected]")).map(item => item.dataset.sortableSelected);
  const hidden = container.querySelector("[data-sortable-value]");
  if (hidden) hidden.value = selected.join("、");
  container.querySelectorAll("[data-sortable-option]").forEach(input => { input.checked = selected.includes(input.value); });
}

function bindBusinessProductSelect(root) {
  const select = root.querySelector("[data-product-select]");
  const display = root.querySelector("[data-product-name-display]");
  const hidden = root.querySelector('[name="displayName"]');
  if (!select || !display || !hidden) return;
  const sync = () => {
    const product = state.data.productRows.find(item => item.productNumber === select.value) || {};
    display.textContent = product.productName || "-";
    hidden.value = product.productName || "";
  };
  select.addEventListener("change", sync);
  sync();
}

function applyVisibility(root) {
  root.querySelectorAll("[data-visible-if]").forEach(group => {
    const visible = group.dataset.visibleIf.split(";").every(rule => {
      const [name, expected] = rule.split(":");
      return getControlValue(root, name) === expected;
    });
    group.hidden = !visible;
    group.querySelectorAll("input, select, textarea").forEach(control => { control.disabled = !visible; });
    if (!visible) {
      group.dataset.disabled = "false";
      group.classList.remove("is-disabled");
      setFieldError(group, "");
    }
  });
  root.querySelectorAll("[data-disabled-if], [data-disabled-if-unchecked]").forEach(group => {
    if (group.hidden) return;
    const disabledByValue = group.dataset.disabledIf ? group.dataset.disabledIf.split(";").every(rule => {
      const [name, expected] = rule.split(":");
      return getControlValue(root, name) === expected;
    }) : false;
    const disabledByUnchecked = group.dataset.disabledIfUnchecked ? group.dataset.disabledIfUnchecked.split(";").some(rule => {
      const [name, expected] = rule.split(":");
      return !isControlChecked(root, name, expected);
    }) : false;
    const disabled = disabledByValue || disabledByUnchecked;
    group.dataset.disabled = disabled ? "true" : "false";
    group.classList.toggle("is-disabled", disabled);
    group.querySelectorAll("input, select, textarea").forEach(control => { control.disabled = disabled; });
    if (disabled) setFieldError(group, "");
  });
}

function isControlChecked(root, name, expected) {
  return Boolean(root.querySelector(`[name="${name}"][value="${expected}"]:checked`));
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
    upsert("productRows", "productNumber", id, { productNumber, productName: values.productName, businessCount: previous?.businessCount || 0, updatedAt: now, updatedBy: "ops_admin", remark: values.remark || "" });
    state.data.businessRows.forEach(row => {
      if (row.productCode === productNumber) row.productName = values.productName;
    });
    appendOperation(values.productName, id ? `编辑产品：${productNumber} / ${values.productName}` : `创建产品：${productNumber} / ${values.productName}`);
  }
  if (type === "business") {
    const previous = state.data.businessRows.find(item => item.businessId === id);
    const businessId = id || `BIZ-${Date.now()}`;
    const configData = previous?.configData || defaultConfigData(values.businessType);
    const strategyData = previous?.strategyData || defaultStrategyData(values.businessType);
    const configSummarySource = values.businessType === "人脸深伪检测" ? strategyData : configData;
    const configSummary = previous?.configSummary || summarizeBusinessConfig({ ...configSummarySource, businessType: values.businessType });
    upsert("businessRows", "businessId", id, { businessId, businessName: values.businessName, productName: values.displayName || "金融人脸核验平台", productCode: values.productNumber, businessType: values.businessType, businessStatus: businessStatusValue(values.businessStatus), status: previous?.status || "formal", configSummary, strategySummary: previous?.strategySummary || summarizeBusinessStrategy({ ...strategyData, businessType: values.businessType }), updatedAt: now, updatedBy: "ops_admin", productNumber: values.productNumber, displayName: values.displayName, mark: values.mark, configData, strategyData });
    updateProductBusinessCounts();
    appendOperation(values.businessName, id ? `编辑业务：${values.businessName}` : `创建业务：${values.businessType}`);
  }
  if (type === "alarm") {
    const business = findBusiness(id) || {};
    const previous = state.data.alarmSettings.find(item => item.businessId === id) || {};
    const enabled = values["通知开关"] === "enabled";
    upsert("alarmSettings", "businessId", id, {
      businessId: id || "BIZ-MOCK",
      objectName: business.businessId || id || "BIZ-MOCK",
      businessName: business.businessName || previous.businessName || "当前业务",
      notifyEnabled: enabled,
      notifyMethod: normalizeAlarmNotifyMethod(values.notifyMethod || previous.notifyMethod),
      thresholdRelation: values.thresholdRelation || previous.thresholdRelation || "AND",
      detectWindowHours: values.detectWindowHours || previous.detectWindowHours || "",
      requestVolumeOperator: values.requestVolumeOperator || previous.requestVolumeOperator || "",
      requestVolumeThreshold: values.requestVolumeThreshold || previous.requestVolumeThreshold || "",
      passRateOperator: values.passRateOperator || previous.passRateOperator || "",
      passRateThreshold: values.passRateThreshold || previous.passRateThreshold || "",
      interceptRateOperator: values.interceptRateOperator || previous.interceptRateOperator || "",
      interceptRateThreshold: values.interceptRateThreshold || previous.interceptRateThreshold || ""
    });
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
  if (type === "financial") upsert("financialLivenessStrategies", "strategyId", id, { strategyId: id || `FLR-${Date.now()}`, strategyName: values.ruleName, businessType: values.targetType === "业务" ? "活体检测" : "全局", riskType: values.strategyType, threshold: Number(values.faceClarityThreshold || 0.8), thresholdSummary: `${values.conditionType || "且"} / ${values.riskTags || "风控检测"}`, status: values.status === "有效" ? "enabled" : "disabled", target: values.targetType || "全局", targetValue: values.targetValue || "", riskTags: splitTags(values.riskTags), detectionSwitches: readDetectionSwitches(form), updatedAt: now });
  if (type === "account") upsert("systemAccounts", "accountId", id, { accountId: id || `AC-${Date.now()}`, username: values.username, displayName: values.displayName, phone: values.phone, roleName: values.roleName, permissions: Array.isArray(values.permissions) ? values.permissions : splitTags(values.permissions), status: values["状态"] === "disabled" ? "disabled" : "enabled", latestLoginAt: "尚未登录", createdAt: now });
  closeLayer();
  toast(type === "business" ? "业务信息已更新，演示环境仅更新 mock 数据。" : "保存成功。");
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
    if (group.hidden || group.dataset.disabled === "true") return;
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
    const targetGroup = group.closest(".form-group") || group;
    if (group.hidden || targetGroup.dataset.disabled === "true" || !group.dataset.validation) return;
    const name = group.dataset.fieldName;
    const rule = group.dataset.validation;
    if (!validateFieldRule(rule, values[name], values, form)) {
      setFieldError(targetGroup, validationMessage(rule));
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
  if (type === "alarm" && values["通知开关"] === "enabled") {
    if (!values.detectWindowHours) {
      setNamedError(form, "detectWindowHours", "请输入检测时间窗口");
      valid = false;
    } else if (!validateFieldRule("positiveInteger", values.detectWindowHours, values, form)) {
      setNamedError(form, "detectWindowHours", "请输入大于 0 的整数");
      valid = false;
    }
    [
      ["requestVolumeOperator", "requestVolumeThreshold"],
      ["passRateOperator", "passRateThreshold"],
      ["interceptRateOperator", "interceptRateThreshold"]
    ].forEach(([operatorName, valueName]) => {
      if (!values[operatorName]) {
        setNamedError(form, operatorName, "请选择条件表达式");
        valid = false;
      }
      if (!values[valueName]) {
        setNamedError(form, valueName, "请输入阈值");
        valid = false;
      }
    });
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
  if (rule === "positiveInteger") return Number.isInteger(Number(value)) && Number(value) > 0;
  if (rule === "percentTwoDecimal") return isPercentTwoDecimal(value);
  if (["frameCount"].includes(rule)) return Number(value) >= 1 && Number(value) <= 30;
  if (["topK"].includes(rule)) return Number(value) >= 1 && Number(value) <= 10;
  if (rule === "dateAfterStart") return !values.startTime || new Date(value).getTime() > new Date(values.startTime).getTime();
  if (rule === "faceIds") return validateFaceIds(value, values.businessKey);
  if (rule === "actionCount") return validateCountAgainstChecked(value, form, "actions");
  if (rule === "rgbActionCount") return validateCountAgainstChecked(value, form, "rgbActions");
  if (rule === "actionRequirementCount") return validateActionRequirementCount(value, values);
  return true;
}

function validationMessage(rule) {
  const messages = {
    percent: "请输入 0-100 的数值",
    zeroToOne: "请输入 0-1 的数值",
    positiveNumber: "请输入大于 0 的数值",
    positiveInteger: "请输入大于 0 的整数",
    percentTwoDecimal: "请输入 0-100 的数值，最多保留两位小数",
    frameCount: "请输入 1-30 的整数",
    topK: "请输入 1-10 的整数",
    dateAfterStart: "结束时间必须晚于开始时间",
    faceIds: "多个 FaceId 最多 100 个，且批量查询需填写业务Id",
    actionCount: "下发动作个数不能超过动作内容个数",
    rgbActionCount: "下发RGB动作个数不能超过RGB动作内容个数",
    actionRequirementCount: "检测动作数量需为 1-4，且不能超过业务配置动作集数量"
  };
  return messages[rule] || "字段格式不正确";
}

function validateActionRequirementCount(value, values) {
  const number = Number(value);
  const limit = Math.min(Number(values.configuredActionCount || 4), 4);
  return Number.isInteger(number) && number >= 1 && number <= Math.max(1, limit);
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

function isPercentTwoDecimal(value) {
  const text = String(value || "");
  const number = Number(text);
  return Number.isFinite(number) && number >= 0 && number <= 100 && /^\d+(\.\d{1,2})?$/.test(text);
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
    "活体检测": [
      `空间活体${values.spatialLiveness || "关闭"}`,
      `RGB${values.rgbLiveness || "关闭"}`,
      `交互式活体${values.interactiveLiveness || "开启"}`,
      `动作${countSelected(values.actionSet)}项`
    ],
    "人脸深伪检测": [
      `截帧 ${values.videoFrameCount || "8"}`,
      `过检照 ${values.videoTopK || "2"}`,
      `欺诈检测${values.fraudDetect || "开启"}`,
      `深伪检测${values.deepfakeDetect || "开启"}`
    ]
  };
  return (summaryMap[type] || [`${values.config || "配置功能"}`, `产品ID ${values.productNumber || "未填"}`]).join(" / ");
}

function summarizeBusinessStrategy(values) {
  if (values.businessType === "人脸深伪检测") {
    return [`欺诈检测${values.fraudDetect || "开启"}`, `深伪检测${values.deepfakeDetect || "开启"}`].join(" / ");
  }
  return [`动作照检测${values.actionPhotoDetect || "开启"}`, `欺诈检测${values.fraudDetect || "开启"}`, `深伪检测${values.deepfakeDetect || "开启"}`].join(" / ");
}

function countSelected(value) {
  if (Array.isArray(value)) return value.length;
  return splitTags(value).length;
}

function defaultConfigData(type) {
  return type === "人脸深伪检测"
    ? {}
    : { spatialLiveness: "关闭", spatialLivenessDirections: [], rgbLiveness: "关闭", interactiveLiveness: "开启", actionOrder: "随机顺序", actionSet: ["右转头", "左转头", "张嘴", "眨眼"], returnPhotoTypes: [] };
}

function defaultStrategyData(type) {
  return type === "人脸深伪检测"
    ? { videoFrameCount: "8", videoTopK: "2", fraudDetect: "开启", fraudConfidence: "0.85", deepfakeDetect: "开启", deepfakeConfidence: "0.5" }
    : { actionPhotoDetect: "开启", actionDetectItems: ["活体人脸比对", "图像交互式活体"], actionRequirementMode: "随机", actionRequirementCount: "2", fixedActionSet: [], fraudDetect: "开启", fraudRequirement: "人脸照", fraudConfidence: "0.85", deepfakeDetect: "开启", deepfakeConfidence: "0.5" };
}

function updateProductBusinessCounts() {
  state.data.productRows.forEach(product => {
    product.businessCount = state.data.businessRows.filter(row => row.productCode === product.productNumber && state.data.businessTypes.includes(row.businessType)).length;
  });
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

function normalizeAlarmNotifyMethod(value) {
  return ["站内通知", "邮件通知"].includes(value) ? value : "站内通知";
}

function submitBusinessConfig(id) {
  const form = drawerOverlay.querySelector("#drawerConfigForm");
  if (!validateForm(form, "businessConfig")) return toast("请检查表单错误。", "error");
  const values = collectFormValues(form);
  const row = findBusiness(id);
  row.configData = { ...(row.configData || {}), ...values };
  row.configSummary = summarizeBusinessConfig({ ...row.configData, businessType: row.businessType });
  row.updatedAt = currentTime();
  row.updatedBy = "ops_admin";
  appendOperation(row.businessName, `更新单业务配置：${row.configSummary}`);
  closeLayer();
  toast("业务配置已更新，演示环境仅更新 mock 数据。");
  render();
}

function submitBusinessStrategyConfig(id) {
  const form = drawerOverlay.querySelector("#drawerStrategyForm");
  if (!validateForm(form, "businessStrategy")) return toast("请检查表单错误。", "error");
  const values = collectFormValues(form);
  const row = findBusiness(id);
  row.strategyData = { ...(row.strategyData || {}), ...values };
  if (!isControlChecked(form, "actionDetectItems", "图像交互式活体")) {
    row.strategyData.actionRequirementMode = row.strategyData.actionRequirementMode || "随机";
    row.strategyData.actionRequirementCount = row.strategyData.actionRequirementCount || "2";
    row.strategyData.fixedActionSet = row.strategyData.fixedActionSet || [];
  }
  row.strategySummary = summarizeBusinessStrategy({ ...row.strategyData, businessType: row.businessType });
  if (row.businessType === "人脸深伪检测") {
    row.configData = {};
    row.configSummary = summarizeBusinessConfig({ ...row.strategyData, businessType: row.businessType });
  } else {
    row.configSummary = `${summarizeBusinessConfig({ ...(row.configData || defaultConfigData(row.businessType)), businessType: row.businessType })} / 策略：${row.strategySummary}`;
  }
  row.updatedAt = currentTime();
  row.updatedBy = "risk_admin";
  appendOperation(row.businessName, `更新策略配置：${row.strategySummary}`);
  closeLayer();
  toast("策略配置已更新，演示环境仅更新 mock 数据。");
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

const AI_SAMPLE_RISK_GROUPS = [
  { riskType: "疑似AI换脸模板攻击", tagType: "purple", description: "过检人脸照与黑产换脸模板存在异常相似，疑似复用换脸模板攻击。" },
  { riskType: "疑似深度合成人脸", tagType: "red", description: "面部纹理、光照或五官边界存在合成痕迹。" },
  { riskType: "疑似翻拍人脸", tagType: "yellow", description: "存在屏幕边缘、反光、摩尔纹等翻拍介质特征。" }
];

const DATA_MARK_TOOLTIP = "这是您在接口中传入的用户标识信息，可用于定位某一用户";

function getAiSampleGroups() {
  const groups = state.data.aiForgeryFaceSamples?.groups || [];
  return AI_SAMPLE_RISK_GROUPS.map(group => {
    const source = groups.find(item => item.riskType === group.riskType) || {};
    const samples = [...(source.samples || [])]
      .sort((a, b) => (confidenceScore(b) - confidenceScore(a)) || String(b.detectedAt).localeCompare(String(a.detectedAt)))
      .slice(0, 6);
    return { ...group, description: source.description || group.description, explanation: source.explanation || "", samples };
  });
}

function confidenceScore(sample) {
  return Number(sample?.confidenceScore ?? sample?.confidence ?? 0);
}

function initializeAiSampleGroups() {
  state.aiSampleExpandedGroups = Object.fromEntries(getAiSampleGroups().map(group => [group.riskType, group.samples.length > 0]));
}

function aiSamplesDrawerBody() {
  const mock = state.data.aiForgeryFaceSamples || {};
  if (mock.loading) return `${sampleDrawerAlert()}${sampleSkeleton()}`;
  const groups = getAiSampleGroups();
  const total = groups.reduce((sum, group) => sum + group.samples.length, 0);
  const error = mock.error ? `<div class="alert error"><span>样本加载失败，请稍后重试</span><button class="btn" type="button" data-reload-samples>重新加载</button></div>` : "";
  const empty = total === 0 ? sampleEmptyState("当前周期暂无高置信AI伪造人脸样本", "当前筛选条件下未发现可展示样本。") : "";
  return `${sampleDrawerAlert()}${error}${empty}<div class="risk-collapse">${groups.map(riskGroupHtml).join("")}</div>`;
}

function sampleDrawerAlert() {
  return `<div class="alert">以下为系统筛选出的部分高置信度疑似AI伪造人脸样本，请结合业务场景与日志信息进一步甄别。</div>`;
}

function sampleSkeleton() {
  return `<div class="sample-grid"><article class="sample-card skeleton-card"></article><article class="sample-card skeleton-card"></article><article class="sample-card skeleton-card"></article></div>`;
}

function sampleEmptyState(title, desc) {
  return `<section class="empty-state sample-empty"><div><h2>${title}</h2><p>${desc}</p></div></section>`;
}

function riskGroupHtml(group) {
  if (!state.aiSampleExpandedGroups) initializeAiSampleGroups();
  const expanded = Boolean(state.aiSampleExpandedGroups[group.riskType]);
  return `<section class="risk-collapse-item ${expanded ? "expanded" : ""}">
    <button class="risk-collapse-header" type="button" data-risk-group="${group.riskType}" aria-expanded="${expanded}">
      ${tag(group.riskType, group.tagType)}
      <span class="risk-collapse-title"><small>${group.description}</small></span>
      <span class="risk-count">${group.samples.length} 个样本</span>
      <span class="risk-arrow" aria-hidden="true">▶</span>
    </button>
    ${expanded ? `<div class="risk-collapse-body">${group.samples.length ? `<div class="sample-grid">${group.samples.map(sample => sampleCard(sample, group)).join("")}</div>` : sampleEmptyState("当前周期暂无该类型高置信取证样本", "该分组暂无可展示样本。")}</div>` : ""}
  </section>`;
}

function sampleCard(sample, group) {
  return `<article class="sample-card">
    <div class="sample-image-pair ${sample.images.length === 1 ? "single" : ""}">${sample.images.map((image, index) => sampleImageBox(sample, image, index)).join("")}</div>
    <div class="sample-body">
      <div class="sample-confidence"><strong>${confidenceScore(sample).toFixed(1)}%</strong><span>综合置信度</span></div>
      <dl class="sample-meta">
        <div><dt>检出时间</dt><dd>${sample.detectedAt}</dd></div>
        <div><dt>日志唯一标识</dt><dd class="ellipsis" title="${sample.logId}">${sample.logId}</dd></div>
        <div><dt>数据标识 <span class="data-mark-tooltip" tabindex="0" data-tooltip="${DATA_MARK_TOOLTIP}" aria-label="${DATA_MARK_TOOLTIP}">?</span></dt><dd class="ellipsis" title="${sample.dataId}">${sample.dataId}</dd></div>
      </dl>
    </div>
  </article>`;
}

function sampleImageBox(sample, image, index) {
  const visualClass = sampleVisualClass(sample, image, index);
  return `<button class="sample-image-box" type="button" data-preview-sample="${sample.id}" aria-label="预览 ${sample.id} ${image.label}">
    <span class="sample-image-label">${image.label}</span>
    <span class="sample-face-visual ${visualClass}" aria-hidden="true"></span>
    <span class="sample-watermark">疑似AI伪造</span>
  </button>`;
}

function sampleVisualClass(sample, image, index) {
  const fallback = ["face-a", "face-b", "face-c", "face-d", "face-e", "face-f"];
  return image.visualClass || fallback[(sample.id.charCodeAt(sample.id.length - 1) + index) % fallback.length];
}

function findAiSample(sampleId) {
  return getAiSampleGroups().flatMap(group => group.samples.map(sample => ({ ...sample, riskType: group.riskType, tagType: group.tagType }))).find(sample => sample.id === sampleId);
}

function bindAiSampleDrawer(root) {
  root.querySelectorAll("[data-risk-group]").forEach(button => button.addEventListener("click", () => {
    if (!state.aiSampleExpandedGroups) initializeAiSampleGroups();
    state.aiSampleExpandedGroups[button.dataset.riskGroup] = !state.aiSampleExpandedGroups[button.dataset.riskGroup];
    root.querySelector(".drawer-body").innerHTML = aiSamplesDrawerBody();
    bindAiSampleDrawer(root);
  }));
  root.querySelectorAll("[data-preview-sample]").forEach(button => button.addEventListener("click", () => openImagePreview(button.dataset.previewSample)));
  root.querySelectorAll("[data-reload-samples]").forEach(button => button.addEventListener("click", () => {
    state.data.aiForgeryFaceSamples.error = "";
    root.querySelector(".drawer-body").innerHTML = aiSamplesDrawerBody();
    bindAiSampleDrawer(root);
  }));
}

function openImagePreview(sampleId) {
  const sample = findAiSample(sampleId);
  if (!sample) return;
  modalOverlay.innerHTML = `<section class="modal modal-lg image-preview-modal" aria-labelledby="previewTitle">
    <header class="modal-header"><h2 id="previewTitle">AI伪造人脸样本预览</h2><button class="modal-close" type="button" aria-label="关闭" data-close-preview-modal>×</button></header>
    <div class="modal-body">
      <div class="preview-image-grid ${sample.images.length === 1 ? "single" : ""}">${sample.images.map((image, index) => previewImageBox(sample, image, index)).join("")}</div>
      ${infoGrid([["风险类型", tag(sample.riskType, sample.tagType)], ["综合置信度", `${confidenceScore(sample).toFixed(1)}%`], ["检出时间", sample.detectedAt], ["日志唯一标识", `<span class="cell-ellipsis" title="${sample.logId}">${sample.logId}</span>`], ["数据标识", `<span class="cell-ellipsis" title="${sample.dataId}">${sample.dataId}</span>`]])}
    </div>
    <footer class="modal-footer"><button class="btn" type="button" data-close-preview-modal>关闭</button></footer>
  </section>`;
  modalOverlay.classList.add("active", "image-preview-overlay");
  modalOverlay.onclick = event => { if (event.target === modalOverlay) closeImagePreview(); };
  modalOverlay.querySelectorAll("[data-close-preview-modal]").forEach(button => button.addEventListener("click", closeImagePreview));
}

function previewImageBox(sample, image, index) {
  const visualClass = sampleVisualClass(sample, image, index);
  return `<div class="sample-image-box preview-image-box">
    <span class="sample-image-label">${image.label}</span>
    <span class="sample-face-visual ${visualClass}" aria-hidden="true"></span>
    <span class="sample-watermark">疑似AI伪造</span>
  </div>`;
}

function closeImagePreview() {
  modalOverlay.classList.remove("active", "image-preview-overlay");
  modalOverlay.innerHTML = "";
  modalOverlay.onclick = null;
}

function openDrawer(type, id) {
  if (type === "aiSamples") initializeAiSampleGroups();
  if (type === "notifications") state.activeNotificationId = null;
  const titleMap = { business: "业务详情", records: "操作记录", config: "业务配置", strategy: "策略配置", log: "日志详情", aiSamples: "AI伪造人脸样本", notifications: "通知中心" };
  const bodyMap = { business: () => businessDetail(id), records: () => recordsDetail(id), config: () => configDetail(id), strategy: () => strategyDetail(id), log: () => logDetail(id), aiSamples: () => aiSamplesDrawerBody(), notifications: () => notificationsDrawerBody() };
  const body = bodyMap[type]?.() || "";
  const drawerClass = ["config", "strategy"].includes(type) ? "drawer-lg" : type === "aiSamples" ? "sample-drawer" : type === "notifications" ? "notification-drawer" : "";
  const footer = type === "aiSamples" ? `<footer class="drawer-footer"><button class="btn" type="button" data-close>关闭</button></footer>` : "";
  drawerOverlay.innerHTML = `<aside class="drawer ${drawerClass}" aria-labelledby="drawerTitle"><header class="drawer-header"><h2 id="drawerTitle">${titleMap[type]}</h2><button class="drawer-close" type="button" aria-label="关闭" data-close>×</button></header><div class="drawer-body">${body}</div>${footer}</aside>`;
  drawerOverlay.classList.add("active");
  drawerOverlay.onclick = event => { if (event.target === drawerOverlay) closeLayer(); };
  drawerOverlay.querySelectorAll("[data-close]").forEach(button => button.addEventListener("click", closeLayer));
  bindDynamicForm(drawerOverlay);
  drawerOverlay.querySelectorAll("[data-submit-config]").forEach(button => button.addEventListener("click", () => submitBusinessConfig(id)));
  drawerOverlay.querySelectorAll("[data-submit-strategy-config]").forEach(button => button.addEventListener("click", () => submitBusinessStrategyConfig(id)));
  if (type === "aiSamples") bindAiSampleDrawer(drawerOverlay);
  if (type === "notifications") bindNotificationDrawer(drawerOverlay);
}

function businessDetail(id) {
  const row = state.data.businessRows.find(item => item.businessId === id);
  return `<div class="drawer-section-title">基础信息</div>${infoGrid([["业务 ID", row.businessId], ["业务名称", row.businessName], ["关联产品", row.productName], ["产品编码", row.productCode], ["业务类型", row.businessType], ["更新时间", row.updatedAt], ["更新账号", row.updatedBy || "-"]])}`;
}

function recordsDetail() {
  return `${table(["操作人", "对象", "操作内容", "结果", "IP", "时间"], state.data.businessOperationRecords.map(row => [row.operator, row.objectName, row.actionSummary, resultTag(row.result), row.ip, row.createdAt]))}`;
}

function configDetail(id) {
  const row = state.data.businessRows.find(item => item.businessId === id);
  return `<form id="drawerConfigForm">${hiddenField("businessType", row.businessType)}${formStack([businessContextHeader(row, "正在配置"), businessConfigFields(row.businessType, row)])}</form><footer class="drawer-footer"><button class="btn" type="button" data-close>取消</button><button class="btn btn-primary" type="button" data-submit-config>确定</button></footer>`;
}

function strategyDetail(id) {
  const row = state.data.businessRows.find(item => item.businessId === id);
  const actionCount = configuredActions(row).length;
  return `<form id="drawerStrategyForm">${hiddenField("configuredActionCount", String(actionCount))}${hiddenField("businessType", row.businessType)}${formStack([businessContextHeader(row, "正在配置策略"), businessStrategyFields(row.businessType, row)])}</form><footer class="drawer-footer"><button class="btn" type="button" data-close>取消</button><button class="btn btn-primary" type="button" data-submit-strategy-config>确定</button></footer>`;
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
  modalOverlay.classList.remove("image-preview-overlay");
  drawerOverlay.classList.remove("active");
  modalOverlay.innerHTML = "";
  drawerOverlay.innerHTML = "";
  modalOverlay.onclick = null;
  drawerOverlay.onclick = null;
  state.aiSampleExpandedGroups = null;
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

function alarmSelectField(label, name, options, value = "", required = false) {
  const inputId = `${name}-${Math.random().toString(16).slice(2)}`;
  return `<div class="form-group" data-disabled-if="通知开关:disabled"><label class="form-label" for="${inputId}">${label}${required ? ` <span class="required">*</span>` : ""}</label><select id="${inputId}" name="${name}" class="form-select">${options.map(option => `<option ${value === option ? "selected" : ""}>${option}</option>`).join("")}</select><div class="field-error"></div></div>`;
}

function alarmThresholdField(label, operatorName, valueName, operatorValue = "", thresholdValue = "", unit = "%", validation = "") {
  const expressionId = `${operatorName}-${Math.random().toString(16).slice(2)}`;
  const valueId = `${valueName}-${Math.random().toString(16).slice(2)}`;
  const operators = ["大于", "大于等于", "小于", "小于等于"];
  return `<div class="form-group full alarm-threshold-field" data-disabled-if="通知开关:disabled"><label class="form-label">${label} <span class="required">*</span></label><div class="alarm-threshold-row"><select id="${expressionId}" name="${operatorName}" class="form-select alarm-threshold-operator"><option value="">请选择</option>${operators.map(option => `<option ${operatorValue === option ? "selected" : ""}>${option}</option>`).join("")}</select><div class="alarm-threshold-value" data-field-name="${valueName}" data-validation="${validation}"><input id="${valueId}" name="${valueName}" class="form-input" type="number" value="${thresholdValue}" /><span class="input-suffix">${unit}</span></div></div><div class="field-error"></div></div>`;
}

function alarmWindowField(value = "") {
  const inputId = `detectWindowHours-${Math.random().toString(16).slice(2)}`;
  return `<div class="form-group alarm-window-field" data-disabled-if="通知开关:disabled"><label class="form-label" for="${inputId}">检测时间窗口 <span class="required">*</span></label><div class="alarm-window-control" data-field-name="detectWindowHours" data-validation="positiveInteger"><input id="${inputId}" name="detectWindowHours" class="form-input" type="number" value="${value}" min="1" step="1" /><span class="input-suffix">小时</span></div><div class="form-help">在该时间窗口内满足阈值条件时触发告警。</div><div class="field-error"></div></div>`;
}

function renderNotificationCount() {
  const target = document.querySelector("#notificationCount");
  if (!target) return;
  target.textContent = String(unreadNotifications().length);
}

function unreadNotifications() {
  return (state.data.alarmNotificationSamples || []).filter(item => !item.read);
}

function sortedNotifications() {
  return [...(state.data.alarmNotificationSamples || [])].sort((a, b) => new Date(b.requestTime).getTime() - new Date(a.requestTime).getTime());
}

function notificationsDrawerBody() {
  const notifications = sortedNotifications();
  if (state.activeNotificationId) {
    const item = notifications.find(notification => notification.id === state.activeNotificationId) || notifications[0];
    return notificationDetail(item);
  }
  return `<div class="notification-summary"><span>${unreadNotifications().length} 条未读</span><span>共 ${notifications.length} 条通知</span></div>${notifications.length ? `<div class="notification-list">${notifications.map(notificationItem).join("")}</div>` : emptyState("暂无通知", "当前没有新的站内通知。")}`;
}

function notificationItem(item) {
  return `<button class="notification-item ${item.read ? "is-read" : "is-unread"}" type="button" data-notification-id="${item.id}"><div class="notification-item-head"><strong>${item.title}</strong>${item.read ? tag("已读", "gray") : tag("未读", "blue")}</div><p>${item.summary}</p><div class="notification-meta"><span>${item.requestTime}</span><span>${item.productCode}</span><span>${item.businessName}</span></div><div class="notification-metrics"><span>请求量 ${formatNumber(item.requestVolume)}</span><span>通过率 ${item.passRate}</span><span>拦截率 ${item.interceptRate}</span></div></button>`;
}

function notificationDetail(item = {}) {
  return `<button class="action-link notification-back" type="button" data-notification-back>返回通知列表</button><div class="notification-detail"><div class="notification-item-head"><h3>${item.title || "业务指标触发监控告警"}</h3>${item.read ? tag("已读", "gray") : tag("未读", "blue")}</div><p class="form-help">${item.summary || "业务指标达到监控条件，请关注近期流量与通过表现。"}</p>${infoGrid([["请求时间", item.requestTime], ["产品编码", item.productCode], ["产品名称", item.productName], ["业务名称", item.businessName], ["请求量", formatNumber(item.requestVolume || 0)], ["通过率", item.passRate], ["拦截率", item.interceptRate]])}</div>`;
}

function bindNotificationDrawer(root) {
  root.querySelectorAll("[data-notification-id]").forEach(button => button.addEventListener("click", () => {
    const id = button.dataset.notificationId;
    const item = state.data.alarmNotificationSamples.find(notification => notification.id === id);
    if (item) item.read = true;
    state.activeNotificationId = id;
    renderNotificationCount();
    root.querySelector(".drawer-body").innerHTML = notificationsDrawerBody();
    bindNotificationDrawer(root);
  }));
  root.querySelectorAll("[data-notification-back]").forEach(button => button.addEventListener("click", () => {
    state.activeNotificationId = null;
    root.querySelector(".drawer-body").innerHTML = notificationsDrawerBody();
    bindNotificationDrawer(root);
  }));
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

function businessStatusLabel(value) {
  return value === "enabled" ? "已开通" : "未开通";
}

function businessStatusValue(label) {
  return label === "已开通" ? "enabled" : "disabled";
}

function businessStatusTag(value) {
  const label = businessStatusLabel(value);
  return tag(label, label === "已开通" ? "green" : "gray");
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
