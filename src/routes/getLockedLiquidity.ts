import { EKUBO_POSITIONS, Entrypoint, UNRUG_FACTORY_ADDRESS } from '@/constants/contracts'
import { addressRegex } from '@/utils/address'
import type { FastifyInstance } from 'fastify'
import { CallData, getChecksumAddress, num, ProviderInterface } from 'starknet'

interface PoolKey {
  token0: string
  token1: string
  fee: string
  tickSpacing: string
  extension: string
}

function hexToDecimal(hex: string): string {
  return num.toBigInt(hex).toString()
}

function getPair(poolKey: PoolKey): string {
  return `${poolKey.token0}-${poolKey.token1}-${hexToDecimal(poolKey.fee)}-${hexToDecimal(poolKey.tickSpacing)}-${poolKey.extension}`
}

export function getLockedLiquidityRoute(fastify: FastifyInstance, provider: ProviderInterface) {
  fastify.get(
    '/get_locked_liquidity',

    async (request, reply) => {
      const { address } = request.query as { address?: string }

      if (!address) {
        return reply.status(400).send({ message: 'Address is required' })
      }

      // Validate address format
      if (!addressRegex.test(address)) {
        return reply.status(400).send({ message: 'Invalid address format' })
      }

      try {
        const lockedLiquidity = await provider.callContract({
          contractAddress: UNRUG_FACTORY_ADDRESS,
          entrypoint: Entrypoint.LOCKED_LIQUIDITY,
          calldata: [address],
        })

        // NOT EKUBO LIQ
        if (lockedLiquidity[2] !== '0x2') {
          console.log('No locked liquidity')
          return 0
        }

        const ekuboId = lockedLiquidity[3]

        const liquidityPositionDetails = await provider.callContract({
          contractAddress: lockedLiquidity[1],
          entrypoint: Entrypoint.LIQUIDITY_POSITION_DETAILS,
          calldata: [ekuboId],
        })

        // get Ekubo fees details
        const poolKey = {
          token0: getChecksumAddress(liquidityPositionDetails[2]),
          token1: getChecksumAddress(liquidityPositionDetails[3]),
          fee: liquidityPositionDetails[4],
          tickSpacing: liquidityPositionDetails[5],
          extension: liquidityPositionDetails[6],
        }
        const bounds = {
          lower: {
            mag: liquidityPositionDetails[7],
            sign: liquidityPositionDetails[8],
          },
          upper: {
            mag: liquidityPositionDetails[9],
            sign: liquidityPositionDetails[10],
          },
        }

        const ekuboFees = await provider.callContract({
          contractAddress: EKUBO_POSITIONS,
          entrypoint: Entrypoint.GET_TOKEN_INFOS,
          calldata: CallData.compile([
            ekuboId,
            poolKey,
            bounds
          ]),
        })

        console.log(ekuboFees, lockedLiquidity, liquidityPositionDetails)

        // wrap and send response
        reply.send([
          {
            pair: getPair(poolKey),
            lockedPercentage: 100,
            burnedPercentage: 100,
            lockedAmount0: hexToDecimal(ekuboFees[5]),
            burnedAmount0: hexToDecimal(ekuboFees[5]),
            pooledAmount0: hexToDecimal(ekuboFees[5]),
            lockedAmount1: hexToDecimal(ekuboFees[6]),
            burnedAmount1: hexToDecimal(ekuboFees[6]),
            pooledAmount1: hexToDecimal(ekuboFees[6]),
          },
        ])
      } catch (error) {
        console.error(error)
        return reply.status(500).send({ message: 'Internal server error' })
      }
    },
  )
}
