import type { FastifyInstance } from 'fastify'

export function trending(fastify: FastifyInstance) {
  fastify.get(
    '/trending',
    async (_, reply) => {
      try {
        const response = await fetch('https://turbopump.fun/api/trending')
        const data = await response.json()

        return reply.status(response.status).send(data)
      } catch (error) {
        console.log(error)
        return reply.status(500).send({ message: 'Internal server error' })
      }
    }
  )
}
