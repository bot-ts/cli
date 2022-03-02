import { ORM } from "@ghom/orm"
import path from "path"
import fs from "fs"

const dataDirectory = path.join(process.cwd(), "data")

if (!fs.existsSync(dataDirectory)) fs.mkdirSync(dataDirectory)

/**
 * Welcome to the database file!
 * You can get the docs of **knex** [here](http://knexjs.org/)
 */

export const orm = new ORM(
  { tablePath: path.join(process.cwd(), "dist", "tables"), verbose: true },
  {
    client: "sqlite3",
    useNullAsDefault: true,
    connection: {
      filename: path.join(dataDirectory, "sqlite3.db"),
    },
  }
)
