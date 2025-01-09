import { EKUBO_POSITIONS, Entrypoint, UNRUG_FACTORY_ADDRESS } from '@/constants/contracts'
import { addressRegex } from '@/utils/address'
import { multiCallContract } from '@/utils/contract'
import type { FastifyInstance } from 'fastify'
import { CallData, getChecksumAddress, ProviderInterface, uint256 } from 'starknet'

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

        const [ekuboFees, totalSupply, token0Decimals, token1Decimals] = await multiCallContract(provider, [
          {
            contractAddress: EKUBO_POSITIONS,
            entrypoint: Entrypoint.GET_TOKEN_INFOS,
            calldata: CallData.compile([
              ekuboId,
              poolKey,
              bounds
            ]),
          },
          {
            contractAddress: poolKey.token0,
            entrypoint: Entrypoint.TOTAL_SUPPLY,
          },
          {
            contractAddress: poolKey.token0,
            entrypoint: Entrypoint.DECIMALS,
          },
          {
            contractAddress: poolKey.token1,
            entrypoint: Entrypoint.DECIMALS,
          }
        ])
        
        const totalSupplyBN = uint256.uint256ToBN({ low: totalSupply[0], high: totalSupply[1] })

        // wrap and send response
        reply.send({
          quoteTokenAddress: poolKey.token1,
          totalSupply: totalSupplyBN.toString(),
          liquidity: BigInt(ekuboFees[4]).toString(),
          lockedAmount: BigInt(ekuboFees[5]).toString(),
          lockedPercentage: (parseInt(ekuboFees[5], 16) / Number(totalSupplyBN)) * 100,
          lockedPair: [
            {
              amount: BigInt(ekuboFees[5]).toString(),
              decimals: Number(token0Decimals[0]),
              tokenAddress: poolKey.token0,
            },
            {
              amount: BigInt(ekuboFees[6]).toString(),
              decimals: Number(token1Decimals[0]),
              tokenAddress: poolKey.token1,
            },
          ],
        })
      } catch (error) {
        console.error(error)
        return reply.status(500).send({ message: 'Internal server error' })
      }
    },
  )
}
