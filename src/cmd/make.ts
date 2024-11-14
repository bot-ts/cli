import boxen from "boxen"
import { exec } from "child_process"
import { Command } from "commander"
import * as discord from "discord.js"
import figlet from "figlet"
import { promises as fsp } from "fs"
import { PackageJson } from "types-package-json"
import * as util from "util"
import {
  confirm,
  cwd,
  injectEnvLine,
  isNodeLikeProject,
  loader,
  readJSON,
  setupDatabase,
  writeJSON,
} from "../util"

export const command = new Command("make")
  .description("create typescript bot")
  .option("-n, --name <name>", "bot name", "bot.ts")
  .option("-p, --path <path>", "bot path", ".")
  .option("-p, --prefix <prefix>", "bot prefix", ".")
  .option("-l, --locale <locale>", "locale timezone", "en")
  .option("-d, --database <database>", "used database", "sqlite3")
  .option("-t, --token <token>", "bot token")
  .option("--secret <secret>", "bot secret")
  .option("-o, --owner <owner>", "your Discord id")
  .option("-h, --host <host>", "database host", "localhost")
  .option("--port <port>", "database port")
  .option("-u, --user <user>", "database user")
  .option("--pw, --password <password>", "database password")
  .option("--db, --dbname <dbname>", "database name")
  .action(async (args) => {
    if (await isNodeLikeProject()) {
      if (
        !(await confirm(
          `${util.styleText(
            "yellow",
            "You are currently in a npm project. Do you want to continue to create a bot here?"
          )} (y/N)`
        ))
      ) {
        console.log(util.styleText("red", "Aborted."))
        process.exit(0)
      }
    }

    const borderNone = {
      top: " ",
      left: " ",
      right: " ",
      bottom: " ",
      topLeft: " ",
      topRight: " ",
      bottomLeft: " ",
      bottomRight: " ",
      horizontal: " ",
      vertical: " ",
    }

    const warns: string[] = []

    console.log(
      boxen(
        util.styleText(
          "blueBright",
          await new Promise<string>((resolve) =>
            figlet("bot.ts", (err, value) => {
              if (err) resolve("")
              else resolve(value as string)
            })
          )
        ),
        {
          float: "center",
          borderStyle: borderNone,
        }
      )
    )

    console.time("duration")

    await loader(
      "downloading",
      () =>
        exec(
          [
            "git clone",
            "--depth=1",
            "--single-branch",
            "--branch=master",
            "https://github.com/bot-ts/framework.git",
            `"${cwd(args.path, args.name)}"`,
          ].join(" ")
        ),
      "downloaded"
    )

    const project = (...segments: string[]) =>
      cwd(args.path, args.name, ...segments)

    let ownerName: string | null = null

    await loader(
      "initializing",
      async () => {
        await fsp.writeFile(project(".env"), "", "utf8")

        await injectEnvLine("BOT_MODE", "development", project())
        await injectEnvLine("BOT_PREFIX", args.prefix, project())
        await injectEnvLine("BOT_LOCALE", args.locale, project())
        await injectEnvLine("BOT_NAME", args.name, project())

        const client = new discord.Client<true>({ intents: [] })
        if (args.token) {
          try {
            await client.login(args.token)
          } catch (error) {
            return console.error(util.styleText("red", `Invalid token given.`))
          }
          await injectEnvLine("BOT_TOKEN", args.token, project())
        }

        if (!client.isReady())
          return console.error(
            util.styleText("red", "Discord Client connection error")
          )

        if (args.token && !args.owner) {
          const app = await client.application.fetch()
          const owner = app.owner instanceof discord.User ? app.owner : null

          if (!owner) warns.push("failure to detect bot owner.")
          else {
            ownerName = owner.username
            await injectEnvLine("BOT_OWNER", owner.id, project())
          }
        } else if (args.owner) {
          await injectEnvLine("BOT_OWNER", args.owner, project())

          const owner = await client.users.fetch(args.owner)

          ownerName = owner.username
        }

        await client.destroy()

        await injectEnvLine("BOT_ID", client.user.id, project())

        if (args.secret)
          await injectEnvLine("BOT_SECRET", args.secret, project())

        await setupDatabase(project(), args)
      },
      "initialized"
    )

    await loader(
      "installing",
      () => exec("npm install --force", { cwd: project() }),
      "installed"
    )

    await loader(
      "finishing",
      async () => {
        try {
          await fsp.unlink(project("update-readme.js"))
        } catch (error) {}

        await exec("git fetch --unshallow origin", { cwd: project() })
        await exec("git remote remove origin", { cwd: project() })

        const conf = await readJSON<PackageJson>(project("package.json"))
        await writeJSON(project("package.json"), {
          ...conf,
          name: args.name,
          author: ownerName,
        })

        try {
          await exec("npm run readme", { cwd: project() })
        } catch (error) {
          warns.push("failure to generate README.md")
        }
      },
      "finished"
    )

    console.log(util.styleText("green", `\n${args.name} bot has been created.`))
    console.log(util.styleText("cyanBright", `=> ${project()}\n`))
    console.timeEnd("duration")

    const $ = util.styleText("grey", "$")

    console.log(
      boxen(
        [
          util.styleText("grey", "# first, move to the bot directory"),
          "  " + $ + " cd " + args.name,
          "",
          util.styleText("grey", "# to quickly create a new file"),
          "  " + $ + " bot add command [name]",
          "  " + $ + " bot add listener [ClientEvent] [category]",
          "  " + $ + " bot add namespace [name]",
          "  " + $ + " bot add table [name]",
          "",
          util.styleText("grey", "# to change databse client"),
          "  " + $ + " bot set database [slite3|mysql2|pg]",
          "",
          util.styleText(
            "grey",
            "# to watch typescript and reload " + args.name
          ),
          "  " + $ + " npm run watch",
          "",
          util.styleText(
            "grey",
            "# to build typescript and start " + args.name
          ),
          "  " + $ + " npm run start",
          "",
          util.styleText("grey", "# to simply start " + args.name),
          "  " + $ + " node .",
          "",
          util.styleText("grey", "# format your files with prettier"),
          "  " + $ + " npm run format",
          "",
        ].join("\n"),
        {
          float: "center",
          borderStyle: borderNone,
        }
      )
    )

    warns.forEach(console.warn)

    console.log(
      boxen(
        `Check the validity of the ${util.styleText(
          "blueBright",
          ".env"
        )} information. ${util.styleText("green", "Enjoy!")}`,
        {
          borderStyle: "round",
          borderColor: "yellow",
          float: "center",
          padding: 1,
        }
      )
    )

    process.exit(0)
  })
