import { createServer } from 'http';
import app from './app';
import { env } from './config/env';
import { initMySQL } from './config/mysql';
import { verifyEmailConfig } from './utils/email.service';
import { initSocketIO } from './socket/socket.server';

const start = async () => {
  try {
    // Initialize MySQL connection
    await initMySQL();
    
    // Verify email configuration (warn if missing, but don't fail)
    const emailConfigured = verifyEmailConfig();
    if (!emailConfigured) {
      console.warn('');
      console.warn('⚠️  WARNING: SMTP email configuration is missing!');
      console.warn('OTP emails will NOT be sent. Please configure SMTP settings in .env file.');
      console.warn('See .env.example for configuration instructions.');
      console.warn('');
    } else {
      console.log('✅ Email service configured and ready');
    }
    
    // Create HTTP server
    const httpServer = createServer(app);
    
    // Initialize Socket.IO
    initSocketIO(httpServer);
    
    httpServer.listen(env.port, () => {
      console.log(`✓ MySQL connected successfully`);
      console.log(`Server running on port ${env.port}`);
      console.log(`API available at http://localhost:${env.port}/api`);
      console.log(`Socket.IO ready for real-time updates`);
    });
  } catch (error) {
    console.error('Failed to start server', error);
    process.exit(1);
  }
};

start();

