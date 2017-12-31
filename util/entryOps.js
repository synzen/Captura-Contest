const mysql = require('mysql')

const mysqlConfig = JSON.parse(require('fs').readFileSync('./mysqlCred.json'))

function end(con, err, callback, res) {
  con.end(function(endErr) {
    if (err) return callback(err)
    else if (endErr) return callback(endErr)
    callback(null, res)
  })
}

exports.add = function(details, callback) {
  const con = mysql.createConnection(mysqlConfig)

  con.query('INSERT IGNORE INTO entries (title, date, link, ign, discord_name, discord_id, status, upvotes) VALUES (?, NOW(), ?, ?, ?, ?, ?, ?)', [details.title.trim(), details.link.trim(), details.ign.trim(), details.discord.username.trim(), details.discord.id.trim(), 'pending', 0], function(err, res) {
    if (err) return end(con, err, callback)
    insertRecent(res.insertId)
  })

  function insertRecent(insertID) {
    con.query('INSERT IGNORE INTO recentlyadded (entryid, title, discord_id) VALUES (?, ?, ?)', [insertID, details.title.trim(), details.discord.id.trim()], function(err, res) {
      if (!err) return cleanRecent(insertID)
      end(con, err, callback)
    })
  }

  function cleanRecent(insertID) {
    con.query(`DELETE FROM \`recentlyadded\`
      WHERE id NOT IN (
        SELECT id
        FROM (
          SELECT id
          FROM \`recentlyadded\`
          ORDER BY id DESC
          LIMIT 5
        ) foo
      );`
      , function(err, res) {
      if (!err) return end(con, null, callback, insertID)
      end(con, err, callback)
    })
  }
}

exports.remove = function(info, callback) {
  const con = mysql.createConnection(mysqlConfig)
  con.query(`DELETE FROM entries WHERE id=?${info.councillor ? '' : ' AND discord_id=?'}`, info.councillor ? [info.entryID] : [info.entryID, info.userID], function (err, res) {
    if (err) return end(con, err, callback)
    end(con, null, callback)
  })
}

exports.get = function(discordID, callback) {
  const con = mysql.createConnection(mysqlConfig)

  con.query('SELECT * FROM entries', function (err, res) {
    if (err) return end(con, err, callback)
    if (discordID) findUpvoted(res)
    else getRecent(res)
  })

  function findUpvoted(entries) {
    con.query('SELECT * FROM upvotetracker WHERE id=? LIMIT 1', [discordID], function (err, res) {
      if (err) return end(con, err, callback)
      if (res.length === 0) return getRecent(entries)
      const upvoted = res[0].upvoted.split(',')
      for (var x in entries) {
        if (upvoted.includes(entries[x].id.toString())) entries[x].upvoted = true
      }
      getRecent(entries)
    })
  }

  function getRecent(entries) {
    con.query('SELECT * FROM recentlyadded', function(err, res) {
      if (err) console.log(err)
      end(con, null, callback, {entries: entries, recents: res})

    })
  }
}


exports.changeStatus = function(status, id, callback) {
  const con = mysql.createConnection(mysqlConfig)
  con.query(`UPDATE entries SET status="${status}" WHERE id=?`, [id], function (err, res) {
    if (err) return end(con, err, callback)
    end(con, null, callback)
  })
}

exports.upvote = function(info, callback) {
  const entryID = info.entryID.toString()
  const userID = info.userID.trim()
  const con = mysql.createConnection(mysqlConfig)

  con.query('SELECT * FROM upvotetracker WHERE id=? LIMIT 1', [userID], function (err, res) {
    if (err) return end(con, err, callback)
    if (res.length === 0) return insert()
    const upvoted = res[0].upvoted.split(',')
    if (upvoted.includes(entryID)) end(con, null, callback)
    else update()
  })

  function insert() {
    con.query('INSERT INTO upvotetracker (id, upvoted) VALUES (?, ?)', [userID, entryID], function(err, res) {
      if (err) return end(con, err, callback)
      updateEntry()
    })
  }

  function update() {
    con.query('UPDATE upvotetracker SET upvoted=CONCAT(upvoted, ?) WHERE id=?', [',' + entryID, userID], function(err, res) {
      if (err) return end(con, err, callback)
      updateEntry()
    })
  }

  function updateEntry() {
    con.query('UPDATE entries SET upvotes=upvotes+1 WHERE id=?', [entryID], function(err, res) {
      if (err) return end(con, err, callback)
      end(con, null, callback)
    })
  }
}

exports.downvote = function(info, callback) {
  const entryID = info.entryID.toString()
  const userID = info.userID.trim()
  const con = mysql.createConnection(mysqlConfig)

  con.query('SELECT * FROM upvotetracker WHERE id=? LIMIT 1', [userID], function (err, res) {
    if (err) return end(con, err, callback)
    if (res.length === 0) return end(con, null, callback)
    const upvoted = res[0].upvoted.split(',')
    for (var x in upvoted) {
      if (upvoted[x] === entryID) upvoted.splice(x, 1)
    }
    update(upvoted.join(','))
  })

  function update(newUpvoted) {
    con.query('UPDATE upvotetracker SET upvoted=? WHERE id=?', [newUpvoted, userID], function(err, res) {
      if (err) return end(con, err, callback)
      updateEntry()
    })
  }

  function updateEntry() {
    con.query('UPDATE entries SET upvotes=upvotes-1 WHERE id=? AND upvotes>0', [entryID], function(err, res) {
      if (err) return end(con, err, callback)
      end(con, null, callback)
    })
  }
}
