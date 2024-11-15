import { Command } from "commander"
import { command as database } from "./set/database"
import { command as packageManager } from "./set/packageManager"
import { command as runtime } from "./set/runtime"

// set database <sqlite3 | pg | "mysql2">
// set engine <node | bun | deno> <npm | yarn | pnpm | bun | deno>

export const command = new Command("set")
  .description("Update bot.ts project configurations")
  .addCommand(database)
  .addCommand(runtime)
  .addCommand(packageManager)
