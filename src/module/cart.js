const builder = require('botbuilder')

const addToCart = (session, data, number) => {
  if (typeof session.privateConversationData.cart === 'undefined') {
    session.privateConversationData.cart = {}
  }
  session.privateConversationData.cart[data.code] = Object.assign(data, { number })
  return session.privateConversationData.cart
}

const removeFromCart = session => (session, id) => {
  if (typeof session.privateConversationData.cart === 'undefined') {
    return session
  }
  delete session.privateConversationData.cart[id]
  return session
}

const resetCart = session => (session.privateConversationData.cart = undefined)

const getCart = session => session.privateConversationData.cart || false

const constructCart = (session, cart) => {
  return Object.values(cart).map(product => {
    return new builder.HeroCard(session)
      .title(product.value)
      .text(`Number: ${product.number}`)
      .images([
        builder.CardImage.create(
          session,
          product.thumbnail || 'http://fscluster.org/sites/default/files/styles/core-group-featured-image/public/default-image.png?itok=VQtWqtdp'
        )
      ])
      .buttons([
        builder.CardAction.imBack(session, `Change the number for ${product.value}`, 'Change the number'),
        builder.CardAction.imBack(session, `Delete product ${product.value} from the cart`, 'Delete the product')
      ])
  })
}


module.exports = {
  addToCart,
  getCart,
  resetCart,
  constructCart
}