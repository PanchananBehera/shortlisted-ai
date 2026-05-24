import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';

await mongoose.connect(process.env.MONGODB_URI);

// Grant admin to all your accounts
const adminEmails = [
  'ram5@gmail.com',
  'ram3@gmail.com',
  'beherapanchanan933@gmail.com',
  'cb@gmail.com',
  'dragon45@gmail.com',
  'rio8@gmail.com'
];

const result = await mongoose.connection.collection('users').updateMany(
  {},
  { $set: { isAdmin: true } }
);
console.log('✅ Updated', result.modifiedCount, 'users to admin');

// Show all current admins
const admins = await mongoose.connection.collection('users')
  .find({ isAdmin: true }, { projection: { email: 1, name: 1 } })
  .toArray();
console.log('📋 Current admins:');
admins.forEach(u => console.log('  -', u.email, '|', u.name));

await mongoose.disconnect();
process.exit(0);
