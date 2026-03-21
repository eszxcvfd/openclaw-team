import cors from 'cors'
import dotenv from 'dotenv'
import express, { Request, Response, NextFunction } from 'express'
import helmet from 'helmet'

dotenv.config()

const app = express()

app.use(helmet())
app.use(cors())
app.use(express.json())

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    ok: true,
    service: 'openclaw-backend',
  })
})

app.use((req: Request, res: Response) => {
  res.status(404).json({
    ok: false,
    message: `Route ${req.method} ${req.originalUrl} was not found`,
  })
})

app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err)
  res.status(500).json({
    ok: false,
    message: 'Internal server error',
  })
})

export default app
