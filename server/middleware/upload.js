const multer = require('multer');
const path = require('path');
const fs = require('fs');

const storage = multer.diskStorage({
  destination(req, file, cb) {
    const dir = path.join(__dirname, '..', 'uploads');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename(req, file, cb) {
    // unique filename
    const ext = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext).replace(/[^a-z0-9_\-]/gi, '_').toLowerCase();
    cb(null, `${base}-${Date.now()}${ext}`);
  }
});

// Separate uploaders to enforce different file size limits
const photoUpload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter(req, file, cb) {
    const allowed = ['.jpg','.jpeg','.png','.gif','.webp'];
    if (!allowed.includes(path.extname(file.originalname).toLowerCase())) {
      return cb(new Error('Only image files are allowed.'));
    }
    cb(null, true);
  }
});

const cvUpload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 }, // 15 MB
  fileFilter(req, file, cb) {
    const allowed = ['.pdf','.doc','.docx'];
    if (!allowed.includes(path.extname(file.originalname).toLowerCase())) {
      return cb(new Error('Only PDF/DOC/DOCX files are allowed.'));
    }
    cb(null, true);
  }
});

module.exports = { photoUpload, cvUpload };
