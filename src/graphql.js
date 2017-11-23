const { createApolloFetch } = require('apollo-fetch')

const uri = 'https://api.github.com/graphql'

const query = `
  query {
    organization(login: "nasa") {
      name
      url
    }
  }
`
const apolloFetch = createApolloFetch({ uri })

const defaultQuery = () => {
  return new Promise((resolve, reject) => {
    apolloFetch({ query })
      .then(resolve)
      .catch(reject)
  })
}

module.exports = {
  defaultQuery
}
