const builder = require('botbuilder')
const Promise = require('bluebird')
const cognitiveServices = require('botbuilder-cognitiveservices')
const uuid = require('uuid/v4')
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
  'https://westus.api.cognitive.microsoft.com/luis/v2.0/apps/419d8afc-3d48-4d4d-8bd7-1e3a336b24e0?subscription-key=8dd0e25c23e4489e96437cb340d378b8&verbose=true&timezoneOffset=0'
const luisRecognizer = new builder.LuisRecognizer(luisEndpoint)
bot.recognizer(luisRecognizer)

//
// PRIVATE
//

const DEFAULT_OBJECT = {
  entity: 'Not found',
  score: 0
}

//
// UTILITES FUNCTION
//

const getAllEntities = (objectEntities, arrayEntities) => {
  return arrayEntities.reduce((memo, entityName) => {
    // TODO: Need to modify to not take in account HomeAutomation
    const entity = builder.EntityRecognizer.findEntity(intent.entities, `HomeAutomation.${entityName}`) || DEFAULT_OBJECT
    memo[entityName] = entity
    return memo
  }, {})
}

const getAllMeals = () => {
  // TODO: Return a call to server with a mutation
  return []
}

const getMeal = mealName => {
  // TODO: Return a call to server with a mutation
  return {}
}

const addAnAddress = (session, data) => {
  if (typeof session.userData.address === 'undefined') {
    session.userData.address = []
  }
  session.userData.address.push(data.address)
  return session
}

const addToCart = (session, data) => {
  if (typeof session.privateConversationData.cart === 'undefined') {
    session.privateConversationData.cart = {}
  }
  const id = uuid()
  session.privateConversationData.cart[id] = Object.assign(data, { id })
  return session
}

const removeFromCart = session => (session, id) => {
  if (typeof session.privateConversationData.cart === 'undefined') {
    return session
  }
  delete session.privateConversationData.cart[id]
  return session
}

const getCart = session => session.privateConversationData.cart || {}

const setMethodOfPayment = session => session

//
// BOT FUNCTION
//

const entityList = [
  (session, args, next) => {
    const intent = args.intent

    const { Device, Operation, Room } = getAllEntities(intent.entities, ['Device', 'Operation', 'Room'])

    const data = ` 
        Main intent : ${intent.intent} \n 
        Device : ${Device.entity} ${Device.score} 
        Operation : ${Operation.entity} ${Operation.score} 
        Room : ${Room.entity} ${Room.score}`

    session.endDialog(data)
  }
]

const mealListDialog = []
const mealShowDialog = []
const addToCartDialog = []
const removeFromCartDialog = []
const cartShowDialog = []
const processCommandDialog = []

//
// DIALOGS DECLARATION
//

bot.dialog('/', dialog)

bot.dialog('/mealList', mealListDialog)
bot.dialog('/mealShow', mealShowDialog)

bot.dialog('/addToCart', addToCartDialog)
bot.dialog('/removeFromCart', removeFromCartDialog)
bot.dialog('/cartShow', cartShowDialog)

bot.dialog('/processCommand', processCommandDialog)
//
// EXPORTS
//

module.exports = {
  connector,
  bot
}
