const builder = require('botbuilder')
const Promise = require('bluebird')
const request = require('request-promise').defaults({
  encoding: null
})

const baseUrl = ''

const connector = new builder.ChatConnector({
  appId: process.env.MICROSOFT_APP_ID,
  appPassword: process.env.MICROSOFT_APP_PASSWORD
})

const bot = new builder.UniversalBot(connector)

bot.endConversationAction('goodbyeAction', 'goodbyeAction', {
  matches: /^goodbye|quit|bye/i
})

bot.dialog('/', [
  session => {
    if (session.userData.lang) {
      session.beginDialog('/menu')
    } else {
     session.beginDialog('/menu')
    }
  }
])

bot
  .dialog('/menu', [
    session => {
      session.send('Working')
      
    }
  ])
  .reloadAction('/menu', null, {
    matches: /^menu|show menu|reload|list|start|restart/i
  })

module.exports = {
  connector,
  bot
}
