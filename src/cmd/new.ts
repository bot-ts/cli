import { confirm, input, password, select } from "@inquirer/prompts"
import { execSync } from "child_process"
import { Command } from "commander"
import { APIApplication } from "discord-api-types/v10"
import { promises as fsp } from "fs"
import { PackageJson } from "types-package-json"
import * as util from "util"
import {
  cwd,
  injectEnvLine,
  inputName,
  isNodeLikeProject,
  loader,
  promptDatabase,
  promptEngine,
  readJSON,
  root,
  setupDatabase,
  setupEngine,
  writeJSON,
} from "../util"

export const command = new Command("new")
  .description("Generate a typescript bot")
  .option(
    "-b, --branch <branch>",
    "Branch to clone the boilerplate from",
    "master"
  )
  .action(async (options) => {
    // base config
    const name = await inputName("Enter the bot name", {
      defaultValue: "bot.ts",
      kebabCase: true,
    })

    const description = await input({
      message: `Enter a short description for the bot ${util.styleText(
        "grey",
        "(one line)"
      )}`,
    })

    const location = await input({
      message: `Where will the bot be located? ${util.styleText(
        "grey",
        "(here by default)"
      )}`,
      default: ".",
    })

    const prefix = await input({
      message: `Enter the bot prefix ${util.styleText(
        "grey",
        "(for textual commands)"
      )}`,
      default: ".",
    })

    const locale = await select({
      message: "Enter the default bot locale",
      default: "en",
      choices: readJSON<{ name: string; value: string }[]>(
        root("locales.json")
      ),
    })

    const token = await password({
      message: `Enter the bot token ${util.styleText(
        "grey",
        "(needed for configuration)"
      )}`,
      async validate(value) {
        if (!value.trim()) return "Bot token is required"

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

          return `Invalid token (code ${response.status})`
        } catch {
          return "Internal error"
        }
      },
    })

    const project = (...segments: string[]) => cwd(location, name, ...segments)

    let onverwrite = false

    if (isNodeLikeProject(project())) {
      const confirmOverwrite = await confirm({
        message: `Do you want to ${util.styleText(
          "red",
          "overwrite the existing project"
        )}?`,
        default: false,
      })

      if (!confirmOverwrite) {
        console.log(util.styleText("red", "Aborted."))
        process.exit(0)
      }

      onverwrite = true
    }

    const { runtime, packageManager } = await promptEngine()

    // database
    const { database, client } = await promptDatabase()

    const ready = await confirm({
      message: "Ready to generate bot files?",
      default: true,
    })

    if (!ready) {
      console.log(util.styleText("red", "Aborted."))
      process.exit(0)
    }

    // generate!

    console.log()

    const warns: string[] = []

    let app: APIApplication, scripts: Record<string, Record<string, string>>

    // validate all data before building any files
    await loader(
      "Validating data",
      async () => {
        app = await fetch("https://discord.com/api/v10/applications/@me", {
          headers: {
            Authorization: `Bot ${token}`,
          },
        })
          .then((res) => res.json())
          .then((data) => data as APIApplication)

        if (!app.owner) {
          console.error("Failed to fetch application owner")
          process.exit(1)
        }
      },
      "Validated data"
    )

    if (onverwrite) {
      await loader(
        "Remove existing project",
        async () => {
          await fsp.rm(project(), { recursive: true, force: true })
        },
        "Removed existing project"
      )
    }

    // download the boilerplate from github
    await loader(
      "Downloading boilerplate",
      () =>
        execSync(
          [
            "git clone",
            "--depth=1",
            "--single-branch",
            `--branch=${options.branch}`,
            "https://github.com/bot-ts/framework.git",
            `"${project()}"`,
          ].join(" "),
          { stdio: ["ignore", "ignore", "pipe"] }
        ),
      "Downloaded boilerplate"
    )

    await loader(
      "Initializing configuration",
      async () => {
        await fsp.writeFile(project(".env"), "", "utf8")

        await injectEnvLine("BOT_MODE", "development", project())
        await injectEnvLine("BOT_PREFIX", prefix, project())
        await injectEnvLine("BOT_LOCALE", locale, project())
        await injectEnvLine("BOT_TOKEN", token, project())
        await injectEnvLine("BOT_NAME", name, project())

        await injectEnvLine("BOT_ID", app.id, project())
        await injectEnvLine("BOT_OWNER", app.owner!.id, project())

        scripts = await setupEngine({ runtime, packageManager }, project())
        await setupDatabase({ client, ...database }, project())
      },
      "Initialized configuration"
    )

    // TODO: update package.json scripts with base.path:scripts/generate-scripts.js

    await loader(
      "Installing dependencies",
      () =>
        execSync(scripts["install-all"][packageManager], {
          cwd: project(),
          stdio: ["ignore", "ignore", "pipe"],
        }),
      "Installed dependencies"
    )

    await loader(
      "Finishing setup",
      async () => {
        try {
          await fsp.unlink(project("update-readme.js"))
        } catch {}

        execSync("git fetch --unshallow origin", {
          cwd: project(),
          stdio: ["ignore", "ignore", "pipe"],
        })

        execSync("git remote remove origin", {
          cwd: project(),
          stdio: ["ignore", "ignore", "pipe"],
        })

        const packageJson = readJSON<PackageJson>(project("package.json"))

        writeJSON(project("package.json"), {
          ...packageJson,
          name,
          author: app.owner!.username,
        })

        try {
          execSync(`${scripts["run-script"][packageManager]} readme`, {
            cwd: project(),
            stdio: "ignore",
          })
        } catch (error) {
          warns.push("failure to generate README.md")
        }
      },
      "Finished setup"
    )

    if (warns.length > 0) {
      console.log()
      warns.map((warn) => console.warn(util.styleText("yellow", `⚠️ ${warn}`)))
    }

    console.log()
    console.log(
      `✅ ${util.styleText("blueBright", name)} bot has been created.`
    )
    console.log(`📂 ${util.styleText("cyanBright", project())}`)

    process.exit(0)
  })
