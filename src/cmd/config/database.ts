import {
  cwd,
  getDatabaseDriverName,
  getExistingTables,
  isBotTsProject,
  loader,
  promptDatabase,
  readJSON,
  removeDatabase,
  setupDatabase,
} from "#src/util"
import { confirm, select } from "@inquirer/prompts"
import { Command } from "commander"
import dotenv, { DotenvParseOutput } from "dotenv"
import { execSync } from "node:child_process"
import fs from "node:fs"
import * as util from "node:util"
import { PackageJson } from "types-package-json"

async function performDatabaseRemoval() {
  await removeDatabase(cwd())

  const { components } = readJSON<{
    components: Record<string, Record<string, string>>
  }>(cwd("compatibility.json"))

  const env = dotenv.parse(fs.readFileSync(cwd(".env"), "utf8"))

  if (env.PACKAGE_MANAGER) {
    console.log()

    await loader(
      "uninstalling database",
      () => {
        execSync(components["install"][env.PACKAGE_MANAGER], {
          stdio: "ignore",
        })
      },
      "database uninstalled"
    )
  }

  console.log()
  console.log(`✅ Database has been removed.`)
}

async function confirmDatabaseRemoval(baseClient: string): Promise<boolean> {
  const tables = getExistingTables(cwd())

  if (tables.length > 0) {
    console.warn(
      util.styleText(
        "yellow",
        `⚠️  Warning: Your project contains ${tables.length} table(s) in src/tables/:`
      )
    )
    for (const table of tables) {
      console.warn(util.styleText("grey", `   - ${table}.ts`))
    }
    console.warn(
      util.styleText(
        "yellow",
        "   These tables will no longer work without a database."
      )
    )
    console.log()
  }

  const confirmed = await confirm({
    message: `Are you sure you want to remove the database (${baseClient})?`,
    default: false,
  })

  return confirmed
}

export const handler = async (options?: {
  client?: string
  remove?: boolean
}) => {
  if (!isBotTsProject()) return process.exit(1)

  const packageJson = readJSON<PackageJson>(cwd("package.json"))

  // Check if a database is currently configured
  let baseClient: string | null = null
  try {
    baseClient = getDatabaseDriverName(packageJson)
  } catch {
    // No database configured
  }

  // Handle remove option
  if (options?.remove) {
    if (!baseClient) {
      console.error(
        util.styleText("red", "No database is currently configured.")
      )
      return process.exit(1)
    }

    const confirmed = await confirmDatabaseRemoval(baseClient)

    if (!confirmed) {
      console.log("Operation cancelled.")
      return process.exit(0)
    }

    await performDatabaseRemoval()
    return
  }

  // If no client option provided, ask what the user wants to do
  if (!options?.client && baseClient) {
    const action = await select({
      message: `A database (${baseClient}) is already configured. What do you want to do?`,
      choices: [
        { value: "change", name: "Change database client" },
        { value: "remove", name: "Remove database" },
        { value: "cancel", name: "Cancel" },
      ],
    })

    if (action === "cancel") {
      return process.exit(0)
    }

    if (action === "remove") {
      const confirmed = await confirmDatabaseRemoval(baseClient)

      if (!confirmed) {
        console.log("Operation cancelled.")
        return process.exit(0)
      }

      await performDatabaseRemoval()
      return
    }
  }

  const { database, client } = await promptDatabase(options)

  if (client !== baseClient && !options?.client) {
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

    let env: DotenvParseOutput | undefined

    if (!options?.client) {
      env = dotenv.parse(fs.readFileSync(cwd(".env"), "utf8"))

      if (!env.PACKAGE_MANAGER) {
        console.error("Please set the PACKAGE_MANAGER in your .env file")
        process.exit(1)
      }
    }

    console.log()

    await loader(
      "installing",
      () => {
        execSync(components["install"][env?.PACKAGE_MANAGER ?? "npm"], {
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
    "Setup or remove database\nMore info: https://ghom.gitbook.io/bot.ts/usage/use-database"
  )
  .option("--client <client>", "Database client (sqlite3, pg or mysql2)")
  .option("--remove", "Remove the database configuration")
  .usage("[--options]")
  .action(handler)
