import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import mongoose from 'mongoose';
import Grid from 'gridfs-stream';

const router = express.Router();

let gfs;

// Initialize GridFS
mongoose.connection.once('open', () => {
  gfs = Grid(mongoose.connection.db, mongoose.mongo);
  gfs.collection('interviewAudio');
});

// ✅ Download audio file
router.get('/audio/download/:fileId', protect, async (req, res) => {
  try {
    const fileId = req.params.fileId;
    
    // Check if file exists
    const file = await gfs.files.findOne({ _id: new mongoose.Types.ObjectId(fileId) });
    
    if (!file) {
      return res.status(404).json({ success: false, error: 'Audio file not found' });
    }

    // Set headers for download
    res.set({
      'Content-Type': file.contentType || 'audio/webm',
      'Content-Disposition': `attachment; filename="${file.filename}"`,
      'Content-Length': file.length
    });

    // Create read stream and pipe to response
    const downloadStream = gfs.createReadStream({ _id: new mongoose.Types.ObjectId(fileId) });
    downloadStream.pipe(res);
    
  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({ success: false, error: 'Failed to download audio' });
  }
});

export default router;