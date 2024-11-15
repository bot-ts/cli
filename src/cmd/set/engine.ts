import { Command } from "commander"
import { isBotTsProject, promptEngine, setupEngine } from "../../util"

export const command = new Command("engine")
  .description(
    "Set the engine for the project\nMore info: https://ghom.gitbook.io/bot.ts/configuration#switch-engine"
  )
  .usage("[--options]")
  .action(async () => {
    if (!isBotTsProject()) return process.exit(1)

    await setupEngine(await promptEngine())

    console.log("✅ Engine set successfully")
  })
