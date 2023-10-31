const axios = require("axios")
const fs = require("fs")
const packageJSON = require("./package.json")

axios
  .get(
    "https://raw.githubusercontent.com/bot-ts/.github/main/profile/readme.md"
  )
  .then((response) => {
    fs.writeFile(
      "readme.md",
      response.data.replace(
        /<div class="title"><\/div>/,
        `<h1> ${packageJSON.name} </h1><p> ${packageJSON.description} </p>`
      ),
      (err) => {
        if (err) {
          console.error("Error writing readme.md:", err)
        } else {
          console.log("readme.md updated successfully.")
        }
      }
    )
  })
  .catch((error) => {
    console.error("Error downloading readme.md:", error)
  })
