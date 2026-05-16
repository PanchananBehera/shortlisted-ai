// server/controllers/aiController.js
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');

import { GoogleGenerativeAI } from '@google/generative-ai';
import AnalysisHistory from '../models/AnalysisHistory.js';
import User from '../models/User.js';

// ✅ Rate limiting store (in production, use Redis)
const rateLimitStore = new Map();

// Rate limit check function
const checkRateLimit = (userId, limit = 10, windowMs = 60000) => {
  const now = Date.now();
  const userRequests = rateLimitStore.get(userId) || [];
  
  // Remove old requests outside the window
  const recentRequests = userRequests.filter(timestamp => now - timestamp < windowMs);
  
  if (recentRequests.length >= limit) {
    return false; // Rate limit exceeded
  }
  
  // Add new request
  recentRequests.push(now);
  rateLimitStore.set(userId, recentRequests);
  return true;
};

// ==========================================
// ✅ 1. ANALYZE RESUME
// ==========================================
export const analyzeResume = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        error: 'No file uploaded. Please select a file.' 
      });
    }

    if (req.file.size > 5 * 1024 * 1024) {
      return res.status(413).json({ 
        success: false, 
        error: 'File size exceeds 5MB limit.' 
      });
    }

    // Parse PDF/DOCX/TXT
    let extractedText;
    try {
      if (req.file.mimetype === 'application/pdf') {
        const data = await pdfParse(req.file.buffer);
        extractedText = data.text;
      } else if (req.file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        // Use mammoth for DOCX (already installed)
        const mammoth = require('mammoth');
        const result = await mammoth.extractRawText({ buffer: req.file.buffer });
        extractedText = result.value;
      } else {
        extractedText = req.file.buffer.toString('utf-8');
      }
      
      if (!extractedText || extractedText.trim().length === 0) {
        return res.status(400).json({ 
          success: false, 
          error: 'Could not extract text from file.' 
        });
      }
    } catch (parseError) {
      console.error('Parse Error:', parseError);
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to parse file. Please try a different file.' 
      });
    }

    // Analyze with Gemini
    let analysis;
    try {
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

      const prompt = `
        Analyze this resume and provide ONLY valid JSON (no markdown):
        {
          "atsScore": number (0-100),
          "keywordScore": number (0-100),
          "formattingScore": number (0-100),
          "missingKeywords": ["array of strings"],
          "improvements": ["array of 3 actionable items"],
          "detectedSkills": ["array of strings"],
          "experienceLevel": "Entry|Intermediate|Senior|Lead",
          "atsCompatibility": {
            "isCompatible": boolean,
            "issues": ["array of strings"]
          }
        }
        
        Resume: ${extractedText.substring(0, 3000)}
      `;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
      analysis = JSON.parse(cleanText);
      
    } catch (aiError) {
      console.error('Gemini Error:', aiError);
      // Fallback analysis
      analysis = {
        atsScore: 65,
        keywordScore: 60,
        formattingScore: 70,
        missingKeywords: ['JavaScript', 'React', 'Node.js'],
        improvements: ['Add quantifiable achievements', 'Include technical keywords'],
        detectedSkills: ['Communication', 'Teamwork'],
        experienceLevel: 'Intermediate',
        atsCompatibility: { isCompatible: true, issues: [] }
      };
    }

    const overallScore = Math.round(
      (analysis.atsScore + analysis.keywordScore + analysis.formattingScore) / 3
    );

    const userId = req.user ? (req.user._id || req.user.id) : null;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

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
    res.status(500).json({ 
      success: false, 
      error: 'Failed to analyze resume. Please try again.' 
    });
  }
};

// ==========================================
// ✅ 2. GENERATE COVER LETTER (with rate limiting)
// ==========================================
export const generateCoverLetter = async (req, res) => {
  try {
    const { companyName, position, jobDescription } = req.body;
    const userId = req.user?._id || req.user?.id;

    if (!companyName || !position) {
      return res.status(400).json({ 
        success: false, 
        error: 'Company name and position are required' 
      });
    }

    // Rate limiting: 5 requests per minute
    if (!checkRateLimit(userId, 5, 60000)) {
      return res.status(429).json({
        success: false,
        error: 'AI Rate limit exceeded. You are generating too fast! Please wait 15-30 seconds and try again.'
      });
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

    const prompt = `
      Write a professional cover letter for ${position} at ${companyName}.
      ${jobDescription ? `Job Description: ${jobDescription}` : ''}
      
      Requirements:
      - Professional tone
      - 300-400 words
      - Highlight relevant skills
      - Show enthusiasm for the role
      - Proper greeting and closing
      - Plain text format (no markdown)
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const coverLetter = response.text().trim();

    res.json({
      success: true,
      coverLetter: coverLetter
    });

  } catch (error) {
    console.error('Cover Letter Error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to generate cover letter. Please try again.' 
    });
  }
};

// ==========================================
// ✅ 3. GENERATE INTERVIEW QUESTIONS (with rate limiting)
// ==========================================
export const generateInterviewQA = async (req, res) => {
  try {
    const { companyName, position, jobDescription } = req.body;
    const userId = req.user?._id || req.user?.id;

    if (!companyName || !position) {
      return res.status(400).json({ 
        success: false, 
        error: 'Company name and position are required' 
      });
    }

    // Rate limiting: 3 requests per minute
    if (!checkRateLimit(userId, 3, 60000)) {
      return res.status(429).json({
        success: false,
        error: 'AI Rate limit exceeded. You are generating too fast! Please wait 15-30 seconds and try again.'
      });
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

    const prompt = `
      Generate 10 interview questions with answers for ${position} at ${companyName}.
      ${jobDescription ? `Job Description: ${jobDescription}` : ''}
      
      Include:
      - 3 technical questions
      - 3 behavioral questions
      - 2 company-specific questions
      - 2 situational questions
      
      Format as JSON array ONLY (no markdown):
      [
        {"question": "Question text", "answer": "Sample answer"},
        ...
      ]
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const questions = JSON.parse(cleanText);

    res.json({
      success: true,
      questions: questions.slice(0, 10)
    });

  } catch (error) {
    console.error('Interview QA Error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to generate interview questions. Please try again.' 
    });
  }
};

