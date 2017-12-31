const express = require('express')
const bodyParser = require('body-parser')
const Discord = require("discord.js")
const needle = require('needle')
const path = require('path')
const Oauth2 = require('simple-oauth2')
const app = express()
const resources = require('./routes/resources.js')
const session = require('express-session')
const MySQLStore = require('express-mysql-session')(session)
const initialize = require('./util/initialize.js')
const fs = require('fs')
const mysqlConfig = JSON.parse(fs.readFileSync('./mysqlCred.json'))
const client = new Discord.Client({ fetchAllMembers: true })
const discordInfo = require('./util/userInfo.js')
const config = JSON.parse(fs.readFileSync('./config.json'))
const host = config.host.endsWith('/') ? config.host : config.host + '/'

initialize(function(err) {
  if (err) return console.log(err)

  client.on('ready', function() {
    console.log(`Logged in as ${client.user.tag}`)
  })

  client.login('MjU5MTEwNjQ3OTUyODM0NTYy.DNSzUw.njQVuxihs37vg5fbwZWnCjwK4MY')

  const oauth2 = Oauth2.create({
    client: {
      id: '259110647952834562',
      secret: 'J0v_IQcSglKudtEBmhboBbU3GtCQF7XB',
    },
    auth: {
      tokenHost: 'https://discordapp.com',
      tokenPath: '/api/oauth2/token',
      authorizePath: '/api/oauth2/authorize',
    },
  })

  const authorizationUri = oauth2.authorizationCode.authorizeURL({
    redirect_uri: `${host}authorize`,
    scope: 'identify'
  })

  const sessionStore = new MySQLStore(mysqlConfig)

  app.use(session({
    cookieName: 'session',
    secret: '435345#WRFT34tgvewdsgvw873qfa!@dsfg',
    duration: 30 * 60 * 1000,
    activeDuration: 5 * 60 * 1000,
    saveUninitialized: false,
    resave: false,
    store: sessionStore
  }))

  app.set('client', client)
  app.use('/resources', resources)
  app.use(express.static(path.join(__dirname, 'public/css')));
  app.use(express.static(path.join(__dirname, 'public/js')));
  app.use(express.static(path.join(__dirname, 'public/imgs')));

  function getUser(req, res, token) {
    const options = {headers: {Authorization: `Bearer ${token}`}}
    needle.get(`https://discordapp.com/api/users/@me`, options, function (err, resp) {
      if (err) {
        res.send('Error with getting user details')
        return console.log(err)
      }
      req.session.discord = resp.body
      discordInfo(client, resp.body.id)
      res.redirect('/')
    })
  }

  app.get('/', function(req, res) {
    res.sendFile(path.join(__dirname, 'public/index.html'))
  })

  app.get('/login', function(req, res) {
    res.redirect(authorizationUri)
  })

  app.get('/logout', function(req, res) {
    req.session.destroy(function(err) {
      if (err) console.log(`Could not destroy session: `, err)
      res.json(null)
    })
  })

  app.get('/authorize', function(req, res) {
    if (req.session.discord) return res.redirect('/')
    const code = req.query.code;
    const options = {
      code: code,
      redirect_uri: `${host}authorize`
    };

    oauth2.authorizationCode.getToken(options, (error, result) => {
      if (error) {
        console.error('Access Token Error', error.message);
        return res.json('Authentication failed');
      }

      let token = oauth2.accessToken.create(result);

      if (token.expired()) {
        token.refresh(function(tokErr, tokResult) {
          token = tokResult;
          getUser(req, res, token.token.access_token);
        })
      } else getUser(req, res, token.token.access_token);

    });
  })

  app.listen(3000, function () {
    console.log('Example app listening on port 3000!')
  })
})
