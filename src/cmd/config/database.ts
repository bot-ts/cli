import {
  cwd,
  getDatabaseDriverName,
  isBotTsProject,
  loader,
  promptDatabase,
  readJSON,
  setupDatabase,
} from "#src/util"
import { confirm } from "@inquirer/prompts"
import { Command } from "commander"
import dotenv from "dotenv"
import { execSync } from "node:child_process"
import fs from "node:fs"
import * as util from "node:util"

export const handler = async (_?: string, options?: { client?: string }) => {
  if (!isBotTsProject()) return process.exit(1)

  // TODO: fetch the current database client
  const baseClient = getDatabaseDriverName(readJSON(cwd("package.json")))

  const { database, client } = await promptDatabase(options)

  if (client !== baseClient) {
    console.warn(
      `⚠️ You'll probably need to transfer the old data to the new database client`
    )

    const backup = await confirm({
      message: "Do you want to backup the database before proceeding?",
      default: true,
    })

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

    console.log()

    await loader(
      "installing",
      () => {
        execSync(components["install"][env.PACKAGE_MANAGER], {
          stdio: "ignore",
        })
      },
      "installed"
    )
  }

  console.log()
  console.log(`✅ Database has been configured.`)
}

export const command = new Command("database")
  .description(
    "Setup database\nMore info: https://ghom.gitbook.io/bot.ts/usage/use-database"
  )
  .option("--client <client>", "Database client", "sqlite3")
  .usage("[--options]")
  .action(handler)
