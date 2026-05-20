import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';

await mongoose.connect(process.env.MONGODB_URI);
const result = await mongoose.connection.collection('users').updateMany(
  { email: { $in: ['rio8@gmail.com', 'beherapanchanan933@gmail.com', 'cb@gmail.com', 'dragon45@gmail.com'] } },
  { $set: { isAdmin: true } }
);
console.log('Updated', result.modifiedCount, 'users to admin');
await mongoose.disconnect();
process.exit(0);
