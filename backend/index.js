// Entry point for AUMS Backend
import app from './src/app.js';
import { envConfig } from './src/config/env.config.js';

const PORT = envConfig.PORT || 5000;

app.listen(PORT, () => {
  console.log(`[AUMS Backend] Server running on port ${PORT}`);
});
