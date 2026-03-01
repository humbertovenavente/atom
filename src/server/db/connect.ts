import mongoose from 'mongoose';

declare global {
  // eslint-disable-next-line no-var
  var _mongooseConn: typeof mongoose | null;
}

export async function connectDB(): Promise<void> {
  if (global._mongooseConn && mongoose.connection.readyState === 1) {
    return;
  }

  const uri = process.env['MONGODB_URI'];
  if (!uri) {
    throw new Error('MONGODB_URI environment variable is not set');
  }

  global._mongooseConn = await mongoose.connect(uri, {
    maxPoolSize: 3,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    bufferCommands: false,
  });
}
