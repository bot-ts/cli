import { program } from "commander"
import path from "node:path"
import url from "node:url"
import { PackageJson } from "types-package-json"

import { command as add } from "#src/cmd/add"
import { command as config } from "#src/cmd/config"
import { command as _new } from "#src/cmd/new"
import { readJSON } from "#src/util"

const dirname = path.dirname(url.fileURLToPath(import.meta.url))

program
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
  .action(() => program.help())

program.parse()
