import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

// ✅ Fix: Use createRequire for CommonJS modules in ES Module project
const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');

// Helper to call Gemini
const analyzeWithGemini = async (prompt) => {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });
  
  const result = await model.generateContent(prompt);
  return result.response.text();
};

// Helper: Extract text from file
const extractTextFromFile = async (filePath, fileType) => {
  try {
    let text = '';
    
    if (fileType === 'application/pdf') {
      const dataBuffer = fs.readFileSync(filePath);
      const data = await pdfParse(dataBuffer);
      text = data.text;
    } 
    else if (fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      const result = await mammoth.extractRawText({ path: filePath });
      text = result.value;
    } 
    else if (fileType === 'text/plain') {
      text = fs.readFileSync(filePath, 'utf8');
    } 
    else {
      throw new Error('Unsupported file type');
    }
    
    // Clean up: remove file after extraction
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    
    return text;
  } catch (error) {
    console.error('Text extraction error:', error);
    // Clean up file on error too
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    throw error;
  }
};

// @desc    Analyze Resume (File Upload)
// @route   POST /api/resume/analyze
// @access  Private
export const analyzeResume = async (req, res) => {
  try {
    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({ message: 'Please upload a resume file (PDF, DOCX, or TXT)' });
    }

    const { targetRole } = req.body;
    
    if (!targetRole) {
      // Clean up file
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({ message: 'Target role is required' });
    }

    // Extract text from uploaded file
    console.log('[Resume] Extracting text from:', req.file.originalname);
    const resumeText = await extractTextFromFile(req.file.path, req.file.mimetype);
    
    if (!resumeText || resumeText.trim().length < 50) {
      return res.status(400).json({ message: 'Could not extract text from file. Please ensure it\'s a valid resume.' });
    }

    console.log('[Resume] Extracted text length:', resumeText.length);

    // Analyze with Gemini
    const prompt = `You are a strict technical recruiter and ATS (Applicant Tracking System) expert.
    
    Analyze the following resume for a "${targetRole}" position.
    
    RESUME TEXT:
    ${resumeText}
    
    Provide a JSON response with the following structure (NO markdown, just valid JSON):
    {
      "score": 0-100 (integer),
      "strengths": ["string", "string"],
      "weaknesses": ["string", "string"],
      "missingSkills": ["string", "string"],
      "improvements": ["string", "string"]
    }
    
    Rules:
    - Score should reflect how well the resume matches the target role.
    - Be critical but constructive.
    - Missing skills should be relevant to ${targetRole}.
    - Check for keywords, action verbs, quantifiable achievements.
    `;

    const response = await analyzeWithGemini(prompt);
    
    // Clean up potential markdown code blocks
    const jsonStr = response.replace(/```json/g, '').replace(/```/g, '').trim();
    const analysis = JSON.parse(jsonStr);

    res.json(analysis);

  } catch (error) {
    console.error('[Resume] Analysis Error:', error);
    
    // Clean up file if it still exists
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({ 
      message: 'Failed to analyze resume. Please try again.',
      error: error.message 
    });
  }
};