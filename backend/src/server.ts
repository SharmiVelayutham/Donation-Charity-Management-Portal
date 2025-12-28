import { createServer } from 'http';
import app from './app';
import { env } from './config/env';
import { initMySQL } from './config/mysql';
import { verifyEmailConfig } from './utils/email.service';
import { initSocketIO } from './socket/socket.server';

const start = async () => {
  try {
    await initMySQL();
    verifyEmailConfig();
    const httpServer = createServer(app);
    initSocketIO(httpServer);
    
    httpServer.listen(env.port, () => {
      console.log(`Server running on port ${env.port}`);
    });
  } catch (error) {
    console.error('Failed to start server', error);
    process.exit(1);
  }
};

start();

