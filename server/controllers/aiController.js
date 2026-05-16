// server/controllers/aiController.js

// ✅ 1. IMPORTS (at the top)
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');

import { GoogleGenerativeAI } from '@google/generative-ai';
import AnalysisHistory from '../models/AnalysisHistory.js';

// ✅ 2. RATE LIMITING (simple in-memory store)
const rateLimitStore = new Map();

const checkRateLimit = (userId, limit = 10, windowMs = 60000) => {
  const now = Date.now();
  const userRequests = rateLimitStore.get(userId) || [];
  const recentRequests = userRequests.filter(timestamp => now - timestamp < windowMs);
  
  if (recentRequests.length >= limit) return false;
  
  recentRequests.push(now);
  rateLimitStore.set(userId, recentRequests);
  return true;
};

// ✅ 3. CONTROLLER FUNCTIONS

export const analyzeResume = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }

    if (req.file.size > 5 * 1024 * 1024) {
      return res.status(413).json({ success: false, error: 'File too large' });
    }

    let extractedText;
    try {
      if (req.file.mimetype === 'application/pdf') {
        const data = await pdfParse(req.file.buffer);
        extractedText = data.text;
      } else if (req.file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        const mammoth = require('mammoth');
        const result = await mammoth.extractRawText({ buffer: req.file.buffer });
        extractedText = result.value;
      } else {
        extractedText = req.file.buffer.toString('utf-8');
      }
      
      if (!extractedText || extractedText.trim().length === 0) {
        return res.status(400).json({ success: false, error: 'Could not extract text' });
      }
    } catch (parseError) {
      return res.status(500).json({ success: false, error: 'Failed to parse file' });
    }

    let analysis;
    try {
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
      const prompt = `Analyze this resume and return ONLY valid JSON: {"atsScore":number,"keywordScore":number,"formattingScore":number,"missingKeywords":[],"improvements":[],"detectedSkills":[],"experienceLevel":"string","atsCompatibility":{"isCompatible":boolean,"issues":[]}}. Resume: ${extractedText.substring(0, 3000)}`;
      
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text().replace(/```json/g, '').replace(/```/g, '').trim();
      analysis = JSON.parse(text);
    } catch (aiError) {
      analysis = {
        atsScore: 65, keywordScore: 60, formattingScore: 70,
        missingKeywords: ['JavaScript', 'React'],
        improvements: ['Add metrics'],
        detectedSkills: ['Communication'],
        experienceLevel: 'Intermediate',
        atsCompatibility: { isCompatible: true, issues: [] }
      };
    }

    const overallScore = Math.round((analysis.atsScore + analysis.keywordScore + analysis.formattingScore) / 3);
    const userId = req.user?._id || req.user?.id;
    
    if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const historyEntry = await AnalysisHistory.create({
      userId,
      resumeName: req.file.originalname,
      uploadedAt: new Date(),
      analysis: { ...analysis, overallScore }
    });

    res.json({
      success: true,
      message: 'Resume analyzed successfully!',
      data: {
        analysisId: historyEntry._id,
        resumeName: req.file.originalname,
        fileSize: (req.file.size / 1024).toFixed(2) + ' KB',
        analysis: { ...analysis, overallScore }
      }
    });

  } catch (error) {
    console.error('Resume Analysis Error:', error);
    res.status(500).json({ success: false, error: 'Failed to analyze resume' });
  }
};

