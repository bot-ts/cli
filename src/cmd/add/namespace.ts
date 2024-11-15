import { Command } from "commander"
import ejs from "ejs"
import fs from "fs"
import inquirer from "inquirer"
import path from "path"
import { styleText } from "util"
import { cwd, format } from "../../util"

export const command = new Command("namespace")
  .description(
    "Add a namespace\nMore info: https://ghom.gitbook.io/bot.ts/usage/create-a-namespace"
  )
  .action(async () => {
    const { name, importCore } = await inquirer.prompt([
      {
        type: "input",
        name: "name",
        message: "Enter the namespace name",
      },
      {
        type: "confirm",
        name: "importCore",
        message: "Do you want to import core?",
        default: false,
      },
    ])

    const template = fs.readFileSync(cwd("templates", "namespace.ejs"), "utf8")
    const namespacePath = ["src", "namespaces", name + ".ts"]

    fs.writeFileSync(
      cwd(...namespacePath),
      format(ejs.compile(template)({ importCore })),
      "utf8"
    )

    console.log(
      `✅ Namespace ${styleText(
        "blueBright",
        name
      )} has been created at ${styleText(
        "cyanBright",
        path.join(...namespacePath)
      )}`
    )
  })
