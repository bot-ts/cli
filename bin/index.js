#!/usr/bin/env node

const exec = require("util").promisify(require("child_process").exec)
const join = require("path").join
const fs = require("fs")
const fsp = require("fs/promises")
const yargs = require("yargs/yargs")
const helpers = require("yargs/helpers")

yargs(helpers.hideBin(process.argv))
  .scriptName("make")
  .usage("$0 <cmd> [args]")
  .command(
    "bot [name] [path]",
    "create typescript bot here",
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
      console.log("done")
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
        default: arg,
        describe: id + " " + arg,
      })
    },
    async (argv) => {
      const template = await fsp.readFile(
        join(__dirname, "..", "templates", id),
        { encoding: "utf8" }
      )
      const file = template.replace(new RegExp(`{{ ${arg} }}`, "g"), argv[arg])
      const path = join(process.cwd(), id + "s", argv[arg])
      if (fs.existsSync(path)) return console.error(id + " already exists")
      await fsp.writeFile(path + ".ts", file)
      console.log("done")
    },
  ]
}
