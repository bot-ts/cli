import { Command } from "commander"
import ejs from "ejs"
import fs from "fs"
import inquirer from "inquirer"
import path from "path"
import { styleText } from "util"
import { cwd } from "../../util"

export const command = new Command("command")
  .description("add a command")
  .action(async () => {
    const { name, description, channelType, botOwnerOnly } =
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
          type: "list",
          name: "channelType",
          message: "Select the channel type",
          choices: ["all", "dm", "guild"],
          default: "all",
        },
        {
          type: "confirm",
          name: "botOwnerOnly",
          message: "Is this command for bot owner only?",
          default: false,
        },
      ])

    const template = fs.readFileSync(cwd("templates", "command.ejs"), "utf8")
    const commandPath = ["src", "commands", name + ".ts"]

    fs.writeFileSync(
      cwd(...commandPath),
      ejs.compile(template)({
        name,
        description,
        channelType,
        botOwnerOnly,
      }),
      "utf8"
    )

    console.log(
      `✅ Command ${styleText(
        "blueBright",
        name
      )} has been created at ${styleText(
        "cyanBright",
        path.join(...commandPath)
      )}`
    )
  })
