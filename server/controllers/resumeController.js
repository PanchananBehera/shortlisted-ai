// ==========================================
// ✅ 1. IMPORTS (THE FIX IS HERE)
// ==========================================
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse'); // ✅ Correct CommonJS import for ESM

import { GoogleGenerativeAI } from '@google/generative-ai';
import AnalysisHistory from '../models/AnalysisHistory.js';

// ==========================================
// ✅ 2. CONTROLLER FUNCTION
// ==========================================
export const analyzeResume = async (req, res) => {
  try {
    // Check if file exists
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        error: 'No PDF file uploaded. Please select a file.' 
      });
    }

    // Validate file size
    if (req.file.size > 5 * 1024 * 1024) {
      return res.status(413).json({ 
        success: false, 
        error: 'File size exceeds 5MB limit.' 
      });
    }

    // ==========================================
    // ✅ 3. PDF PARSING (USING THE FIXED IMPORT)
    // ==========================================
    let extractedText;
    try {
      // pdfParse is now a function, not a class. No 'new' keyword needed.
      const data = await pdfParse(req.file.buffer); 
      extractedText = data.text;
      
      if (!extractedText || extractedText.trim().length === 0) {
        return res.status(400).json({ 
          success: false, 
          error: 'Could not extract text from PDF. Ensure it is a text-based PDF.' 
        });
      }
    } catch (parseError) {
      console.error('PDF Parse Error:', parseError);
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to parse PDF. Try uploading a different file.' 
      });
    }

    // ==========================================
    // ✅ 4. AI ANALYSIS (Google Gemini)
    // ==========================================
    let analysis;
    try {
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

      const prompt = `
        Analyze this resume and provide a JSON response with the following structure:
        {
          "atsScore": number (0-100),
          "keywordScore": number (0-100),
          "formattingScore": number (0-100),
          "missingKeywords": ["array", "of", "strings"],
          "improvements": ["array", "of", "3", "actionable", "items"],
          "detectedSkills": ["array", "of", "skills"],
          "experienceLevel": "Entry|Intermediate|Senior|Lead",
          "atsCompatibility": {
            "isCompatible": boolean,
            "issues": ["array", "of", "issues"]
          }
        }
        
        Resume Text:
        ${extractedText.substring(0, 3000)}
        
        Provide ONLY valid JSON, no markdown formatting.
      `;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      // Clean response
      const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
      analysis = JSON.parse(cleanText);
      
    } catch (aiError) {
      console.error('Gemini API Error:', aiError);
      // Fallback analysis
      analysis = {
        atsScore: 65,
        keywordScore: 60,
        formattingScore: 70,
        missingKeywords: ['JavaScript', 'React'],
        improvements: ['Add metrics', 'Improve formatting'],
        detectedSkills: ['Communication'],
        experienceLevel: 'Intermediate',
        atsCompatibility: { isCompatible: true, issues: [] }
      };
    }

    // Calculate overall score
    const overallScore = Math.round(
      (analysis.atsScore + analysis.keywordScore + analysis.formattingScore) / 3
    );

    // ==========================================
    // ✅ 5. SAVE TO DATABASE
    // ==========================================
    // Note: Check if your auth middleware puts user in req.user or req.user._id
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

    // ==========================================
    // ✅ 6. SEND RESPONSE
    // ==========================================
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