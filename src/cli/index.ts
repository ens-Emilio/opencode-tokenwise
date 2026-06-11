import { Command } from "commander"
import { Database } from "bun:sqlite"
import { initDB } from "../db/schema"
import { getAnalytics, getDailyUsage, getModelBreakdown } from "../db/queries"
import { toCSV } from "./csv"
import { config } from "../config"

const program = new Command()

program
  .name("opencode-analytics")
  .description("Token analytics para OpenCode")
  .version("1.0.0")

function getDB(): Database {
  return initDB()
}

program
  .command("stats")
  .description("Resumo geral de uso de tokens")
  .option("-d, --days <number>", "Últimos N dias", "7")
  .action((opts) => {
    const db = getDB()
    const data = getAnalytics(db, Number(opts.days))
    console.log("=== Resumo de Tokens ===")
    console.log(`Total Input:  ${data.totalInput.toLocaleString()}`)
    console.log(`Total Output: ${data.totalOutput.toLocaleString()}`)
    console.log(`Total Tokens: ${(data.totalInput + data.totalOutput).toLocaleString()}`)
    console.log(`Custo Estimado: $${data.totalCostUsd.toFixed(4)}`)
    console.log(`Sessões: ${data.sessionCount}`)
    console.log("")
    console.log("Por Modelo:")
    for (const [model, stats] of Object.entries(data.byModel)) {
      console.log(`  ${model}: ${stats.input.toLocaleString()} in / ${stats.output.toLocaleString()} out / $${stats.cost.toFixed(4)} (${stats.sessions} sessões)`)
    }
  })

program
  .command("today")
  .description("Tokens consumidos hoje")
  .action(() => {
    const db = getDB()
    const data = getDailyUsage(db, 1)
    if (!data.length) {
      console.log("Nenhum dado para hoje.")
      return
    }
    const d = data[0]
    console.log("=== Hoje ===")
    console.log(`Input:  ${d.totalInput.toLocaleString()}`)
    console.log(`Output: ${d.totalOutput.toLocaleString()}`)
    console.log(`Total:  ${(d.totalInput + d.totalOutput).toLocaleString()}`)
    console.log(`Custo:  $${d.totalCostUsd.toFixed(4)}`)
    console.log(`Sessões: ${d.sessionCount}`)
  })

program
  .command("dashboard")
  .description("Abre o dashboard no navegador")
  .action(() => {
    const url = `http://${config.host}:${config.port}/dashboard`
    console.log(`Abrindo ${url}...`)
    const { spawn } = require("child_process")
    const opener = process.platform === "darwin" ? "open" : process.platform === "win32" ? "start" : "xdg-open"
    spawn(opener, [url], { detached: true, stdio: "ignore" }).unref()
  })

program
  .command("models")
  .description("Breakdown por modelo")
  .action(() => {
    const db = getDB()
    const data = getModelBreakdown(db)
    console.log("=== Por Modelo ===")
    for (const m of data) {
      console.log(`${m.model}: ${m.sessions} sessões, ${m.total_input.toLocaleString()} in, ${m.total_output.toLocaleString()} out, $${m.total_cost.toFixed(4)}`)
    }
  })

program
  .command("export")
  .description("Exporta dados em JSON ou CSV")
  .option("-f, --format <type>", "json ou csv", "json")
  .option("-o, --output <file>", "Arquivo de saída")
  .option("-d, --days <number>", "Últimos N dias", "365")
  .action((opts) => {
    const db = getDB()
    const data = getAnalytics(db, Number(opts.days))
    
    const rows = data.byDay.map(d => ({
      date: d.date,
      input: d.input,
      output: d.output,
      cost: d.cost,
      sessions: d.sessions,
    }))

    let output: string
    if (opts.format === "csv") {
      output = toCSV(rows)
    } else {
      output = JSON.stringify({
        summary: {
          totalInput: data.totalInput,
          totalOutput: data.totalOutput,
          totalCostUsd: data.totalCostUsd,
          sessionCount: data.sessionCount,
        },
        byModel: data.byModel,
        byDay: data.byDay,
      }, null, 2)
    }

    if (opts.output) {
      require("fs").writeFileSync(opts.output, output)
      console.log(`Exportado para ${opts.output}`)
    } else {
      console.log(output)
    }
  })

program.parse()