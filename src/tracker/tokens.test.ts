import { describe, it, expect, beforeEach } from "bun:test"
import { extractUsage } from "./tokens"

describe("token tracker", () => {
  beforeEach(() => {
    process.env.TOKENWISE_PRICING_PATH = ""
  })

  it("extracts tokens from standard payload", () => {
    const result = extractUsage(
      { tokens: { input: 500, output: 200 } },
      "claude-sonnet-4-5"
    )
    expect(result?.input).toBe(500)
    expect(result?.output).toBe(200)
    expect(result?.estimatedCostUsd).toBeCloseTo(0.0045)
  })

  it("extracts tokens from usage payload (OpenAI style)", () => {
    const result = extractUsage(
      { usage: { prompt_tokens: 300, completion_tokens: 150 } },
      "gpt-4o"
    )
    expect(result?.input).toBe(300)
    expect(result?.output).toBe(150)
    expect(result?.estimatedCostUsd).toBeCloseTo(0.00375)
  })

  it("extracts tokens from metadata.tokens payload", () => {
    const result = extractUsage(
      { metadata: { tokens: { input: 100, output: 50 } } },
      "gemini-2.0-flash"
    )
    expect(result?.input).toBe(100)
    expect(result?.output).toBe(50)
  })

  it("handles cache read/write tokens", () => {
    const result = extractUsage(
      {
        tokens: {
          input: 100,
          output: 50,
          cacheRead: 200,
          cacheWrite: 50,
        },
      },
      "claude-opus-4-5"
    )
    expect(result?.cacheRead).toBe(200)
    expect(result?.cacheWrite).toBe(50)
  })

  it("returns null when no tokens in payload", () => {
    const result = extractUsage({ foo: "bar" }, "gpt-4o")
    expect(result).toBeNull()
  })

  it("falls back to provider prefix for model matching", () => {
    const result = extractUsage(
      { tokens: { input: 100, output: 50 } },
      "anthropic/claude-sonnet-4-5"
    )
    expect(result?.estimatedCostUsd).toBeCloseTo(0.0009)
  })

  it("returns zero cost for unknown model", () => {
    const result = extractUsage(
      { tokens: { input: 1000, output: 500 } },
      "unknown-model"
    )
    expect(result?.estimatedCostUsd).toBe(0)
  })
})