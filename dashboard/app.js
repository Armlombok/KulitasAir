/* global Chart, DASHBOARD_CONFIG */
const CONFIG = window.DASHBOARD_CONFIG || {};
const API_URL = CONFIG.scriptUrl;
const SENSOR_COLUMNS = [
  ["Nilai_pH", "metricPh"], ["Nilai_turbidity", "metricTurbidity"],
  ["Nilai_DO", "metricDo"], ["Nilai_EC", "metricEc"],
  ["Flow_Rate", "metricFlow"], ["DS18B20", "metricTemperature"]
];
const CALIBRATION = [
  ["pH", "ph_a", "ph_b"], ["Turbidity", "turbidity_a", "turbidity_b"],
  ["Dissolved Oxygen", "do_a", "do_b"], ["Electrical Conductivity", "ec_a", "ec_b"],
  ["Flow offset", "flow_offset", null]
];
const chartSpecs = [
  ["chartPh", "Nilai_pH", "#159f93"], ["chartTurbidity", "Nilai_turbidity", "#e5a624"],
  ["chartDo", "Nilai_DO", "#327fb8"], ["chartEc", "Nilai_EC", "#8059a4"],
  ["chartFlow", "Flow_Rate", "#d87550"], ["chartTemperature", "DS18B20", "#d55555"]
];
let allRows = [], headers = [], charts = [];

const $ = id => document.getElementById(id);
const getDate = row => String(row.Timestamp || "").slice(0, 10);
const number = value => {
  const parsed = Number(String(value ?? "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
};

function apiUrl(parameters = {}) {
  const url = new URL(API_URL);
  Object.entries(parameters).forEach(([key, value]) => url.searchParams.set(key, value));
  return url;
}

async function getApi(parameters) {
  const response = await fetch(apiUrl(parameters));
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const json = await response.json();
  if (json.status === "error") throw new Error(json.message || "Respons API tidak valid");
  return json;
}

async function loadAllData() {
  let offset = 0;
  const collected = [];
  do {
    const page = await getApi({ action: "data", offset, limit: 1000 });
    headers = page.headers || headers;
    collected.push(...(page.rows || []));
    offset = page.nextOffset;
  } while (offset !== null && offset !== undefined);
  allRows = collected;
}

function selectedRows() {
  const from = $("fromDate").value;
  const to = $("toDate").value;
  return allRows.filter(row => (!from || getDate(row) >= from) && (!to || getDate(row) <= to));
}

function recentRows(rows) {
  const selection = $("chartRange").value;
  return selection === "all" ? rows : rows.slice(-Number(selection));
}

function updateMetrics() {
  const latest = allRows.at(-1);
  SENSOR_COLUMNS.forEach(([field, element]) => $(element).textContent = latest?.[field] || "—");
  $("lastUpdated").textContent = latest
    ? `Data terbaru: ${latest.Timestamp || "tanpa waktu"} · ${allRows.length.toLocaleString("id-ID")} rekaman dimuat`
    : "Belum ada data pada Data_Sensor.";
}

function drawCharts(rows) {
  charts.forEach(chart => chart.destroy());
  charts = [];
  const displayRows = recentRows(rows);
  chartSpecs.forEach(([canvasId, field, color]) => {
    const points = displayRows.map(row => number(row[field]));
    charts.push(new Chart($(canvasId), {
      type: "line",
      data: { labels: displayRows.map(row => String(row.Timestamp || "").replace(" ", "\n")), datasets: [{ data: points, borderColor: color, backgroundColor: `${color}20`, fill: true, pointRadius: points.length > 100 ? 0 : 2, borderWidth: 2.2, tension: .32, spanGaps: true }] },
      options: { maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { displayColors: false } }, scales: { x: { grid: { display: false }, ticks: { color: "#789", maxTicksLimit: 6, font: { size: 10 } } }, y: { grid: { color: "#e8eeee" }, ticks: { color: "#789", font: { size: 10 } } } } }
    }));
  });
}

function populateTable(rows) {
  $("dataHead").innerHTML = `<tr>${headers.map(header => `<th>${escapeHtml(header)}</th>`).join("")}</tr>`;
  $("dataBody").innerHTML = rows.length ? rows.slice().reverse().map(row => `<tr>${headers.map(header => `<td>${escapeHtml(row[header] ?? "")}</td>`).join("")}</tr>`).join("") : `<tr><td colspan="${Math.max(headers.length, 1)}">Tidak ada data pada rentang tanggal tersebut.</td></tr>`;
  $("tableInfo").textContent = `${rows.length.toLocaleString("id-ID")} dari ${allRows.length.toLocaleString("id-ID")} rekaman ditampilkan`;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char]));
}

