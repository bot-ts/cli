# make-bot.ts CLI

CLI for make Discord bots in TypeScript quickly using [CamilleAbella/bot.ts](https://github.com/CamilleAbella/bot.ts) template.

## Getting started

```shell
# install globally
npm i -g make-bot.ts@latest

# bootstrap correctly your bot
make bot "NAME" --token "TOKEN" --locale "fr-FR"

# move to your bot directory
cd "NAME"

# replace remote
git remote remove origin
git remote add origin "YOUR REMOTE LINK"

# make your first command
make command "NAME"

# run your bot
npm run start
```

## Commands

```
make bot [name] [path]  // create typescript bot
make command [name]     // create bot command
make listener [event]   // create bot listener
make namespace [name]   // create bot namespace
make table [name]       // create database table
make database [type]    // change database type
```

## make bot \[name] \[path]

create typescript bot and generate config files

### options:

```
-p, --prefix   // bot prefix
-t, --token    // bot token (recommended)
-l, --locale   // targeted timezone
-o, --owner    // your Discord id
-d, --database // database to setup (default: sqlite3)
               // (possible values: mysql2, pg, sqlite3)
```