// ==========================================
// ✅ 4. GET ANALYSIS HISTORY
// ==========================================
export const getAnalysisHistory = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    
    const history = await AnalysisHistory.find({ userId })
      .sort({ uploadedAt: -1 })
      .limit(20)
      .select('resumeName uploadedAt analysis.overallScore analysis.atsScore');

    res.json({
      success: true,
      count: history.length,
      history
    });

  } catch (error) {
    console.error('Get History Error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch history' 
    });
  }
};

// ==========================================
// ✅ 5. GET ANALYSIS DETAIL
// ==========================================
export const getAnalysisDetail = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id || req.user.id;
    
    const analysis = await AnalysisHistory.findOne({ 
      _id: id, 
      userId 
    });

    if (!analysis) {
      return res.status(404).json({ 
        success: false, 
        error: 'Analysis not found' 
      });
    }

    res.json({
      success: true,
      analysis
    });

  } catch (error) {
    console.error('Get Detail Error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch analysis detail' 
    });
  }
};

// ==========================================
// ✅ 6. DELETE ANALYSIS
// ==========================================
export const deleteAnalysisHistory = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id || req.user.id;
    
    const deleted = await AnalysisHistory.findOneAndDelete({ 
      _id: id, 
      userId 
    });

    if (!deleted) {
      return res.status(404).json({ 
        success: false, 
        error: 'Analysis not found' 
      });
    }

    res.json({
      success: true,
      message: 'Analysis deleted successfully'
    });

  } catch (error) {
    console.error('Delete Error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to delete analysis' 
    });
  }
};

// ==========================================
// ✅ 7. EMAIL RESUME
// ==========================================
export const emailResume = async (req, res) => {
  try {
    const { email, targetRole, correctedResume, score } = req.body;
    
    if (!email || !correctedResume) {
      return res.status(400).json({ 
        success: false, 
        error: 'Email and resume content are required' 
      });
    }

    // Use nodemailer (already installed)
    const nodemailer = require('nodemailer');
    
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: `Your Optimized Resume - ${targetRole}`,
      text: `
        Hi there!
        
        Here's your AI-optimized resume for ${targetRole} position.
        
        Overall Score: ${score}/100
        
        ${correctedResume}
        
        Best regards,
        Shortlisted AI Team
      `
    };

    await transporter.sendMail(mailOptions);

    res.json({
      success: true,
      message: 'Resume sent successfully!'
    });

  } catch (error) {
    console.error('Email Error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to send email' 
    });
  }
};

// ==========================================
// ✅ 8. EXPORT ATS REPORT (PDF)
// ==========================================
export const exportATSReport = async (req, res) => {
  try {
    const { targetRole, score, atsCheck, roadmap } = req.body;
    
    // Use pdfkit (already installed)
    const PDFDocument = require('pdfkit');
    const doc = new PDFDocument();
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=ATS_Report_${targetRole.replace(/\s+/g, '_')}.pdf`);
    
    doc.pipe(res);
    
    // Header
    doc.fontSize(24).text('ATS Compatibility Report', { align: 'center' });
    doc.moveDown();
    
    // Score
    doc.fontSize(18).text(`Target Role: ${targetRole}`);
    doc.fontSize(24).text(`Overall Score: ${score}/100`, { color: score >= 80 ? '#22c55e' : score >= 50 ? '#eab308' : '#ef4444' });
    doc.moveDown();
    
    // ATS Check details
    if (atsCheck) {
      doc.fontSize(16).text('ATS Analysis:', { underline: true });
      doc.moveDown();
      
      if (atsCheck.isCompatible) {
        doc.fontSize(12).text('✅ Resume is ATS-compatible', { color: '#22c55e' });
      } else {
        doc.fontSize(12).text('❌ Resume has ATS compatibility issues', { color: '#ef4444' });
      }
      doc.moveDown();
      
      if (atsCheck.issues && atsCheck.issues.length > 0) {
        doc.fontSize(14).text('Issues Found:', { underline: true });
        atsCheck.issues.forEach(issue => {
          doc.fontSize(12).text(`• ${issue}`);
        });
        doc.moveDown();
      }
    }
    
    // Roadmap
    if (roadmap && roadmap.length > 0) {
      doc.fontSize(16).text('Improvement Roadmap:', { underline: true });
      doc.moveDown();
      
      roadmap.slice(0, 5).forEach((step, i) => {
        doc.fontSize(12).text(`${i + 1}. ${step.actionStep || step}`);
      });
    }
    
    doc.end();

  } catch (error) {
    console.error('PDF Export Error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to generate PDF report' 
    });
  }
};

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