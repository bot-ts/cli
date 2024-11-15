import { execSync } from "child_process"
import { Command } from "commander"
import dotenv from "dotenv"
import fs from "fs"
import inquirer from "inquirer"
import * as util from "util"
import {
  cwd,
  getDatabaseDriverName,
  isBotTsProject,
  loader,
  promptDatabase,
  readJSON,
  setupDatabase,
} from "../../util"

export const command = new Command("database")
  .description(
    "Setup database\nMore info: https://ghom.gitbook.io/bot.ts/usage/use-database"
  )
  .usage("[--options]")
  .action(async () => {
    if (!isBotTsProject()) return process.exit(1)

    // TODO: fetch the current database client
    const baseClient = getDatabaseDriverName(readJSON(cwd("package.json")))

    const { database, client } = await promptDatabase()

    if (client !== baseClient) {
      console.warn(
        `⚠️ You'll probably need to transfer the old data to the new database client`
      )

      const { backup } = await inquirer.prompt([
        {
          type: "confirm",
          name: "backup",
          message: "Do you want to backup the database before proceeding?",
          default: true,
        },
      ])

      if (backup) {
        console.error(
          `${util.styleText(
            "red",
            "The backup command is not yet automated."
          )}\nPlease backup manually using the @ghom/orm documentaiton.\nhttps://www.npmjs.com/package/@ghom/orm#Backup`
        )

        return process.exit(1)
      }
    }

    await setupDatabase({ client, ...database }, cwd())

    if (client !== baseClient) {
      const { components } = readJSON<{
        components: Record<string, Record<string, string>>
      }>(cwd("compatibility.json"))

      const env = dotenv.parse(fs.readFileSync(cwd(".env"), "utf8"))

      await loader(
        "installing",
        () => {
          execSync(components["install-all"][env.PACKAGE_MANAGER], {
            stdio: "ignore",
          })
        },
        "installed"
      )
    }

    console.log(`✅ The database has been configured.`)
  })
