import mongoose from 'mongoose';
import dns from 'dns';

export const connectDB = async () => {
  const options = {
    serverSelectionTimeoutMS: 5000,
  };

  try {
    await mongoose.connect(process.env.MONGODB_URI, options);
    console.log('✅ MongoDB Connected');
  } catch (error) {
    console.error('❌ MongoDB Atlas Connection failed:', error.message);

    // ✅ Self-healing: Check if in development and try local MongoDB fallback
    if (process.env.NODE_ENV === 'development') {
      const localUri = 'mongodb://127.0.0.1:27017/shortlisted-ai';
      console.warn(`⚠️ Falling back to Local MongoDB: ${localUri}...`);
      try {
        await mongoose.connect(localUri, options);
        console.log('✅ MongoDB Connected to Local Database');
        return;
      } catch (localError) {
        console.error('❌ Local MongoDB Fallback also failed:', localError.message);
      }
    }

    const isDnsError = 
      error.message.includes('querySrv') || 
      error.message.includes('ENOTFOUND') || 
      error.message.includes('EREFUSED') || 
      error.message.includes('ETIMEOUT');
      
    if (isDnsError) {
      console.warn('⚠️ MongoDB DNS resolution failed. Applying self-healing DNS fallback to Google/Cloudflare DNS...');
      try {
        dns.setServers(['8.8.8.8', '1.1.1.1']);
        await mongoose.connect(process.env.MONGODB_URI, options);
        console.log('✅ MongoDB Connected (via DNS fallback)');
        return;
      } catch (retryError) {
        console.error('❌ MongoDB Connection retry failed:', retryError.message);
      }
    }
    process.exit(1);
  }
};