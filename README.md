# opencode-tokenwise

Plugin de analytics de tokens para [OpenCode](https://opencode.ai). Captura uso de tokens em tempo real, exibe dashboard web local e oferece CLI para consultas rápidas.

## Funcionalidades

- 📊 **Captura automática** — Hooks no `chat.params`, `session.created`, `message.updated`, `session.idle`
- 💾 **Storage local** — SQLite em `~/.config/opencode/tokenwise.db` (zero dependências externas)
- 🌐 **Dashboard web** — SPA em `http://localhost:7842/dashboard` com gráficos (Chart.js)
- 🖥️ **CLI standalone** — `opencode-analytics stats|today|models|dashboard|export`
- 🤖 **Custom tools** — Agente pode consultar `token_stats` e `token_today`
- ⚠️ **Alertas de custo** — Configurável via `TOKENWISE_ALERT_USD`
- 💰 **Pricing embutido** — Tabela de preços por modelo com override via arquivo JSON

## Instalação

```bash
npm install -g opencode-tokenwise
```

Adicione ao `~/.config/opencode/opencode.json`:

```json
{
  "plugin": ["opencode-tokenwise"]
}
```

Reinicie o OpenCode.

## Configuração (variáveis de ambiente)

| Variável | Padrão | Descrição |
|----------|--------|-----------|
| `TOKENWISE_PORT` | `7842` | Porta do dashboard |
| `TOKENWISE_HOST` | `127.0.0.1` | Host do servidor (nunca `0.0.0.0` por segurança) |
| `TOKENWISE_DB_PATH` | `~/.config/opencode/tokenwise.db` | Caminho do SQLite |
| `TOKENWISE_ALERT_USD` | `0` | Limite de alerta de custo por mensagem (0 = desabilitado) |
| `TOKENWISE_PRICING_PATH` | — | Caminho para JSON customizado de pricing |

## Uso

### Dashboard

```bash
opencode-analytics dashboard
# ou acesse http://localhost:7842/dashboard
```

### CLI

```bash
# Resumo últimos 7 dias
opencode-analytics stats

# Resumo últimos 30 dias
opencode-analytics stats -d 30

# Consumo de hoje
opencode-analytics today

# Breakdown por modelo
opencode-analytics models

# Exportar JSON
opencode-analytics export -f json -o analytics.json

# Exportar CSV
opencode-analytics export -f csv -o analytics.csv
```

### Custom Tools (agente)

O agente do OpenCode pode usar:

```
"Quanto gastei hoje?" → usa token_today
"Stats dos últimos 30 dias" → usa token_stats com days: 30
```

## Estrutura do Banco

```sql
sessions (
  id, project, model, input_tokens, output_tokens,
  cache_read_tokens, cache_write_tokens, estimated_cost_usd,
  created_at, updated_at, tags
)

daily_summary (
  date, total_input, total_output, total_cost_usd, session_count
)
```

Migrações automáticas via tabela `_meta`.

## Pricing Override

Crie `pricing.json`:

```json
{
  "meu-modelo-custom": { "input": 2.50, "output": 10.00 }
}
```

```bash
export TOKENWISE_PRICING_PATH=/caminho/pricing.json
```

## Desenvolvimento

```bash
# Instalar deps
bun install

# Testes
bun test

# Build plugin
bun run build

# Build CLI
bun run build:cli

# Dev mode (watch)
bun run dev
```

## Segurança

- Dashboard bind apenas em `127.0.0.1` (localhost)
- Para acesso remoto, use SSH tunneling:
  ```bash
  ssh -L 7842:localhost:7842 user@servidor
  ```

## Licença

MIT