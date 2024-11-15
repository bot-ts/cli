import { execSync } from "child_process"
import { Command } from "commander"
import { APIApplication } from "discord-api-types/v10"
import { promises as fsp } from "fs"
import inquirer from "inquirer"
import { PackageJson } from "types-package-json"
import * as util from "util"
import {
  cwd,
  injectEnvLine,
  isNodeLikeProject,
  loader,
  promptDatabase,
  readJSON,
  setupDatabase,
  setupScripts,
  writeJSON,
} from "../util"

export const command = new Command("make")
  .aliases(["create", "new"])
  .description("Generate a typescript bot")
  .action(async () => {
    // base config
    const base = await inquirer.prompt([
      {
        type: "input",
        name: "name",
        message:
          "Enter the bot name (used as directory name and package.json name)",
        default: "bot.ts",
      },
      {
        type: "input",
        name: "description",
        message: "Enter a short description for the bot (one line)",
      },
      {
        type: "input",
        name: "path",
        message: "Where will the bot be located? (here by default)",
        default: ".",
      },
      {
        type: "input",
        name: "prefix",
        message: "Enter the bot prefix for textual commands",
        default: ".",
      },
      {
        type: "input",
        name: "locale",
        message: "Enter the locale code for timezone",
        default: "en",
        validate(value) {
          return (
            Intl.getCanonicalLocales(value).length > 0 || "Invalid locale code"
          )
        },
      },
      {
        type: "password",
        name: "token",
        message: "Enter the bot token (needed for configuration)",
        async validate(value) {
          if (!value) return "Bot token is required"

          try {
            const response = await fetch(
              "https://discord.com/api/v10/users/@me",
              {
                headers: {
                  Authorization: `Bot ${value}`,
                },
              }
            )

            if (response.status === 200) return true
            return "Invalid token"
          } catch {
            return "Internal error"
          }
        },
      },
    ])

    if (isNodeLikeProject(base.path)) {
      const { overwrite } = await inquirer.prompt([
        {
          type: "confirm",
          name: "overwrite",
          message: "Do you want to overwrite the existing project?",
          default: false,
        },
      ])

      if (!overwrite) {
        console.log(util.styleText("red", "Aborted."))
        process.exit(0)
      }
    }

    // runtime
    const { runtime } = await inquirer.prompt([
      {
        type: "list",
        name: "runtime",
        message: "Select the JavaScript runtime",
        choices: [
          { value: "node", name: "Node.js" },
          { value: "deno", name: "Deno" },
          { value: "bun", name: "Bun (recommended)" },
        ],
        default: "node",
      },
    ])

    let list = ["npm", "yarn", "pnpm"]

    if (runtime !== "node") list.unshift(runtime)

    const { packageManager } = await inquirer.prompt([
      {
        type: "list",
        name: "packageManager",
        message: "Select the package manager",
        choices: list,
        default: list[0],
      },
    ])

    // database
    const { database, client } = await promptDatabase()

    const { confirm } = await inquirer.prompt([
      {
        type: "confirm",
        name: "confirm",
        message: "Ready to generate bot files?",
        default: true,
      },
    ])

    if (!confirm) {
      console.log(util.styleText("red", "Aborted."))
      process.exit(0)
    }

    // generate!

    const project = (...segments: string[]) =>
      cwd(base.path, base.name, ...segments)

    const warns: string[] = []

    let app: APIApplication, scripts: Record<string, Record<string, string>>

    // validate all data before building any files
    await loader(
      "validating",
      async () => {
        app = await fetch("https://discord.com/api/v10/applications/@me", {
          headers: {
            Authorization: `Bot ${base.token}`,
          },
        })
          .then((res) => res.json())
          .then((data) => data as APIApplication)

        if (!app.owner) {
          console.error("Failed to fetch application owner")
          process.exit(1)
        }
      },
      "validated"
    )

    // download the boilerplate from github
    await loader(
      "downloading",
      () =>
        execSync(
          [
            "git clone",
            "--depth=1",
            "--single-branch",
            "--branch=master",
            "https://github.com/bot-ts/framework.git",
            `"${project()}"`,
          ].join(" "),
          { stdio: ["ignore", "ignore", "pipe"] }
        ),
      "downloaded"
    )

    await loader(
      "initializing",
      async () => {
        await fsp.writeFile(project(".env"), "", "utf8")

        await injectEnvLine("RUNTIME", runtime, project())
        await injectEnvLine("PACKAGE_MANAGER", packageManager, project())

        await injectEnvLine("BOT_MODE", "development", project())
        await injectEnvLine("BOT_PREFIX", base.prefix, project())
        await injectEnvLine("BOT_LOCALE", base.locale, project())
        await injectEnvLine("BOT_TOKEN", base.token, project())
        await injectEnvLine("BOT_NAME", base.name, project())

        await injectEnvLine("BOT_ID", app.id, project())
        await injectEnvLine("BOT_OWNER", app.owner!.id, project())

        scripts = await setupScripts({ runtime, packageManager }, project())
        await setupDatabase({ client, ...database }, project())
      },
      "initialized"
    )

    // TODO: update package.json scripts with base.path:scripts/generate-scripts.js

    await loader(
      "installing",
      () =>
        execSync(scripts["install-all"][packageManager], {
          cwd: project(),
          stdio: ["ignore", "ignore", "pipe"],
        }),
      "installed"
    )

    await loader(
      "finishing",
      async () => {
        try {
          await fsp.unlink(project("update-readme.js"))
        } catch (error) {}

        execSync("git fetch --unshallow origin", {
          cwd: project(),
          stdio: ["ignore", "ignore", "pipe"],
        })

        execSync("git remote remove origin", {
          cwd: project(),
          stdio: ["ignore", "ignore", "pipe"],
        })

        const packageJson = await readJSON<PackageJson>(project("package.json"))

        writeJSON(project("package.json"), {
          ...packageJson,
          name: base.name,
          author: app.owner!.username,
        })

        try {
          execSync(`${scripts["run-script"]} readme`, {
            cwd: project(),
            stdio: "ignore",
          })
        } catch (error) {
          warns.push("failure to generate README.md")
        }
      },
      "finished"
    )

    if (warns.length > 0) {
      console.warn(
        util.styleText("yellow", warns.map((warn) => `⚠️ ${warn}`).join("\n"))
      )
    }

    console.log(
      `✅ ${util.styleText("blueBright", base.name)} bot has been created.`
    )
    console.log(`📂 ${util.styleText("cyanBright", project())}`)

    process.exit(0)
  })
