import { program, Command } from "commander"
import dotenv from "dotenv"
import path from "node:path"
import url from "node:url"
import cp from "node:child_process"
import { PackageJson } from "types-package-json"

import { command as add } from "#src/cmd/add"
import { command as config } from "#src/cmd/config"
import { command as _new } from "#src/cmd/new"
import { readJSON, isBotTsProject, cwd } from "#src/util"

const dirname = path.dirname(url.fileURLToPath(import.meta.url))

const bot = program
  .name("bot")
  .description(
    "Bot.ts is a modern framework for creating Discord bots with TypeScript."
  )
  .usage("<cmd> [args] [--options]")
  .version(
    readJSON<PackageJson>(path.join(dirname, "..", "package.json")).version
  )
  .addCommand(_new)
  .addCommand(add)
  .addCommand(config)

if (isBotTsProject()) {
  const compatibility = readJSON<{
    components: Record<string, Record<string, string>>
  }>(cwd("compatibility.json"))

  const botEnv = dotenv.config({
    path: cwd(".env"),
  })

  for (const [key, value] of Object.entries(compatibility.components)) {
    if (key === "lockfile") continue

    const [name, sub] = key.split("-")

    const run =
      "node" in value
        ? value[botEnv.parsed!.RUNTIME!]
        : value[botEnv.parsed!.PACKAGE_MANAGER!]

    let cmd = bot.commands.find((cmd) => cmd.name() === name)

    if (!cmd) {
      cmd = new Command(name)
        .description(`Run the "${run}" command`)
        .usage("[args] [--options]")

      bot.addCommand(cmd)
    }

    const action = async () => {
      cp.execSync(`${run} ${process.argv.slice(2).join(" ")}`, {
        cwd: process.cwd(),
      })
    }

    if (!sub) {
      cmd.action(action)
    } else {
      cmd.addCommand(
        new Command(sub)
          .description(
            sub === "dev"
              ? "Add a dev dependency"
              : sub === "global"
              ? "Add a global dependency"
              : "Add a dependency"
          )
          .action(action)
      )
    }
  }
}

bot.action(() => program.help())

program.parse()
