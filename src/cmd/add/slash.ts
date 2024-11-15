import { Command } from "commander"
import ejs from "ejs"
import fs from "fs"
import inquirer from "inquirer"
import path from "path"
import { styleText } from "util"
import { cwd, format } from "../../util"

export const command = new Command("slash")
  .description(
    "Add a slash command\nMore info: https://ghom.gitbook.io/bot.ts/usage/create-a-command#slash-commands"
  )
  .action(async () => {
    const { name, description, guildOnly, botOwnerOnly, withSubs } =
      await inquirer.prompt([
        {
          type: "input",
          name: "name",
          message: "Enter the command name",
        },
        {
          type: "input",
          name: "description",
          message: "Enter the command description",
        },
        {
          type: "confirm",
          name: "guildOnly",
          message: "Is this command for guilds only?",
          default: false,
        },
        {
          type: "confirm",
          name: "botOwnerOnly",
          message: "Is this command for bot owner only?",
          default: false,
        },
        {
          type: "confirm",
          name: "withSubs",
          message: "Does this command have subcommands or options?",
          default: false,
        },
      ])

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

    console.log(
      `✅ Slash command ${styleText(
        "blueBright",
        name
      )} has been created at ${styleText(
        "cyanBright",
        path.join(...slashPath)
      )}`
    )
  })
