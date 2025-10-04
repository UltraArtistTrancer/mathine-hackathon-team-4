import express from "express";
import multer from "multer";
import { PDFController } from "../controllers/pdf.controller";

const router = express.Router();

// Configure multer for file uploads
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { 
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'));
    }
  }
});

// Route for analyzing course schedule PDFs
router.post("/analyze-schedule", upload.single('pdf'), async (req, res, next) => {
  try {
    await PDFController.analyzeSchedule(req, res, next);
  } catch (error) {
    next(error);
  }
});

// Test route to verify PDF routes are working
router.get("/test", (req, res) => {
  res.json({ message: "PDF routes are working!", timestamp: new Date() });
});

export default router;