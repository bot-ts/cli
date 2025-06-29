#!/usr/bin/env node

import { input, password, select } from "@inquirer/prompts"
import ejs from "ejs"
import loading from "loading-cli"
import { execSync } from "node:child_process"
import fs from "node:fs"
import fsp from "node:fs/promises"
import path from "node:path"
import url from "node:url"
import util from "node:util"
import prettier from "prettier"
import { PackageJson } from "types-package-json"

const dirname = path.dirname(url.fileURLToPath(import.meta.url))

export const root = (...segments: string[]) =>
  path.join(dirname, "..", ...segments)

export const cwd = (...segments: string[]) =>
  path.join(process.cwd(), ...segments)

export function inputName(
  message: string,
  options?: {
    defaultValue?: string
    kebabCase?: boolean
    main?: boolean
    column?: boolean
  }
) {
  return input({
    message: `${message} ${util.styleText(
      "grey",
      options?.column
        ? "(in snake_case)"
        : options?.main
        ? "(used as directory/package.json name)"
        : "(used as filename)"
    )}`,
    required: true,
    default: options?.defaultValue,
    validate: (value) =>
      options?.column
        ? /^[a-z]+[a-z0-9_]*$/.test(value) || "Must be in snake_case"
        : options?.kebabCase
        ? /^[a-z]+[a-z0-9-]*$/.test(value) || "Must be in kebab-case"
        : /^[a-z]+[a-zA-Z0-9]*$/.test(value) || "Must be in camelCase",
  })
}

export function isNodeLikeProject(projectPath = cwd()): boolean {
  return fs.existsSync(path.join(projectPath, "package.json"))
}

export function isBotTsProject(silent?: boolean): boolean {
  let packageJson: PackageJson

  try {
    packageJson = readJSON<PackageJson>(cwd("package.json"))
  } catch {
    if (!silent)
      console.error(
        util.styleText(
          "red",
          'You should only use this command at the root of a "bot.ts" project'
        )
      )
    return false
  }

  if (!packageJson.devDependencies?.hasOwnProperty("@ghom/bot.ts-cli")) {
    if (!silent)
      console.error(
        util.styleText(
          "red",
          'This project does not seem to be a "bot.ts" project'
        )
      )
    return false
  }

  return fs.existsSync(cwd("compatibility.json"))
}

export function getDatabaseDriverName(packageJson: PackageJson) {
  if (packageJson?.dependencies?.["pg"]) {
    return "pg"
  } else if (packageJson?.dependencies?.["mysql2"]) {
    return "mysql2"
  } else if (packageJson?.dependencies?.["sqlite3"]) {
    return "sqlite3"
  } else throw new Error("No database driver found in package.json")
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
    text: util.styleText("bold", start),
    interval: 150,
    color: "white",
    frames: ["◐", "◓", "◑", "◒"],
  }).start()
  await callback()
  load.succeed(
    `${util.styleText("bold", end)} ${util.styleText(
      "grey",
      `${Date.now() - time}ms`
    )}`
  )
}

