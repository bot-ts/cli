import { confirm } from "@inquirer/prompts"
import { Command } from "commander"
import ejs from "ejs"
import fs from "fs"
import path from "path"
import { styleText } from "util"
import { cwd, format, inputName, isBotTsProject } from "../../util"

export const handler = async () => {
  if (!isBotTsProject()) return process.exit(1)

  const name = await inputName("Enter the namespace name")

  const importCore = await confirm({
    message: "Do you want to import core?",
    default: false,
  })

  const template = fs.readFileSync(cwd("templates", "namespace.ejs"), "utf8")
  const namespacePath = ["src", "namespaces", name + ".ts"]

  fs.writeFileSync(
    cwd(...namespacePath),
    format(ejs.compile(template)({ importCore })),
    "utf8"
  )

  console.log()
  console.log(
    `✅ Namespace ${styleText(
      "blueBright",
      name
    )} has been created at ${styleText(
      "cyanBright",
      path.join(...namespacePath)
    )}`
  )
}

export const command = new Command("namespace")
  .description(
    "Add a namespace\nMore info: https://ghom.gitbook.io/bot.ts/usage/create-a-namespace"
  )
  .usage("[--options]")
  .action(handler)
