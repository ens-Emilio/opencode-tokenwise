import { readFileSync } from "fs"
import { config } from "../config"

export interface TokenUsage {
  input: number
  output: number
  cacheRead: number
  cacheWrite: number
  estimatedCostUsd: number
}

const DEFAULT_PRICING: Record<string, { input: number; output: number }> = {
  "claude-opus-4-5": { input: 15.00, output: 75.00 },
  "claude-sonnet-4-5": { input: 3.00, output: 15.00 },
  "gpt-4o": { input: 5.00, output: 15.00 },
  "gpt-4o-mini": { input: 0.15, output: 0.60 },
  "gemini-2.0-flash": { input: 0.075, output: 0.30 },
}

let pricingCache: Record<string, { input: number; output: number }> | null = null

function loadPricing(): Record<string, { input: number; output: number }> {
  if (pricingCache) return pricingCache

  if (config.pricingPath) {
    try {
      const content = readFileSync(config.pricingPath, "utf-8")
      pricingCache = JSON.parse(content)
      return pricingCache
    } catch {
      console.warn("[tokenwise] Failed to load custom pricing, using defaults")
    }
  }

  pricingCache = DEFAULT_PRICING
  return pricingCache
}

export function extractUsage(eventProperties: unknown, model: string): TokenUsage | null {
  const props = eventProperties as Record<string, any>

  const tokens = props?.tokens ?? props?.usage ?? props?.metadata?.tokens
  if (!tokens) return null

  const input = tokens.input ?? tokens.prompt_tokens ?? 0
  const output = tokens.output ?? tokens.completion_tokens ?? 0
  const cacheRead = tokens.cacheRead ?? tokens.cache_read_input_tokens ?? 0
  const cacheWrite = tokens.cacheWrite ?? tokens.cache_creation_input_tokens ?? 0

  const pricing = loadPricing()
  const modelPricing = pricing[model] ?? pricing[model.split("/").pop() ?? ""] ?? { input: 0, output: 0 }

  const estimatedCostUsd =
    (input / 1_000_000) * modelPricing.input +
    (output / 1_000_000) * modelPricing.output

  return { input, output, cacheRead, cacheWrite, estimatedCostUsd }
}