// server/controllers/aiController.js - FULLY UPDATED WITH USAGE TRACKING

// ✅ 1. IMPORTS
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
import PDFDocument from 'pdfkit';
const pdfParse = require('pdf-parse');
import { GoogleGenerativeAI } from '@google/generative-ai';
import AnalysisHistory from '../models/AnalysisHistory.js';
import AIUsageLog from '../models/AIUsageLog.js'; // ✅ Usage tracking model
import { logAIUsage } from '../utils/aiUsageLogger.js'; // ✅ Logger utility

// ✅ 2. RATE LIMITING
const rateLimitStore = new Map();
const checkRateLimit = (userId, limit = 20, windowMs = 60000) => {
  const now = Date.now();
  const userRequests = rateLimitStore.get(userId) || [];
  const recentRequests = userRequests.filter(timestamp => now - timestamp < windowMs);
  if (recentRequests.length >= limit) return false;
  recentRequests.push(now);
  rateLimitStore.set(userId, recentRequests);
  return true;
};

// ✅ API Key Rotation & Fallback to bypass Rate Limits
let currentKeyIndex = 0;
const generateContentWithRetry = async (prompt, modelName = 'gemini-2.0-flash', retries = 0) => {
  const keys = (process.env.GEMINI_API_KEY || '').split(',').map(k => k.trim()).filter(k => k);
  if (keys.length === 0) throw new Error("GEMINI_API_KEY is not set in .env");
  
  const keyToUse = keys[currentKeyIndex];
  const genAI = new GoogleGenerativeAI(keyToUse);
  const model = genAI.getGenerativeModel({ model: modelName });

  try {
    const result = await model.generateContent(prompt);
    return await result.response;
  } catch (error) {
    if ((error.message?.includes('429') || error.message?.includes('quota') || error.message?.includes('exceeded')) && keys.length > 1 && retries < keys.length) {
      console.warn(`API Key ${currentKeyIndex + 1} hit rate limit. Rotating to next key...`);
      currentKeyIndex = (currentKeyIndex + 1) % keys.length;
      return generateContentWithRetry(prompt, modelName, retries + 1);
    }
    throw error;
  }
};

// ✅ 2.1 CACHING
const aiCache = new Map();
setInterval(() => aiCache.clear(), 30 * 60 * 1000);
const getCacheKey = (type, data) => {
  const sorted = Object.keys(data).sort().reduce((acc, key) => { acc[key] = data[key]; return acc; }, {});
  return `${type}:${JSON.stringify(sorted)}`;
};

// ✅ 3. CONTROLLER FUNCTIONS

