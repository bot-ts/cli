import { capitalize, cwd, format, inputName, isBotTsProject } from "#src/util"
import { confirm, input, number, select } from "@inquirer/prompts"
import { Command } from "commander"
import ejs from "ejs"
import fs from "node:fs"
import path from "node:path"
import { styleText } from "node:util"

const TYPES = [
  "string",
  "integer",
  "float",
  "boolean",
  "date",
  "json",
  "bigint",
] as const

export const handler = async () => {
  if (!isBotTsProject()) return process.exit(1)

  const name = await inputName("Enter the table name")

  const description = await input({
    message: "Enter the table description",
  })

  const priority = await number({
    message: `Enter the computing priority for relations ${styleText(
      "grey",
      "(higher is computed first)"
    )}`,
    default: 0,
  })

  const columns: Record<string, object> = {}

  let addColumn = true,
    firstColumn = true

  while (addColumn) {
    const category = await select({
      message: `Choose the ${firstColumn ? "first" : "next"} column category`,
      choices: [
        {
          name: `Data column ${styleText("grey", "(default)")}`,
          value: "data",
        },
        { name: "Relation column", value: "relation" },
        {
          name: `Primary column ${styleText("grey", "(e.g. auto increments)")}`,
          value: "primary",
        },
      ],
      default: "data",
    })

    switch (category) {
      case "data": {
        const name = await inputName("Enter the column name", {
          column: true,
        })

        const typeFn = await select({
          message: "Enter the column type",
          choices: TYPES.map((t) => ({ name: t, value: t })),
        })

        const required = await confirm({
          message: "Is this column required?",
          default: false,
        })

        const unique = await confirm({
          message: "Is this column unique?",
          default: false,
        })

        columns[name] = {
          category,
          typeFn,
          required,
          unique,
          type: typeFromTypeFn(typeFn),
        }
        break
      }
      case "relation": {
        const tableName = await input({
          message: "Enter the related table name",
          required: true,
          async validate(value) {
            if (!fs.existsSync(cwd("src", "tables", value + ".ts"))) {
              return `Table ${value} does not exist`
            }

            return true
          },
        })

        // TODO: resolve the columns of the targetted table and use a select

        const tableColumn = await input({
          message: `Enter the related ${styleText(
            "blueBright",
            tableName
          )}'s column name`,
          required: true,
        })

        // TODO: resolve the type of the column from the targetted table

        const typeFn = await select({
          message: `Enter the related ${styleText(
            "blueBright",
            tableName + "." + tableColumn
          )}'s type`,
          choices: TYPES.map((t) => ({ name: t, value: t })),
          default: "integer",
        })

        const name = await inputName("Enter the relation name", {
          defaultValue: tableName + "_" + tableColumn,
          column: true,
        })

        const deleteCascade = await confirm({
          message: "Should the relation cascade on delete?",
          default: false,
        })

        columns[name] = {
          category,
          tableName,
          tableColumn,
          name,
          typeFn,
          type: typeFromTypeFn(typeFn),
          required: true,
          deleteCascade,
        }
        break
      }
      case "primary": {
        const name = await inputName("Enter the primary column name", {
          defaultValue: "id",
          column: true,
        })

        const auto = await confirm({
          message: "Is this column auto incrementing?",
          default: true,
        })

        if (!auto) {
          const typeFn = await select({
            message: "Enter the primary column type",
            choices: TYPES.map((t) => ({ name: t, value: t })),
          })

          columns[name] = {
            category,
            typeFn,
            type: typeFromTypeFn(typeFn),
            required: true,
          }
        } else {
          columns[name] = { category, auto, type: "number", required: true }
        }

        break
      }
    }

    const moreColumns = await confirm({
      message: "Do you want to add another column?",
      default: true,
    })

    addColumn = moreColumns
    firstColumn = false
  }

  const template = fs.readFileSync(cwd("templates", "table.ejs"), "utf8")
  const buttonPath = ["src", "tables", name + ".ts"]

  fs.writeFileSync(
    cwd(...buttonPath),
    format(
      ejs.compile(template)({
        name,
        Name: capitalize(name),
        description,
        priority,
        columns,
      })
    ),
    "utf8"
  )

  console.log()
  console.log(
    `✅ Table ${styleText("blueBright", name)} has been created at ${styleText(
      "cyanBright",
      path.join(...buttonPath)
    )}`
  )
}

export const command = new Command("table")
  .description(
    "Add a database table\nMore info: https://ghom.gitbook.io/bot.ts/usage/use-database#create-a-table"
  )
  .usage("[--options]")
  .action(handler)

function typeFromTypeFn(typeFn: (typeof TYPES)[number]) {
  switch (typeFn) {
    case "integer":
      return "number"
    case "float":
      return "number"
    case "date":
      return "Date"
    case "json":
      return "object"
    case "bigint":
      return "bigint"
    default:
      return typeFn
  }
}
