#!/usr/bin/env node

import cp from "child_process"
import fs from "fs"
import fsp from "fs/promises"
import loading from "loading-cli"
import path from "path"
import readline from "readline"
import ss from "string-similarity"
import { PackageJson } from "types-package-json"
import url from "url"
import util from "util"

const dirname = path.dirname(url.fileURLToPath(import.meta.url))

export const root = (...segments: string[]) =>
  path.join(dirname, "..", ...segments)

export const cwd = (...segments: string[]) =>
  path.join(process.cwd(), ...segments)

export function isNodeLikeProject(): boolean {
  return fs.existsSync(cwd("package.json"))
}

export async function isBotTsProject(): Promise<boolean> {
  let conf = null

  try {
    conf = require(cwd("package.json"))
  } catch {}

  if (
    !conf ||
    !conf.hasOwnProperty("devDependencies") ||
    !conf.devDependencies.hasOwnProperty("@ghom/bot.ts-cli")
  ) {
    console.error(
      util.styleText(
        "red",
        'you should only use this command at the root of a "bot.ts" project'
      )
    )
    return false
  }
  return true
}

export async function fetchGenmap() {
  return readJSON<Record<string, string>>(cwd("genmap.json"))
}

export const exec = (
  cmd: string,
  options?: cp.CommonOptions
): Promise<null> => {
  return new Promise((res, rej) => {
    cp.exec(cmd, options, (err) => {
      if (err) rej(err)
      else res(null)
    })
  })
}

export async function confirm(question: string) {
  const line = readline.createInterface({
    // @ts-ignore
    input: process.stdin,
    // @ts-ignore
    output: process.stdout,
  })

  return new Promise((resolve) => {
    line.question(question, (response) => {
      line.close()
      resolve(response.toUpperCase() === "Y")
    })
  })
}

export function readJSON<T>(srcPath: string): T {
  return JSON.parse(fs.readFileSync(srcPath, "utf8"))
}

export function writeJSON(destPath: string, json: any) {
  fs.writeFileSync(destPath, JSON.stringify(json, null, 2), "utf8")
}

export function capitalize(str: string) {
  return str[0].toUpperCase() + str.slice(1)
}

export async function loader(
  start: string,
  callback: () => unknown,
  end: string
) {
  const time = Date.now()
  const load = loading({
    text: start,
    interval: 150,
    color: "white",
    frames: ["◐", "◓", "◑", "◒"],
  }).start()
  await callback()
  load.succeed(`${end} ${util.styleText("grey", `${Date.now() - time}ms`)}`)
}

export async function injectEnvLine(
  name: string,
  value: string,
  projectPath = cwd()
) {
  const env = await fsp.readFile(path.join(projectPath, ".env"), "utf8")
  const lines = env.split("\n")
  const index = lines.findIndex((line) => line.split("=")[0] === name)
  if (index > -1) lines.splice(index, 1)
  lines.push(`${name}="${value}"`)
  await fsp.writeFile(path.join(projectPath, ".env"), lines.join("\n"), "utf8")
}

export async function setupDatabase(
  projectPath: string,
  database: {
    database: string
    host: string
    port?: string
    password?: string
    user?: string
    dbname?: string
  }
) {
  const conf = await readJSON<PackageJson>(
    path.join(projectPath, "package.json")
  )

  if (!conf.dependencies) conf.dependencies = {}

  // delete all other database dependencies.
  for (const dbname of ["sqlite3", "mysql2", "pg"]) {
    if (dbname !== database.database) delete conf.dependencies[dbname]
    else conf.dependencies[dbname] = "latest"
  }

  await writeJSON(path.join(projectPath, "package.json"), conf)

  const template = await fsp.readFile(
    path.join(projectPath, "templates", database.database + ".txt"),
    "utf8"
  )

  await fsp.writeFile(
    path.join(projectPath, "src", "app", "database.ts"),
    template,
    "utf8"
  )

  if (database.host) await injectEnvLine("DB_HOST", database.host, projectPath)
  if (database.port) await injectEnvLine("DB_PORT", database.port, projectPath)
  if (database.user) await injectEnvLine("DB_USER", database.user, projectPath)
  if (database.password)
    await injectEnvLine("DB_PASSWORD", database.password, projectPath)
  if (database.dbname)
    await injectEnvLine("DB_DATABASE", database.dbname, projectPath)
}

