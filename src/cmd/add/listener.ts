import { Command } from "commander"
import ejs from "ejs"
import fs from "fs"
import inquirer from "inquirer"
import path from "path"
import { styleText } from "util"
import { cwd, format, readJSON, root } from "../../util"

export const command = new Command("listener")
  .description("add a listener")
  .action(async () => {
    const events = readJSON<Record<string, string | string[]>>(
      root("events.json")
    )

    const { event, category, once, description } = await inquirer.prompt([
      {
        type: "list",
        name: "event",
        message: "Enter the event name",
        choices: Object.keys(events),
      },
      {
        type: "input",
        name: "category",
        message:
          "Enter a category name to group listeners by usage: tracker, mod, etc",
        required: false,
      },
      {
        type: "confirm",
        name: "once",
        message: "Is this a one-time listener? (like on ready)",
      },
      {
        type: "input",
        name: "description",
        message: "Enter the listener description",
      },
    ])

    const args = events[event]
    const filename = [category, event].filter(Boolean).join(".")
    const template = fs.readFileSync(cwd("templates", "listener.ejs"), "utf8")
    const listenerPath = ["src", "listeners", filename + ".ts"]

    fs.writeFileSync(
      cwd(...listenerPath),
      format(
        ejs.compile(template)({
          event,
          once,
          description,
          args: Array.isArray(args) ? args : [args],
        })
      ),
      "utf8"
    )

    console.log(
      `✅ Listener ${styleText(
        "blueBright",
        event
      )} has been created at ${styleText(
        "cyanBright",
        path.join(...listenerPath)
      )}`
    )
  })
