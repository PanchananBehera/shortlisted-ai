// server/controllers/aiController.js
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createRequire } from 'module';
import nodemailer from 'nodemailer'; // ✅ Email import
import PDFDocument from 'pdfkit'; // ✅ PDF import - ADD THIS

const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');
import mammoth from 'mammoth';
import AnalysisHistory from '../models/AnalysisHistory.js';

// Helper to get Gemini model after env vars are loaded
const getModel = () => {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  return genAI.getGenerativeModel({ model: 'gemini-flash-latest' });
};

// 🔁 Helper: Extract text from uploaded file buffer
const extractTextFromFile = async (file) => {
  if (!file) throw new Error('No file provided');
  
  const mimetype = file.mimetype || file.type || '';
  const ext = file.originalname ? file.originalname.split('.').pop().toLowerCase() : '';
  
  if (mimetype === 'application/pdf' || ext === 'pdf') {
    const data = await pdfParse(file.buffer);
    return data.text;
  } else if (mimetype.includes('word') || mimetype.includes('document') || ext === 'docx') {
    const result = await mammoth.extractRawText({ buffer: file.buffer });
    return result.value;
  } else if (mimetype === 'text/plain' || ext === 'txt') {
    return file.buffer.toString('utf-8');
  }
  
  throw new Error('Unsupported file format. Please upload PDF, DOCX, or TXT.');
};

// ✅ NEW: Save analysis to history
export const saveAnalysisHistory = async (userId, analysisData) => {
  try {
    await AnalysisHistory.create({
      userId,
      targetRole: analysisData.targetRole,
      jobDescription: analysisData.jobDescription,
      score: analysisData.score,
      strengths: analysisData.strengths,
      weaknesses: analysisData.weaknesses,
      missingSkills: analysisData.missingSkills,
      improvements: analysisData.improvements,
      issues: analysisData.issues,
      atsCheck: analysisData.atsCheck,
      roadmap: analysisData.roadmap,
      correctedResume: analysisData.correctedResume,
      fileName: analysisData.fileName
    });
    return { success: true };
  } catch (error) {
    console.error('Failed to save analysis history:', error);
    return { success: false, error: error.message };
  }
};

// ✅ NEW: Get user's analysis history
export const getAnalysisHistory = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const history = await AnalysisHistory.find({ userId })
      .sort({ createdAt: -1 })
      .limit(50);

    res.json({ success: true, history });
  } catch (error) {
    console.error('Failed to fetch analysis history:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch history' });
  }
};

// ✅ NEW: Get single analysis detail (with full resume text)
export const getAnalysisDetail = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const analysis = await AnalysisHistory.findOne({ _id: id, userId });
    
    if (!analysis) {
      return res.status(404).json({ success: false, message: 'Analysis not found' });
    }

    res.json({ success: true, analysis });
  } catch (error) {
    console.error('Failed to fetch analysis detail:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch analysis' });
  }
};

// ✅ NEW: Delete analysis from history
export const deleteAnalysisHistory = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const result = await AnalysisHistory.deleteOne({ _id: id, userId });
    
    if (result.deletedCount === 0) {
      return res.status(404).json({ success: false, message: 'Analysis not found' });
    }

    res.json({ success: true, message: 'Analysis deleted successfully' });
  } catch (error) {
    console.error('Failed to delete analysis:', error);
    res.status(500).json({ success: false, message: 'Failed to delete analysis' });
  }
};

