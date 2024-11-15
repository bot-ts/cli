![Bot avatar](https://cdn.discordapp.com/avatars/555419470894596096/b93811640f236581697fa02a8936c75d.webp?size=128&fit=cover&mask=circle)

# test

> Made with [bot.ts](https://ghom.gitbook.io/bot-ts/) by **ghom**  
> CLI version: `^8.3.1`  
> Bot.ts version: `v8.0.0-Capi`  
> Licence: `ISC`

## Description

A Discord bot in TypeScript made with [bot.ts](https://ghom.gitbook.io/bot-ts/)  
This bot is private and cannot be invited in other servers.

## Specifications

You can find the documentation of bot.ts [here](https://ghom.gitbook.io/bot-ts/).  
Below you will find the specifications for **test**.

## Configuration file

```ts
{
  {
    configFile
  }
}
```

## Cron jobs

> No cron jobs have been created yet.

## Commands

### Slash commands

- [/help](src/slash/help.native.ts) - Show slash command details or list all slash commands  
- [/ping](src/slash/ping.native.ts) - Get the bot ping

### Textual commands

- [database](src/commands/database.native.ts) - Run SQL query on database  
- [eval](src/commands/eval.native.ts) - JS code evaluator  
- [help](src/commands/help.native.ts) - Help menu  
- [info](src/commands/info.native.ts) - Get information about bot  
- [terminal](src/commands/terminal.native.ts) - Run shell command from Discord  
- [turn](src/commands/turn.native.ts) - Turn on/off command handling

## Buttons

- [pagination](src/buttons/pagination.native.ts) - The pagination button

## Listeners

### Button  

- [interactionCreate](src/listeners/button.interactionCreate.native.ts) - Handle the interactions for buttons  

### Command  

- [messageCreate](src/listeners/command.messageCreate.native.ts) - Handle the messages for commands  

### Cron  

- [ready](src/listeners/cron.ready.native.ts) - Launch all cron jobs  

### Log  

- [afterReady](src/listeners/log.afterReady.native.ts) - Just log that bot is ready  

### Pagination  

- [messageDelete](src/listeners/pagination.messageDelete.native.ts) - Remove existing deleted paginator  
- [messageReactionAdd](src/listeners/pagination.messageReactionAdd.native.ts) - Handle the reactions for pagination  

### Slash  

- [guildCreate](src/listeners/slash.guildCreate.native.ts) - Deploy the slash commands to the new guild  
- [interactionCreate](src/listeners/slash.interactionCreate.native.ts) - Handle the interactions for slash commands  
- [ready](src/listeners/slash.ready.native.ts) - Deploy the slash commands

## Database

Using **sqlite3@latest** as database.  
Below you will find a list of all the tables used by **test**.

> No tables have been created yet.

## Information

This readme.md is dynamic, it will update itself with the latest information.  
If you see a mistake, please report it and an update will be made as soon as possible.

- Used by: **12** Discord guilds
- Last update date: **11/15/2024**