export function makeFile(
  id: "command" | "button" | "listener" | "slash" | "cron",
  arg: string,
  arg2?: string
) {
  const name = () => (id === "slash" ? "slash command" : id)

  return [
    `${id} <${arg}>${arg2 ? ` <${arg2}>` : ""}`,
    "add a " + name(),
    (yargs: any) => {
      yargs.positional(arg, {
        describe: name() + " " + arg,
      })
      if (arg2) {
        yargs.positional(arg2, {
          describe: `The ${arg2} of ${id} file`,
        })
      }
    },
    async (argv: any) => {
      console.time("duration")

      if (!(await isBotTsProject()))
        return console.error(
          util.styleText(
            "red",
            'you should only use this command at the root of a "bot.ts" project'
          )
        )

      if (/[\\\/]/.test(argv.arg))
        return console.error(
          util.styleText(
            "red",
            `${name()} ${arg} cannot contain path separators.`
          )
        )

      if (/[\\\/]/.test(argv.arg2))
        return console.error(
          util.styleText(
            "red",
            `${name()} ${arg2} cannot contain path separators.`
          )
        )

      if (id === "listener" && !argv[arg2!])
        return console.error(
          util.styleText("red", "you should give a category name.")
        )

      const filename =
        id === "listener"
          ? `${argv[arg2!]}.${argv[arg]}.ts`
          : (argv.name ?? argv[arg]) + ".ts"

      const events = await readJSON<Record<string, string | string[]>>(
        "../events.json"
      )

      if (arg === "event") {
        if (!argv[arg]) {
          return console.error(
            util.styleText(
              "red",
              "you should give a Discord Client event name."
            )
          )
        }

        const event = Object.keys(events).find(
          (key) => key.toLowerCase() === argv[arg].toLowerCase()
        )

        if (event) {
          argv[arg] = event
        } else {
          console.error(
            util.styleText(
              "red",
              "you should give a valid Discord Client event name."
            )
          )
          for (const event of Object.keys(events)) {
            const similarity = ss.compareTwoStrings(
              event.toLowerCase(),
              argv[arg].toLowerCase()
            )
            if (similarity > 0.75) {
              console.log(
                `Did you mean ${util.styleText("cyanBright", event)} instead?\n`
              )
            }
          }
          return
        }
      }

      const template = await fsp.readFile(cwd("templates", id), "utf8")
      const capitalize = (t: string) => t[0].toUpperCase() + t.slice(1)

      let file = template
        .replace(new RegExp(`{{ ${arg} }}`, "g"), argv[arg])
        .replace(
          new RegExp(`{{ ${capitalize(arg)} }}`, "g"),
          capitalize(argv[arg])
        )

      if (arg2)
        file = file.replace(new RegExp(`{{ ${arg2} }}`, "g"), argv[arg2])

      if (arg === "event") {
        let args = events[argv[arg]]
        args = typeof args === "string" ? args : args.join(", ")
        file = file.replace(`{{ args }}`, args)
      }

      const directory = cwd(
        "src",
        id + (id === "slash" || id === "cron" ? "" : "s")
      )

      if (!fs.existsSync(directory))
        return console.error(
          util.styleText(
            "red",
            `The ${util.styleText("white", directory)} directory doesn't exist.`
          )
        )

      const destPath = path.join(directory, filename)

      if (fs.existsSync(destPath))
        return console.error(
          util.styleText("red", `${argv[arg]} ${name()} already exists.`)
        )

      await fsp.writeFile(destPath, file, "utf8")

      console.log(
        util.styleText("green", `\n${argv[arg]} ${name()} has been created.`)
      )
      console.log(util.styleText("cyanBright", `=> ${path}`), "\n")
      console.timeEnd("duration")
    },
  ] as const
}
