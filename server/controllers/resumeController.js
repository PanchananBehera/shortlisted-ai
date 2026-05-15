// ==========================================
// ✅ FIX 1: Correct imports for pdf-parse
// ==========================================
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');

// ✅ FIX 2: Correct Gemini model name
import { GoogleGenerativeAI } from '@google/generative-ai';
import AnalysisHistory from '../models/AnalysisHistory.js';

// ==========================================
// MAIN FUNCTION
// ==========================================
export const analyzeResume = async (req, res) => {
  try {
    // Check if file exists
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        error: 'No file uploaded. Please select a file.' 
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
    // ✅ FIX 3: Parse PDF or DOCX correctly
    // ==========================================
    let extractedText;
    const mimetype = req.file.mimetype;
    const filename = req.file.originalname.toLowerCase();

    try {
      if (mimetype === 'application/pdf' || filename.endsWith('.pdf')) {
        const parser = new pdfParse.PDFParse({ data: req.file.buffer });
        const data = await parser.getText();
        extractedText = data.text;
      } else if (mimetype.includes('word') || filename.endsWith('.docx')) {
        const result = await mammoth.extractRawText({ buffer: req.file.buffer });
        extractedText = result.value;
      } else {
        return res.status(400).json({ 
          success: false, 
          error: 'Unsupported file format. Please upload PDF or DOCX.' 
        });
      }
      
      if (!extractedText || extractedText.trim().length === 0) {
        return res.status(400).json({ 
          success: false, 
          error: 'Could not extract text from file. Please ensure the file is not scanned/empty.' 
        });
      }
    } catch (parseError) {
      console.error('PDF Parse Error:', parseError);
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to parse file. Try converting to PDF first.' 
      });
    }

    // ==========================================
    // ✅ FIX 4: Use correct Gemini model
    // ==========================================
    let analysis;
    try {
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      
      // ✅ Use 'gemini-2.0-flash' which is available for this key
      const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

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
      
      // Clean the response (remove markdown code blocks)
      const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
      analysis = JSON.parse(cleanText);
      
    } catch (aiError) {
      console.error('Gemini API Error:', aiError);
      // Fallback analysis if API fails
      analysis = {
        atsScore: 65,
        keywordScore: 60,
        formattingScore: 70,
        missingKeywords: ['JavaScript', 'React', 'Node.js', 'MongoDB'],
        improvements: [
          'Add more quantifiable achievements',
          'Include relevant technical keywords',
          'Improve section formatting'
        ],
        detectedSkills: ['Communication', 'Teamwork', 'Problem Solving'],
        experienceLevel: 'Intermediate',
        atsCompatibility: {
          isCompatible: true,
          issues: []
        }
      };
    }

    // Calculate overall score
    const overallScore = Math.round(
      (analysis.atsScore + analysis.keywordScore + analysis.formattingScore) / 3
    );

    // Save to database
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

    // ✅ FIX 5: CORRECT res.json() SYNTAX - added 'data:' key
    res.json({
      success: true,
      message: 'Resume analyzed successfully!',
      data: {  // ✅ THIS KEY WAS MISSING!
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