// Entry point for AUMS AI Services
import express from 'express';
import { llmConfig } from './src/config/llm.config.js';
import aiRoutes from './src/routes/ai.routes.js';
import { errorMiddleware } from './src/middlewares/error.middleware.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json({ limit: '15mb' }));

app.use('/api/v1/ai', aiRoutes);
app.use(errorMiddleware);

app.listen(PORT, () => {
  console.log(`[AUMS AI Services] Microservice running on port ${PORT}`);
});
