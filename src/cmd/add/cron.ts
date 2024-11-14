import { Command } from "commander"
import ejs from "ejs"
import fs from "fs"
import inquirer from "inquirer"
import path from "path"
import { styleText } from "util"
import { capitalize, cwd } from "../../util"

export const command = new Command("cron")
  .description("add a cron job")
  .action(async () => {
    const { name, description, scheduleType } = await inquirer.prompt([
      {
        type: "input",
        name: "name",
        message: "Enter a name for the cron job",
      },
      {
        type: "input",
        name: "description",
        message: "Enter a description for the cron job",
      },
      {
        type: "list",
        name: "scheduleType",
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
      },
    ])

    const template = fs.readFileSync(cwd("templates", "cron.ejs"), "utf8")
    const cronPath = ["src", "cron", name + ".ts"]

    fs.writeFileSync(
      cwd(...cronPath),
      ejs.compile(template)({
        name,
        Name: capitalize(name),
        description,
        scheduleType,
      }),
      "utf8"
    )

    console.log(
      `✅ Cron job ${styleText(
        "blueBright",
        name
      )} has been created at ${styleText("cyanBright", path.join(...cronPath))}`
    )
  })
