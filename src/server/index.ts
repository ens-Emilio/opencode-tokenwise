import { Hono } from "hono"
import { serveStatic } from "hono/bun"
import { Database } from "bun:sqlite"
import { initDB } from "../db/schema"
import { getAnalytics, getDailyUsage, getModelBreakdown } from "../db/queries"
import { config } from "../config"

const app = new Hono()

const db = initDB()

app.use("/dashboard/*", serveStatic({ root: "./src/server/public" }))
app.use("/dashboard", serveStatic({ root: "./src/server/public", path: "index.html" }))

app.get("/api/analytics", (c) => {
  const days = Number(c.req.query("days") ?? 30)
  return c.json(getAnalytics(db, days))
})

app.get("/api/daily", (c) => {
  const days = Number(c.req.query("days") ?? 30)
  return c.json(getDailyUsage(db, days))
})

app.get("/api/models", (c) => {
  return c.json(getModelBreakdown(db))
})

app.get("/api/health", (c) => {
  return c.json({ status: "ok", timestamp: Date.now() })
})

export function startDashboardServer() {
  try {
    Bun.serve({ fetch: app.fetch, port: config.port, hostname: config.host })
    console.log(`[tokenwise] Dashboard em http://${config.host}:${config.port}/dashboard`)
  } catch (e: any) {
    if (e.code === "EADDRINUSE") {
      console.log("[tokenwise] Servidor já rodando, ignorando.")
    } else {
      console.error(`[tokenwise] Falha ao subir servidor: ${e.message}`)
    }
  }
}

export { app }