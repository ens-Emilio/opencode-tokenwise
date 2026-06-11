async function fetchJSON(url) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

function formatNumber(n) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M"
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K"
  return n.toString()
}

function formatCurrency(n) {
  return "$" + n.toFixed(4)
}

function getChartColors(count) {
  const baseColors = [
    "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6",
    "#ec4899", "#06b6d4", "#84cc16", "#f97316", "#6366f1"
  ]
  const colors = []
  for (let i = 0; i < count; i++) {
    colors.push(baseColors[i % baseColors.length])
  }
  return colors
}

let dailyChart = null
let modelChart = null

async function loadDashboard() {
  try {
    const [analytics, daily, models] = await Promise.all([
      fetchJSON("/api/analytics?days=30"),
      fetchJSON("/api/daily?days=30"),
      fetchJSON("/api/models"),
    ])

    updateCards(analytics, daily)
    renderDailyChart(daily)
    renderModelChart(models)
    renderModelTable(models)
    renderDailyTable(daily)
  } catch (err) {
    console.error("Erro ao carregar dashboard:", err)
    document.body.innerHTML += `<div style="padding:20px;color:red;text-align:center">Erro ao carregar dados: ${err.message}</div>`
  }
}

function updateCards(analytics, daily) {
  const totalTokens = analytics.totalInput + analytics.totalOutput
  document.getElementById("totalTokens").textContent = formatNumber(totalTokens)
  document.getElementById("totalInput").textContent = formatNumber(analytics.totalInput)
  document.getElementById("totalOutput").textContent = formatNumber(analytics.totalOutput)
  document.getElementById("totalCost").textContent = formatCurrency(analytics.totalCostUsd)
  document.getElementById("sessionCount").textContent = analytics.sessionCount

  const today = daily.find(d => d.date === new Date().toISOString().split("T")[0])
  const todayTotal = today ? today.totalInput + today.totalOutput : 0
  document.getElementById("todayTokens").textContent = formatNumber(todayTotal)
}

function renderDailyChart(daily) {
  const ctx = document.getElementById("dailyChart").getContext("2d")
  
  const labels = daily.map(d => d.date.split("-").slice(1).join("/"))
  const inputData = daily.map(d => d.totalInput)
  const outputData = daily.map(d => d.totalOutput)

  if (dailyChart) dailyChart.destroy()

  dailyChart = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "Input",
          data: inputData,
          borderColor: "#3b82f6",
          backgroundColor: "rgba(59, 130, 246, 0.1)",
          fill: true,
          tension: 0.3,
          pointRadius: 3,
        },
        {
          label: "Output",
          data: outputData,
          borderColor: "#10b981",
          backgroundColor: "rgba(16, 185, 129, 0.1)",
          fill: true,
          tension: 0.3,
          pointRadius: 3,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: "top" },
      },
      scales: {
        y: { beginAtZero: true, ticks: { callback: v => formatNumber(v) } },
        x: { ticks: { maxRotation: 45, minRotation: 45 } },
      },
    },
  })
}

function renderModelChart(models) {
  const ctx = document.getElementById("modelChart").getContext("2d")
  
  const labels = models.map(m => m.model)
  const data = models.map(m => m.total_input + m.total_output)
  const colors = getChartColors(labels.length)

  if (modelChart) modelChart.destroy()

  modelChart = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: colors,
        borderWidth: 2,
        borderColor: "#fff",
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: "right", labels: { usePointStyle: true, padding: 16 } },
        tooltip: {
          callbacks: {
            label: ctx => `${ctx.label}: ${formatNumber(ctx.raw)} (${((ctx.raw / data.reduce((a,b)=>a+b,0))*100).toFixed(1)}%)`,
          },
        },
      },
      cutout: "60%",
    },
  })
}

function renderModelTable(models) {
  const tbody = document.querySelector("#modelTable tbody")
  tbody.innerHTML = models.map(m => `
    <tr>
      <td>${m.model}</td>
      <td>${m.sessions}</td>
      <td>${formatNumber(m.total_input)}</td>
      <td>${formatNumber(m.total_output)}</td>
      <td>${formatCurrency(m.total_cost)}</td>
    </tr>
  `).join("")
}

function renderDailyTable(daily) {
  const tbody = document.querySelector("#dailyTable tbody")
  tbody.innerHTML = daily.slice().reverse().map(d => `
    <tr>
      <td>${d.date}</td>
      <td>${d.session_count}</td>
      <td>${formatNumber(d.totalInput)}</td>
      <td>${formatNumber(d.totalOutput)}</td>
      <td>${formatCurrency(d.totalCostUsd)}</td>
    </tr>
  `).join("")
}

// Chart.js via CDN fallback
if (typeof Chart === "undefined") {
  const script = document.createElement("script")
  script.src = "https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js"
  script.onload = loadDashboard
  document.head.appendChild(script)
}