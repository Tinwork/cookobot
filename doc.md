# Cookobot

## Build

```
npm install

// Add a .env based on .env.example

npm run dev // For debugging purprose
npm run start // Production purpose
```

## Description

Cookobot is a Chatbot that will use an API to list dishes that a User will be able to order to a place of his choice.

### Intents 
- List all products
- See details for a given product
- Add a product of his carts
- Remove a product of his carts
- Order with a cart
- Add an address
- Set a methods of payments

#### Payments 
- Par default à la livraison
- Sinon, envoie sur le site avec une URL

#### Address
- If no address, ask to create one
- If already an address, ask if he want an another

### Entities
- Meals
- Payments
- Cart
- Address

### Technology
- GraphQL 
- Bot Framework

### Platform wanted
- Facebook 