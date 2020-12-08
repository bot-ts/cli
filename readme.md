# make-bot.ts CLI

CLI for make Discord bots in TypeScript quickly using [CamilleAbella/bot.ts](https://github.com/CamilleAbella/bot.ts) template.

## Getting started

```shell
# install globally
npm i -g make-bot.ts@latest

# bootstrap correctly your bot
make bot "NAME" --token "TOKEN"

# move to your bot directory
cd "NAME"


npm i

```

## Documentation

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
  -o, --owner    // your Discord id
```
