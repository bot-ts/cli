import { Command } from "commander"
import ejs from "ejs"
import fs from "fs"
import inquirer from "inquirer"
import path from "path"
import { styleText } from "util"
import { capitalize, cwd } from "../../util"

export const command = new Command("button")
  .description("add a button")
  .action(async () => {
    const { name, description, label } = await inquirer.prompt([
      {
        type: "input",
        name: "name",
        message: "Enter a name for the button (used as filename)",
      },
      {
        type: "input",
        name: "description",
        message: "Enter a description for the button",
      },
      {
        type: "input",
        name: "label",
        message: "Enter the text to display on the button",
      },
    ])

    let endParams = false,
      first = true

    const params: Record<string, string> = {}

    while (!endParams) {
      const { addMore } = await inquirer.prompt([
        {
          type: "confirm",
          name: "addMore",
          message: `Do you want to add ${first ? "" : "more "}parameters?`,
        },
      ])

      if (addMore) {
        const { paramName, paramType, optional } = await inquirer.prompt([
          {
            type: "input",
            name: "paramName",
            message: "Enter a parameter name",
          },
          {
            type: "list",
            name: "paramType",
            message: "Select a parameter type",
            choices: ["string", "number", "boolean"],
          },
          {
            type: "confirm",
            name: "optional",
            message: "Is this parameter optional?",
            default: false,
          },
        ])

        params[paramName + (optional ? "?" : "")] = paramType
      } else {
        endParams = true
      }
    }

    const template = fs.readFileSync(cwd("templates", "button.ejs"), "utf8")
    const buttonPath = ["src", "buttons", name + ".ts"]

    fs.writeFileSync(
      cwd(...buttonPath),
      ejs.compile(template)({
        name,
        Name: capitalize(name),
        description,
        params,
        label,
      }),
      "utf8"
    )

    console.log(
      `✅ Button ${styleText(
        "blueBright",
        name
      )} has been created at ${styleText(
        "cyanBright",
        path.join(...buttonPath)
      )}`
    )
  })