// ✨ Generate Cover Letter
export const generateCoverLetter = async (req, res) => {
  try {
    const { 
      companyName, 
      jobRole, 
      jobDescription, 
      profile, 
      regenerate 
    } = req.body;

    if (!companyName || !jobRole || !jobDescription) {
      return res.status(400).json({ 
        success: false, 
        message: 'Company name, job role, and job description are required' 
      });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ 
        success: false, 
        message: 'Gemini API key not configured' 
      });
    }

    const profileSection = profile ? `
ABOUT THE CANDIDATE:
- Name: ${profile.fullName || 'the candidate'}
- Current Role: ${profile.jobTitle || 'Professional'}
- Experience: ${profile.experience || 'Not specified'}
- Key Skills: ${profile.skills || 'Not specified'}
- Professional Summary: ${profile.summary || 'Not specified'}
- Education: ${profile.education || 'Not specified'}
- Notable Projects: ${profile.projects || 'Not specified'}
`.trim() : '';

    const regenerationInstruction = regenerate 
      ? '\n\n⚠️ IMPORTANT: This is a REGENERATION request. Write a COMPLETELY DIFFERENT cover letter. Use a different opening hook, different structure, and different vocabulary.' 
      : '';

    const prompt = `
You are a professional career coach and expert cover letter writer.

TASK: Write a compelling, personalized cover letter for a ${jobRole} position at ${companyName}.

JOB DESCRIPTION:
${jobDescription}

${profileSection}

REQUIREMENTS:
1. Keep it concise (250-350 words max)
2. Use a professional but warm tone
3. Highlight how the candidate's skills match the job requirements
4. Include specific examples from their experience where possible
5. End with a strong call-to-action
6. Format with proper spacing and paragraphs (no markdown)
${regenerationInstruction}

Write the cover letter now:
`.trim();

    const result = await getModel().generateContent(prompt);
    const coverLetter = result.response.text().trim();

    res.json({
      success: true,
      coverLetter
    });

  } catch (error) {
    console.error('❌ Cover letter generation error:', error);
    
    if (error.status === 429 || error.message?.includes('429')) {
      return res.status(429).json({ 
        success: false, 
        message: 'AI Rate limit exceeded. You are generating too fast! Please wait 15-30 seconds and try again.' 
      });
    }

    res.status(500).json({ 
      success: false, 
      message: 'Failed to generate cover letter',
      error: error.message 
    });
  }
};

// ❓ Generate Interview Q&A
export const generateInterviewQA = async (req, res) => {
  try {
    const { 
      companyName, 
      jobRole, 
      jobDescription, 
      profile, 
      existingQuestions, 
      regenerate 
    } = req.body;

    if (!companyName || !jobRole || !jobDescription) {
      return res.status(400).json({ 
        success: false, 
        message: 'Company name, job role, and job description are required' 
      });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ 
        success: false, 
        message: 'Gemini API key not configured' 
      });
    }

    const profileSection = profile ? `
CANDIDATE BACKGROUND:
- Name: ${profile.fullName || 'the candidate'}
- Role: ${profile.jobTitle || 'Professional'}
- Experience: ${profile.experience || 'Not specified'}
- Skills: ${profile.skills || 'Not specified'}
`.trim() : '';

    const avoidQuestions = (regenerate && existingQuestions?.length > 0)
      ? `\n\n⚠️ CRITICAL INSTRUCTION: DO NOT REPEAT ANY OF THESE PREVIOUS QUESTIONS:\n${existingQuestions.map((q, i) => `${i + 1}. ${q}`).join('\n')}\n\nYou MUST generate 10 COMPLETELY NEW and UNIQUE questions that were NOT asked before.`
      : '';

    const prompt = `
You are an expert technical interviewer and career coach.

TASK: Generate 10 personalized, COMPANY-SPECIFIC interview questions with suggested answers for a ${jobRole} position at ${companyName}.
Make sure the questions reflect ${companyName}'s industry, products, and the specific context of the job description.

JOB DESCRIPTION:
${jobDescription}

${profileSection}

REQUIREMENTS:
1. Generate exactly 10 questions.
2. Mix of categories: Technical, System Design, Behavioral, Company-Specific, HR.
3. Include difficulty level: MUST include exactly 3 "Easy", 4 "Medium", and 3 "Hard" questions.
4. For each question, provide a concise suggested answer (2-3 sentences).
5. Tailor questions to the candidate's skills and experience where relevant.
6. Format as JSON array with this exact structure:
   [
     {
       "question": "Question text here",
       "answer": "Suggested answer here",
       "category": "Technical|System Design|Behavioral|Company-Specific|HR",
       "difficulty": "Easy|Medium|Hard"
     }
   ]
${avoidQuestions}

Return ONLY the JSON array, no other text.
`.trim();

    const result = await getModel().generateContent(prompt);
    let responseText = result.response.text().trim();

    responseText = responseText.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    
    let questions;
    try {
      questions = JSON.parse(responseText);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        questions = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('Failed to parse AI response as JSON');
      }
    }

    if (!Array.isArray(questions) || questions.length !== 10) {
      throw new Error('AI did not return exactly 10 questions');
    }

    const difficultyOrder = { 'Easy': 1, 'Medium': 2, 'Hard': 3 };
    questions.sort((a, b) => {
      const d1 = difficultyOrder[a.difficulty] || 4;
      const d2 = difficultyOrder[b.difficulty] || 4;
      return d1 - d2;
    });

    res.json({
      success: true,
      questions
    });

  } catch (error) {
    console.error('❌ Interview QA generation error:', error);
    
    if (error.status === 429 || error.message?.includes('429')) {
      return res.status(429).json({ 
        success: false, 
        message: 'AI Rate limit exceeded. You are generating too fast! Please wait 15-30 seconds and try again.' 
      });
    }

    res.status(500).json({ 
      success: false, 
      message: 'Failed to generate interview questions',
      error: error.message 
    });
  }
};

