const fs = require("fs")
const packageJSON = require("./package.json")

fetch("https://raw.githubusercontent.com/bot-ts/.github/main/profile/readme.md")
  .then((response) => response.text())
  .then((response) => {
    fs.writeFile(
      "readme.md",
      response
        .replace(
          /<div class="title"><\/div>/,
          `<h1> ${packageJSON.name} </h1><p> ${packageJSON.description} </p>`
        )
        .replace(/\[(.+?)]\((.+?)\)/, "<a href='$2'>$1</a>"),
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
