const express = require('express')
const router = express.Router()
const imgur = require('imgur')
const bodyParser = require('body-parser')
const genCard = require('../util/card.js')
const entryOps = require('../util/entryOps.js')
const discordInfo = require('../util/userInfo.js')
const jsonParser = bodyParser.json({limit: '5mb'})

function shuffle(array) {
  if (array.length === 1) return array
  var currentIndex = array.length, temporaryValue, randomIndex;

  while (0 !== currentIndex) {
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex -= 1;
    temporaryValue = array[currentIndex];
    array[currentIndex] = array[randomIndex];
    array[randomIndex] = temporaryValue;
  }

  return array;
}

router.get('/test', function(req, res) {
  res.send('hello world')
})

router.post('/discord', function(req, res) {
  const discord = req.session.discord
  if (!discord) return res.json(null)
  const client = res.app.get('client')
  const details = discordInfo(client, discord.id)
  discord.avatarURL = `https://cdn.discordapp.com/avatars/${discord.id}/${discord.avatar}.jpg`
  discord.clan = details.clan
  discord.councillor = details.councillor
  req.session.discord = Object.assign(req.session.discord, details)
  res.json(req.session.discord)
})

router.post('/test', function(req, res) {
  res.json(null)
})

router.post('/newentry', jsonParser, function(req, res) {
  if (!req.session.discord) return res.json(null)
  const info = req.body
  imgur.uploadBase64(info.base64)
  .then(function(json) {
    info.link = json.data.link
    info.discord = req.session.discord

    entryOps.add(info, function(err, entryID) {
      const client = res.app.get('client')
      const member = client.guilds.get('224586661562941440').members.get(info.discord.id)
      const recentHTML = `
        <div class="event">
          <div class="content">
            <div class="summary">
               <a onclick="showModal(${entryID}').modal('show')">${info.title.trim() ? info.title.trim() : `A new submission`}</a> was added by ${!member ? 'a guest' : member.nickname ? member.nickname : member.user.username}
            </div>
          </div>
        </div>
      `
      const newEntry = {
        id: entryID,
        date: new Date(),
        title: info.title.trim(),
        link: info.link,
        ign: info.ign.trim(),
        discord_id: info.discord.id,
        discord_name: !member ? 'a guest' : member.nickname ? member.nickname : member.user.username,
        status: 'pending',
        upvotes: 0
      }
      res.json({card: genCard(newEntry, req.session.discord), recent: recentHTML, entry: newEntry})
    })
  })
  .catch(function(err) {
    console.log(err)
    res.json(err.message.startsWith('Invalid URL') ? {err: 'invalid'} : {err: 'internal'})
  })
})

router.post('/removeentry', jsonParser, function(req, res) {
  const sessionData = req.session.discord
  entryOps.remove({councillor: sessionData.councillor, userID: sessionData.id, entryID: req.body.id}, function(err) {
    if (!err) return res.json({})
    console.log(err)
    return res.json(null)
  })
})

router.post('/getentries', function(req, res) {
  const id = req.session.discord ? req.session.discord.id : undefined
  entryOps.get(id, function(err, results) {

    if (!err) {
      const acquiredUsernames = {}
      const entries = shuffle(results.entries)
      const recents = results.recents
      let html = ''
      let recentHTML = ''
      let upvoteCount = 0
      let entryCount = 0
      let topEntry = {upvotes: 0}
      const client = res.app.get('client')
      for (var x in entries) {
        const entry = entries[x]
        const member = client.guilds.get('224586661562941440').members.get(entry.discord_id)
        if (member) {
          acquiredUsernames[entry.discord_id] = member.nickname ? member.nickname : member.user.username
          entry.discord_name = acquiredUsernames[entry.discord_id]
        }
        html += genCard(entry, req.session.discord)
        if (entry.upvotes >= topEntry.upvotes && entry.status === 'approved') topEntry = entry
        upvoteCount += entry.upvotes
        ++entryCount
      }
      for (var y = recents.length - 1; y >= 0; --y) {
        const recent = recents[y]
        let member = acquiredUsernames[recent.discord_id] ? { user: { username: acquiredUsernames[recent.discord_id] } } : client.guilds.get('224586661562941440').members.get(recent.discord_id)
        const name = !member ? 'a guest' : member.nickname ? member.nickname : member.user.username
        recentHTML += `
          <div class="event">
            <div class="content">
              <div class="summary">
                 <a onclick="showModal(${recent.entryid})">${recent.title ? recent.title : `A new submission`}</a> was added by ${name}
              </div>
            </div>
          </div>
        `
      }
      return res.json({html: html, recentHTML: recentHTML, upvoteCount: upvoteCount, entryCount: entryCount, topEntry: topEntry, entries: entries, loggedIn: id ? true : false})
    }
    throw err
    res.json(null)
  })
})

router.post('/approveentry', jsonParser, function(req, res) {
  if (!req.session.discord.councillor) {
    console.log(`Cannot approve an entry due to non-councillor`, req.session.discord)
    return res.json(null)
  }
  entryOps.changeStatus('approved', req.body.id, function(err) {
    if (!err) return res.json({})
    console.log(err)
    return res.json(null)
  })
})

router.post('/denyentry', jsonParser, function(req, res) {
  if (!req.session.discord.councillor) {
    console.log(`Cannot unapprove an entry due to non-councillor`, req.session.discord)
    return res.json(null)
  }
  entryOps.changeStatus('denied', req.body.id, function(err) {
    if (!err) return res.json({})
    console.log(err)
    return res.json(null)
  })
})

router.post('/pendingentry', jsonParser, function(req, res) {
  if (!req.session.discord.councillor) {
    console.log(`Cannot pending an entry due to non-councillor`, req.session.discord)
    return res.json(null)
  }
  entryOps.changeStatus('pending', req.body.id, function(err) {
    if (!err) return res.json({})
    console.log(err)
    return res.json(null)
  })
})

router.post('/upvote', jsonParser, function(req, res) {
  if (!req.session.discord) return res.json(null)
  entryOps.upvote({entryID: req.body.id, userID: req.session.discord.id}, function(err) {
    if (!err) return res.json({})
    console.log(err)
    return res.json(null)
  })
})

router.post('/downvote', jsonParser, function(req, res) {
  if (!req.session.discord) return res.json(null)
  entryOps.downvote({entryID: req.body.id, userID: req.session.discord.id}, function(err) {
    if (!err) return res.json({})
    console.log(err)
    return res.json(null)
  })
})

module.exports = router