// 🚀 Analyze & Optimize Resume (WITH ATS CHECKER + HISTORY SAVE)
export const analyzeResume = async (req, res) => {
  try {
    const file = req.file;
    const targetRole = req.body.targetRole || 'Software Engineer';
    const jobDescription = req.body.jobDescription || '';
    const userId = req.user?.id;

    if (!file) {
      return res.status(400).json({ 
        success: false, 
        message: 'Resume file is required' 
      });
    }

    if (file.size > 5 * 1024 * 1024) {
      return res.status(400).json({ 
        success: false, 
        message: 'File size must be less than 5MB' 
      });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ 
        success: false, 
        message: 'Gemini API key not configured' 
      });
    }

    let resumeText;
    try {
      resumeText = await extractTextFromFile(file);
    } catch (extractError) {
      return res.status(400).json({ 
        success: false, 
        message: extractError.message || 'Failed to read resume file' 
      });
    }

    if (!resumeText || !resumeText.trim()) {
      return res.status(400).json({ 
        success: false, 
        message: 'Resume appears empty or unreadable. Please try a different file.' 
      });
    }

    const prompt = `
You are an elite ATS-optimized resume consultant and career coach for the role: ${targetRole}.

Analyze this resume for BOTH quality AND ATS compatibility. Return STRICT VALID JSON matching this schema:
{
  "score": number (0-100),
  "strengths": string[],
  "weaknesses": string[],
  "missingSkills": string[],
  "improvements": string[],
  "correctedResume": "Full rewritten, professional, ATS-friendly version. Fix grammar, strengthen action verbs, quantify achievements, remove fluff, optimize formatting.",
  "roadmap": [
    { 
      "skill": "Topic/Skill to learn", 
      "priority": "Critical|Important|Optional", 
      "timeEstimate": "e.g. 2 weeks", 
      "resources": ["Course/Doc name", "Practice platform"], 
      "actionStep": "Specific practice or project to complete" 
    }
  ],
  "issues": [
    { "type": "Grammar|Formatting|Keyword|Structure|Impact", "description": "Clear, actionable issue", "severity": "High|Medium|Low" }
  ],
  
  "atsCheck": {
    "overallScore": number (0-100),
    "keywordMatch": {
      "score": number,
      "matchedKeywords": string[],
      "missingKeywords": string[]
    },
    "formatting": {
      "hasTables": boolean,
      "hasGraphics": boolean,
      "hasColumns": boolean,
      "usesStandardHeadings": boolean,
      "fontCompatibility": "Good|Fair|Poor",
      "issues": string[]
    },
    "recommendations": string[]
  }
}

ATS RULES TO CHECK:
1. KEYWORDS: Extract hard skills, job titles, certifications from resume. Compare against typical ${targetRole} requirements ${jobDescription ? `AND this specific job description: "${jobDescription.substring(0, 500)}"` : ''}. Flag missing critical keywords.
2. FORMATTING: Detect tables, images, graphics, multi-column layouts, text boxes, headers/footers. These break ATS parsing.
3. HEADINGS: Ensure standard section titles: "Work Experience", "Education", "Skills", "Projects" (not creative names like "My Journey").
4. FONTS: Recommend Arial, Calibri, Times New Roman, Helvetica, Georgia. Flag decorative or unusual fonts.
5. FILE TYPE: Note if PDF is text-based (good) vs scanned/image-based (bad for ATS).

SCORING GUIDELINES:
- atsCheck.overallScore: 100 = perfect ATS compatibility, 0 = will definitely fail
- keywordMatch.score: % of critical keywords found
- formatting.issues: array of specific problems (e.g., "Contains 2-column layout")
- recommendations: actionable fixes (e.g., "Replace table with bullet points", "Add 'Python' to skills section")

Rules:
- correctedResume must be ATS-optimized plain text (no markdown, simple formatting)
- atsCheck.recommendations must be specific and actionable
- DO NOT output markdown, explanations, or extra text. ONLY valid JSON.

Resume Text:
${resumeText.substring(0, 4500)}
`.trim();

    const result = await getModel().generateContent(prompt);
    let responseText = result.response.text().trim();

    responseText = responseText.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    
    let aiResponse;
    try {
      aiResponse = JSON.parse(responseText);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        aiResponse = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('Failed to parse AI response as JSON');
      }
    }

    const safeResponse = {
      score: typeof aiResponse.score === 'number' ? aiResponse.score : 0,
      strengths: Array.isArray(aiResponse.strengths) ? aiResponse.strengths : [],
      weaknesses: Array.isArray(aiResponse.weaknesses) ? aiResponse.weaknesses : [],
      missingSkills: Array.isArray(aiResponse.missingSkills) ? aiResponse.missingSkills : [],
      improvements: Array.isArray(aiResponse.improvements) ? aiResponse.improvements : [],
      correctedResume: aiResponse.correctedResume || resumeText,
      roadmap: Array.isArray(aiResponse.roadmap) ? aiResponse.roadmap : [],
      issues: Array.isArray(aiResponse.issues) ? aiResponse.issues : [],
      
      atsCheck: aiResponse.atsCheck || {
        overallScore: 0,
        keywordMatch: { score: 0, matchedKeywords: [], missingKeywords: [] },
        formatting: { 
          hasTables: false, 
          hasGraphics: false, 
          hasColumns: false, 
          usesStandardHeadings: true, 
          fontCompatibility: 'Good', 
          issues: [] 
        },
        recommendations: []
      }
    };

    if (userId) {
      saveAnalysisHistory(userId, {
        targetRole,
        jobDescription,
        ...safeResponse,
        fileName: file.originalname
      }).catch(err => console.error('Background history save failed:', err));
    }

    res.json({
      success: true,
      ...safeResponse
    });

  } catch (error) {
    console.error('❌ Resume analysis error:', error);
    
    if (error.status === 429 || error.message?.includes('429')) {
      return res.status(429).json({ 
        success: false, 
        message: 'AI Rate limit exceeded. You are generating too fast! Please wait 15-30 seconds and try again.' 
      });
    }

    res.status(500).json({ 
      success: false, 
      message: 'Failed to analyze resume',
      error: error.message 
    });
  }
};

