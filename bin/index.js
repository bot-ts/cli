#!/usr/bin/env node

const exec = require("util").promisify(require("child_process").exec)
const join = require("path").join
const fs = require("fs")
const fsp = require("fs/promises")
const yargs = require("yargs/yargs")
const helpers = require("yargs/helpers")

console.log("it works!")

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
  .command(
    "command [name]",
    "create bot command",
    (yargs) => {
      yargs.positional("name", {
        default: "name",
        describe: "command name",
      })
    },
    async ({ name }) => {
      const template = await fsp.readFile(
        join(__dirname, "..", "templates", "command"),
        { encoding: "utf8" }
      )
      const command = template.replace(/{{ name }}/g, name)
      const path = join(process.cwd(), "commands", name)
      if (fs.existsSync(path)) return console.error("command already exists")
      await fsp.writeFile(path + ".ts", command)
      console.log("done")
    }
  )
  .command(
    "listener [event]",
    "create bot listener",
    (yargs) => {
      yargs.positional("event", {
        default: "event",
        describe: "listener event name",
      })
    },
    async ({ event }) => {
      const template = await fsp.readFile(
        join(__dirname, "..", "templates", "listener"),
        { encoding: "utf8" }
      )
      const listener = template.replace(/{{ event }}/g, event)
      const path = join(process.cwd(), "listeners", name)
      if (fs.existsSync(path)) return console.error("listener already exists")
      await fsp.writeFile(path + ".ts", listener)
      console.log("done")
    }
  )
  .help().argv
