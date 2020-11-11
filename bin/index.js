#!/usr/bin/env node

const exec = require("util").promisify(require("child_process").exec)
const join = require("path").join
const fs = require("fs")
const fsp = require("fs/promises")
const chalk = require("chalk")
const yargs = require("yargs/yargs")
const helpers = require("yargs/helpers")
const Discord = require("discord.js")

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
          alias: "u",
          describe: "your Discord id",
        }),
    async ({ name, path, prefix, token, owner }) => {
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

      let env = await fsp.readFile(join(root, "template.env"), {
        encoding: "utf8",
      })
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
      } else if (owner) {
        env = env.replace("{{ owner }}", owner)
      }
      await fsp.writeFile(join(root, ".env"), env)

      client.destroy()

      console.log(chalk.green(`${name} bot has been created.`))
      console.log(chalk.cyanBright(`=> ${root}`))
      console.timeEnd("duration")
      console.log(
        `\ncheck the validity of the ${chalk.blueBright(
          ".env"
        )} information.`
      )
      console.group("\ngetting started:\n")
      console.log(`$ cd ${chalk.blueBright(name)}`)
      console.log("$ npm i")
      console.log("$ make command helloworld")
      console.log("$ make listener guildMemberAdd")
      console.log(`$ npm run watch ${chalk.grey("# for watch typescript and reload " + name)}`)
      console.log(`$ npm run start ${chalk.grey("# for build typescript and start " + name)}`)
      console.log(`$ node . ${chalk.grey("# for simply start " + name)}`)
      console.groupEnd()
      console.log("\n" + chalk.green("Enjoy!"))
    }
  )
  .command(...makeFile("command", "name"))
  .command(...makeFile("listener", "event", require("../events.json")))
  .help().argv

function makeFile(id, arg, choices) {
  return [
    `${id} [${arg}]`,
    "create bot " + id,
    (yargs) => {
      yargs.positional(arg, {
        default: "message",
        describe: id + " " + arg,
        choices,
      })
    },
    async (argv) => {
      console.time("duration")
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
      const file = template.replace(new RegExp(`{{ ${arg} }}`, "g"), argv[arg])

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

      console.log(chalk.green(`${argv[arg]} ${id} has been created.`))
      console.log(chalk.cyanBright(`=> ${path}`))
      console.timeEnd("duration")
    },
  ]
}
