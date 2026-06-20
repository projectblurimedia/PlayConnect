import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { randomUUID } from 'crypto'

const s3 = new S3Client({
  region: process.env.AWS_REGION || 'ap-south-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
})

const BUCKET = process.env.AWS_S3_BUCKET
const REGION = process.env.AWS_REGION || 'ap-south-1'

export async function uploadToS3(base64, mimeType, folder = 'posts') {
  const ext = mimeType.split('/')[1]?.replace('jpeg', 'jpg') || 'jpg'
  const key = `${folder}/${randomUUID()}.${ext}`
  const buffer = Buffer.from(base64, 'base64')

  await s3.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: buffer,
    ContentType: mimeType,
  }))

  return `https://${BUCKET}.s3.${REGION}.amazonaws.com/${key}`
}
