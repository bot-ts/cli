#!/usr/bin/env node

const exec = require("util").promisify(require("child_process").exec)
const join = require("path").join
const fs = require("fs")
const fsp = require("fs/promises")
const chalk = require("chalk")
const yargs = require("yargs/yargs")
const helpers = require("yargs/helpers")

yargs(helpers.hideBin(process.argv))
  .scriptName("make")
  .usage("$0 <cmd> [args]")
  .command(
    "bot [name] [path]",
    "create typescript bot",
    (yargs) => {
      yargs.positional("name", {
        default: "bot.ts",
        describe: "bot name",
      })
      yargs.positional("path", {
        default: ".",
        describe: "bot path",
      })
    },
    async ({ name, path }) => {
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

      console.log(chalk.green(`${name} bot has been created.`))
      console.log(chalk.cyanBright(`=> ${root}`))
      console.group("\nhow to start ?")
      console.log(chalk.white(`\n$ cd ${chalk.blueBright(name)}\n$ npm i`))
      console.groupEnd()
      console.log("\nthen, create your /.env file from /template.env.")
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
        describe: id + " " + arg,
        choices
      })
    },
    async (argv) => {
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
    },
  ]
}
