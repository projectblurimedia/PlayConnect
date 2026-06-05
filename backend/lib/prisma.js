import "dotenv/config" 
import { PrismaClient } from '../generated/prisma/client.ts'
import { PrismaPg } from '@prisma/adapter-pg' 

const connectionString = (process.env.DATABASE_URL || '').replace(
  /sslmode=(prefer|require|verify-ca)/g,
  'sslmode=verify-full'
)
const adapter = new PrismaPg({ connectionString })
const prisma = new PrismaClient({ adapter })

export default prisma
