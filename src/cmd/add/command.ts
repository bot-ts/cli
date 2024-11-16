import { confirm, input, select } from "@inquirer/prompts"
import { Command } from "commander"
import ejs from "ejs"
import fs from "fs"
import path from "path"
import { styleText } from "util"
import { cwd, format, inputName, isBotTsProject } from "../../util"

export const handler = async () => {
  if (!isBotTsProject()) return process.exit(1)

  const name = await inputName("Enter the command name")

  const description = await input({
    message: "Enter the command description",
  })

  const channelType = await select({
    message: "Select the channel type",
    choices: [
      { name: "All Channels", value: "all" },
      { name: "Direct Messages", value: "dm" },
      { name: "Guild Channels", value: "guild" },
    ],
    default: "all",
  })

  const botOwnerOnly = await confirm({
    message: "Is this command for bot owner only?",
    default: false,
  })

  const template = fs.readFileSync(cwd("templates", "command.ejs"), "utf8")
  const commandPath = ["src", "commands", name + ".ts"]

  fs.writeFileSync(
    cwd(...commandPath),
    format(
      ejs.compile(template)({
        name,
        description,
        channelType,
        botOwnerOnly,
      })
    ),
    "utf8"
  )

  console.log()
  console.log(
    `✅ Command ${styleText(
      "blueBright",
      name
    )} has been created at ${styleText(
      "cyanBright",
      path.join(...commandPath)
    )}`
  )
}

export const command = new Command("command")
  .description(
    "Add a command\nMore info: https://ghom.gitbook.io/bot.ts/usage/create-a-command"
  )
  .usage("[--options]")
  .action(handler)