export const analyzeResume = async (req, res) => {
  const startTime = Date.now(); // ✅ Track start time
  
  try {
    const { targetRole = 'Software Engineer', jobDescription = '' } = req.body || {};
    if (!req.file) return res.status(400).json({ success: false, error: 'No file uploaded' });
    if (req.file.size > 5 * 1024 * 1024) return res.status(413).json({ success: false, error: 'File too large' });

    let extractedText;
    try {
      const ext = req.file.originalname ? req.file.originalname.split('.').pop().toLowerCase() : '';
      if (req.file.mimetype === 'application/pdf' || ext === 'pdf') {
        const pdfParseData = await pdfParse(req.file.buffer);
        extractedText = pdfParseData.text;
      } else if (req.file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || ext === 'docx') {
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
        return res.status(400).json({ success: false, error: 'Could not extract text' });
      }
    } catch (parseError) {
      console.error('FILE PARSING ERROR:', parseError);
      return res.status(500).json({ success: false, error: `Failed to parse file: ${parseError.message}` });
    }

    let analysis;
    try {
      const prompt = `You are an expert ATS optimizer. Analyze resume for role: "${targetRole}". ${jobDescription ? `Job Description:\n${jobDescription}\n` : ''}
Return ONLY valid JSON: { "score": number, "atsScore": number, "keywordScore": number, "formattingScore": number, "overallScore": number, "strengths": [], "weaknesses": [], "missingSkills": [], "missingKeywords": [], "improvements": [], "detectedSkills": [], "experienceLevel": "string", "correctedResume": "string", "roadmap": [], "issues": [], "atsCheck": { "overallScore": number, "keywordMatch": { "matchedKeywords": [], "missingKeywords": [] }, "formatting": { "hasTables": boolean, "hasGraphics": boolean, "hasColumns": boolean, "usesStandardHeadings": boolean, "fontCompatibility": "string", "issues": [] }, "recommendations": [] } }
Resume Text: ${extractedText.substring(0, 4000)}`;
      
      const response = await generateContentWithRetry(prompt, 'gemini-2.0-flash');
      const text = response.text();
      
      try {
        const cleanText = text.replace(/```json/gi, '').replace(/```/g, '').trim();
        analysis = JSON.parse(cleanText);
      } catch (parseErr) {
        // Fallback: extract JSON object via regex if there's extra conversational text
        const match = text.match(/\{[\s\S]*\}/);
        if (match) {
          analysis = JSON.parse(match[0]);
        } else {
          throw new Error('Invalid JSON format from AI');
        }
      }
    } catch (aiError) {
      console.warn('Gemini API Error for Resume Analysis:', aiError.message);
      throw aiError;
    }

    const overallScore = analysis.score || analysis.overallScore || Math.round((analysis.atsScore + analysis.keywordScore + analysis.formattingScore) / 3);
    analysis.score = overallScore;
    analysis.overallScore = overallScore;
    
    const userId = req.user?._id || req.user?.id;
    if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const historyEntry = await AnalysisHistory.create({
      userId, resumeName: req.file.originalname, uploadedAt: new Date(), analysis: { ...analysis }
    });

    // ✅ LOG SUCCESSFUL USAGE - Matches your AIUsageLog schema exactly
    const responseTime = Date.now() - startTime;
    await logAIUsage({
      userId,
      userEmail: req.user?.email || 'unknown',
      featureUsed: 'resume-analysis',
      jobRole: targetRole,
      success: true,
      tokenCount: Math.round(extractedText?.length / 4), // ✅ Matches your schema field name
      responseTime,
      modelUsed: 'gemini-2.0-flash', // ✅ Added per your schema
      ipAddress: req?.ip || req?.connection?.remoteAddress, // ✅ Added per your schema
      userAgent: req?.get('User-Agent'), // ✅ Added per your schema
      req // ✅ Pass req for IP/userAgent extraction in logger
    });

    res.json({
      success: true, message: 'Resume analyzed successfully!',
      ...historyEntry.analysis.toObject(),
      data: { analysisId: historyEntry._id, resumeName: req.file.originalname, fileSize: (req.file.size / 1024).toFixed(2) + ' KB', analysis: historyEntry.analysis }
    });

  } catch (error) {
    console.error('Resume Analysis Error:', error);
    
    // ✅ LOG FAILED USAGE
    const responseTime = Date.now() - startTime;
    await logAIUsage({
      userId: req.user?._id || req.user?.id,
      userEmail: req.user?.email || 'unknown',
      featureUsed: 'resume-analysis',
      success: false,
      errorMessage: error.message,
      responseTime,
      modelUsed: 'gemini-2.0-flash',
      ipAddress: req?.ip || req?.connection?.remoteAddress,
      userAgent: req?.get('User-Agent'),
      req
    });
    if (error.message?.includes('429') || error.message?.includes('quota') || error.message?.includes('exceeded')) {
      return res.status(429).json({ success: false, error: 'AI quota exceeded. Please wait 1 minute.' });
    }
    res.status(500).json({ success: false, error: 'Failed to analyze resume' });
  }
};

