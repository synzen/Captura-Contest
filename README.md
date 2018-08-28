# Captura Contest

A single-page application built with JQuery that allows users to upload images for it to be voted on by the public. User authentication is done via Discord OAuth 2, and submission moderation tools are controlled via server roles in a manually-specified Discord server.

Images are uploaded via Imgur, and linked to onsite. Webserver is created with Express.

Made specifically for a game community. To run this repo:

  * Install [Node](https://nodejs.org/en/)
  * Install [MySQL](https://www.mysql.com/products/community/)
  * Clone this repo
  * Put MySQL credentials in mysqlCred.json
  * Put a Discord Bot's client id, client secret, bot token and a discord server in config.json
  * Run `npm install` to install dependencies
  * Run `node server` in terminal/command prompt in the main directory
  * Enter localhost:3000 in any web browser
