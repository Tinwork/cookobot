const uuid = require('uuid/v4')
const builder = require('botbuilder')
const cognitiveServices = require('botbuilder-cognitiveservices')

const connector = new builder.ChatConnector({
  appId: process.env.MICROSOFT_APP_ID,
  appPassword: process.env.MICROSOFT_APP_PASSWORD
})

console.log('process.env.MICROSOFT_APP_ID', process.env.MICROSOFT_APP_ID)
console.log('process.env.MICROSOFT_APP_PASSWORD', process.env.MICROSOFT_APP_PASSWORD)
console.log('process.env.KNOWLEDGE_BASE_ID', process.env.KNOWLEDGE_BASE_ID)
console.log('process.env.SUBSCRIPTION_KEY', process.env.SUBSCRIPTION_KEY)

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

const { categoryListQuery } = require('./module/graphql')
const { 
  addToCart,
  getCart,
  resetCart,
  constructCart
} = require('./module/cart')
const { addAnAddress } = require('./module/address')
const { setMethodOfPayment } = require('./module/payment')

//
// PRIVATE
//

const DEFAULT_OBJECT = {
  entity: 'Not found',
  score: 0
}

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

//
// BOT FUNCTION
//

const entityList = [
  (session, args) => {
    try {
      const data = categoryListQuery().then(response => {
        session.endDialog(JSON.stringify(response))
      })
    } catch (e) {
      console.error(e)
    }
  }
]

function getDataFromLocale (data) {
  return data[0].value
}

function constructCategories (data) {
  return data.reduce((memo, category) =>{
    if (category.products.length > 0) {
      category.description = getDataFromLocale(category.description)

      memo[getDataFromLocale(category.label)] = {
        code: category.code,
        products: category.products,
        thumbnail: category.thumbnail,
        description: getDataFromLocale(category.description),
        label: getDataFromLocale(category.label)
      }
    }
    return memo
  }, {}) 
}

function constructProduct (product) {
  console.log(product)
  return Object.assign({}, product, {
    value: getDataFromLocale(product.label)
  })
}

function constructProducts (products) {
  return products.reduce((memo, product) => {
    const p = constructProduct (product)
    if (p) {
      memo[p.value] = p
    }
    return memo
  }, {})
}

const mealListDialog = [
  session => {
    try {
      // GraphQL test with Github API
      categoryListQuery().then(response => {
        const mappedCategories = constructCategories(response.data.category)

        session.conversationData.categories = response.data.category
        session.conversationData.mappedCategories = mappedCategories
        builder.Prompts.choice(session, 'Here a list of our categories', mappedCategories, { listStyle: builder.ListStyle.button })
      })
    } catch (e) {
      console.error(e)
      session.replaceDialog('/mealList', { reprompt: true })
    }
  },
  (session, results, next) => {
    const entity = session.conversationData.mappedCategories[results.response.entity]
    if (entity) {
      session.conversationData.currentCategory = entity
      const mappedProducts = constructProducts(entity.products)
      session.conversationData.mappedProducts = mappedProducts
      builder.Prompts.choice(session, 'Here a list of our products', mappedProducts, { listStyle: builder.ListStyle.button })
    } else {
      session.send("We didn't understand")
      session.replaceDialog('/mealList', { reprompt: true })
    }
  },
  (session, results, next) => {
    const entity = session.conversationData.mappedProducts[results.response.entity]
    if (entity) {
      console.log(entity)
      session.conversationData.currentProduct = entity
      session.beginDialog('chooseAction')
    } else {
      session.send("We didn't understand")
      session.replaceDialog('/mealList', { reprompt: true })
    }
  }
]

const chooseActionDialog = [
  session => {
    builder.Prompts.choice(session, 'What do you want to do with this product ?', ['Add it to cart', 'Show information about it'], { listStyle: builder.ListStyle.button })
  },
  (session, results) => {
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
      if (results.response && results.response > 0) {
        const currentCart = addToCart(session, session.conversationData.currentProduct, results.response)
      } else {
        session.send('Please choose an number superior to 0')
        session.replaceDialog('/addToCart', { reprompt: true })
      }
    } else {
      session.endDialog('No item')
      session.replaceDialog('/mealList', { reprompt: true })
    }
  }
]

const removeFromCartDialog = [
  session => {
    session.send('Remove from cart, API is in WIP.')
    resetCart(session)
    session.endDialog('Cart is reset.')
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
      carrousel.suggestedActions(
        builder.SuggestedActions.create(session, [
          builder.CardAction.imBack(session, 'I want to confirm my cart', 'Confirm cart'),
          builder.CardAction.imBack(session, 'I want to reset my cart', 'Reset cart')
        ])
      )
      session.send(carrousel)
    } else {
      builder.Prompts.confirm(session, "You don't have a cart, do you want to add item to it ?")
    }
  },
  (session, results) => {
    if (results.response) {
      session.replaceDialog('/mealList', { reprompt: true })
    } else {
      session.endDialog('Okay')
    }
  }
]

const processCommandDialog = [
  session => {
    // Add an address
    session.endDialog('We will process your command, wait in there.')
  }
]
const cartChangeNumberDialog = [
  (session, intent) => {
    const entity = builder.EntityRecognizer.findEntity(intent.entities, 'Meals')
    session.endDialog('Change number')
  }
]

const cartRemoveProductDialog = [
    (session, intent) => {
      const entity = builder.EntityRecognizer.findEntity(intent.entities, 'Meals')
    session.endDialog('Change number')
  }
]

//
// DIALOGS DECLARATION
//

// Debug methods
bot.dialog('/', entityList).triggerAction({ matches: /\bmenu\b/i })

bot
  .dialog('/mealList', mealListDialog)
  .triggerAction({ matches: 'Meals.List' })
  .cancelAction('CancelIntent', 'Canceling action', { matches: /\bcancel\b/i })

bot.dialog('/mealShow', mealShowDialog).triggerAction({ matches: 'Meal.show' })

bot.dialog('/cartShow', cartShowDialog).triggerAction({ matches: 'Cart.list' })

bot.dialog('processCommand', processCommandDialog).triggerAction({ matches: 'Command.process' })
bot.dialog('chooseAction', chooseActionDialog)

bot.dialog('/addToCart', addToCartDialog).triggerAction({ matches: 'Cart.add' })
bot.dialog('removeFromCart', removeFromCartDialog).triggerAction({ matches: 'Cart.remove' })
bot.dialog('mealShow', mealShowDialog).triggerAction({ matches: 'Meal.show' })
bot.dialog('/cartChangeNumber', cartChangeNumberDialog).triggerAction({ matches: 'Cart.changeNumber' })
bot.dialog('/cartRemoveProduct', cartRemoveProductDialog).triggerAction({ matches: 'Cart.removeProduct' })

module.exports = {
  bot,
  dialog,
  connector
}
