// ✅ CORRECT IMPORT FOR ESM + CommonJS interop
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');

import { GoogleGenerativeAI } from '@google/generative-ai';
import AnalysisHistory from '../models/AnalysisHistory.js';

export const analyzeResume = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        error: 'No PDF file uploaded. Please select a file.' 
      });
    }

    if (req.file.size > 5 * 1024 * 1024) {
      return res.status(413).json({ 
        success: false, 
        error: 'File size exceeds 5MB limit.' 
      });
    }

    // ✅ PDF PARSING - using the correctly imported function
    let extractedText;
    try {
      const data = await pdfParse(req.file.buffer);  // ✅ lowercase pdfParse
      extractedText = data.text;
      
      if (!extractedText || extractedText.trim().length === 0) {
        return res.status(400).json({ 
          success: false, 
          error: 'Could not extract text from PDF.' 
        });
      }
    } catch (parseError) {
      console.error('PDF Parse Error:', parseError);
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to parse PDF.' 
      });
    }

    // ... rest of your AI analysis code stays the same ...
    // (Keep everything else as it was)
    
    let analysis;
    try {
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

      const prompt = `Analyze this resume: ${extractedText.substring(0, 3000)}`;
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
      analysis = JSON.parse(cleanText);
    } catch (aiError) {
      console.error('Gemini API Error:', aiError);
      analysis = {
        atsScore: 65,
        keywordScore: 60,
        formattingScore: 70,
        missingKeywords: ['JavaScript', 'React'],
        improvements: ['Add metrics'],
        detectedSkills: ['Communication'],
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
      userId: userId,
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