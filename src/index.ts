#!/usr/bin/env node

// replace yargs by https://www.npmjs.com/package/@inquirer/prompts and https://github.com/tj/commander.js

import path from "path"
import { PackageJson } from "types-package-json"
import url from "url"
import { readJSON } from "./util"

import { program } from "commander"
import { command as add } from "./cmd/add"
import { command as make } from "./cmd/make"
import { command as set } from "./cmd/set"

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
  .addCommand(add)
  .addCommand(make)
  .addCommand(set)

program.parse()
