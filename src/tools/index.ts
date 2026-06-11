import { tool } from "@opencode-ai/plugin"
import { z } from "zod"
import { Database } from "bun:sqlite"
import { initDB } from "../db/schema"
import { getAnalytics, getDailyUsage } from "../db/queries"

const db = initDB()

export const tokenStatsTool = tool({
  description: "Retorna estatísticas de consumo de tokens e custo estimado",
  args: { days: z.number().default(7) },
  async execute({ days }) {
    const data = getAnalytics(db, days)
    return JSON.stringify({
      totalInput: data.totalInput,
      totalOutput: data.totalOutput,
      totalCostUsd: data.totalCostUsd,
      sessionCount: data.sessionCount,
      byModel: data.byModel,
    })
  },
})

export const tokenTodayTool = tool({
  description: "Retorna o consumo de tokens do dia atual",
  args: {},
  async execute() {
    const data = getDailyUsage(db, 1)
    return JSON.stringify(data[0] ?? { message: "Nenhum dado para hoje" })
  },
})