function render() {
  const rows = selectedRows();
  updateMetrics();
  drawCharts(rows);
  populateTable(rows);
}

function renderCalibration(values = {}) {
  $("calibrationFields").innerHTML = CALIBRATION.map(([label, first, second]) => second ? `
    <div class="cal-field"><h3>${label}</h3><div class="cal-pair"><label>a<input required step="any" type="number" name="${first}" value="${values[first] ?? ""}"></label><label>b<input required step="any" type="number" name="${second}" value="${values[second] ?? ""}"></label></div></div>` :
    `<div class="cal-field"><h3>${label}</h3><div class="cal-pair"><label>nilai<input required step="any" type="number" name="${first}" value="${values[first] ?? ""}"></label></div></div>`).join("");
}

async function loadCalibration() {
  const result = await getApi({ action: "calibration" });
  renderCalibration(result.calibration);
}

function downloadCsv(rows, filename) {
  if (!rows.length) return alert("Tidak ada data untuk diunduh.");
  const escapeCsv = value => `"${String(value ?? "").replaceAll('"', '""')}"`;
  const csv = [headers, ...rows.map(row => headers.map(header => row[header]))].map(row => row.map(escapeCsv).join(",")).join("\r\n");
  const anchor = document.createElement("a");
  anchor.href = URL.createObjectURL(new Blob(["\ufeff", csv], { type: "text/csv;charset=utf-8" }));
  anchor.download = filename;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(anchor.href), 1000);
}

async function submitCalibration(event) {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const calibration = Object.fromEntries([...form.entries()].map(([key, value]) => [key, Number(value)]));
  const message = $("calibrationMessage");
  message.className = "form-message";
  message.textContent = "Menyimpan kalibrasi…";
  try {
    const response = await fetch(API_URL, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify({ action: "setCalibration", calibration, writeToken: $("writeToken").value }) });
    const result = await response.json();
    if (result.status !== "success") throw new Error(result.message || "Gagal menyimpan");
    message.textContent = "Kalibrasi tersimpan. UPDATE menunggu diambil ESP32.";
    $("writeToken").value = "";
  } catch (error) {
    message.className = "form-message error";
    message.textContent = `Gagal: ${error.message}`;
  }
}

async function refresh() {
  if (!API_URL || API_URL.includes("PASTE_")) throw new Error("URL Apps Script belum diatur di dashboard/config.js");
  $("connectionText").textContent = "Memuat data…";
  await Promise.all([loadAllData(), loadCalibration()]);
  render();
  document.querySelector(".connection").classList.add("connected");
  $("connectionText").textContent = "Terhubung ke Google Sheets";
}

function wireEvents() {
  $("refreshButton").addEventListener("click", () => refresh().catch(showError));
  $("chartRange").addEventListener("change", render);
  $("applyFilter").addEventListener("click", render);
  $("clearFilter").addEventListener("click", () => { $("fromDate").value = ""; $("toDate").value = ""; render(); });
  $("downloadAll").addEventListener("click", () => downloadCsv(allRows, "waterwatch-semua-data.csv"));
  $("downloadToday").addEventListener("click", () => { const day = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Makassar" }); downloadCsv(allRows.filter(row => getDate(row) === day), `waterwatch-${day}.csv`); });
  $("downloadDates").addEventListener("click", () => downloadCsv(selectedRows(), "waterwatch-rentang-tanggal.csv"));
  $("calibrationForm").addEventListener("submit", submitCalibration);
}

function showError(error) {
  console.error(error);
  document.querySelector(".connection").classList.remove("connected");
  $("connectionText").textContent = `Gagal terhubung: ${error.message}`;
  $("lastUpdated").textContent = "Periksa deployment Apps Script, URL pada config.js, dan koneksi internet.";
}

wireEvents();
refresh().catch(showError);
setInterval(() => refresh().catch(showError), (CONFIG.refreshSeconds || 60) * 1000);
