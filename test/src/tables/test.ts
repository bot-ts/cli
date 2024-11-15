import { Table } from "@ghom/orm"

export interface Test {
  remote_id: number
}

/**
 * See the {@link https://ghom.gitbook.io/bot.ts/usage/use-database database guide} for more information.
 */
export default new Table<Test>({
  name: "test",
  description: "test",
  setup: (table) => {
    // setup table columns => https://knexjs.org/guide/schema-builder.html
    table
      .integer("remote_id")
      .references("id")
      .inTable("remote")
      .onDelete("cascade")
      .notNullable()
  },
})
