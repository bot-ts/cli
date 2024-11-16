import { confirm, input } from "@inquirer/prompts"
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

  const guildOnly = await confirm({
    message: "Is this command for guilds only?",
    default: false,
  })

  const botOwnerOnly = await confirm({
    message: "Is this command for bot owner only?",
    default: false,
  })

  const withSubs = await confirm({
    message: "Does this command have subcommands or options?",
    default: false,
  })

  const template = fs.readFileSync(cwd("templates", "slash.ejs"), "utf8")
  const slashPath = ["src", "slash", name + ".ts"]

  fs.writeFileSync(
    cwd(...slashPath),
    format(
      ejs.compile(template)({
        name,
        description,
        guildOnly,
        botOwnerOnly,
        withSubs,
      })
    ),
    "utf8"
  )

  console.log()
  console.log(
    `✅ Slash command ${styleText(
      "blueBright",
      name
    )} has been created at ${styleText("cyanBright", path.join(...slashPath))}`
  )
}

export const command = new Command("slash")
  .description(
    "Add a slash command\nMore info: https://ghom.gitbook.io/bot.ts/usage/create-a-command#slash-commands"
  )
  .usage("[--options]")
  .action(handler)
