import { Command } from "commander"
import { command as button } from "./add/button"
import { command as cmd } from "./add/command"
import { command as cron } from "./add/cron"
import { command as listener } from "./add/listener"
import { command as namespace } from "./add/namespace"
import { command as slash } from "./add/slash"
import { command as table } from "./add/table"

export const command = new Command("add")
  .aliases(["generate"])
  .description("Generate a bot component")
  .addCommand(cmd)
  .addCommand(slash)
  .addCommand(listener)
  .addCommand(table)
  .addCommand(cron)
  .addCommand(button)
  .addCommand(namespace)

// .command(
//   "add <cmd> [args] [--options]",
//   "add a command, listener, namespace or table",
//   (yargs) => {
//     yargs
//       .command(...makeFile("cron", "name"))
//       .command(...makeFile("button", "name"))
//       .command(...makeFile("command", "name"))
//       .command(...makeFile("slash", "name"))
//       .command(...makeFile("listener", "event", "category"))
//       .command<{ name: string }>(
//         "namespace <name>",
//         "add a namespace",
//         (yargs) => {
//           yargs.positional("name", {
//             describe: "namespace name",
//             type: "string",
//           })
//         },
//         async (args) => {
//           console.time("duration")

//           if (!(await isBotTsProject()))
//             return console.error(
//               util.styleText(
//                 "red",
//                 'you should only use this command at the root of a "bot.ts" project'
//               )
//             )

//           if (/[\\\/]/.test(args.name))
//             return console.error(
//               util.styleText(
//                 "red",
//                 "namespace name cannot contain path separators."
//               )
//             )

//           const lowerCamelCaseName = args.name.replace(
//             /\.([a-z])/gi,
//             (_, letter) => {
//               return letter.toUpperCase()
//             }
//           )

//           const namespacePath = cwd("src", "namespaces", args.name + ".ts")

//           await fsp.writeFile(namespacePath, `export {}\n`, "utf8")

//           const appFile = await fsp.readFile(cwd("src", "app.ts"), "utf8")
//           const appLines = appFile.split("\n")

//           if (/^\s*$/.test(appLines[appLines.length - 1])) appLines.pop()

//           const spaceIndex = appLines.findIndex((line) => /^\s*$/.test(line))

//           appLines.splice(
//             spaceIndex,
//             0,
//             `export * from "./namespaces/${args.name}.ts"`
//           )
//           appLines.push(
//             `export * as ${lowerCamelCaseName} from "./namespaces/${args.name}.ts"`
//           )

//           await fsp.writeFile(
//             cwd("src", "app.ts"),
//             appLines.join("\n"),
//             "utf8"
//           )

//           console.log(
//             util.styleText(
//               "green",
//               `\n${args.name} namespace has been created.`
//             )
//           )
//           console.log(
//             `It can be accessible as: ${util.styleText(
//               "italic",
//               `app.${lowerCamelCaseName}`
//             )}`
//           )
//           console.log(util.styleText("cyanBright", `=> ${namespacePath}\n`))
//           console.timeEnd("duration")
//         }
//       )
//       .command(
//         "table <name>",
//         "create a database table",
//         (yargs) => {
//           yargs.positional("name", {
//             describe: "table name",
//             type: "string",
//           })
//         },
//         async (args) => {
//           console.time("duration")

//           if (!(await isBotTsProject())) return

//           const tablePath = cwd("src", "tables", args.name + ".ts")

//           const template = await fsp.readFile(
//             cwd("templates", "table"),
//             "utf8"
//           )
//           await fsp.writeFile(
//             tablePath,
//             template
//               // @ts-ignore
//               .replace(/{{ name }}/g, args.name)
//               .replace(
//                 /{{ Name }}/g,
//                 // @ts-ignore
//                 args.name[0].toUpperCase() + args.name.slice(1)
//               ),
//             "utf8"
//           )

//           console.log(
//             util.styleText("green", `\n${args.name} table has been created.`)
//           )
//           console.log(util.styleText("cyanBright", `=> ${tablePath}\n`))
//           console.timeEnd("duration")
//         }
//       )
//       .demandCommand(1)
//   }
// )
