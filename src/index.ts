#!/usr/bin/env node

import cp from "child_process"
import util from "util"
import fs from "fs"
import fsp from "fs/promises"
import chalk from "chalk"
import boxen from "boxen"
import yargs from "yargs/yargs"
import Discord from "discord.js"
import ss from "string-similarity"
import figlet from "figlet"
import loading from "loading-cli"
import { join } from "path"

const helpers = require("yargs/helpers")
const events = require("../events.json")
const exec = util.promisify(cp.exec)

const root = (...segments: string[]) => join(process.cwd(), ...segments)

async function readJSON(path: string) {
  return JSON.parse(await fsp.readFile(path, "utf8"))
}

async function writeJSON(path: string, json: object) {
  await fsp.writeFile(path, JSON.stringify(json, null, 2), "utf8")
}

async function loader(start: string, callback: () => unknown, end: string) {
  const time = Date.now()
  const load = loading({
    text: start,
    interval: 150,
    color: "white",
    frames: ["◐", "◓", "◑", "◒"],
  }).start()
  await callback()
  load.succeed(`${end} ${chalk.grey(`${Date.now() - time}ms`)}`)
}

async function setupDatabase(
  projectPath: string,
  database: {
    database: string
    host: string
    port?: string
    password?: string
    user?: string
    dbname?: string
  }
) {
  const conf = await readJSON(join(projectPath, "package.json"))

  // delete all other database dependencies.
  for (const dbname of ["sqlite3", "mysql2", "pg"]) {
    if (dbname !== database.database) delete conf.dependencies[dbname]
  }

  await writeJSON(join(projectPath, "package.json"), conf)

  const template = await fsp.readFile(
    join(__dirname, "..", "templates", database.database),
    "utf8"
  )
  await fsp.writeFile(
    join(projectPath, "src", "app", "database.ts"),
    template,
    "utf8"
  )

  if (database.host) await injectEnvLine("HOST", database.host, projectPath)
  if (database.port) await injectEnvLine("PORT", database.port, projectPath)
  if (database.user) await injectEnvLine("USER", database.user, projectPath)
  if (database.password)
    await injectEnvLine("PASSWORD", database.password, projectPath)
  if (database.dbname)
    await injectEnvLine("DATABASE", database.dbname, projectPath)
}

async function injectEnvLine(
  name: string,
  value: string,
  projectPath = process.cwd()
) {
  const env = await fsp.readFile(join(projectPath, ".env"), "utf8")
  const lines = env.split("\n")
  const index = lines.findIndex((line) => line.split("=")[0] === name)
  if (index > -1) lines.splice(index, 1)
  lines.push(`${name}="${value}"`)
  await fsp.writeFile(join(projectPath, ".env"), lines.join("\n"), "utf8")
}

