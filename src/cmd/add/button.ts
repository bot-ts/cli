import { capitalize, cwd, format, inputName, isBotTsProject } from "#src/util"
import { confirm, input, select } from "@inquirer/prompts"
import { Command } from "commander"
import ejs from "ejs"
import fs from "node:fs"
import path from "node:path"
import { styleText } from "node:util"

export const handler = async () => {
  if (!isBotTsProject()) return process.exit(1)

  const name = await inputName("Enter a name for the button")

  const description = await input({
    message: "Enter a description for the button",
  })

  const label = await input({
    message: "Enter the text to display on the button",
    required: true,
  })

  let endParams = false,
    first = true

  const params: Record<string, string> = {}

  while (!endParams) {
    const addMore = await confirm({
      message: `Do you want to add ${first ? "" : "more "}parameters?`,
    })

    if (addMore) {
      const paramName = await input({
        message: "Enter a parameter name",
      })

      const paramType = await select({
        message: "Select a parameter type",
        choices: [
          { name: "String", value: "string" },
          { name: "Number", value: "number" },
          { name: "Boolean", value: "boolean" },
        ],
      })

      const optional = await confirm({
        message: "Is this parameter optional?",
        default: false,
      })

      params[paramName + (optional ? "?" : "")] = paramType
    } else {
      endParams = true
    }
  }

  const template = fs.readFileSync(cwd("templates", "button.ejs"), "utf8")
  const buttonPath = ["src", "buttons", name + ".ts"]

  fs.writeFileSync(
    cwd(...buttonPath),
    format(
      ejs.compile(template)({
        name,
        Name: capitalize(name),
        description,
        params,
        label,
      })
    ),
    "utf8"
  )

  console.log()
  console.log(
    `✅ Button ${styleText("blueBright", name)} has been created at ${styleText(
      "cyanBright",
      path.join(...buttonPath)
    )}`
  )
}

export const command = new Command("button")
  .description(
    "Add a button\nMore info: https://ghom.gitbook.io/bot.ts/usage/create-a-button"
  )
  .usage("[--options]")
  .action(handler)
