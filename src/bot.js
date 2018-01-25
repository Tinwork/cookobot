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

const { categoryListQuery } = require('./module/graphql')
const { addToCart, getCart, resetCart, constructCart, getProductFromCart } = require('./module/cart')
const { addAnAddress, getAddresses } = require('./module/address')
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
    const entity = builder.EntityRecognizer.findEntity(intent.entities, entityName) || DEFAULT_OBJECT
    memo[entityName] = entity
    return memo
  }, {})
}

//
// BOT FUNCTION
//

const entityList = [
  (session, args) => {
    const message = new builder.Message(session)
	    .text("What can we do for you ?")
      .suggestedActions(
        builder.SuggestedActions.create(session, [
          builder.CardAction.imBack(session, 'I want to order', 'Order'),
          builder.CardAction.imBack(session, 'I want to see my cart', 'Show my cart')
        ])
      )
    session.send(message)
  }
]

function getDataFromLocale (data) {
  return data[0].value
}

function constructCategories (data) {
  return data.reduce((memo, category) =>{
    if (category.products.length > 0) {
      memo[getDataFromLocale(category.label)] = Object.assign({}, category, {
        description: getDataFromLocale(category.description),
        label: getDataFromLocale(category.label)
      })
    }
    return memo
  }, {}) 
}

function constructProduct (product) {
  return Object.assign({}, product, {
    value: getDataFromLocale(product.label)
  })
}

function constructProducts (products) {
  return products.reduce((memo, product) => {
    const p = constructProduct(product)
    if (p) {
      memo[p.value] = p
    }
    return memo
  }, {})
}

const mealListDialog = [
  session => {
    try {
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
    builder.Prompts.choice(session, 'What do you want to do with this product ?', ['Add it to cart'], { listStyle: builder.ListStyle.button })
  },
  (session, results) => {
    switch (results.response.index) {
      case 0:
        session.beginDialog('addToCart')
        break
      default:
        session.replaceDialog('chooseAction', { reprompt: true })
        break
    }
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
        session.beginDialog('addAnAnotherOne')
      } else {
        session.send('Please choose an number superior to 0')
        session.replaceDialog('addToCart', { reprompt: true })
      }
    } else {
      session.send('No item')
      session.replaceDialog('/mealList', { reprompt: true })
    }
  }
]

const addAnAnotherOneDialog = [
  session => {
    builder.Prompts.confirm(session, "Do you want to add an another item ?")
  },
  (session, results) => {
    if (results.response) {
      session.replaceDialog('/mealList', { reprompt: true })
    } else {
      session.send('Okay')
      session.replaceDialog('/cartShow')
    }
  }
]

const removeFromCartDialog = [
  session => {
    resetCart(session)
    session.endDialog('Cart is reset.')
  }
]