yargs(helpers.hideBin(process.argv))
  .scriptName("make")
  .usage("$0 <cmd> [args] --options")
  .command(
    "bot [name] [path]",
    "create typescript bot",
    (yargs) =>
      yargs
        .positional("name", {
          default: "bot.ts",
          describe: "bot name",
        })
        .positional("path", {
          default: ".",
          describe: "bot path",
        })
        .option("prefix", {
          alias: "p",
          default: ".",
          describe: "bot prefix",
        })
        .option("locale", {
          alias: "l",
          default: "en",
          describe: "locale timezone",
        })
        .option("database", {
          alias: "d",
          default: "sqlite3",
          choices: ["sqlite3", "mysql2", "pg"],
          describe: "used database",
        })
        .option("token", {
          alias: "t",
          type: "string",
          describe: "bot token",
        })
        .option("owner", {
          alias: "o",
          type: "string",
          describe: "your Discord id",
        })
        .option("host", {
          alias: "h",
          default: "localhost",
          describe: "database host",
        })
        .option("port", {
          describe: "database port",
          type: "string",
        })
        .option("user", {
          alias: "u",
          type: "string",
          describe: "database user",
        })
        .option("password", {
          alias: "pw",
          type: "string",
          describe: "database password",
        })
        .option("dbname", {
          alias: "db",
          type: "string",
          describe: "database name",
        }),
    async (args) => {
      const borderNone = {
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
          chalk.blueBright(
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
            `git clone https://github.com/CamilleAbella/bot.ts.git "${root(
              args.path,
              args.name
            )}"`
          ),
        "downloaded"
      )

      const project = (...segments: string[]) =>
        root(args.path, args.name, ...segments)

      await loader(
        "initializing",
        async () => {
          const conf = await readJSON(project("package.json"))
          await writeJSON(project("package.json"), { ...conf, name: args.name })

          await fsp.writeFile(project(".env"), "", "utf8")

          await injectEnvLine("PREFIX", args.prefix, project())
          await injectEnvLine("LOCALE", args.locale, project())

          const client = new Discord.Client()
          if (args.token) {
            try {
              await client.login(args.token)
            } catch (error) {
              return console.error(chalk.red(`Invalid token given.`))
            }
            await injectEnvLine("TOKEN", args.token, project())
          }

          if (args.token && !args.owner) {
            const app = await client.fetchApplication()
            const ownerID: string =
              app.owner instanceof Discord.User
                ? app.owner.id
                : app.owner?.id ?? "none"

            if (ownerID === "none") warns.push("failure to detect bot owner.")

            await injectEnvLine("OWNER", ownerID, project())

            client.destroy()
          } else if (args.owner) {
            await injectEnvLine("OWNER", args.owner, project())
          }

          await setupDatabase(project(), args)

          await fsp.writeFile(
            project("readme.md"),
            `# ${
              args.name[0].toUpperCase() + args.name.slice(1)
            } - powered by [bot.ts](https://github.com/CamilleAbella/bot.ts)`
          )
        },
        "initialized"
      )

      await loader(
        "installing",
        () =>
          new Promise<void>((resolve, reject) => {
            cp.exec("npm i", { cwd: project() }, (err) => {
              if (err) reject(err)
              else resolve()
            })
          }),
        "installed"
      )

      console.log(chalk.green(`\n${args.name} bot has been created.`))
      console.log(chalk.cyanBright(`=> ${project()}`))
      console.timeEnd("duration")

      const $ = chalk.grey("$")

      console.log(
        boxen(
          [
            "",
            chalk.grey("# to quickly create a command or a listener"),
            "  " + $ + " make command [name]",
            "  " + $ + " make listener [ClientEvent]",
            "",
            chalk.grey("# to watch typescript and reload " + args.name),
            "  " + $ + " npm run watch",
            "",
            chalk.grey("# to build typescript and start " + args.name),
            "  " + $ + " npm run start",
            "",
            chalk.grey("# to simply start " + args.name),
            "  " + $ + " node .",
            "",
            chalk.grey("# format your files with prettier"),
            "  " + $ + " npm run prettier",
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
          `Check the validity of the ${chalk.blueBright(
            ".env"
          )} information. ${chalk.green("Enjoy!")}`,
          {
            borderStyle: boxen.BorderStyle.Round,
            borderColor: "yellow",
            float: "center",
            padding: 1,
          }
        )
      )

      process.exit(0)
    }
  )
  // @ts-ignore
  .command(...makeFile("command", "name"))
  // @ts-ignore
  .command(...makeFile("listener", "event"))
  .command(
    "database [database]",
    "setup database",
    (yargs) => {
      yargs
        .positional("database", {
          describe: "used database",
          choices: ["sqlite3", "mysql2", "pg"],
        })
        .option("host", {
          alias: "h",
          default: "localhost",
          describe: "database host",
        })
        .option("port", {
          describe: "database port",
          type: "string",
        })
        .option("user", {
          alias: "u",
          type: "string",
          describe: "database user",
        })
        .option("password", {
          alias: "pw",
          type: "string",
          describe: "database password",
        })
        .option("dbname", {
          alias: "db",
          type: "string",
          describe: "database name",
        })
    },
    async (args) => {
      console.time("duration")
      await setupDatabase(root(), args)

      console.log(chalk.green(`\n${args.database} database has been created.`))
      console.log(chalk.cyanBright(`=> ${root("src", "app", "database.ts")}`))
      console.timeEnd("duration")
    }
  )
  .help().argv

function makeFile(id: "command" | "listener", arg: string) {
  return [
    `${id} [${arg}]`,
    "create bot " + id,
    (yargs: any) => {
      yargs.positional(arg, {
        describe: id + " " + arg,
      })
    },
    async (argv: any) => {
      console.time("duration")

      if (arg === "event") {
        if (!argv[arg]) {
          return console.error(
            chalk.red("you should give a Discord Client event name.")
          )
        }

        const event = Object.keys(events).find(
          (key) => key.toLowerCase() === argv[arg].toLowerCase()
        )

        if (event) {
          argv[arg] = event
        } else {
          console.error(
            chalk.red("you should give a valid Discord Client event name.")
          )
          for (const event of Object.keys(events)) {
            const similarity = ss.compareTwoStrings(
              event.toLowerCase(),
              argv[arg].toLowerCase()
            )
            if (similarity > 0.75) {
              console.log(`Did you mean ${chalk.cyanBright(event)} instead?`)
            }
          }
          return
        }
      }

      let conf = null
      try {
        conf = require(root("package.json"))
      } catch (e) {}
      if (
        !conf ||
        !conf.hasOwnProperty("devDependencies") ||
        !conf.devDependencies.hasOwnProperty("make-bot.ts")
      ) {
        return console.error(
          chalk.red(
            'you should only use this command at the root of a "bot.ts" project'
          )
        )
      }

      const template = await fsp.readFile(
        join(__dirname, "..", "templates", id),
        "utf8"
      )

      let file = template.replace(new RegExp(`{{ ${arg} }}`, "g"), argv[arg])

      if (arg === "event") {
        let args = events[argv[arg]]
        args = typeof args === "string" ? args : args.join(", ")
        file = file.replace(`{{ args }}`, args)
      }

      const directory = root("src", id + "s")

      if (!fs.existsSync(directory)) {
        console.warn(`${id}s directory not exists.`)
        await fsp.mkdir(directory, { recursive: true })

        console.log(chalk.green(`${id}s directory created.`))
        console.log(chalk.cyanBright(`=> ${directory}`))
      }

      const path = join(directory, argv[arg] + ".ts")
      if (fs.existsSync(path))
        return console.error(chalk.red(`${argv[arg]} ${id} already exists.`))

      await fsp.writeFile(path, file, "utf8")

      console.log(chalk.green(`\n${argv[arg]} ${id} has been created.`))
      console.log(chalk.cyanBright(`=> ${path}`))
      console.timeEnd("duration")
    },
  ]
}
