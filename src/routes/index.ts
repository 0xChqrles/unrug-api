import type { FastifyInstance } from 'fastify'
import { getLockedLiquidityRoute } from './getLockedLiquidity'
import { RpcProvider } from 'starknet'
import { trending } from './trending'
import fastifyCors from '@fastify/cors'

export function declareRoutes(
  fastify: FastifyInstance,
  provider: RpcProvider
) {
  // Enable CORS
  fastify.register(fastifyCors, {
    origin: '*'
  })

  getStatusRoute(fastify, provider)
  getLockedLiquidityRoute(fastify, provider)
  trending(fastify)
}

//
// Health check
//

function getStatusRoute(fastify: FastifyInstance, provider: RpcProvider) {
  fastify.get('/status', async () => handleGetStatus(provider))
}

async function handleGetStatus(provider: RpcProvider) {
  // Check that starknet RPC works
  await provider.getBlockNumber()

  return { status: 'ok' }
}
