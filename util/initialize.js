const mysql = require('mysql')
const mysqlCred = JSON.parse(require('fs').readFileSync('./mysqlCred.json'))

module.exports = function(callback) {
  const db = mysqlCred.database
  const con = mysql.createConnection({
    host: mysqlCred.host,
    user: mysqlCred.user,
    password: mysqlCred.password
  })

  con.query(`CREATE DATABASE IF NOT EXISTS \`${db}\``, function (err) {
    if (err) return end(err)
    createEntries()
  })

  function createEntries() {
    con.query(`CREATE TABLE IF NOT EXISTS ${db}.entries (id INT NOT NULL PRIMARY KEY AUTO_INCREMENT, date DATETIME, title TEXT, link TEXT, ign TEXT, discord_name TEXT, discord_id TEXT, status TEXT, upvotes INT)`, function (err, res) {
      if (err) return end(err)
      createRecent()
    })
  }

  function createRecent() {
    con.query(`CREATE TABLE IF NOT EXISTS ${db}.recentlyadded (id INT NOT NULL PRIMARY KEY AUTO_INCREMENT, entryid INT, title TEXT, discord_id TEXT)`, function (err, res) {
      if (err) return end(err)
      createTracker()
    })
  }

  function createTracker() {
    con.query(`CREATE TABLE IF NOT EXISTS ${db}.upvotetracker (id VARCHAR(25) PRIMARY KEY NOT NULL, upvoted TEXT)`, function (err, res) {
      if (err) return end(err)
      end()
    })
  }

  function end(err) {
    con.end(function(endErr) {
      if (err) return callback(err)
      else if (endErr) return callback(err)
      callback()
    })
  }
}
