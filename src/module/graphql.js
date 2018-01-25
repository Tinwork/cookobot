const { createApolloFetch } = require('apollo-fetch')

const uri = 'https://devel.admin.slabprea.com/graphql'

const mealList = `
  query SlabQueries {
    category {
      description {
        locale
        value
      }
      code
      thumbnail
      label {
        locale
        value
      }
      products {
        label {
          locale
          value
        }
        tags {
          label {
            locale
            value
          }
        }
        thumbnail
        code
      }
    }
  }
`

const operationName = 'SlabQueries'

const apolloFetch = createApolloFetch({ uri })


const categoryListQuery = () => {
  return new Promise((resolve, reject) => {
    apolloFetch({ query: mealList, operationName })
      .then(resolve)
      .catch(reject)
  })
}

module.exports = {
  categoryListQuery
}
