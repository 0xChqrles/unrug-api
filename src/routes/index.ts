import type { FastifyInstance } from 'fastify'

import { getLockedLiquidityRoute } from './getLockedLiquidity'
import { ProviderInterface, RpcProvider } from 'starknet'

export function declareRoutes(
  fastify: FastifyInstance,
  provider: RpcProvider
) {
  getStatusRoute(fastify, provider)
  getLockedLiquidityRoute(fastify, provider)
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
