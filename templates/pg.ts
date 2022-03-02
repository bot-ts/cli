import { ORM } from "@ghom/orm"
import path from "path"

/**
 * Welcome to the database file!
 * You can get the docs of **knex** [here](http://knexjs.org/)
 */

export const orm = new ORM(
  {
    tablePath: path.join(process.cwd(), "dist", "tables"),
    verbose: true,
  },
  {
    client: "pg",
    useNullAsDefault: true,
    connection: {
      port: +(process.env.DB_PORT ?? 5432),
      host: process.env.DB_HOST ?? "localhost",
      user: process.env.DB_USER ?? "postgres",
      password: process.env.DB_PASSWORD,
      database: process.env.DB_DATABASE ?? "postgres",
    },
  }
)
