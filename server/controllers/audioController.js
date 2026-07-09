import mongoose from 'mongoose';
import multer from 'multer';
import Grid from 'gridfs-stream';

// Configure GridFS
let gfs;
const conn = mongoose.connection;

conn.once('open', () => {
  gfs = Grid(conn.db, mongoose.mongo);
  gfs.collection('interviewAudio');
});

// Multer configuration for audio upload
const storage = multer.memoryStorage();
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('audio/')) {
    cb(null, true);
  } else {
    cb(new Error('Only audio files are allowed'), false);
  }
};

export const upload = multer({ 
  storage, 
  fileFilter,
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});

// ✅ Upload audio recording
export const uploadAudio = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No audio file provided' });
    }

    // Create GridFS write stream
    const uploadStream = gfs.createWriteStream({
      filename: `session_${req.user._id}_${Date.now()}.webm`,
      contentType: req.file.mimetype,
      metadata: {
        userId: req.user._id,
        uploadedAt: new Date()
      }
    });

    // Upload file to GridFS
    uploadStream.end(req.file.buffer);

    // Wait for upload to complete
    await new Promise((resolve, reject) => {
      uploadStream.on('finish', resolve);
      uploadStream.on('error', reject);
    });

    res.json({
      success: true,
      fileId: uploadStream.id,
      filename: uploadStream.filename
    });
  } catch (error) {
    console.error('Audio upload error:', error);
    res.status(500).json({ success: false, error: 'Failed to upload audio' });
  }
};

// ✅ Get audio stream for playback
export const getAudioStream = async (req, res) => {
  try {
    const { fileId } = req.params;
    
    const downloadStream = gfs.createReadStream({
      _id: new mongoose.Types.ObjectId(fileId)
    });

    res.set({
      'Content-Type': 'audio/webm',
      'Accept-Ranges': 'bytes'
    });

    downloadStream.pipe(res);
  } catch (error) {
    console.error('Audio stream error:', error);
    res.status(404).json({ success: false, error: 'Audio not found' });
  }
};

// ✅ Delete audio file
export const deleteAudio = async (req, res) => {
  try {
    const { fileId } = req.params;
    
    await new Promise((resolve, reject) => {
      gfs.remove({ _id: new mongoose.Types.ObjectId(fileId) }, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    res.json({ success: true, message: 'Audio deleted successfully' });
  } catch (error) {
    console.error('Audio delete error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete audio' });
  }
};