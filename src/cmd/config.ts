import * as database from "#src/cmd/config/database"
import * as engine from "#src/cmd/config/engine"
import { select } from "@inquirer/prompts"
import { Command } from "commander"

// set database <sqlite3 | pg | "mysql2">
// set engine <node | bun | deno> <npm | yarn | pnpm | bun | deno>

export const command = new Command("config")
  .description("Update bot.ts project configurations")
  .usage("[command] [--options]")
  .addCommand(database.command)
  .addCommand(engine.command)
  .action(async () => {
    const component = await select({
      message: "Select a component to configure",
      choices: [
        { name: "Database", value: "database" },
        { name: "Engine", value: "engine" },
      ],
    })

    switch (component) {
      case "database":
        return database.handler()
      case "engine":
        return engine.handler()
    }
  })
