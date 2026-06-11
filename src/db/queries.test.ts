import { describe, it, expect, beforeEach } from "bun:test"
import { Database } from "bun:sqlite"
import { initDB } from "./schema"
import { insertSession, updateSessionTokens, getAnalytics, getDailyUsage, getModelBreakdown } from "./queries"

describe("queries", () => {
  let db: Database

  beforeEach(() => {
    db = new Database(":memory:")
    initDB(db)
  })

  it("inserts and accumulates tokens correctly", () => {
    insertSession(db, { sessionId: "s1", project: "/proj", model: "gpt-4o", createdAt: Date.now() })
    updateSessionTokens(db, { sessionId: "s1", inputTokens: 100, outputTokens: 50, cacheReadTokens: 0, cacheWriteTokens: 0, estimatedCostUsd: 0.001 })

    const analytics = getAnalytics(db, 7)
    expect(analytics.totalInput).toBe(100)
    expect(analytics.totalOutput).toBe(50)
  })

  it("aggregates by model correctly", () => {
    const now = Date.now()
    insertSession(db, { sessionId: "s1", project: "/proj", model: "gpt-4o", createdAt: now })
    insertSession(db, { sessionId: "s2", project: "/proj", model: "claude-sonnet-4-5", createdAt: now })
    updateSessionTokens(db, { sessionId: "s1", inputTokens: 100, outputTokens: 50, cacheReadTokens: 0, cacheWriteTokens: 0, estimatedCostUsd: 0.001 })
    updateSessionTokens(db, { sessionId: "s2", inputTokens: 200, outputTokens: 100, cacheReadTokens: 0, cacheWriteTokens: 0, estimatedCostUsd: 0.002 })

    const analytics = getAnalytics(db, 7)
    expect(analytics.byModel["gpt-4o"].input).toBe(100)
    expect(analytics.byModel["claude-sonnet-4-5"].input).toBe(200)
  })

  it("daily usage returns correct data", () => {
    const now = Date.now()
    insertSession(db, { sessionId: "s1", project: "/proj", model: "gpt-4o", createdAt: now })
    updateSessionTokens(db, { sessionId: "s1", inputTokens: 100, outputTokens: 50, cacheReadTokens: 0, cacheWriteTokens: 0, estimatedCostUsd: 0.001 })

    const daily = getDailyUsage(db, 1)
    expect(daily.length).toBe(1)
    expect(daily[0].totalInput).toBe(100)
    expect(daily[0].totalOutput).toBe(50)
  })

  it("model breakdown returns correct aggregation", () => {
    const now = Date.now()
    insertSession(db, { sessionId: "s1", project: "/proj", model: "gpt-4o", createdAt: now })
    insertSession(db, { sessionId: "s2", project: "/proj", model: "gpt-4o", createdAt: now })
    updateSessionTokens(db, { sessionId: "s1", inputTokens: 100, outputTokens: 50, cacheReadTokens: 0, cacheWriteTokens: 0, estimatedCostUsd: 0.001 })
    updateSessionTokens(db, { sessionId: "s2", inputTokens: 200, outputTokens: 100, cacheReadTokens: 0, cacheWriteTokens: 0, estimatedCostUsd: 0.002 })

    const breakdown = getModelBreakdown(db)
    expect(breakdown.length).toBe(1)
    expect(breakdown[0].model).toBe("gpt-4o")
    expect(breakdown[0].total_input).toBe(300)
    expect(breakdown[0].total_output).toBe(150)
  })
})