import { Command } from "commander"

// set database <sqlite3 | pg | "mysql2">
// set engine <node | bun | deno> <npm | yarn | pnpm | bun | deno>

export const command = new Command()

// .command("set <cmd> [args] [--options]", "set something", (yargs) => {
//   yargs.command(
//     "database <database>",
//     "setup database",
//     (yargs) => {
//       yargs
//         .positional("database", {
//           describe: "used database",
//           type: "string",
//           choices: ["sqlite3", "mysql2", "pg"],
//         })
//         .option("host", {
//           alias: "h",
//           default: "localhost",
//           describe: "database host",
//         })
//         .option("port", {
//           describe: "database port",
//           type: "string",
//         })
//         .option("user", {
//           alias: "u",
//           type: "string",
//           describe: "database user",
//         })
//         .option("password", {
//           alias: "pw",
//           type: "string",
//           describe: "database password",
//         })
//         .option("dbname", {
//           alias: "db",
//           type: "string",
//           describe: "database name",
//         })
//     },
//     async (args) => {
//       console.time("duration")

//       // @ts-ignore
//       await setupDatabase(cwd(), args)

//       console.log(
//         util.styleText(
//           "green",
//           `\n${args.database} database has been created.`
//         )
//       )
//       console.log(
//         util.styleText(
//           "cyanBright",
//           `=> ${cwd("src", "app", "database.ts")}\n`
//         )
//       )
//       console.timeEnd("duration")
//     }
//   )
// })