export async function injectEnvLine(
  name: string,
  value: string,
  projectPath = cwd()
) {
  let env: string | undefined

  try {
    env = await fsp.readFile(path.join(projectPath, ".env"), "utf8")
  } catch {
    console.warn("No .env file found, aborted env var injection.")
    return
  }

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

export async function promptDatabase(options?: { client?: string }) {
  const choices = [
    { value: "sqlite3", name: "SQLite" },
    { value: "pg", name: "PostgreSQL" },
    { value: "mysql2", name: "MySQL" },
  ]

  let client: string

  if (options?.client) {
    client = options.client
  } else {
    client = await select({
      message: "Select the database client",
      choices,
      default: "sqlite3",
    })
  }

  if (!choices.some((choice) => choice.value === client)) {
    throw new Error(`Invalid database client: "${client}"`)
  }

  let database: {
    host?: string
    port?: string
    password?: string
    user?: string
    database?: string
  } = {}

  if (client !== "sqlite3" && !options?.client) {
    database.host = await input({
      message: "Enter the database host",
      default: "127.0.0.1",
    })

    database.port = await input({
      message: "Enter the database port",
      default: client === "pg" ? "5432" : "3306",
    })

    database.user = await input({
      message: "Enter the database user",
      default: client === "pg" ? "postgres" : "root",
    })

    database.password = await password({
      message: "Enter the database password",
    })

    database.database = await input({
      message: "Enter the database/schema name",
      default: client === "pg" ? "postgres" : undefined,
      required: client !== "pg",
    })
  }

  return { database, client }
}

export async function promptEngine() {
  const runtime = await select({
    message: "Select the JavaScript runtime",
    choices: [
      { value: "node", name: "Node.js" },
      { value: "deno", name: "Deno" },
      { value: "bun", name: "Bun (recommended)" },
    ],
    default: "node",
  })

  let list = ["npm", "yarn", "pnpm"]

  if (runtime !== "node") list.unshift(runtime)

  const packageManager = await select({
    message: "Select the package manager",
    choices: list.map((pm, index) => ({
      value: pm,
      name: index === 0 ? `${pm} (recommended)` : pm,
    })),
    default: list[0],
  })

  return { runtime, packageManager }
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
  const packageJson = readJSON<PackageJson>(
    path.join(projectPath, "package.json")
  )

  if (!packageJson.dependencies) packageJson.dependencies = {}

  // delete all other database dependencies.
  for (const dbname of ["sqlite3", "mysql2", "pg"]) {
    if (dbname !== database.client) delete packageJson.dependencies[dbname]
    else packageJson.dependencies[dbname] = "latest"
  }

  writeJSON(path.join(projectPath, "package.json"), packageJson)

  const template = await fsp.readFile(
    path.join(projectPath, "templates", "database.ejs"),
    "utf8"
  )

  await fsp.writeFile(
    path.join(projectPath, "src", "core", "database.ts"),
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

export async function setupEngine(
  config: {
    runtime: string
    packageManager: string
  },
  options: {
    setupDocker?: boolean
  },
  projectPath = cwd()
) {
  await injectEnvLine("RUNTIME", config.runtime, projectPath)
  await injectEnvLine("PACKAGE_MANAGER", config.packageManager, projectPath)

  const compatibility = readJSON<{
    components: Record<string, Record<string, string>>
  }>(path.join(projectPath, "compatibility.json"))

  for (const lockfile of Object.values(compatibility.components["lockfile"])) {
    try {
      await fsp.unlink(path.join(projectPath, lockfile))
    } catch {}
  }

  execSync(compatibility.components["install"][config.packageManager], {
    stdio: ["ignore", "ignore", "pipe"],
    cwd: projectPath,
  })

  await setupWorkflow(config, projectPath)
  if (options.setupDocker) await setupDocker(config, projectPath)
  return await setupScripts(config, projectPath)
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
      if (components[tag]) {
        if ("node" in components[tag]) {
          return components[tag][config.runtime]
        } else {
          return components[tag][config.packageManager]
        }
      } else {
        throw new Error(
          `Tag "${tag}" not found in compatibility.json, please remove the tag from the file.`
        )
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

export async function setupDocker(
  config: {
    client?: string
    runtime: string
    packageManager: string
  },
  projectPath = cwd()
) {
  config.client ??= getDatabaseDriverName(
    readJSON(path.join(projectPath, "package.json"))
  )

  const compatibility = readJSON<{
    components: Record<string, Record<string, string>>
  }>(path.join(projectPath, "compatibility.json"))

  const [dockerfile, compose] = await Promise.all([
    fsp.readFile(path.join(projectPath, "templates", "dockerfile.ejs"), "utf8"),
    fsp.readFile(path.join(projectPath, "templates", "compose.ejs"), "utf8"),
  ])

  await fsp.writeFile(
    path.join(projectPath, "Dockerfile"),
    ejs.compile(dockerfile)({
      ...config,
      lockfile: compatibility.components.lockfile[config.packageManager],
    }),
    "utf8"
  )

  await fsp.writeFile(
    path.join(projectPath, "docker-compose.yml"),
    ejs.compile(compose)(config),
    "utf8"
  )
}

export async function setupWorkflow(
  config: {
    runtime: string
    packageManager: string
  },
  projectPath = cwd()
) {
  const template = await fsp.readFile(
    path.join(projectPath, "templates", "workflow.ejs"),
    "utf8"
  )

  await fsp.writeFile(
    path.join(projectPath, ".github", "workflows", "tests.yml"),
    ejs.compile(template)(config),
    "utf8"
  )
}
