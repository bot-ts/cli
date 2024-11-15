import path from "path"
import { PackageJson } from "types-package-json"
import url from "url"
import { readJSON } from "./util"

import { program } from "commander"
import { command as add } from "./cmd/add"
import { command as config } from "./cmd/config"
import { command as _new } from "./cmd/new"

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

program.parse()
