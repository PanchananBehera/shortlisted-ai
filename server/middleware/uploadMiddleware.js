import multer from 'multer';

// Configure memory storage
const storage = multer.memoryStorage();

// File filter for PDFs only
const fileFilter = (req, file, cb) => {
  // Check if file is PDF
  if (file.mimetype === 'application/pdf') {
    cb(null, true);
  } else {
    cb(new Error('Only PDF files are allowed!'), false);
  }
};

// Configure upload limits
export const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max
  },
});