export const generateCoverLetter = async (req, res) => {
  const startTime = Date.now(); // ✅ Track start time
  
  try {
    const { companyName, position, jobRole, jobDescription, profile } = req.body;
    const userId = req.user?._id || req.user?.id;
    const role = position || jobRole;

    if (!companyName || !role) return res.status(400).json({ success: false, error: 'Company name and position are required' });
    if (!checkRateLimit(userId, 20, 60000)) return res.status(429).json({ success: false, error: 'Please wait 30 seconds before generating again.' });

    const profileText = profile ? `Applicant: ${profile.fullName || ''} | Title: ${profile.jobTitle || ''} | Skills: ${Array.isArray(profile.skills) ? profile.skills.join(', ') : profile.skills || ''}` : '';

    // Random seed + varied style instruction so each generation is unique
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

    // ✅ Never cache cover letters — always generate fresh unique content
    // (caching was causing repeated identical letters on regenerate)

    let coverLetter;
    try {
      const response = await generateContentWithRetry(prompt, 'gemini-2.0-flash');
      coverLetter = response.text().trim();
    } catch (aiError) {
      console.warn('Gemini API Error for Cover Letter:', aiError.message);
      throw aiError;
    }

    // ✅ LOG SUCCESSFUL USAGE
    const responseTime = Date.now() - startTime;
    await logAIUsage({
      userId,
      userEmail: req.user?.email || 'unknown',
      featureUsed: 'cover-letter',
      companyName,
      jobRole: role,
      success: true,
      tokenCount: Math.round(coverLetter?.length / 4),
      responseTime,
      modelUsed: 'gemini-2.0-flash',
      ipAddress: req?.ip || req?.connection?.remoteAddress,
      userAgent: req?.get('User-Agent'),
      req
    });

    res.json({ success: true, coverLetter });

  } catch (error) {
    console.error('Cover Letter Error:', error);
    
    // ✅ LOG FAILED USAGE
    const responseTime = Date.now() - startTime;
    await logAIUsage({
      userId: req.user?._id || req.user?.id,
      userEmail: req.user?.email || 'unknown',
      featureUsed: 'cover-letter',
      companyName: req.body.companyName,
      jobRole: req.body.position || req.body.jobRole,
      success: false,
      errorMessage: error.message,
      responseTime,
      modelUsed: 'gemini-2.0-flash',
      ipAddress: req?.ip || req?.connection?.remoteAddress,
      userAgent: req?.get('User-Agent'),
      req
    });
    
    if (error.message?.includes('429') || error.message?.includes('quota')) {
      return res.status(429).json({ success: false, error: 'AI quota exceeded. Please wait 1 minute.' });
    }
    if (error.message?.includes('API key') || error.message?.includes('authentication')) {
      return res.status(500).json({ success: false, error: 'Gemini API key invalid. Please check your configuration.' });
    }
    res.status(500).json({ success: false, error: 'Failed to generate cover letter' });
  }
};

