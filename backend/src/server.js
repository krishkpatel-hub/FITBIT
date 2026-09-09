import 'dotenv/config';
import http from 'http';
import app from './app.js';
import connectDB from './config/db.js';
import { attachRealtimeServer, closeRealtimeServer } from './realtime/realtimeServer.js';

const PORT = process.env.PORT || 3000;

connectDB();

const server = http.createServer(app);
attachRealtimeServer(server);

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

const shutdown = async () => {
  await closeRealtimeServer();
  server.close(() => {
    process.exit(0);
  });
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
