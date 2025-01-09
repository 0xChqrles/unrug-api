import { Call, CallData, hash, ProviderInterface } from 'starknet'
import {  Entrypoint, MULTICALL_ADDRESS } from '@/constants/contracts'


export async function multiCallContract(
  provider: ProviderInterface,
  calls: Call[],
) {
  const calldata = calls.map((call) => {
    return CallData.compile({
      to: call.contractAddress,
      selector: hash.getSelector(call.entrypoint),
      calldata: call.calldata ?? [],
    })
  })

  const rawResult = await provider.callContract({
    contractAddress: MULTICALL_ADDRESS,
    entrypoint: Entrypoint.AGGREGATE,
    calldata: [calldata.length, ...calldata.flat()],
  })
  const raw = rawResult.slice(2)

  const result: string[][] = []
  let idx = 0

  for (let i = 0; i < raw.length; i += idx + 1) {
    idx = parseInt(raw[i], 16)

    result.push(raw.slice(i + 1, i + 1 + idx))
  }

  return result
}
