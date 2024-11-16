import { input, select } from "@inquirer/prompts"
import { Command } from "commander"
import ejs from "ejs"
import fs from "fs"
import path from "path"
import { styleText } from "util"
import { capitalize, cwd, format, inputName, isBotTsProject } from "../../util"

export const handler = async () => {
  if (!isBotTsProject()) return process.exit(1)

  const name = await inputName("Enter a name for the cron job")

  const description = await input({
    message: "Enter a description for the cron job",
  })

  const scheduleType = await select({
    message: "Select a schedule type",
    choices: [
      {
        value: '"hourly"',
        name: `Simple ${styleText("grey", "(hourly, daily, weekly...)")}`,
      },
      {
        value: '{ type: "hour", duration: 2 } // every 2 hours',
        name: `Advanced ${styleText(
          "grey",
          "(each X minutes, hours, days...)"
        )}`,
      },
      {
        value: "{ second: 0, minute: 0, hour: 12 } // everyday at noon",
        name: `Custom ${styleText("grey", "(cron expression)")}`,
      },
    ],
  })

  const template = fs.readFileSync(cwd("templates", "cron.ejs"), "utf8")
  const cronPath = ["src", "cron", name + ".ts"]

  fs.writeFileSync(
    cwd(...cronPath),
    format(
      ejs.compile(template)({
        name,
        Name: capitalize(name),
        description,
        scheduleType,
      })
    ),
    "utf8"
  )

  console.log()
  console.log(
    `✅ Cron job ${styleText(
      "blueBright",
      name
    )} has been created at ${styleText("cyanBright", path.join(...cronPath))}`
  )
}

export const command = new Command("cron")
  .description(
    "Add a cron job\nMore info: https://ghom.gitbook.io/bot.ts/usage/create-a-cron"
  )
  .usage("[--options]")
  .action(handler)
