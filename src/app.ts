import dotenv from 'dotenv'
import Fastify from 'fastify'

import { declareRoutes } from './routes'
import { RpcProvider } from 'starknet'
import { getNodeURL } from './utils/provider'
import fastifyCors from '@fastify/cors'

export type AppConfiguration = {
  app: {
    port: number
    host?: string
  }
}

export async function buildApp() {
  const app = Fastify({ logger: true })

  dotenv.config()

  // verify env
  if (!process.env.JUNO_API_KEY) {
    throw new Error('JUNO RPC API key not set')
  }

  // create provider
  const provider = new RpcProvider({ nodeUrl: getNodeURL(process.env.JUNO_API_KEY) })

  // Enable CORS
  await app.register(fastifyCors, {
    origin: '*',
  })

  // Declare routes
  declareRoutes(app, provider)

  return app
}

export async function buildAndStartApp(config: AppConfiguration) {
  const app = await buildApp()

  try {
    await app.listen({ port: config.app.port, host: config.app.host })
    console.log(`Server listening on port ${config.app.port}`)
  } catch (err) {
    console.error(err)
    process.exit(1)
  }
}
