#!/usr/bin/env node

const cp = require("child_process")
const exec = require("util").promisify(cp.exec)
const join = require("path").join
const fs = require("fs")
const fsp = require("fs/promises")
const chalk = require("chalk")
const boxen = require("boxen")
const yargs = require("yargs/yargs")
const helpers = require("yargs/helpers")
const Discord = require("discord.js")
const events = require("../events.json")
const ss = require("string-similarity")
const figlet = require("figlet")

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
        .option("token", {
          alias: "t",
          describe: "bot token",
        })
        .option("owner", {
          alias: "o",
          describe: "your Discord id",
        }),
    async ({ name, path, prefix, token, owner }) => {
      console.log(
        boxen(
          chalk.blueBright(
            await new Promise((resolve) =>
              figlet("bot.ts", (err, value) => {
                if (err) resolve("")
                else resolve(value)
              })
            )
          ),
          {
            float: "center",
          }
        )
      )
      console.time("duration")
      const root = join(process.cwd(), path, name)
      await exec(
        `git clone https://github.com/CamilleAbella/bot.ts.git ${root}`
      )
      const conf = require(join(root, "package.json"))
      conf.name = name
      await fsp.writeFile(
        join(root, "package.json"),
        JSON.stringify(conf, null, 2)
      )

      let env = await fsp.readFile(join(root, "template.env"), "utf8")
      if (prefix) {
        env = env.replace("{{ prefix }}", prefix)
      }
      let client
      if (token) {
        try {
          client = new Discord.Client()
          await client.login(token)
        } catch (error) {
          return console.error(chalk.red(`Invalid token given.`))
        }
        env = env.replace("{{ token }}", token)
      }
      if (token && !owner) {
        const app = await client.fetchApplication()
        env = env.replace(
          "{{ owner }}",
          app.owner instanceof Discord.User ? app.owner.id : app.owner.ownerID
        )
        client.destroy()
      } else if (owner) {
        env = env.replace("{{ owner }}", owner)
      }
      await fsp.writeFile(join(root, ".env"), env)

      await new Promise((resolve, reject) => {
        cp.exec("npm i", { cwd: root }, (err) => {
          if (err) reject(err)
          else resolve()
        })
      })

      const $ = chalk.grey("$")

      console.log(
        boxen(
          [
            "",
            chalk.grey("# to quickly create a command or a listener"),
            $ + " make command [name]",
            $ + " make listener [ClientEvent]",
            "",
            chalk.grey("# to watch typescript and reload " + name),
            $ + "npm run watch",
            "",
            chalk.grey("# to build typescript and start " + name),
            $ + " npm run start",
            "",
            chalk.grey("# to simply start " + name),
            $ + " node .",
            "",
            chalk.grey("# format your files with prettier"),
            $ + " npm run prettier",
            "",
          ].join("\n"),
          {
            float: "center",
          }
        )
      )

      console.log(chalk.green(`\n${name} bot has been created.`))
      console.log(chalk.cyanBright(`=> ${root}`))
      console.timeEnd("duration")
      console.warn(
        chalk.yellow(
          `\n> check the validity of the ${chalk.blueBright(
            ".env"
          )} information. <\n`
        )
      )
      console.log(
        boxen(chalk.green("Enjoy!"), {
          borderStyle: "round",
          borderColor: "yellow",
          float: "center",
          padding: 1,
        })
      )
    }
  )
  .command(...makeFile("command", "name"))
  .command(...makeFile("listener", "event"))
  .help().argv

function makeFile(id, arg) {
  return [
    `${id} [${arg}]`,
    "create bot " + id,
    (yargs) => {
      yargs.positional(arg, {
        describe: id + " " + arg,
      })
    },
    async (argv) => {
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
        conf = require(join(process.cwd(), "package.json"))
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
        { encoding: "utf8" }
      )

      let file = template.replace(new RegExp(`{{ ${arg} }}`, "g"), argv[arg])

      if (arg === "event") {
        let args = events[argv[arg]]
        args = typeof args === "string" ? args : args.join(", ")
        file = file.replace(`{{ args }}`, args)
      }

      const directory = join(process.cwd(), "src", id + "s")

      if (!fs.existsSync(directory)) {
        console.warn(`${id}s directory not exists.`)
        await fsp.mkdir(directory, { recursive: true })

        console.log(chalk.green(`${id}s directory created.`))
        console.log(chalk.cyanBright(`=> ${directory}`))
      }

      const path = join(directory, argv[arg] + ".ts")
      if (fs.existsSync(path))
        return console.error(chalk.red(`${argv[arg]} ${id} already exists.`))

      await fsp.writeFile(path, file)

      console.log(chalk.green(`\n${argv[arg]} ${id} has been created.`))
      console.log(chalk.cyanBright(`=> ${path}`))
      console.timeEnd("duration")
    },
  ]
}
