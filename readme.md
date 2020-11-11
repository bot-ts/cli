# make-bot.ts CLI

CLI for [bot.ts](https://github.com/CamilleAbella/bot.ts) projects.

```
Commands:
  make bot [name] [path]  create typescript bot
  make command [name]     create bot command
  make listener [event]   create bot listener

Options:
  --version  Show version number                                       [boolean]
  --help     Show help                                                 [boolean]
```

## make bot \[name] \[path]

create typescript bot and generate config files

```
Positionals:
  name  bot name                                             [default: "bot.ts"]
  path  bot path                                                  [default: "."]

Options:
      --version  Show version number                                   [boolean]
      --help     Show help                                             [boolean]
  -p, --prefix   bot prefix                                       [default: "."]
  -t, --token    bot token
  -u, --owner    your Discord id
```

## recommendation for best project bootstraping

```
$ npm i -g make-bot.ts@latest
$ make bot NAME --token TOKEN
```
