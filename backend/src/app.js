// Express application skeleton
import express from 'express';

const app = express();

app.use(express.json());

// Routes mounting skeleton
// app.use('/api/v1/auth', authRoutes);
// app.use('/api/v1/maps', mapsRoutes);
// app.use('/api/v1/reports', reportRoutes);

export default app;
