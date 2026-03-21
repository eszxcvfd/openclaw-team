import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import helmet from 'helmet';
dotenv.config();
const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json());
app.get('/api/health', (_req, res) => {
    res.json({
        ok: true,
        service: 'openclaw-backend',
    });
});
app.use((req, res) => {
    res.status(404).json({
        ok: false,
        message: `Route ${req.method} ${req.originalUrl} was not found`,
    });
});
app.use((err, _req, res, _next) => {
    console.error(err);
    res.status(500).json({
        ok: false,
        message: 'Internal server error',
    });
});
export default app;
