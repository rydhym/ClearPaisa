import multer from 'multer';

// Use memory storage to process files directly from memory buffers
const storage = multer.memoryStorage();

export const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB file limit
  },
  fileFilter: (req, file, cb) => {
    const ext = file.originalname.split('.').pop()?.toLowerCase();
    if (ext === 'csv' || ext === 'pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only CSV and PDF statements are supported'));
    }
  }
});
