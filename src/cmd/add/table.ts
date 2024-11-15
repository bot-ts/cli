import { Command } from "commander"
import ejs from "ejs"
import fs from "fs"
import inquirer from "inquirer"
import path from "path"
import { styleText } from "util"
import { capitalize, cwd, format, isBotTsProject } from "../../util"

const TYPES = [
  "string",
  "integer",
  "float",
  "boolean",
  "date",
  "json",
  "bigint",
] as const

export const command = new Command("table")
  .description(
    "Add a database table\nMore info: https://ghom.gitbook.io/bot.ts/usage/use-database#create-a-table"
  )
  .usage("[--options]")
  .action(async () => {
    if (!isBotTsProject()) return process.exit(1)

    const { name, description, priority } = await inquirer.prompt([
      {
        type: "input",
        name: "name",
        message: "Enter the table name",
        required: true,
      },
      {
        type: "input",
        name: "description",
        message: "Enter the table description",
      },
      {
        type: "number",
        name: "priority",
        message: `Enter the computing priority for relations ${styleText(
          "grey",
          "(higher is computed first)"
        )}`,
        default: 0,
      },
    ])

    const columns: Record<string, object> = {}

    let addColumn = true,
      firstColumn = true

    while (addColumn) {
      const { category } = await inquirer.prompt([
        {
          type: "list",
          name: "category",
          message: `Choose the ${
            firstColumn ? "first" : "next"
          } column category`,
          choices: [
            {
              name: `Data column ${styleText("grey", "(default)")}`,
              value: "data",
            },
            { name: "Relation column", value: "relation" },
            {
              name: `Primary column ${styleText(
                "grey",
                "(e.g. auto increments)"
              )}`,
              value: "primary",
            },
          ],
          default: "data",
        },
      ])

      switch (category) {
        case "data": {
          const { name, typeFn, required, unique } = await inquirer.prompt([
            {
              type: "input",
              name: "name",
              message: "Enter the column name",
              required: true,
            },
            {
              type: "list",
              name: "typeFn",
              message: "Enter the column type",
              choices: TYPES,
            },
            {
              type: "confirm",
              name: "required",
              message: "Is this column required?",
              default: false,
            },
            {
              type: "confirm",
              name: "unique",
              message: "Is this column unique?",
              default: false,
            },
          ])

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
          const { tableName } = await inquirer.prompt([
            {
              type: "input",
              name: "tableName",
              message: "Enter the related table name",
            },
          ])

          const { tableColumn } = await inquirer.prompt([
            {
              type: "input",
              name: "tableColumn",
              message: `Enter the related ${styleText(
                "blueBright",
                tableName
              )}'s column name`,
            },
          ])

          // TODO: resolve the type of the column from the targetted table

          const { name, typeFn } = await inquirer.prompt([
            {
              type: "list",
              name: "typeFn",
              message: `Enter the related ${styleText(
                "blueBright",
                tableName + "." + tableColumn
              )}'s type`,
              choices: TYPES,
              default: "integer",
            },
            {
              type: "input",
              name: "name",
              message: "Enter the relation name",
              default: tableName + "_" + tableColumn,
            },
          ])

          const { deleteCascade } = await inquirer.prompt([
            {
              type: "confirm",
              name: "deleteCascade",
              message: "Should the relation cascade on delete?",
              default: false,
            },
          ])

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
          const { name, auto } = await inquirer.prompt([
            {
              type: "input",
              name: "name",
              message: "Enter the primary column name",
            },
            {
              type: "confirm",
              name: "auto",
              message: "Is this column auto incrementing?",
              default: true,
            },
          ])

          if (!auto) {
            const { typeFn } = await inquirer.prompt([
              {
                type: "list",
                name: "typeFn",
                message: "Enter the primary column type",
                choices: TYPES,
              },
            ])

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

      const { moreColumns } = await inquirer.prompt({
        type: "confirm",
        name: "moreColumns",
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

    console.log(
      `✅ Table ${styleText(
        "blueBright",
        name
      )} has been created at ${styleText(
        "cyanBright",
        path.join(...buttonPath)
      )}`
    )
  })

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