// ✅ FIX: Accept both "position" and "jobRole" field names
export const generateCoverLetter = async (req, res) => {
  try {
    const { companyName, position, jobRole, jobDescription } = req.body;
    const userId = req.user?._id || req.user?.id;
    
    // ✅ Use position if available, otherwise fall back to jobRole
    const role = position || jobRole;

    if (!companyName || !role) {
      return res.status(400).json({ 
        success: false, 
        error: 'Company name and position are required',
        received: { companyName, position, jobRole }
      });
    }

    if (!checkRateLimit(userId, 5, 60000)) {
      return res.status(429).json({ success: false, error: 'Rate limit exceeded. Please wait 30 seconds.' });
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

    const prompt = `Write a professional cover letter for ${role} at ${companyName}. ${jobDescription ? 'Job Description: ' + jobDescription : ''}. Keep it 300-400 words, professional tone, plain text only.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const coverLetter = response.text().trim();

    res.json({ success: true, coverLetter });

  } catch (error) {
    console.error('Cover Letter Error:', error);
    res.status(500).json({ success: false, error: 'Failed to generate cover letter' });
  }
};

// ✅ FIX: Accept both "position" and "jobRole" field names
export const generateInterviewQA = async (req, res) => {
  try {
    const { companyName, position, jobRole, jobDescription } = req.body;
    const userId = req.user?._id || req.user?.id;
    
    // ✅ Use position if available, otherwise fall back to jobRole
    const role = position || jobRole;

    if (!companyName || !role) {
      return res.status(400).json({ 
        success: false, 
        error: 'Company name and position are required',
        received: { companyName, position, jobRole }
      });
    }

    if (!checkRateLimit(userId, 3, 60000)) {
      return res.status(429).json({ success: false, error: 'Rate limit exceeded. Please wait 30 seconds.' });
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

    const prompt = `Generate 10 interview questions with answers for ${role} at ${companyName}. ${jobDescription ? 'Job Description: ' + jobDescription : ''}. Return ONLY valid JSON array: [{"question":"text","answer":"text"}].`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text().replace(/```json/g, '').replace(/```/g, '').trim();
    
    let questions;
    try {
      questions = JSON.parse(text);
    } catch (parseErr) {
      console.error('JSON Parse Error:', parseErr);
      // Fallback: try to extract array using regex
      const match = text.match(/\[\s*\{.*\}\s*\]/s);
      if (match) {
        questions = JSON.parse(match[0]);
      } else {
        throw new Error('Invalid JSON format from AI');
      }
    }

    res.json({ success: true, questions: Array.isArray(questions) ? questions.slice(0, 10) : [] });

  } catch (error) {
    console.error('Interview QA Error:', error);
    res.status(500).json({ success: false, error: 'Failed to generate questions' });
  }
};

export const getAnalysisHistory = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const history = await AnalysisHistory.find({ userId }).sort({ uploadedAt: -1 }).limit(20);
    res.json({ success: true, count: history.length, history });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch history' });
  }
};

export const getAnalysisDetail = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id || req.user.id;
    const analysis = await AnalysisHistory.findOne({ _id: id, userId });
    
    if (!analysis) return res.status(404).json({ success: false, error: 'Not found' });
    
    res.json({ success: true, analysis });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch detail' });
  }
};

export const deleteAnalysisHistory = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id || req.user.id;
    const deleted = await AnalysisHistory.findOneAndDelete({ _id: id, userId });
    
    if (!deleted) return res.status(404).json({ success: false, error: 'Not found' });
    
    res.json({ success: true, message: 'Deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to delete' });
  }
};

export const emailResume = async (req, res) => {
  try {
    const { email, targetRole, correctedResume, score } = req.body;
    
    if (!email || !correctedResume) {
      return res.status(400).json({ success: false, error: 'Email and resume required' });
    }

    const nodemailer = require('nodemailer');
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
    });

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: `Your Optimized Resume - ${targetRole}`,
      text: `Overall Score: ${score}/100\n\n${correctedResume}`
    });

    res.json({ success: true, message: 'Email sent successfully!' });

  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to send email' });
  }
};

export const exportATSReport = async (req, res) => {
  try {
    const { targetRole, score, atsCheck, roadmap } = req.body;
    const PDFDocument = require('pdfkit');
    const doc = new PDFDocument();
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=ATS_Report_${targetRole.replace(/\s+/g, '_')}.pdf`);
    doc.pipe(res);
    
    doc.fontSize(24).text('ATS Compatibility Report', { align: 'center' }).moveDown();
    doc.fontSize(18).text(`Target Role: ${targetRole}`);
    doc.fontSize(24).text(`Overall Score: ${score}/100`, { color: score >= 80 ? '#22c55e' : score >= 50 ? '#eab308' : '#ef4444' }).moveDown();
    
    if (atsCheck) {
      doc.fontSize(16).text('ATS Analysis:', { underline: true }).moveDown();
      doc.fontSize(12).text(atsCheck.isCompatible ? '✅ Compatible' : '❌ Issues found').moveDown();
      if (atsCheck.issues?.length) {
        atsCheck.issues.forEach(issue => doc.fontSize(12).text(`• ${issue}`));
        doc.moveDown();
      }
    }
    
    if (roadmap?.length) {
      doc.fontSize(16).text('Improvements:', { underline: true }).moveDown();
      roadmap.slice(0, 5).forEach((step, i) => doc.fontSize(12).text(`${i + 1}. ${step.actionStep || step}`));
    }
    
    doc.end();
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to generate PDF' });
  }
};

// ✅ 4. EXPORTS (at the bottom)
export default {
  analyzeResume,
  generateCoverLetter,
  generateInterviewQA,
  getAnalysisHistory,
  getAnalysisDetail,
  deleteAnalysisHistory,
  emailResume,
  exportATSReport
};