const cartShowDialog = [
  session => {
    const currentCart = getCart(session)
    if (currentCart && Object.keys(currentCart).length !== 0 && currentCart.constructor === Object) {
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
    session.send('We will process your command, wait in there.')
    session.beginDialog('getAddress')
  }
]

const getAddressDialog = [
  session => {
    const addresses = getAddresses(session)
    if (addresses[0] !== null && addresses[0] && addresses.length > 0) {
      const mappedAdresses = addresses.reduce((memo, address) => {
        memo.push(address)
        return memo
      }, ['Add an another address'])
      builder.Prompts.choice(session, 'Where do you want to be delivred', mappedAdresses, { listStyle: builder.ListStyle.button })
    } else {
      session.replaceDialog('addAddress')
    }
  },
  (session, results) => {
    if (results.response.entity === "Add an another address") {
      session.replaceDialog('addAddress')
    } else {
      const cart = getCart(session)
      const items = Object.entries(cart).reduce((memo, [code, item]) => {
        const data = builder.ReceiptItem.create(session, '', item.value)
          .quantity(item.number)
          .image(builder.CardImage.create(session, item.thumbnail))
        memo.push(data)
        return memo
      }, [])
      const card = new builder.ReceiptCard(session)
        .title('Receipt Card from command')
        .facts([
            builder.Fact.create(session, 'Address', results.response.entity)
        ])
        .items(items)
      const msg = new builder.Message(session).addAttachment(card);
      session.send(msg)
    }
  }
]

const addAddressDialog = [
  session => {
    session.dialogData.form = {}
    builder.Prompts.text(session, 'Please enter where you want to be delivred (Simplify for the demo)');
  },
  (session, results) => {
    session.endDialog(`Hello ${results.response}!`);
    addAnAddress(session, results.response)
    session.beginDialog('getAddress')
  }
]

const cartChangeNumberDialog = [
  (session, intent, next) => {
    const entity = session.message.text.match(/Change the number for (.+)/)
    const cart = getCart(session)
    const product = getProductFromCart(cart, 'value', entity[1])
    session.conversationData.currentCartProduct = product
    if (product) {
      builder.Prompts.number(session, 'How many do you want to order ?')
    } else {
      session.endDialog('You don\'t have this element in cart')
    }
  },
  (session, results) => {
    const cart = getCart(session)
    if ( session.conversationData.currentCartProduct && results.response > 0) {
      cart[session.conversationData.currentCartProduct.id].number = results.response
      session.beginDialog('/cartShow')
    } else if ( session.conversationData.currentCartProduct && results.response === 0) {
      delete cart[session.conversationData.currentCartProduct.id]
      session.beginDialog('/cartShow')
    } else {
      session.endDialog('Please retry')
    }
  }
]

const cartRemoveProductDialog = [
  (session, args, intent) => {
    const entity = session.message.text.match(/Delete product (.+) from the cart/)
    const cart = getCart(session)
    const product = getProductFromCart(cart, 'value', entity[1])
    delete cart[product.id]
    session.beginDialog('/cartShow')
  }
]

//
// DIALOGS DECLARATION
//

bot.dialog('firstRun', function (session) {    
  session.userData.firstRun = true;
  session.send("Hello")
  session.send("Welcome here, you can type `menu` for some idea where to start !")
}).triggerAction({
  onFindAction: (context, callback) => {
    if (!context.userData.firstRun) {
      callback(null, 1.1);
    } else {
      callback(null, 0.0);
    }
  }
});

// Debug methods
bot.dialog('/', entityList).triggerAction({ matches: /\bmenu\b/i })

// TODO: Break in category list
bot
  .dialog('/mealList', mealListDialog)
  .triggerAction({ matches: 'Meals.List' })
  .cancelAction('CancelIntent', 'Canceling action', { matches: /\bcancel|bye|dyop\b/i })

// Cart
bot.dialog('processCommand', processCommandDialog).triggerAction({ matches: 'Cart.process' }).cancelAction('CancelIntent', 'Canceling action', { matches: /\bcancel|bye|dyop\b/i })

bot.dialog('/cartShow', cartShowDialog).triggerAction({ matches: 'Cart.list' }).cancelAction('CancelIntent', 'Canceling action', { matches: /\bcancel|bye|dyop\b/i })
bot.dialog('addToCart', addToCartDialog).triggerAction({ matches: 'Cart.add' }).cancelAction('CancelIntent', 'Canceling action', { matches: /\bcancel|bye|dyop\b/i })
bot.dialog('removeFromCart', removeFromCartDialog).triggerAction({ matches: 'Cart.remove' }).cancelAction('CancelIntent', 'Canceling action', { matches: /\bcancel|bye|dyop\b/i })
bot.dialog('/cartChangeNumber', cartChangeNumberDialog).triggerAction({ matches: /Change the number for (.+)/ }).cancelAction('CancelIntent', 'Canceling action', { matches: /\bcancel|bye|dyop\b/i })
bot.dialog('/cartRemoveProduct', cartRemoveProductDialog).triggerAction({ matches: /Delete product (.+) from the cart/ }).cancelAction('CancelIntent', 'Canceling action', { matches: /\bcancel|bye|dyop\b/i })

// Address
bot.dialog('chooseAction', chooseActionDialog).cancelAction('CancelIntent', 'Canceling action', { matches: /\bcancel|bye|dyop\b/i })
bot.dialog('addAnAnotherOne', addAnAnotherOneDialog).cancelAction('CancelIntent', 'Canceling action', { matches: /\bcancel|bye|dyop\b/i })
bot.dialog('getAddress', getAddressDialog).cancelAction('CancelIntent', 'Canceling action', { matches: /\bcancel|bye|dyop\b/i })
bot.dialog('addAddress', addAddressDialog).cancelAction('CancelIntent', 'Canceling action', { matches: /\bcancel|bye|dyop\b/i })

module.exports = {
  bot,
  dialog,
  connector
}
