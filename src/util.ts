#!/usr/bin/env node

import cp from "child_process"
import ejs from "ejs"
import fs from "fs"
import fsp from "fs/promises"
import loading from "loading-cli"
import path from "path"
import prettier from "prettier"
import readline from "readline"
import { PackageJson } from "types-package-json"
import url from "url"
import util from "util"

const dirname = path.dirname(url.fileURLToPath(import.meta.url))

export const root = (...segments: string[]) =>
  path.join(dirname, "..", ...segments)

export const cwd = (...segments: string[]) =>
  path.join(process.cwd(), ...segments)

export function isNodeLikeProject(projectPath = cwd()): boolean {
  return fs.existsSync(path.join(projectPath, "package.json"))
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

export function format(str: string) {
  return prettier.format(str, {
    parser: "typescript",
    semi: false,
    endOfLine: "crlf",
  })
}

export async function setupDatabase(
  database: {
    client: string
    host?: string
    port?: string
    password?: string
    user?: string
    database?: string
  },
  projectPath = cwd()
) {
  const conf = readJSON<PackageJson>(path.join(projectPath, "package.json"))

  if (!conf.dependencies) conf.dependencies = {}

  // delete all other database dependencies.
  for (const dbname of ["sqlite3", "mysql2", "pg"]) {
    if (dbname !== database.client) delete conf.dependencies[dbname]
    else conf.dependencies[dbname] = "latest"
  }

  writeJSON(path.join(projectPath, "package.json"), conf)

  const template = await fsp.readFile(
    path.join(projectPath, "templates", "database.ejs"),
    "utf8"
  )

  await fsp.writeFile(
    path.join(projectPath, "src", "app", "database.ts"),
    format(
      ejs.compile(template)({
        client: database.client,
      })
    ),
    "utf8"
  )

  if (database.host) await injectEnvLine("DB_HOST", database.host, projectPath)
  if (database.port) await injectEnvLine("DB_PORT", database.port, projectPath)
  if (database.user) await injectEnvLine("DB_USER", database.user, projectPath)
  if (database.password)
    await injectEnvLine("DB_PASSWORD", database.password, projectPath)
  if (database.database)
    await injectEnvLine("DB_DATABASE", database.database, projectPath)
}

/**
 * Generate pacakge.json scripts from compatibility.json and return the compatibility json components.
 */
export async function setupScripts(
  config: {
    runtime: string
    packageManager: string
  },
  projectPath = cwd()
) {
  const packageJsonPath = path.join(projectPath, "package.json")
  const compatibilityJsonPath = path.join(projectPath, "compatibility.json")

  const { templates, components } = readJSON<{
    templates: Record<string, string | Record<string, string>>
    components: Record<string, Record<string, string>>
  }>(compatibilityJsonPath)

  const generateScripts = () => {
    const scripts: Record<string, string> = {}

    for (const [key, value] of Object.entries(templates)) {
      if (typeof value === "string") {
        scripts[key] = replaceTags(value)
      } else if (typeof value === "object") {
        scripts[key] = replaceTags(value[config.runtime] ?? value.default)
      }
    }

    return scripts
  }

  const replaceTags = (template: string) => {
    return template.replace(/{([a-z-]+)}/g, (_, tag) => {
      if ("note" in components[tag]) {
        return components[tag][config.runtime]
      } else {
        return components[tag][config.packageManager]
      }
    })
  }

  const generatedScripts = generateScripts()
  const packageJson = JSON.parse(await fsp.readFile(packageJsonPath, "utf-8"))

  packageJson.scripts = {
    ...packageJson.scripts,
    ...generatedScripts,
  }

  await fsp.writeFile(
    packageJsonPath,
    JSON.stringify(packageJson, null, 2),
    "utf-8"
  )

  return components
}
