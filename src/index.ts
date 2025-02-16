import dotenv from 'dotenv'

import { type AppConfiguration, buildAndStartApp } from '@/app'

dotenv.config()

const config: AppConfiguration = {
  app: {
    port: Number.parseInt(process.env.PORT || '8080'),
    host: process.env.HOST || '127.0.0.1',
  },
}

buildAndStartApp(config)
