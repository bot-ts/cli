import { Command } from "commander"
import { command as database } from "./set/database"
import { command as engine } from "./set/engine"

// set database <sqlite3 | pg | "mysql2">
// set engine <node | bun | deno> <npm | yarn | pnpm | bun | deno>

export const command = new Command("config")
  .description("Update bot.ts project configurations")
  .usage("[command] [--options]")
  .addCommand(database)
  .addCommand(engine)
