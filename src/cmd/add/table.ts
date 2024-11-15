import { Command } from "commander"
import ejs from "ejs"
import fs from "fs"
import inquirer from "inquirer"
import path from "path"
import { styleText } from "util"
import { cwd, format } from "../../util"

export const command = new Command("table")
  .description("add a database table")
  .action(async () => {
    const types = [
      "string",
      "integer",
      "float",
      "boolean",
      "date",
      "json",
      "bigint",
    ]

    const { name, description, priority } = await inquirer.prompt([
      {
        type: "input",
        name: "name",
        message: "Enter the table name",
      },
      {
        type: "input",
        name: "description",
        message: "Enter the table description",
      },
      {
        type: "number",
        name: "priority",
        message:
          "Enter the computing priority for relations: higher is computed first",
        default: 0,
      },
    ])

    const columns: Record<string, object> = {}

    let addColumn = true

    while (addColumn) {
      const { category } = await inquirer.prompt([
        {
          type: "list",
          name: "category",
          message: "Choose the column category",
          choices: [
            { name: "Data column (default)", value: "data" },
            { name: "Relation column", value: "relation" },
            {
              name: "Primary column (e.g. auto increments)",
              value: "primary",
            },
          ],
          default: "data",
        },
      ])

      switch (category) {
        case "data": {
          const { name, type, required, unique } = await inquirer.prompt([
            {
              type: "input",
              name: "name",
              message: "Enter the column name",
            },
            {
              type: "list",
              name: "type",
              message: "Enter the column type",
              choices: types,
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

          columns[name] = { category, type, required, unique }
          break
        }
        case "relation": {
          const { tableName, tableColumn } = await inquirer.prompt([])

          const { name } = await inquirer.prompt([
            {
              type: "input",
              name: "name",
              message: "Enter the column name",
              default: tableName + "_" + tableColumn,
            },
          ])

          columns[name] = { category, tableName, tableColumn, name }
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
              default: false,
            },
          ])

          if (!auto) {
            const { type } = await inquirer.prompt([
              {
                type: "list",
                name: "type",
                message: "Enter the primary column type",
                choices: types,
              },
            ])

            columns[name] = { category, type }
          } else {
            columns[name] = { category, auto }
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
    }

    const template = fs.readFileSync(cwd("templates", "table.ejs"), "utf8")
    const buttonPath = ["src", "tables", name + ".ts"]

    fs.writeFileSync(
      cwd(...buttonPath),
      format(
        ejs.compile(template)({
          name,
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
