const dotenv = require('dotenv');
const http = require('http');
const app = require('../../app.js');
const connectToDb = require('./database.js');

dotenv.config();

const PORT = process.env.PORT || 5000;
let server;



const startServer = async () => {
  try {
    
    await connectToDb();
    
    
    console.log('📦 Connected to Database');
    server = http.createServer(app);
    return new Promise((resolve, reject) => {
      server
        .listen(PORT)
        .on('error', reject)
        .on('listening', () => {
          const addr = server.address();
          const bind = typeof addr === 'string' ? `pipe ${addr}` : `port ${addr?.port}`;
          console.log(`🚀 Server running on ${bind}`);
          resolve();
        });
    });
    
  } catch (err) {
    console.error('Startup error:', err);
    process.exit(1);
  }
};

const handleError = (error) => {
  if (error.syscall !== 'listen') throw error;
  
  const bind = `Port ${PORT}`;
  
  switch (error.code) {
    case 'EACCES':
      console.error(`${bind} requires elevated privileges`);
      process.exit(1);
    case 'EADDRINUSE':
      console.error(`${bind} is already in use`);
      process.exit(1);
    default:
      throw error;
  }
};

const shutdown = async (signal) => {
  console.log(`\n${signal} received. Starting graceful shutdown...`);
  
  const shutdownPromises = [];
  
  if (server) {
    shutdownPromises.push(
      new Promise((resolve) => {
        server.close(() => {
          console.log('Server closed');
          resolve();
        });
      })
    );
  }
  
  
  
  
  try {
    await Promise.race([
      Promise.all(shutdownPromises),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Shutdown timed out')), 5000)
      )
    ]);
    console.log('Graceful shutdown completed');
    process.exit(0);
  } catch (err) {
    console.error('Error during shutdown:', err);
    process.exit(1);
  }
};

// Error handling
process.on('uncaughtException', err => {
  console.error('Uncaught Exception:', err);
  shutdown('UNCAUGHT_EXCEPTION').catch(() => process.exit(1));
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
  shutdown('UNHANDLED_REJECTION').catch(() => process.exit(1));
});

// Handle shutdown signals
['SIGTERM', 'SIGINT'].forEach(signal => {
  process.on(signal, () => shutdown(signal));
});

// Start the server
startServer();