// ✉️ Email Optimized Resume WITH PDF Attachment
export const emailResume = async (req, res) => {
  try {
    const { email, targetRole, correctedResume, score, atsScore, strengths, atsCheck, roadmap } = req.body;

    if (!email || !correctedResume) {
      return res.status(400).json({ success: false, message: 'Email and resume content are required.' });
    }

    // ✅ Generate PDF attachment buffer
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const pdfBuffers = [];
    
    doc.on('data', pdfBuffers.push.bind(pdfBuffers));
    
    // 🎨 PDF Header: Branding
    doc.rect(0, 0, doc.page.width, 100).fill('#16a34a');
    doc.fillColor('#ffffff').fontSize(24).font('Helvetica-Bold').text('Shortlisted AI', 50, 30);
    doc.fontSize(14).font('Helvetica').text('ATS Compatibility Report', 50, 60);
    doc.fontSize(10).text(`Generated: ${new Date().toLocaleDateString()}`, 50, 80);

    // 👤 Candidate Info
    doc.fillColor('#333333').fontSize(12).font('Helvetica-Bold').text('Candidate Information', 50, 130);
    doc.font('Helvetica').fontSize(10)
      .text(`Target Role: ${targetRole}`, 50, 145)
      .text(`Overall Score: ${score}/100`, 50, 160)
      .text(`ATS Score: ${atsScore || 0}/100`, 50, 175);

    // 📊 ATS Score Bar
    const atsScoreVal = atsScore || 0;
    doc.rect(50, 190, 300, 20).strokeColor('#ccc').fill('#f3f4f6').fillAndStroke();
    doc.rect(50, 190, (atsScoreVal * 3), 20).fill(atsScoreVal >= 80 ? '#16a34a' : atsScoreVal >= 50 ? '#f59e0b' : '#ef4444').fillAndStroke();
    doc.fillColor('#333').fontSize(9).text(`${atsScoreVal}%`, 360, 195);

    // 🔑 Keywords
    doc.fontSize(12).font('Helvetica-Bold').text('Keyword Analysis', 50, 230);
    const keywords = atsCheck?.keywordMatch || {};
    doc.fontSize(10).font('Helvetica')
      .text('✅ Matched Keywords:', 50, 250)
      .fontSize(9)
      .text((keywords.matchedKeywords || []).slice(0, 10).join(', '), 50, 265, { width: 450 });
    doc.fontSize(10).font('Helvetica-Bold').text('⚠️ Missing Keywords:', 50, 295)
      .fontSize(9)
      .text((keywords.missingKeywords || []).slice(0, 10).join(', '), 50, 310, { width: 450 });

    // 📐 Formatting Checklist
    doc.fontSize(12).font('Helvetica-Bold').text('Formatting Compliance', 50, 345);
    const formatting = atsCheck?.formatting || {};
    const checks = [
      { label: 'No tables or text boxes', pass: !formatting.hasTables },
      { label: 'No images/graphics', pass: !formatting.hasGraphics },
      { label: 'Single-column layout', pass: !formatting.hasColumns },
      { label: 'Standard section headings', pass: formatting.usesStandardHeadings },
      { label: 'ATS-friendly fonts', pass: formatting.fontCompatibility !== 'Poor' },
    ];
    let yPos = 365;
    checks.forEach(check => {
      doc.fontSize(10)
        .fillColor(check.pass ? '#16a34a' : '#ef4444')
        .text(check.pass ? '✅' : '❌', 50, yPos)
        .fillColor('#333')
        .text(check.label, 70, yPos, { width: 400 })
        .text(check.pass ? 'Pass' : 'Fix Needed', 480, yPos, { align: 'right' });
      yPos += 18;
    });

    // 💡 Recommendations (if any)
    if (atsCheck?.recommendations?.length > 0) {
      doc.addPage();
      doc.fontSize(12).font('Helvetica-Bold').fillColor('#333').text('Recommendations', 50, 50);
      doc.fontSize(10).font('Helvetica');
      atsCheck.recommendations.forEach((rec, i) => {
        doc.text(`${i + 1}. ${rec}`, 50, 70 + (i * 20), { width: 450, lineGap: 5 });
      });
    }

    // 🗺️ Roadmap Summary (if any)
    if (roadmap?.length > 0) {
      doc.addPage();
      doc.fontSize(12).font('Helvetica-Bold').fillColor('#333').text('90-Day Growth Roadmap', 50, 50);
      doc.fontSize(10).font('Helvetica');
      roadmap.slice(0, 5).forEach((step, i) => {
        doc.font('Helvetica-Bold').text(`${i + 1}. ${step.skill}`, 50, 70 + (i * 40));
        doc.font('Helvetica').fontSize(9).text(step.actionStep, 50, 85 + (i * 40), { width: 450 });
        doc.fontSize(8).text(`⏱️ ${step.timeEstimate} • Priority: ${step.priority}`, 50, 100 + (i * 40));
      });
    }

    // 🦶 Footer
    doc.addPage();
    doc.fontSize(9).fillColor('#666').text(
      'Generated by Shortlisted AI • Keep optimizing! 🚀',
      50, doc.page.height - 50, { align: 'center', width: doc.page.width - 100 }
    );

    doc.end();

    // Wait for PDF to finish generating
    await new Promise((resolve) => doc.on('end', resolve));
    const pdfBuffer = Buffer.concat(pdfBuffers);

    // ✉️ Create HTML email body
    const emailHtml = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #333; line-height: 1.6; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #f0fdf4; padding: 20px; border-radius: 12px; border-left: 5px solid #16a34a; margin-bottom: 20px;">
          <h2 style="color: #15803d; margin-top: 0; font-size: 20px;">✨ Your Optimized Resume is Ready!</h2>
          <p style="margin: 5px 0; font-size: 14px;"><strong>Target Role:</strong> ${targetRole}</p>
          <p style="margin: 5px 0; font-size: 14px;"><strong>Overall Score:</strong> ${score}/100</p>
          <p style="margin: 5px 0; font-size: 14px;"><strong>ATS Score:</strong> ${atsScore || 0}/100</p>
        </div>

        ${strengths && strengths.length > 0 ? `
          <h3 style="color: #444; margin: 20px 0 10px 0; font-size: 16px;">🔑 Top Strengths</h3>
          <ul style="color: #555; padding-left: 20px; margin: 0 0 20px 0;">
            ${strengths.map(s => `<li style="margin-bottom: 5px;">${s}</li>`).join('')}
          </ul>
        ` : ''}

        <hr style="border: 0; border-top: 1px solid #eee; margin: 25px 0;" />

        <h3 style="color: #444; margin: 20px 0 10px 0; font-size: 16px;">📄 Optimized Resume Content</h3>
        <pre style="white-space: pre-wrap; font-family: inherit; font-size: 13px; color: #555; background: #f9fafb; padding: 15px; border-radius: 8px; overflow-x: auto;">${correctedResume}</pre>
        
        <div style="margin-top: 30px; text-align: center; color: #999; font-size: 11px; padding-top: 20px; border-top: 1px solid #eee;">
          <p>📎 <strong>ATS Report PDF attached below!</strong></p>
          Generated by Shortlisted AI • Keep optimizing! 🚀
        </div>
      </div>
    `;

    // 📧 Send email with PDF attachment
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: `✨ Your Optimized Resume for ${targetRole}`,
      html: emailHtml,
      attachments: [
        {
          filename: `ATS_Report_${targetRole.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`,
          content: pdfBuffer,
        },
      ],
    };

    await transporter.sendMail(mailOptions);

    res.json({ success: true, message: 'Resume with ATS Report sent successfully!' });
  } catch (error) {
    console.error('Email with PDF error:', error);
    res.status(500).json({ success: false, message: 'Failed to send email with attachment.' });
  }
};

// ✨ Export ATS Report PDF - ✅ ADD THIS FUNCTION AT THE VERY END
export const exportATSReport = async (req, res) => {
  try {
    const { targetRole, score, atsCheck, roadmap } = req.body;

    if (!targetRole || !atsCheck) {
      return res.status(400).json({ success: false, message: 'Missing required data for PDF generation.' });
    }

    // Create PDF document
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const buffers = [];
    
    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => {
      const pdfData = Buffer.concat(buffers);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="ATS_Report_${targetRole.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf"`);
      res.send(pdfData);
    });
    doc.on('error', (err) => {
      console.error('PDF error:', err);
      res.status(500).json({ success: false, message: 'Failed to generate PDF.' });
    });

    // 🎨 Header: Branding
    doc.rect(0, 0, doc.page.width, 100).fill('#16a34a'); // green-600
    doc.fillColor('#ffffff').fontSize(24).font('Helvetica-Bold').text('Shortlisted AI', 50, 30);
    doc.fontSize(14).font('Helvetica').text('ATS Compatibility Report', 50, 60);
    doc.fontSize(10).text(`Generated: ${new Date().toLocaleDateString()}`, 50, 80);

    // 👤 User & Role Info
    doc.fillColor('#333333').fontSize(12).font('Helvetica-Bold').text('Candidate Information', 50, 130);
    doc.font('Helvetica').fontSize(10)
      .text(`Target Role: ${targetRole}`, 50, 145)
      .text(`Overall Score: ${score}/100`, 50, 160)
      .text(`ATS Score: ${atsCheck.overallScore || 0}/100`, 50, 175);

    // 📊 ATS Score Bar
    const atsScore = atsCheck.overallScore || 0;
    doc.rect(50, 190, 300, 20).strokeColor('#ccc').fill('#f3f4f6').fillAndStroke();
    doc.rect(50, 190, (atsScore * 3), 20).fill(atsScore >= 80 ? '#16a34a' : atsScore >= 50 ? '#f59e0b' : '#ef4444').fillAndStroke();
    doc.fillColor('#333').fontSize(9).text(`${atsScore}%`, 360, 195);

    // 🔑 Keyword Match Section
    doc.fontSize(12).font('Helvetica-Bold').text('Keyword Analysis', 50, 230);
    const keywords = atsCheck.keywordMatch || {};
    
    doc.fontSize(10).font('Helvetica')
      .text('✅ Matched Keywords:', 50, 250)
      .fontSize(9)
      .text((keywords.matchedKeywords || []).slice(0, 10).join(', '), 50, 265, { width: 450 });
    
    doc.fontSize(10).font('Helvetica-Bold').text('⚠️ Missing Keywords:', 50, 295)
      .fontSize(9)
      .text((keywords.missingKeywords || []).slice(0, 10).join(', '), 50, 310, { width: 450 });

    // 📐 Formatting Checklist
    doc.fontSize(12).font('Helvetica-Bold').text('Formatting Compliance', 50, 345);
    const formatting = atsCheck.formatting || {};
    
    const checks = [
      { label: 'No tables or text boxes', pass: !formatting.hasTables },
      { label: 'No images/graphics', pass: !formatting.hasGraphics },
      { label: 'Single-column layout', pass: !formatting.hasColumns },
      { label: 'Standard section headings', pass: formatting.usesStandardHeadings },
      { label: 'ATS-friendly fonts', pass: formatting.fontCompatibility !== 'Poor' },
    ];

    let yPos = 365;
    checks.forEach(check => {
      doc.fontSize(10)
        .fillColor(check.pass ? '#16a34a' : '#ef4444')
        .text(check.pass ? '✅' : '❌', 50, yPos)
        .fillColor('#333')
        .text(check.label, 70, yPos, { width: 400 })
        .text(check.pass ? 'Pass' : 'Fix Needed', 480, yPos, { align: 'right' });
      yPos += 18;
    });

    // 💡 Recommendations
    if (atsCheck.recommendations?.length > 0) {
      doc.addPage();
      doc.fontSize(12).font('Helvetica-Bold').fillColor('#333').text('Recommendations', 50, 50);
      doc.fontSize(10).font('Helvetica');
      
      atsCheck.recommendations.forEach((rec, i) => {
        doc.text(`${i + 1}. ${rec}`, 50, 70 + (i * 20), { width: 450, lineGap: 5 });
      });
    }

    // 🗺️ Roadmap Summary
    if (roadmap?.length > 0) {
      doc.addPage();
      doc.fontSize(12).font('Helvetica-Bold').fillColor('#333').text('90-Day Growth Roadmap', 50, 50);
      doc.fontSize(10).font('Helvetica');
      
      roadmap.slice(0, 5).forEach((step, i) => {
        doc.font('Helvetica-Bold').text(`${i + 1}. ${step.skill}`, 50, 70 + (i * 40));
        doc.font('Helvetica').fontSize(9).text(step.actionStep, 50, 85 + (i * 40), { width: 450 });
        doc.fontSize(8).text(`⏱️ ${step.timeEstimate} • Priority: ${step.priority}`, 50, 100 + (i * 40));
      });
    }

    // 🦶 Footer
    doc.addPage();
    doc.fontSize(9).fillColor('#666').text(
      'Generated by Shortlisted AI • This report is for personal use only • Keep optimizing! 🚀',
      50, doc.page.height - 50, { align: 'center', width: doc.page.width - 100 }
    );

    doc.end();

  } catch (error) {
    console.error('PDF generation error:', error);
    res.status(500).json({ success: false, message: 'Failed to generate PDF report.' });
  }
};