export const generateInterviewQA = async (req, res) => {
  const startTime = Date.now(); // ✅ Track start time
  
  try {
    const { companyName, position, jobRole, jobDescription, profile } = req.body;
    const userId = req.user?._id || req.user?.id;
    const role = position || jobRole;

    if (!companyName || !role) return res.status(400).json({ success: false, error: 'Company name and position are required' });
    if (!checkRateLimit(userId, 20, 60000)) return res.status(429).json({ success: false, error: 'Please wait 30 seconds before generating again.' });

    // Add random seed + timestamp so Gemini always generates fresh unique questions
    const randomSeed = Math.random().toString(36).substring(2, 8);
    const prompt = `Generate 10 UNIQUE and VARIED interview questions with detailed answers for the ${role} position at ${companyName}. ${jobDescription ? 'Job Description: ' + jobDescription : ''}
IMPORTANT: Make questions fresh and different each time. Vary the difficulty and categories. Seed: ${randomSeed}.
Return ONLY valid JSON array: [{"question":"text","answer":"text","category":"Technical|Behavioral|HR|System Design|Company-Specific","difficulty":"Easy|Medium|Hard"}]`;

    // ✅ Never cache interview questions — always generate fresh ones for "New Questions"
    // (cover-letter caching is fine since it rarely needs regeneration)

    let questions;
    try {
      const response = await generateContentWithRetry(prompt, 'gemini-2.0-flash');
      const text = response.text().replace(/```json/g, '').replace(/```/g, '').trim();
      
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

    // ✅ LOG SUCCESSFUL USAGE
    const responseTime = Date.now() - startTime;
    await logAIUsage({
      userId,
      userEmail: req.user?.email || 'unknown',
      featureUsed: 'interview-qa',
      companyName,
      jobRole: role,
      success: true,
      tokenCount: finalQuestions?.length * 50,
      responseTime,
      modelUsed: 'gemini-2.0-flash',
      ipAddress: req?.ip || req?.connection?.remoteAddress,
      userAgent: req?.get('User-Agent'),
      req
    });

    res.json({ success: true, questions: finalQuestions });

  } catch (error) {
    console.error('Interview QA Error:', error);
    
    // ✅ LOG FAILED USAGE
    const responseTime = Date.now() - startTime;
    await logAIUsage({
      userId: req.user?._id || req.user?.id,
      userEmail: req.user?.email || 'unknown',
      featureUsed: 'interview-qa',
      companyName: req.body.companyName,
      jobRole: req.body.position || req.body.jobRole,
      success: false,
      errorMessage: error.message,
      responseTime,
      modelUsed: 'gemini-2.0-flash',
      ipAddress: req?.ip || req?.connection?.remoteAddress,
      userAgent: req?.get('User-Agent'),
      req
    });
    
    if (error.message?.includes('429') || error.message?.includes('quota')) {
      return res.status(429).json({ success: false, error: 'AI quota exceeded. Please wait 1 minute.' });
    }
    if (error.message?.includes('API key') || error.message?.includes('authentication')) {
      return res.status(500).json({ success: false, error: 'Gemini API key invalid. Please check configuration.' });
    }
    res.status(500).json({ success: false, error: 'Failed to generate questions' });
  }
};

export const getAnalysisHistory = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const history = await AnalysisHistory.find({ userId }).sort({ uploadedAt: -1 }).limit(20);
    const flattenedHistory = history.map(item => {
      const obj = item.toObject();
      const analysisObj = obj.analysis || {};
      delete obj.analysis;
      return { ...obj, ...analysisObj, score: analysisObj.score || analysisObj.overallScore || 0, atsCheck: analysisObj.atsCheck || null, roadmap: analysisObj.roadmap || [] };
    });
    res.json({ success: true, count: history.length, history: flattenedHistory });
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
    const obj = analysis.toObject();
    const analysisObj = obj.analysis || {};
    delete obj.analysis;
    const flattenedAnalysis = { ...obj, ...analysisObj, score: analysisObj.score || analysisObj.overallScore || 0, atsCheck: analysisObj.atsCheck || null, roadmap: analysisObj.roadmap || [] };
    res.json({ success: true, analysis: flattenedAnalysis });
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
    if (!email || !correctedResume) return res.status(400).json({ success: false, error: 'Email and resume required' });
    const nodemailer = require('nodemailer');
    const transporter = nodemailer.createTransport({ service: 'gmail', auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS } });
    await transporter.sendMail({ from: process.env.EMAIL_USER, to: email, subject: `Your Optimized Resume - ${targetRole}`, text: `Overall Score: ${score}/100\n\n${correctedResume}` });
    res.json({ success: true, message: 'Email sent successfully!' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to send email' });
  }
};

export const exportATSReport = async (req, res) => {
  try {
    const { targetRole, score, atsCheck, roadmap, strengths, weaknesses } = req.body;
    if (!targetRole || !atsCheck) return res.status(400).json({ success: false, message: 'Missing required data for PDF generation.' });

    const doc = new PDFDocument({ margin: 50, size: 'A4', layout: 'portrait', bufferPages: true });
    const buffers = [];
    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => {
      const pdfData = Buffer.concat(buffers);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="ATS_Report_${targetRole.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf"`);
      res.send(pdfData);
    });

    const colors = { primary: '#16a34a', secondary: '#0f172a', accent: '#3b82f6', warning: '#f59e0b', error: '#ef4444', success: '#10b981', dark: '#1e293b', light: '#f8fafc', gray: '#64748b' };

    // HEADER
    const headerHeight = 100;
    const gradient = doc.linearGradient(0, 0, doc.page.width, headerHeight);
    gradient.stop(0, colors.secondary); gradient.stop(1, colors.dark);
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

// ✅ 4. EXPORTS
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