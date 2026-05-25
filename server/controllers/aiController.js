// server/controllers/aiController.js - FINAL PRODUCTION VERSION
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
import PDFDocument from 'pdfkit';
import { GoogleGenerativeAI } from '@google/generative-ai';
import AnalysisHistory from '../models/AnalysisHistory.js';
import { logAIUsage } from '../utils/aiUsageLogger.js';
import { sendEmail } from '../utils/emails.js';

// ✅ RATE LIMITING
const rateLimitStore = new Map();
const checkRateLimit = (userId, limit = parseInt(process.env.AI_RATE_LIMIT || '10'), windowMs = parseInt(process.env.AI_RATE_LIMIT_WINDOW || '60000')) => {
  const now = Date.now();
  const userRequests = rateLimitStore.get(userId) || [];
  const recentRequests = userRequests.filter(timestamp => now - timestamp < windowMs);
  
  if (recentRequests.length >= limit) {
    const oldest = Math.min(...recentRequests);
    const waitTime = Math.ceil((oldest + windowMs - now) / 1000);
    return { allowed: false, waitTime };
  }
  recentRequests.push(now);
  rateLimitStore.set(userId, recentRequests);
  return { allowed: true };
};

// ✅ API Key Rotation & Fallback with Exponential Backoff
let currentKeyIndex = 0;
const generateContentWithRetry = async (prompt, modelName = 'gemini-1.5-flash', retries = 0) => {
  const keys = (process.env.GEMINI_API_KEY || '').split(',').map(k => k.trim()).filter(k => k);
  if (keys.length === 0) throw new Error("GEMINI_API_KEY is not set in .env");
  
  const keyToUse = keys[currentKeyIndex];
  const genAI = new GoogleGenerativeAI(keyToUse);
  const model = genAI.getGenerativeModel({ model: modelName });

  try {
    const result = await model.generateContent(prompt);
    return await result.response;
  } catch (error) {
    const isRateLimit = error.message?.includes('429') || 
                       error.message?.includes('quota') || 
                       error.message?.includes('exceeded') || 
                       error.message?.includes('RESOURCE_EXHAUSTED');
    
    if (isRateLimit && keys.length > 1 && retries < keys.length) {
      console.warn(`API Key ${currentKeyIndex + 1} hit rate limit. Rotating...`);
      currentKeyIndex = (currentKeyIndex + 1) % keys.length;
      return generateContentWithRetry(prompt, modelName, retries + 1);
    }
    
    if (isRateLimit && retries < 2) {
      const delay = Math.pow(2, retries) * 1000;
      console.log(`Rate limited. Waiting ${delay}ms before retry ${retries + 1}...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return generateContentWithRetry(prompt, modelName, retries + 1);
    }
    
    throw error;
  }
};

// ✅ CACHING
const aiCache = new Map();
setInterval(() => aiCache.clear(), 30 * 60 * 1000);
const getCacheKey = (type, data) => {
  const sorted = Object.keys(data).sort().reduce((acc, key) => { acc[key] = data[key]; return acc; }, {});
  return `${type}:${JSON.stringify(sorted)}`;
};

// ✅ analyzeResume
export const analyzeResume = async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { targetRole = 'Software Engineer', jobDescription = '' } = req.body || {};
    if (!req.file) return res.status(400).json({ success: false, error: 'No file uploaded' });
    if (req.file.size > 5 * 1024 * 1024) return res.status(413).json({ success: false, error: 'File too large' });

    let analysis;
    const ext = req.file.originalname ? req.file.originalname.split('.').pop().toLowerCase() : '';
    const isPDF = req.file.mimetype === 'application/pdf' || ext === 'pdf';

    if (isPDF) {
      // ✅ Use Gemini's native PDF processing
      try {
        const base64Data = req.file.buffer.toString('base64');
        const pdfPart = {
          inlineData: {
            data: base64Data,
            mimeType: 'application/pdf'
          }
        };

        const prompt = `You are an expert ATS optimizer. Analyze the attached resume PDF for role: "${targetRole}". ${jobDescription ? `Job Description:\n${jobDescription}\n` : ''}
Return ONLY valid JSON: { "score": number, "atsScore": number, "keywordScore": number, "formattingScore": number, "overallScore": number, "strengths": [], "weaknesses": [], "missingSkills": [], "missingKeywords": [], "improvements": [], "detectedSkills": [], "experienceLevel": "string", "correctedResume": "string", "roadmap": [], "issues": [], "atsCheck": { "overallScore": number, "keywordMatch": { "matchedKeywords": [], "missingKeywords": [] }, "formatting": { "hasTables": boolean, "hasGraphics": boolean, "hasColumns": boolean, "usesStandardHeadings": boolean, "fontCompatibility": "string", "issues": [] }, "recommendations": [] } }`;

        const response = await generateContentWithRetry([prompt, pdfPart], 'gemini-1.5-flash');
        const text = response.text();
        
        try {
          const cleanText = text.replace(/```json/gi, '').replace(/```/g, '').trim();
          analysis = JSON.parse(cleanText);
        } catch (parseErr) {
          const match = text.match(/\{[\s\S]*\}/);
          if (match) {
            analysis = JSON.parse(match[0]);
          } else {
            throw new Error('Invalid JSON format from AI');
          }
        }
      } catch (aiError) {
        console.error('Gemini API Error for Resume PDF Analysis:', aiError.message);
        throw aiError;
      }
    } else {
      // ✅ Fallback to text extraction for DOCX, DOC, and TXT
      let extractedText;
      try {
        if (req.file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || ext === 'docx') {
          const mammoth = require('mammoth');
          const result = await mammoth.extractRawText({ buffer: req.file.buffer });
          extractedText = result.value;
        } else if (req.file.mimetype === 'application/msword' || ext === 'doc') {
          const WordExtractor = require('word-extractor');
          const extractor = new WordExtractor();
          const extracted = await extractor.extract(req.file.buffer);
          extractedText = extracted.getBody();
        } else {
          extractedText = req.file.buffer.toString('utf-8');
        }
        if (!extractedText || extractedText.trim().length === 0) {
          return res.status(400).json({ success: false, error: 'Could not extract text from file' });
        }
      } catch (parseError) {
        console.error('FILE PARSING ERROR:', parseError);
        return res.status(500).json({ success: false, error: `Failed to parse file: ${parseError.message}` });
      }

      try {
        const prompt = `You are an expert ATS optimizer. Analyze resume for role: "${targetRole}". ${jobDescription ? `Job Description:\n${jobDescription}\n` : ''}
Return ONLY valid JSON: { "score": number, "atsScore": number, "keywordScore": number, "formattingScore": number, "overallScore": number, "strengths": [], "weaknesses": [], "missingSkills": [], "missingKeywords": [], "improvements": [], "detectedSkills": [], "experienceLevel": "string", "correctedResume": "string", "roadmap": [], "issues": [], "atsCheck": { "overallScore": number, "keywordMatch": { "matchedKeywords": [], "missingKeywords": [] }, "formatting": { "hasTables": boolean, "hasGraphics": boolean, "hasColumns": boolean, "usesStandardHeadings": boolean, "fontCompatibility": "string", "issues": [] }, "recommendations": [] } }
Resume Text: ${extractedText.substring(0, 4000)}`;
        
        const response = await generateContentWithRetry(prompt, 'gemini-1.5-flash');
        const text = response.text();
        
        try {
          const cleanText = text.replace(/```json/gi, '').replace(/```/g, '').trim();
          analysis = JSON.parse(cleanText);
        } catch (parseErr) {
          const match = text.match(/\{[\s\S]*\}/);
          if (match) {
            analysis = JSON.parse(match[0]);
          } else {
            throw new Error('Invalid JSON format from AI');
          }
        }
      } catch (aiError) {
        console.warn('Gemini API Error for Resume Text Analysis:', aiError.message);
        throw aiError;
      }
    }

    const overallScore = analysis.score || analysis.overallScore || Math.round((analysis.atsScore + analysis.keywordScore + analysis.formattingScore) / 3);
    analysis.score = overallScore;
    analysis.overallScore = overallScore;
    
    const userId = req.user?._id || req.user?.id;
    if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    // ✅ Sanitize roadmap array to match Mongoose schema
    if (Array.isArray(analysis.roadmap)) {
      analysis.roadmap = analysis.roadmap.map(item => {
        if (typeof item === 'string') {
          return {
            skill: item.split(':')[0]?.replace(/\*\*|\*/g, '').trim() || 'General Development',
            priority: 'Medium',
            actionStep: item.trim(),
            timeEstimate: 'Flexible',
            resources: []
          };
        }
        return {
          skill: item.skill || 'General Development',
          priority: item.priority || 'Medium',
          actionStep: item.actionStep || '',
          timeEstimate: item.timeEstimate || 'Flexible',
          resources: Array.isArray(item.resources) ? item.resources : []
        };
      });
    } else {
      analysis.roadmap = [];
    }

    // ✅ Sanitize issues array to match Mongoose schema
    if (Array.isArray(analysis.issues)) {
      analysis.issues = analysis.issues.map(item => {
        if (typeof item === 'string') {
          return {
            type: 'Resume Formatting',
            description: item.trim(),
            severity: 'Medium'
          };
        }
        return {
          type: item.type || 'Resume Formatting',
          description: item.description || '',
          severity: item.severity || 'Medium'
        };
      });
    } else {
      analysis.issues = [];
    }

    const historyEntry = await AnalysisHistory.create({
      userId, resumeName: req.file.originalname, uploadedAt: new Date(), analysis: { ...analysis }
    });

    const responseTime = Date.now() - startTime;
    await logAIUsage({
      userId,
      userEmail: req.user.email,
      featureUsed: 'resume-analysis',
      companyName: targetRole,
      jobRole: targetRole,
      success: true,
      responseTime,
      req
    });

    const historyObj = historyEntry.toObject();
    res.json({
      success: true, message: 'Resume analyzed successfully!',
      ...historyObj.analysis,
      data: { analysisId: historyEntry._id, resumeName: req.file.originalname, fileSize: (req.file.size / 1024).toFixed(2) + ' KB', analysis: historyObj.analysis }
    });

  } catch (error) {
    console.error('Resume Analysis Error:', error);
    
    const responseTime = Date.now() - startTime;
    await logAIUsage({
      userId: req.user?._id || req.user?.id || 'anonymous',
      userEmail: req.user?.email || 'anonymous@example.com',
      featureUsed: 'resume-analysis',
      companyName: targetRole || 'Unknown',
      jobRole: targetRole || 'Unknown',
      success: false,
      errorMessage: error.message,
      responseTime,
      req
    });
    
    if (error.message?.includes('429') || error.message?.includes('quota') || error.message?.includes('exceeded')) {
      return res.status(429).json({ 
        success: false, 
        error: 'AI quota exceeded. Please wait 60 seconds.',
        retryAfter: 60,
        code: 'AI_QUOTA_EXCEEDED'
      });
    }
    res.status(500).json({ success: false, error: 'Failed to analyze resume' });
  }
};

// ✅ generateCoverLetter
export const generateCoverLetter = async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { companyName, position, jobRole, jobDescription, profile } = req.body;
    const userId = req.user?._id || req.user?.id;
    const role = position || jobRole;

    if (!companyName || !role) return res.status(400).json({ success: false, error: 'Company name and position are required' });
    
    const rateCheck = checkRateLimit(userId, 10, 60000);
    if (!rateCheck.allowed) {
      return res.status(429).json({ 
        success: false, 
        error: `Too many requests. Please wait ${rateCheck.waitTime} seconds before trying again.`,
        retryAfter: rateCheck.waitTime,
        code: 'RATE_LIMITED'
      });
    }

    const profileText = profile ? `Applicant: ${profile.fullName || ''} | Title: ${profile.jobTitle || ''} | Skills: ${Array.isArray(profile.skills) ? profile.skills.join(', ') : profile.skills || ''}` : '';

    const randomSeed = Math.random().toString(36).substring(2, 10);
    const styles = [
      'confident and achievement-focused',
      'enthusiastic and story-driven',
      'concise and impact-oriented',
      'professional and detail-oriented',
      'warm and culture-focused'
    ];
    const chosenStyle = styles[Math.floor(Math.random() * styles.length)];
    const prompt = `Write a UNIQUE professional cover letter for ${role} at ${companyName}. Style: ${chosenStyle}. ${jobDescription ? 'Job Description: ' + jobDescription : ''} ${profileText ? 'About the applicant: ' + profileText : ''} Keep it 300-400 words, plain text only. Make it feel personal and varied — avoid generic phrases. Ref: ${randomSeed}`;

    let coverLetter;
    try {
      const response = await generateContentWithRetry(prompt, 'gemini-1.5-flash');
      coverLetter = response.text().trim();
    } catch (aiError) {
      console.warn('Gemini API Error for Cover Letter:', aiError.message);
      throw aiError;
    }

    const responseTime = Date.now() - startTime;
    await logAIUsage({
      userId,
      userEmail: req.user.email,
      featureUsed: 'cover-letter',
      companyName,
      jobRole: role,
      success: true,
      responseTime,
      req
    });

    res.json({ success: true, coverLetter });

  } catch (error) {
    console.error('Cover Letter Error:', error);
    
    const responseTime = Date.now() - startTime;
    await logAIUsage({
      userId: req.user?._id || req.user?.id || 'anonymous',
      userEmail: req.user?.email || 'anonymous@example.com',
      featureUsed: 'cover-letter',
      companyName: companyName || 'Unknown',
      jobRole: role || 'Unknown',
      success: false,
      errorMessage: error.message,
      responseTime,
      req
    });
    
    if (error.message?.includes('429') || error.message?.includes('quota')) {
      return res.status(429).json({ 
        success: false, 
        error: 'AI quota exceeded. Please wait 60 seconds.',
        retryAfter: 60,
        code: 'AI_QUOTA_EXCEEDED'
      });
    }
    if (error.message?.includes('API key') || error.message?.includes('authentication')) {
      return res.status(500).json({ success: false, error: 'Gemini API key invalid. Please check your configuration.' });
    }
    res.status(500).json({ success: false, error: 'Failed to generate cover letter' });
  }
};

// ✅ generateInterviewQA
export const generateInterviewQA = async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { companyName, position, jobRole, jobDescription, profile, existingQuestions = [] } = req.body;
    const userId = req.user?._id || req.user?.id;
    const role = position || jobRole;

    if (!companyName || !role) return res.status(400).json({ success: false, error: 'Company name and position are required' });
    
    const rateCheck = checkRateLimit(userId, 10, 60000);
    if (!rateCheck.allowed) {
      return res.status(429).json({ 
        success: false, 
        error: `Too many requests. Please wait ${rateCheck.waitTime} seconds before trying again.`,
        retryAfter: rateCheck.waitTime,
        code: 'RATE_LIMITED'
      });
    }

    const avoidPrompt = Array.isArray(existingQuestions) && existingQuestions.length > 0
      ? `\nCRITICAL: Do NOT generate any of these existing questions (ensure all generated questions are completely fresh):\n${existingQuestions.map(q => `- ${q}`).join('\n')}`
      : '';

    const randomSeed = Math.random().toString(36).substring(2, 8);
    const prompt = `Generate 10 UNIQUE and VARIED interview questions with detailed answers for the ${role} position at ${companyName}. ${jobDescription ? 'Job Description: ' + jobDescription : ''}${avoidPrompt}
IMPORTANT: Make questions fresh and different each time. Vary the difficulty and categories. Seed: ${randomSeed}.
Return ONLY valid JSON array: [{"question":"text","answer":"text","category":"Technical|Behavioral|HR|System Design|Company-Specific","difficulty":"Easy|Medium|Hard"}]`;

    let questions;
    try {
      const response = await generateContentWithRetry(prompt, 'gemini-1.5-flash');
      const text = response.text().replace(/```json/gi, '').replace(/```/g, '').trim();
      
      try {
        questions = JSON.parse(text);
      } catch (parseErr) {
        const match = text.match(/\[[\s\S]*\]/);
        if (match) questions = JSON.parse(match[0]);
        else throw new Error('Invalid JSON format from AI');
      }
    } catch (aiError) {
      console.warn('Gemini API Error for Interview QA:', aiError.message);
      throw aiError;
    }

    const finalQuestions = Array.isArray(questions) ? questions.slice(0, 10) : [];

    const responseTime = Date.now() - startTime;
    await logAIUsage({
      userId,
      userEmail: req.user.email,
      featureUsed: 'interview-qa',
      companyName,
      jobRole: role,
      success: true,
      responseTime,
      req
    });

    res.json({ success: true, questions: finalQuestions });

  } catch (error) {
    console.error('Interview QA Error:', error);
    
    const responseTime = Date.now() - startTime;
    await logAIUsage({
      userId: req.user?._id || req.user?.id || 'anonymous',
      userEmail: req.user?.email || 'anonymous@example.com',
      featureUsed: 'interview-qa',
      companyName: companyName || 'Unknown',
      jobRole: role || 'Unknown',
      success: false,
      errorMessage: error.message,
      responseTime,
      req
    });
    
    if (error.message?.includes('429') || error.message?.includes('quota')) {
      return res.status(429).json({ 
        success: false, 
        error: 'AI quota exceeded. Please wait 60 seconds.',
        retryAfter: 60,
        code: 'AI_QUOTA_EXCEEDED'
      });
    }
    if (error.message?.includes('API key') || error.message?.includes('authentication')) {
      return res.status(500).json({ success: false, error: 'Gemini API key invalid. Please check configuration.' });
    }
    res.status(500).json({ success: false, error: 'Failed to generate questions' });
  }
};

// ✅ getAnalysisHistory
export const getAnalysisHistory = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    
    const history = await AnalysisHistory.find({ userId })
      .sort({ uploadedAt: -1 })
      .limit(20);
    
    const flattenedHistory = history.map(item => {
      const obj = item.toObject();
      const analysisObj = obj.analysis || {};
      delete obj.analysis;
      return { 
        ...obj, 
        ...analysisObj, 
        score: analysisObj.score || analysisObj.overallScore || 0, 
        atsCheck: analysisObj.atsCheck || null, 
        roadmap: analysisObj.roadmap || [] 
      };
    });
    
    res.json({ 
      success: true, 
      count: flattenedHistory.length, 
      history: flattenedHistory 
    });
  } catch (error) {
    console.error('Get history error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch analysis history' });
  }
};

// ✅ getAnalysisDetail
export const getAnalysisDetail = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id || req.user.id;
    
    const analysis = await AnalysisHistory.findOne({ _id: id, userId });
    
    if (!analysis) {
      return res.status(404).json({ success: false, error: 'Analysis not found' });
    }
    
    const obj = analysis.toObject();
    const analysisObj = obj.analysis || {};
    delete obj.analysis;
    
    const flattenedAnalysis = { 
      ...obj, 
      ...analysisObj, 
      score: analysisObj.score || analysisObj.overallScore || 0, 
      atsCheck: analysisObj.atsCheck || null, 
      roadmap: analysisObj.roadmap || [] 
    };
    
    res.json({ success: true, analysis: flattenedAnalysis });
  } catch (error) {
    console.error('Get analysis detail error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch analysis detail' });
  }
};

// ✅ deleteAnalysisHistory
export const deleteAnalysisHistory = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id || req.user.id;
    
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
    
    const deleted = await AnalysisHistory.findOneAndDelete({ _id: id, userId });
    
    if (!deleted) {
      return res.status(404).json({ 
        success: false, 
        error: 'Analysis not found or you do not have permission to delete it' 
      });
    }
    
    res.json({ 
      success: true, 
      message: 'Analysis deleted successfully',
      deletedId: id 
    });
    
  } catch (error) {
    console.error('Delete analysis error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to delete analysis' 
    });
  }
};

// ✅ emailResume - PRODUCTION READY with HTML email + error handling
export const emailResume = async (req, res) => {
  try {
    const { email, targetRole, correctedResume, score, atsScore, strengths, atsCheck, roadmap } = req.body;
    
    if (!email || !correctedResume) {
      return res.status(400).json({ success: false, error: 'Email and resume content are required' });
    }
    
    // ✅ Verify env vars exist
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      return res.status(500).json({ success: false, error: 'Email credentials not configured on server' });
    }

    // ✅ Process input data robustly
    const safeStrengths = Array.isArray(strengths)
      ? strengths.map(s => typeof s === 'string' ? s.trim() : JSON.stringify(s))
      : (typeof strengths === 'string' && strengths.trim() ? [strengths.trim()] : []);

    let safeRecommendations = [];
    if (atsCheck) {
      if (Array.isArray(atsCheck.recommendations)) {
        safeRecommendations = atsCheck.recommendations.map(r => typeof r === 'string' ? r.trim() : JSON.stringify(r));
      } else if (typeof atsCheck.recommendations === 'string' && atsCheck.recommendations.trim()) {
        safeRecommendations = [atsCheck.recommendations.trim()];
      }
    }

    let safeRoadmap = [];
    if (Array.isArray(roadmap)) {
      safeRoadmap = roadmap.map(step => {
        if (step && typeof step === 'object') {
          return {
            skill: typeof step.skill === 'string' ? step.skill.trim() : 'Skill Focus',
            priority: typeof step.priority === 'string' ? step.priority.trim() : 'Medium',
            actionStep: typeof step.actionStep === 'string' ? step.actionStep.trim() : '',
            timeEstimate: typeof step.timeEstimate === 'string' ? step.timeEstimate.trim() : 'Flexible'
          };
        }
        return {
          skill: 'Skill Focus',
          priority: 'Medium',
          actionStep: typeof step === 'string' ? step.trim() : '',
          timeEstimate: 'Flexible'
        };
      }).filter(step => step.actionStep);
    }
    
    // ✅ Email sending transport and verification are handled by the unified sendEmail utility
    
    // ✅ Generate plain-text fallback
    const textContent = `
Hi there,

Here's your optimized resume for the ${targetRole} position, generated by Shortlisted AI.

📊 Overall Score: ${score || 'N/A'}/100
🎯 ATS Score: ${atsScore || 'N/A'}/100

💪 Strengths:
${safeStrengths.map(s => `• ${s}`).join('\n') || '• None identified'}

🔍 ATS Compatibility Report:
${safeRecommendations.map(r => `• ${r}`).join('\n') || '• No specific recommendations'}

🗺️ Your 90-Day Growth Roadmap:
${safeRoadmap.slice(0, 3).map(step => `• ${step.skill}: ${step.actionStep}`).join('\n') || '• No roadmap available'}

---
✨ Your Optimized Resume:
${correctedResume}

---
This resume was optimized using AI-powered ATS analysis. 
For best results, save as PDF before submitting to employers.

Generated by Shortlisted AI • ${process.env.FRONTEND_URL || 'https://shortlisted.ai'}
    `;

    // ✅ Generate premium HTML email
    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Your Optimized Resume - Shortlisted AI</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; color: #1e293b;">
        <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 680px; margin: 30px auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03); border: 1px solid #e2e8f0;">
          <!-- HEADER -->
          <tr>
            <td style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 40px 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 800; letter-spacing: -0.5px;">✨ Shortlisted AI</h1>
              <p style="color: #94a3b8; margin: 8px 0 0 0; font-size: 15px; font-weight: 500;">Your Resume is Optimized & Ready!</p>
            </td>
          </tr>

          <!-- HERO BANNER -->
          <tr>
            <td style="padding: 30px 30px 20px 30px;">
              <div style="background-color: #f0fdf4; border-left: 4px solid #16a34a; padding: 20px; border-radius: 12px;">
                <h2 style="color: #16a34a; margin: 0 0 10px 0; font-size: 18px; font-weight: 700;">🎯 Target Role: ${targetRole}</h2>
                <table cellpadding="0" cellspacing="0" width="100%">
                  <tr>
                    <td style="padding-right: 20px; width: 50%;">
                      <span style="font-size: 13px; color: #15803d; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; display: block; margin-bottom: 2px;">Overall Score</span>
                      <strong style="font-size: 28px; color: #16a34a; font-weight: 800;">${score || 'N/A'}/100</strong>
                    </td>
                    <td style="border-left: 1px solid #bbf7d0; padding-left: 20px; width: 50%;">
                      <span style="font-size: 13px; color: #15803d; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; display: block; margin-bottom: 2px;">ATS Score</span>
                      <strong style="font-size: 28px; color: #16a34a; font-weight: 800;">${atsScore || 'N/A'}/100</strong>
                    </td>
                  </tr>
                </table>
              </div>
            </td>
          </tr>

          <!-- MAIN CONTENT -->
          <tr>
            <td style="padding: 0 30px 30px 30px;">
              
              <!-- STRENGTHS -->
              ${safeStrengths.length > 0 ? `
                <h3 style="font-size: 16px; font-weight: 700; color: #0f172a; margin: 25px 0 12px 0; border-bottom: 1px solid #f1f5f9; padding-bottom: 8px;">💪 Top Strengths Identified</h3>
                <ul style="margin: 0; padding-left: 20px; color: #334155; font-size: 14px; line-height: 1.6;">
                  ${safeStrengths.map(s => `<li style="margin-bottom: 6px;">${s}</li>`).join('')}
                </ul>
              ` : ''}

              <!-- ATS CHECK -->
              ${safeRecommendations.length > 0 ? `
                <h3 style="font-size: 16px; font-weight: 700; color: #0f172a; margin: 25px 0 12px 0; border-bottom: 1px solid #f1f5f9; padding-bottom: 8px;">🔍 ATS Compatibility & Fixes</h3>
                <ul style="margin: 0; padding-left: 20px; color: #334155; font-size: 14px; line-height: 1.6;">
                  ${safeRecommendations.map(r => `<li style="margin-bottom: 6px; color: #b45309;">${r}</li>`).join('')}
                </ul>
              ` : ''}

              <!-- ROADMAP -->
              ${safeRoadmap.length > 0 ? `
                <h3 style="font-size: 16px; font-weight: 700; color: #0f172a; margin: 25px 0 12px 0; border-bottom: 1px solid #f1f5f9; padding-bottom: 8px;">🗺️ Your 90-Day Growth Roadmap</h3>
                <div style="margin-top: 12px;">
                  ${safeRoadmap.map((step, idx) => `
                    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; margin-bottom: 10px;">
                      <div style="margin-bottom: 6px;">
                        <strong style="color: #1e293b; font-size: 13px; text-transform: uppercase;">Step ${idx + 1}: ${step.skill}</strong>
                        <span style="font-size: 11px; background-color: ${step.priority === 'Critical' ? '#fee2e2' : step.priority === 'Important' ? '#fef3c7' : '#dcfce7'}; color: ${step.priority === 'Critical' ? '#b91c1c' : step.priority === 'Important' ? '#b45309' : '#15803d'}; padding: 2px 6px; border-radius: 4px; font-weight: 600; float: right;">${step.priority}</span>
                      </div>
                      <p style="margin: 0 0 6px 0; font-size: 13px; color: #475569; line-height: 1.5;">${step.actionStep}</p>
                      <span style="font-size: 11px; color: #64748b; font-weight: 500;">⏱️ Suggested duration: ${step.timeEstimate}</span>
                    </div>
                  `).join('')}
                </div>
              ` : ''}

              <!-- OPTIMIZED RESUME CONTENT -->
              <h3 style="font-size: 16px; font-weight: 700; color: #0f172a; margin: 30px 0 12px 0; border-bottom: 1px solid #f1f5f9; padding-bottom: 8px;">📄 Your Optimized Resume (Ready to Copy)</h3>
              <p style="margin: 0 0 10px 0; font-size: 12px; color: #64748b;">Below is the text version optimized for ATS parser compatibility. Copy it directly or download the formatted PDF from your dashboard.</p>
              <div style="background-color: #0f172a; border-radius: 12px; padding: 20px; overflow-x: auto; border: 1px solid #1e293b;">
                <pre style="margin: 0; font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, Courier, monospace; font-size: 12px; color: #e2e8f0; white-space: pre-wrap; line-height: 1.6;">${correctedResume}</pre>
              </div>

            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 25px 30px; text-align: center;">
              <p style="margin: 0 0 8px 0; font-size: 12px; color: #64748b; font-weight: 500;">Generated by <strong>Shortlisted AI</strong></p>
              <p style="margin: 0; font-size: 11px; color: #94a3b8; line-height: 1.5;">
                This email was sent to ${email} regarding your resume analysis request.<br>
                For best results with employers, always save your final resume in PDF format.
              </p>
              <div style="margin-top: 15px;">
                <a href="${process.env.FRONTEND_URL || 'https://shortlisted.ai'}" style="display: inline-block; padding: 8px 16px; font-size: 12px; font-weight: 600; color: #ffffff; background-color: #16a34a; text-decoration: none; border-radius: 6px; box-shadow: 0 2px 4px rgba(22, 163, 74, 0.25);">Visit Dashboard</a>
              </div>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    // ✅ Send email using the robust auto-fallback sendEmail utility
    await sendEmail({
      to: email,
      subject: `Your Optimized Resume - ${targetRole} • Shortlisted AI`,
      text: textContent,
      html: emailHtml
    });
    
    res.json({ success: true, message: 'Resume sent successfully!' });
    
  } catch (error) {
    console.error('❌ Email send failed:', error.message);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to send email. Please check server logs.' 
    });
  }
};

// ✅ exportATSReport
export const exportATSReport = async (req, res) => {
  try {
    const { targetRole, score, atsCheck, roadmap, strengths, weaknesses } = req.body;
    
    if (!targetRole || !atsCheck) {
      return res.status(400).json({ success: false, message: 'Missing required data for PDF generation.' });
    }

    const doc = new PDFDocument({ margin: 50, size: 'A4', layout: 'portrait', bufferPages: true });
    const buffers = [];
    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => {
      const pdfData = Buffer.concat(buffers);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="ATS_Report_${targetRole.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf"`);
      res.send(pdfData);
    });

    const colors = { 
      primary: '#16a34a', 
      secondary: '#0f172a', 
      accent: '#3b82f6', 
      warning: '#f59e0b', 
      error: '#ef4444', 
      success: '#10b981', 
      dark: '#1e293b', 
      light: '#f8fafc', 
      gray: '#64748b' 
    };

    // HEADER
    const headerHeight = 100;
    const gradient = doc.linearGradient(0, 0, doc.page.width, headerHeight);
    gradient.stop(0, colors.secondary); 
    gradient.stop(1, colors.dark);
    doc.rect(0, 0, doc.page.width, headerHeight).fill(gradient);
    doc.fontSize(32).font('Helvetica-Bold').fillColor('#ffffff').text('Shortlisted AI', 50, 30);
    doc.fontSize(16).font('Helvetica').fillColor('#94a3b8').text('ATS Compatibility Report', 50, 60);
    doc.fontSize(11).fillColor('#64748b').text(`Generated: ${new Date().toLocaleDateString()}`, 50, 80);
    doc.roundedRect(doc.page.width - 250, 35, 200, 35, 6).fill(colors.primary);
    doc.fontSize(11).font('Helvetica').fillColor('#ffffff').text('Target Role', doc.page.width - 240, 42);
    doc.fontSize(13).font('Helvetica-Bold').text(targetRole, doc.page.width - 240, 57);

    // PAGE 1: OVERVIEW
    let yPos = 120;
    const cardWidth = (doc.page.width - 120) / 2;
    
    // Overall Score Card
    doc.roundedRect(50, yPos, cardWidth, 120, 10).fill('#ffffff').stroke('#e2e8f0', 1);
    doc.fontSize(14).font('Helvetica-Bold').fillColor(colors.secondary).text('Overall Score', 60, yPos + 15);
    const scoreColor = score >= 80 ? colors.success : score >= 50 ? colors.warning : colors.error;
    doc.circle(110, yPos + 70, 35).stroke('#e2e8f0', 3);
    doc.circle(110, yPos + 70, 30).fill('#ffffff');
    doc.fontSize(20).font('Helvetica-Bold').fillColor(scoreColor).text(`${score}`, 95, yPos + 60);
    doc.fontSize(11).font('Helvetica').fillColor(colors.gray).text(score >= 80 ? 'Excellent!' : score >= 50 ? 'Good, but needs improvements' : 'Needs work', 155, yPos + 50, { width: cardWidth - 115 });
    
    // ATS Score Card
    doc.roundedRect(50 + cardWidth + 20, yPos, cardWidth, 120, 10).fill('#ffffff').stroke('#e2e8f0', 1);
    doc.fontSize(14).font('Helvetica-Bold').fillColor(colors.secondary).text('ATS Score', 60 + cardWidth + 20, yPos + 15);
    const atsScore = atsCheck.overallScore || 0;
    const atsColor = atsScore >= 80 ? colors.success : atsScore >= 50 ? colors.warning : colors.error;
    doc.circle(110 + cardWidth + 20, yPos + 70, 35).stroke('#e2e8f0', 3);
    doc.circle(110 + cardWidth + 20, yPos + 70, 30).fill('#ffffff');
    doc.fontSize(20).font('Helvetica-Bold').fillColor(atsColor).text(`${atsScore}`, 95 + cardWidth + 20, yPos + 60);
    doc.fontSize(11).font('Helvetica').fillColor(colors.gray).text(atsScore >= 80 ? 'Highly ATS-friendly' : atsScore >= 50 ? 'Moderately compatible' : 'Low compatibility', 155 + cardWidth + 20, yPos + 50, { width: cardWidth - 115 });
    
    yPos += 150;
    
    // Keyword Analysis Card
    doc.roundedRect(50, yPos, doc.page.width - 100, 160, 10).fill('#ffffff').stroke('#e2e8f0', 1);
    doc.fontSize(16).font('Helvetica-Bold').fillColor(colors.secondary).text('Keyword Analysis', 60, yPos + 15);
    const keywords = atsCheck.keywordMatch || {};
    const keywordScore = keywords.score || 0;
    doc.fontSize(12).font('Helvetica').fillColor(colors.gray).text('Keyword Match Score:', 60, yPos + 45);
    doc.roundedRect(220, yPos + 42, 200, 18, 4).fill('#e2e8f0');
    const progressWidth = (keywordScore / 100) * 200;
    doc.roundedRect(220, yPos + 42, progressWidth, 18, 4).fill(keywordScore >= 80 ? colors.success : keywordScore >= 50 ? colors.warning : colors.error);
    doc.fontSize(11).font('Helvetica-Bold').fillColor(colors.secondary).text(`${keywordScore}%`, 430, yPos + 43);
    doc.fontSize(11).font('Helvetica-Bold').fillColor(colors.success).text('Matched Keywords:', 60, yPos + 75);
    doc.fontSize(10).font('Helvetica').fillColor(colors.gray).text((keywords.matchedKeywords || []).slice(0, 8).join(' | '), 60, yPos + 90, { width: doc.page.width - 120 });
    if ((keywords.missingKeywords || []).length > 0) {
      doc.fontSize(11).font('Helvetica-Bold').fillColor(colors.error).text('Missing Keywords:', 60, yPos + 115);
      doc.fontSize(10).font('Helvetica').fillColor(colors.gray).text((keywords.missingKeywords || []).slice(0, 6).join(' | '), 60, yPos + 130, { width: doc.page.width - 120 });
    }
    
    yPos += 175;
    
    // Formatting Compliance Card
    doc.roundedRect(50, yPos, doc.page.width - 100, 180, 10).fill('#ffffff').stroke('#e2e8f0', 1);
    doc.fontSize(16).font('Helvetica-Bold').fillColor(colors.secondary).text('Formatting Compliance', 60, yPos + 15);
    const formatting = atsCheck.formatting || {};
    const checks = [
      { label: 'No tables or text boxes', pass: !formatting.hasTables },
      { label: 'No images/graphics', pass: !formatting.hasGraphics },
      { label: 'Single-column layout', pass: !formatting.hasColumns },
      { label: 'Standard section headings', pass: formatting.usesStandardHeadings },
      { label: 'ATS-friendly fonts', pass: formatting.fontCompatibility !== 'Poor' },
    ];
    let checkY = yPos + 45;
    checks.forEach((check, i) => {
      const y = checkY + (i * 28);
      doc.fontSize(11).font('Helvetica').fillColor(check.pass ? colors.success : colors.error).text(check.pass ? '[PASS]' : '[FAIL]', 60, y);
      doc.fillColor(check.pass ? colors.secondary : colors.error).text(check.label, 130, y);
    });
    
    // PAGE 2: RECOMMENDATIONS & ROADMAP
    doc.addPage();
    yPos = 50;
    
    if (atsCheck.recommendations?.length > 0) {
      doc.roundedRect(50, yPos, doc.page.width - 100, 100 + (atsCheck.recommendations.length * 25), 10).fill('#ffffff').stroke('#e2e8f0', 1);
      doc.fontSize(16).font('Helvetica-Bold').fillColor(colors.secondary).text('Actionable Recommendations', 60, yPos + 15);
      atsCheck.recommendations.forEach((rec, i) => {
        const itemY = yPos + 45 + (i * 25);
        doc.fontSize(11).font('Helvetica').fillColor(colors.secondary).text(`${i + 1}. ${rec}`, 60, itemY, { width: doc.page.width - 120 });
      });
      yPos += 120 + (atsCheck.recommendations.length * 25);
    }
    
    if (roadmap?.length > 0) {
      doc.roundedRect(50, yPos, doc.page.width - 100, 100 + (Math.min(roadmap.length, 4) * 65), 10).fill('#ffffff').stroke('#e2e8f0', 1);
      doc.fontSize(16).font('Helvetica-Bold').fillColor(colors.secondary).text('90-Day Growth Roadmap', 60, yPos + 15);
      roadmap.slice(0, 4).forEach((step, i) => {
        const itemY = yPos + 45 + (i * 65);
        const priorityColor = step.priority === 'Critical' ? colors.error : step.priority === 'Important' ? colors.warning : colors.success;
        doc.fontSize(9).font('Helvetica-Bold').fillColor('#ffffff').text(step.priority.toUpperCase(), doc.page.width - 120, itemY + 8);
        doc.fontSize(12).font('Helvetica-Bold').fillColor(colors.secondary).text(step.skill, 60, itemY + 8);
        doc.fontSize(10).font('Helvetica').fillColor(colors.gray).text(step.actionStep, 60, itemY + 24, { width: doc.page.width - 200 });
        doc.fontSize(9).font('Helvetica').fillColor(colors.accent).text(`Time: ${step.timeEstimate}`, 60, itemY + 45);
      });
    }
    
    // Footer
    const footerY = doc.page.height - 50;
    doc.fontSize(9).font('Helvetica').fillColor(colors.gray).text('Generated by Shortlisted AI - Confidential', doc.page.width / 2, footerY, { align: 'center' });
    
    // Page numbers
    const pageCount = doc.bufferedPageRange ? doc.bufferedPageRange().count : 1;
    for (let i = 0; i < pageCount; i++) {
      if (doc.switchToPage) doc.switchToPage(i);
      doc.fontSize(8).fillColor('#94a3b8').text(`Page ${i + 1} of ${pageCount}`, doc.page.width - 100, doc.page.height - 25);
    }

    doc.end();

  } catch (error) {
    console.error('PDF generation error:', error);
    res.status(500).json({ success: false, message: 'Failed to generate PDF report.' });
  }
};

// ✅ EXPORTS - ALL FUNCTIONS INCLUDED
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