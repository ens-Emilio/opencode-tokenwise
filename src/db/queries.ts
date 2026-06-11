import { Database } from "./schema"

export interface SessionData {
  sessionId: string
  project: string
  model: string
  inputTokens: number
  outputTokens: number
  cacheReadTokens: number
  cacheWriteTokens: number
  estimatedCostUsd: number
}

export interface AnalyticsResult {
  totalInput: number
  totalOutput: number
  totalCostUsd: number
  sessionCount: number
  byModel: Record<string, { input: number; output: number; cost: number; sessions: number }>
  byDay: Array<{ date: string; input: number; output: number; cost: number; sessions: number }>
}

export interface DailyUsage {
  date: string
  totalInput: number
  totalOutput: number
  totalCostUsd: number
  sessionCount: number
}

export function insertSession(
  db: Database,
  data: { sessionId: string; project: string; model: string; createdAt: number }
) {
  db.prepare(`
    INSERT OR IGNORE INTO sessions (id, project, model, created_at)
    VALUES (?, ?, ?, ?)
  `).run(data.sessionId, data.project, data.model, data.createdAt)
}

export function updateSessionTokens(
  db: Database,
  data: SessionData
) {
  const now = Date.now()
  db.prepare(`
    UPDATE sessions
    SET input_tokens = input_tokens + ?,
        output_tokens = output_tokens + ?,
        cache_read_tokens = cache_read_tokens + ?,
        cache_write_tokens = cache_write_tokens + ?,
        estimated_cost_usd = estimated_cost_usd + ?,
        updated_at = ?
    WHERE id = ?
  `).run(data.inputTokens, data.outputTokens, data.cacheReadTokens, data.cacheWriteTokens, data.estimatedCostUsd, now, data.sessionId)

  updateDailySummary(db, data, now)
}

function updateDailySummary(
  db: Database,
  data: SessionData,
  timestamp: number
) {
  const date = new Date(timestamp).toISOString().split("T")[0]
  db.prepare(`
    INSERT INTO daily_summary (date, total_input, total_output, total_cost_usd, session_count)
    VALUES (?, ?, ?, 0, 1)
    ON CONFLICT(date) DO UPDATE SET
      total_input = total_input + ?,
      total_output = total_output + ?,
      session_count = session_count + 1
  `).run(date, data.inputTokens, data.outputTokens, data.inputTokens, data.outputTokens)
}

export function getAnalytics(db: Database, days: number): AnalyticsResult {
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000

  const sessions = db.prepare(`
    SELECT model, input_tokens, output_tokens, estimated_cost_usd, created_at
    FROM sessions
    WHERE created_at >= ?
  `).all(cutoff) as Array<{
    model: string
    input_tokens: number
    output_tokens: number
    estimated_cost_usd: number
    created_at: number
  }>

  const daily = db.prepare(`
    SELECT date, total_input, total_output, total_cost_usd, session_count
    FROM daily_summary
    WHERE date >= ?
    ORDER BY date
  `).all(new Date(cutoff).toISOString().split("T")[0]) as Array<{
    date: string
    total_input: number
    total_output: number
    total_cost_usd: number
    session_count: number
  }>

  let totalInput = 0
  let totalOutput = 0
  let totalCostUsd = 0
  const byModel: AnalyticsResult["byModel"] = {}
  const byDayMap = new Map<string, { input: number; output: number; cost: number; sessions: number }>()

  for (const s of sessions) {
    totalInput += s.input_tokens
    totalOutput += s.output_tokens
    totalCostUsd += s.estimated_cost_usd

    if (!byModel[s.model]) {
      byModel[s.model] = { input: 0, output: 0, cost: 0, sessions: 0 }
    }
    byModel[s.model].input += s.input_tokens
    byModel[s.model].output += s.output_tokens
    byModel[s.model].cost += s.estimated_cost_usd
    byModel[s.model].sessions += 1

    const day = new Date(s.created_at).toISOString().split("T")[0]
    if (!byDayMap.has(day)) {
      byDayMap.set(day, { input: 0, output: 0, cost: 0, sessions: 0 })
    }
    const d = byDayMap.get(day)!
    d.input += s.input_tokens
    d.output += s.output_tokens
    d.cost += s.estimated_cost_usd
    d.sessions += 1
  }

  const byDay = Array.from(byDayMap.entries())
    .map(([date, data]) => ({ date, ...data }))
    .sort((a, b) => a.date.localeCompare(b.date))

  return {
    totalInput,
    totalOutput,
    totalCostUsd,
    sessionCount: sessions.length,
    byModel,
    byDay,
  }
}

export function getDailyUsage(db: Database, days: number): DailyUsage[] {
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
  return db.prepare(`
    SELECT date, 
           total_input as totalInput,
           total_output as totalOutput,
           total_cost_usd as totalCostUsd,
           session_count as sessionCount
    FROM daily_summary
    WHERE date >= ?
    ORDER BY date DESC
  `).all(cutoff) as DailyUsage[]
}

export function getModelBreakdown(db: Database) {
  return db.prepare(`
    SELECT model, COUNT(*) as sessions,
           SUM(input_tokens) as total_input,
           SUM(output_tokens) as total_output,
           SUM(estimated_cost_usd) as total_cost
    FROM sessions
    GROUP BY model
    ORDER BY total_cost DESC
  `).all() as Array<{
    model: string
    sessions: number
    total_input: number
    total_output: number
    total_cost: number
  }>
}