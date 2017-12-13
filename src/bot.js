const uuid = require('uuid/v4')
const builder = require('botbuilder')
const cognitiveServices = require('botbuilder-cognitiveservices')

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
// EXPORTS
//

const { defaultQuery } = require('./graphql')

//
// PRIVATE
//

const DEFAULT_OBJECT = {
  entity: 'Not found',
  score: 0
}

const PRODUCTS = [
  {
    title: 'Rillettes de saumon',
    description: 'Des rillettes moitié saumon frais, moitié fumé, émiettées à la main et réveillées avec un jus de citron.',
    price: '4.50€',
    thumbnail:
      'https://static.frichti.co/frichti/image/fetch/w_636,h_420,c_fit/https://cdn.shopify.com/s/files/1/0832/9391/products/rillettes-de-thon.jpg?v=1484325255'
  },
  {
    title: 'Harengs fumés & pommes de terre',
    description: 'Filet de hareng fumé et patates fondantes, vinaigrette à la moutarde de Meaux.',
    price: '4.20€',
    thumbnail:
      'https://static.frichti.co/frichti/image/fetch/w_636,h_420,c_fit/https://cdn.shopify.com/s/files/1/0832/9391/products/salade-de-PdT-harengs-1-OK.jpg?v=1491803066'
  },
  {
    title: 'Potatoes aux épices cajun',
    description: "De grosses pommes de terre frottées aux épices à réchauffer au four et servies avec une mayonnaise à l'estragon maison.",
    price: '4.90€',
    thumbnail: 'https://static.frichti.co/frichti/image/fetch/w_1310,h_880,c_fit/https://cdn.shopify.com/s/files/1/0832/9391/products/patatoes.jpg?v=1484569119'
  },
  {
    title: 'Linguine alla puttanesca',
    description: "Des pâtes al dente dans une sauce tomate relevée avec de l'ail, des morceaux d'olives noires, des câpres, des anchois et du piment !",
    price: '7.90€',
    thumbnail:
      'https://static.frichti.co/frichti/image/fetch/w_636,h_420,c_fit/https://cdn.shopify.com/s/files/1/0832/9391/products/SAUMON-FUME-HIGHLANDS.jpg?v=1511172603'
  }
]

//
// BOT UTILITIES FUNCTION
//

// bot.recognizer(new builder.RegExpRecognizer('CancelIntent', { en_us: /^(cancel|nevermind|stop)/i }))

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

const addToCart = (session, data, number) => {
  if (typeof session.privateConversationData.cart === 'undefined') {
    session.privateConversationData.cart = {}
  }
  session.privateConversationData.cart[data.title] = Object.assign(data, { number })
  return session.privateConversationData.cart
}

const removeFromCart = session => (session, id) => {
  if (typeof session.privateConversationData.cart === 'undefined') {
    return session
  }
  delete session.privateConversationData.cart[id]
  return session
}

const getCart = session => session.privateConversationData.cart || false

const constructCart = (session, cart) => {
  return Object.values(cart).map(product => {
    return new builder.HeroCard(session)
      .title(product.title)
      .subtitle(`${product.description}`)
      .text(`Number: ${product.number}`)
      .images([
        builder.CardImage.create(
          session,
          product.thumbnail || 'http://fscluster.org/sites/default/files/styles/core-group-featured-image/public/default-image.png?itok=VQtWqtdp'
        )
      ])
      .buttons([builder.CardAction.imBack(session, 'Change number', 'changeNumber')])
  })
}

const setMethodOfPayment = session => session

//
// BOT FUNCTION
//

const entityList = [
  (session, args) => {
    try {
      // GraphQL test with Github API
      const data = defaultQuery().then(response => {
        session.endDialog(JSON.stringify(response))
      })
    } catch (e) {
      console.error(e)
    }
  }
]

const mealListDialog = [
  session => {
    const mappedProducts = PRODUCTS.map(product => product.title)
    // TODO: Add choice from category
    builder.Prompts.choice(session, 'Here a list of our products, API is in WIP.', mappedProducts, { listStyle: builder.ListStyle.button })
  },
  (session, results, next) => {
    const entity = PRODUCTS.filter(product => product.title === results.response.entity)
    if (entity) {
      session.send("You choosed '%s'", JSON.stringify(entity[0]))
      session.conversationData.currentProduct = entity[0]
      session.beginDialog('chooseAction')
    } else {
      session.send("We didn't understand")
      session.replaceDialog('/mealList', { reprompt: true })
    }

    // TODO: Add cart
  }
]

const chooseActionDialog = [
  session => {
    session.send('Current Product: "%s" ', JSON.stringify(session.conversationData.currentProduct))
    builder.Prompts.choice(session, 'What do you want to do with this product ?', ['Add it to cart', 'Show information about it'])
  },
  (session, results) => {
    session.send('results.response.entity: "%s" ', JSON.stringify(results.response.entity))
    console.log(results.response.index)
    switch (results.response.index) {
      case 0:
        session.beginDialog('addToCart')
        break
      case 1:
        session.beginDialog('mealShow')
        break
      default:
        session.replaceDialog('chooseAction', { reprompt: true })
        break
    }
  }
]

const mealShowDialog = [
  session => {
    session.endDialog('Here a list of One product, API is in WIP.')
  }
]

const addToCartDialog = [
  session => {
    builder.Prompts.number(session, 'How many do you want to order ?')
  },
  (session, results) => {
    if (session.conversationData.currentProduct) {
      const currentCart = addToCart(session, session.conversationData.currentProduct, results.response)
      session.endDialog(JSON.stringify(currentCart))
    } else {
      session.endDialog('No item')
    }
  }
]

const removeFromCartDialog = [
  session => {
    session.endDialog('Remove from cart, API is in WIP.')
  }
]

const cartShowDialog = [
  session => {
    const currentCart = getCart(session)
    if (currentCart) {
      const transformedCart = constructCart(session, currentCart)

      const carrousel = new builder.Message(session)
      carrousel.attachmentLayout(builder.AttachmentLayout.carousel)
      carrousel.attachments(transformedCart)
      session.send('Here is your current cart, API is in WIP.')
      session.send(carrousel)
    } else {
      session.send("You don't have a cart, do you want to add item to it ?.")
    }
  }
]

const processCommandDialog = [
  session => {
    session.endDialog('We will process your command, wait in there, API is in WIP.')
  }
]

//
// DIALOGS DECLARATION
//

// Debug methods
// bot.dialog('/', entityList)

// Intent Name	Utterances
// Address.add	4
// Address.remove	2

bot
  .dialog('/mealList', mealListDialog)
  .triggerAction({ matches: 'Meals.List' })
  .cancelAction('CancelIntent', 'Canceling action', { matches: /\bcancel\b/i })

bot.dialog('/mealShow', mealShowDialog).triggerAction({ matches: 'Meal.show' })

bot.dialog('/cartShow', cartShowDialog).triggerAction({ matches: 'Cart.list' })

bot.dialog('processCommand', processCommandDialog).triggerAction({ matches: 'Command.process' })
bot.dialog('chooseAction', chooseActionDialog)
bot.dialog('addToCart', addToCartDialog).triggerAction({ matches: 'Cart.add' })
bot.dialog('removeFromCart', removeFromCartDialog).triggerAction({ matches: 'Cart.remove' })
bot.dialog('mealShow', mealShowDialog).triggerAction({ matches: 'Meal.show' })

module.exports = {
  bot,
  dialog,
  connector
}
