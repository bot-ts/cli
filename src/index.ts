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

async function setupDatabase(projectPath: string, database: string) {
  const conf = await readJSON(join(projectPath, "package.json"))
  conf.dependencies[database] = "latest"
  await writeJSON(join(projectPath, "package.json"), conf)
  const template = await fsp.readFile(
    join(__dirname, "..", "templates", database),
    "utf8"
  )
  await fsp.writeFile(
    join(projectPath, "src", "app", "database.ts"),
    template,
    "utf8"
  )
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
        .option("database", {
          alias: "d",
          default: "enmap",
          describe: "used database",
        })
        .option("token", {
          alias: "t",
          describe: "bot token",
        })
        .option("owner", {
          alias: "o",
          describe: "your Discord id",
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
            `git clone https://github.com/CamilleAbella/bot.ts.git ${root(
              args.path,
              args.name
            )}`
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

          let env = await fsp.readFile(project("template.env"), "utf8")
          env = env.replace("{{ prefix }}", args.prefix)

          const client = new Discord.Client()
          if (typeof args.token === "string") {
            try {
              await client.login(args.token)
            } catch (error) {
              return console.error(chalk.red(`Invalid token given.`))
            }
            env = env.replace("{{ token }}", args.token)
          }

          if (args.token && !args.owner) {
            const app = await client.fetchApplication()
            const ownerID: string =
              app.owner instanceof Discord.User
                ? app.owner.id
                : app.owner?.id ?? "none"
            if (ownerID === "none") warns.push("failure to detect bot owner.")
            env = env.replace("{{ owner }}", ownerID)
            client.destroy()
          } else if (typeof args.owner === "string") {
            env = env.replace("{{ owner }}", args.owner)
          }
          await fsp.writeFile(project(".env"), env, "utf8")
          await setupDatabase(project(), args.database)
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
            $ + " make command [name]",
            $ + " make listener [ClientEvent]",
            "",
            chalk.grey("# to watch typescript and reload " + args.name),
            $ + " npm run watch",
            "",
            chalk.grey("# to build typescript and start " + args.name),
            $ + " npm run start",
            "",
            chalk.grey("# to simply start " + args.name),
            $ + " node .",
            "",
            chalk.grey("# format your files with prettier"),
            $ + " npm run prettier",
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
      yargs.positional("database", {
        describe: "database name",
        choices: ["enmap", "ghomap"],
      })
    },
    (args) => setupDatabase(root(), args.database)
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
