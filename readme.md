# make-bot.ts CLI

CLI for make Discord bots in TypeScript quickly using [CamilleAbella/bot.ts](https://github.com/CamilleAbella/bot.ts) template.

```
Commands:
  make bot [name] [path]  // create typescript bot
  make command [name]     // create bot command
  make listener [event]   // create bot listener

Options:
  --version  // Show version number
  --help     // Show help
```

## make bot \[name] \[path]

create typescript bot and generate config files

```
Positionals:
  name  // bot name
  path  // bot path

Options:
      --help     // Show help
  -p, --prefix   // bot prefix
  -t, --token    // bot token (recommended)
  -u, --owner    // your Discord id
```

## recommendation for best project bootstrapping

```
$ npm i -g make-bot.ts@latest
$ make bot NAME --token TOKEN
```
