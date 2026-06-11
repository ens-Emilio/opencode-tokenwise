import { join } from "path"
import { homedir } from "os"

export const config = {
  port: Number(process.env.TOKENWISE_PORT ?? 7842),
  host: process.env.TOKENWISE_HOST ?? "127.0.0.1",
  dbPath: process.env.TOKENWISE_DB_PATH
    ?? join(homedir(), ".config", "opencode", "tokenwise.db"),
  alertThresholdUsd: Number(process.env.TOKENWISE_ALERT_USD ?? 0),
  pricingPath: process.env.TOKENWISE_PRICING_PATH,
}