const { createApolloFetch } = require('apollo-fetch')

const uri = 'http://ec2-34-243-27-172.eu-west-1.compute.amazonaws.com/graphql '

const query = `
  query SlabQueries {
    product(id: 1) {
      entity_id
      code
      tags {
        label {
          locale
          value
        }
      }
      category {
        label {
          locale
          value
        }
      }
    }
  }
`
const operationName = 'SlabQueries'

const apolloFetch = createApolloFetch({ uri })

const defaultQuery = () => {
  return new Promise((resolve, reject) => {
    apolloFetch({ query, operationName })
      .then(resolve)
      .catch(reject)
  })
}

module.exports = {
  defaultQuery
}
