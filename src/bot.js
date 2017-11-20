const builder = require('botbuilder')
const Promise = require('bluebird')
const cognitiveServices = require('botbuilder-cognitiveservices')
const request = require('request-promise').defaults({
  encoding: null
})

const connector = new builder.ChatConnector({
  appId: process.env.MICROSOFT_APP_ID,
  appPassword: process.env.MICROSOFT_APP_PASSWORD
})

const bot = new builder.UniversalBot(connector)

const recogniser = new cognitiveServices.QnAMakerRecognizer({
  knowledgeBaseId: process.env.KNOWLEDGE_BASE_ID,
  subscriptionKey: process.env.SUBSCRIPTION_KEY
})

const dialog = new cognitiveServices.QnAMakerDialog({
  recognizers: [recogniser],
  defaultMessage: 'Default message'
})

const luisEndpoint =
  'https://westus.api.cognitive.microsoft.com/luis/v2.0/apps/35aa771f-ce0f-47b4-aa6f-dab385a8e620?subscription-key=7079e6989b494df4988560a8470cc3a9&spellCheck=true&verbose=true&timezoneOffset=0'
const luisRecognizer = new builder.LuisRecognizer(luisEndpoint)
bot.recognizer(luisRecognizer)

//
// DIALOGS DECLARATION
//

bot.dialog('/', dialog)
bot
  .dialog('HomePilot', [
    (session, args, next) => {
      const intent = args.intent

      const DEFAULT_OBJECT = {
        entity: 'Not found',
        score: 0
      }

      const device = builder.EntityRecognizer.findEntity(intent.entities, 'HomeAutomation.Device') || DEFAULT_OBJECT
      const operation = builder.EntityRecognizer.findEntity(intent.entities, 'HomeAutomation.Operation') || DEFAULT_OBJECT
      const room = builder.EntityRecognizer.findEntity(intent.entities, 'HomeAutomation.Room') || DEFAULT_OBJECT

      const data = `
        Main intent : ${intent.intent} \n
        Device : ${device.entity} ${device.score}
        Operation : ${operation.entity} ${operation.score}
        Room : ${room.entity} ${room.score}`

      session.endDialog(data)
    }
  ])
  .triggerAction({
    matches: 'HomeAutomation.TurnOn'
  })

//
// EXPORTS
//

module.exports = {
  connector,
  bot
}
