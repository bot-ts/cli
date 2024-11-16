import {
  cwd,
  format,
  inputName,
  isBotTsProject,
  readJSON,
  root,
} from "#src/util"
import { confirm, input, select } from "@inquirer/prompts"
import { Command } from "commander"
import ejs from "ejs"
import fs from "node:fs"
import path from "node:path"
import { styleText } from "node:util"

export const handler = async () => {
  if (!isBotTsProject()) return process.exit(1)

  const events = readJSON<Record<string, string | string[]>>(
    root("events.json")
  )

  const event = await select({
    message: "Enter the event name",
    choices: Object.keys(events).map((event) => ({
      name: event,
      value: event,
    })),
  })

  const category = await inputName(
    `Enter a category name ${styleText("grey", "(tracker, mod, etc)")}`
  )

  const once = await confirm({
    message: `Is this a one-time listener? ${styleText(
      "grey",
      "(like on ready)"
    )}`,
    default: false,
  })

  const description = await input({
    message: "Enter the listener description",
    required: false,
  })

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

  console.log()
  console.log(
    `✅ Listener ${styleText(
      "blueBright",
      event
    )} has been created at ${styleText(
      "cyanBright",
      path.join(...listenerPath)
    )}`
  )
}

export const command = new Command("listener")
  .description(
    "Add a listener\nMore info: https://ghom.gitbook.io/bot.ts/usage/create-a-listener"
  )
  .usage("[--options]")
  .action(handler)
