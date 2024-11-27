import { isBotTsProject, loader, promptEngine, setupEngine } from "#src/util"
import { Command } from "commander"
import { confirm } from "@inquirer/prompts"

export const handler = async () => {
  if (!isBotTsProject()) return process.exit(1)

  const engine = await promptEngine()
  const setupDocker = await confirm({
    message: "Do you want to overwrite the Dockerfile and compose.yml?",
    default: false,
  })

  console.log()

  await loader(
    "Updating engine",
    () => setupEngine(engine, { setupDocker }),
    "Updated engine"
  )

  console.log()
  console.log("✅ Engine has been configured")
}

export const command = new Command("engine")
  .description(
    "Set the engine for the project\nMore info: https://ghom.gitbook.io/bot.ts/configuration#switch-engine"
  )
  .usage("[--options]")
  .action(handler)
