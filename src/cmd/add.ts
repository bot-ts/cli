import * as button from "#src/cmd/add/button"
import * as cmd from "#src/cmd/add/command"
import * as cron from "#src/cmd/add/cron"
import * as listener from "#src/cmd/add/listener"
import * as namespace from "#src/cmd/add/namespace"
import * as slash from "#src/cmd/add/slash"
import * as table from "#src/cmd/add/table"
import { select } from "@inquirer/prompts"
import { Command } from "commander"

export const command = new Command("add")
  .description("Generate a bot component or add a dependency")
  .addCommand(cmd.command)
  .addCommand(slash.command)
  .addCommand(listener.command)
  .addCommand(table.command)
  .addCommand(cron.command)
  .addCommand(button.command)
  .addCommand(namespace.command)
  .action(async () => {
    const component = await select({
      message: "Select a component to add",
      choices: [
        { name: "Command", value: "cmd" },
        { name: "Slash Command", value: "slash" },
        { name: "Listener", value: "listener" },
        { name: "Table", value: "table" },
        { name: "Cron Job", value: "cron" },
        { name: "Button", value: "button" },
        { name: "Namespace", value: "namespace" },
      ],
    })

    switch (component) {
      case "cmd":
        return cmd.handler()
      case "slash":
        return slash.handler()
      case "listener":
        return listener.handler()
      case "table":
        return table.handler()
      case "cron":
        return cron.handler()
      case "button":
        return button.handler()
      case "namespace":
        return namespace.handler()
    }
  })
