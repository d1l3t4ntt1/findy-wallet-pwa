import typeDefs from './schema'

import { ApolloClient, InMemoryCache } from '@apollo/client'

export const cache = new InMemoryCache({
  typePolicies: {
    Pairwise: {
      fields: {
        events: {
          read() {
            return [];
          }
        } 
      },
    },
    Query: {
      fields: {
        user: {
          read() {
            return { name: 'Minnie Mouse' }
          },
        },  
      },
    },
  },
})

const client = new ApolloClient({
  cache,
  typeDefs,
})

export default client
