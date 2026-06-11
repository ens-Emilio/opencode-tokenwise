import type { Plugin } from "@opencode-ai/plugin"
import { Database } from "bun:sqlite"
import { initDB } from "./db/schema"
import { insertSession, updateSessionTokens } from "./db/queries"
import { extractUsage } from "./tracker/tokens"
import { startDashboardServer } from "./server"
import { tokenStatsTool, tokenTodayTool } from "./tools"
import { config } from "./config"

const db = initDB()
const sessionModelMap = new Map<string, string>()

startDashboardServer()

export const TokenwisePlugin: Plugin = async ({ project, client }) => {
  return {
    "chat.params": async ({ model, provider, message }) => {
      const sessionId = (message as any)?.sessionID ?? "unknown"
      sessionModelMap.set(sessionId, `${provider}/${model}`)
    },

    "session.created": async ({ event }) => {
      const props = event.properties as any
      insertSession(db, {
        sessionId: props.id,
        project: project.path,
        model: sessionModelMap.get(props.id) ?? "unknown",
        createdAt: Date.now(),
      })
    },

    "message.updated": async ({ event }) => {
      const props = event.properties as any
      const sessionId = props?.sessionID
      if (!sessionId) return

      const model = sessionModelMap.get(sessionId) ?? "unknown"
      const usage = extractUsage(props, model)
      if (!usage) return

      updateSessionTokens(db, {
        sessionId,
        project: project.path,
        model,
        inputTokens: usage.input,
        outputTokens: usage.output,
        cacheReadTokens: usage.cacheRead,
        cacheWriteTokens: usage.cacheWrite,
        estimatedCostUsd: usage.estimatedCostUsd,
      })

      if (config.alertThresholdUsd > 0 && usage.estimatedCostUsd >= config.alertThresholdUsd) {
        client.app.log("warn", `[tokenwise] Alerta de custo: $${usage.estimatedCostUsd.toFixed(4)} na sessão ${sessionId}`)
      }
    },

    "session.idle": async ({ event }) => {
      const props = event.properties as any
      client.app.log("info", `[tokenwise] Sessão ${props.id} finalizada.`)
      sessionModelMap.delete(props.id)
    },

    tool: {
      token_stats: tokenStatsTool,
      token_today: tokenTodayTool,
    },
  }
}

export default TokenwisePlugin