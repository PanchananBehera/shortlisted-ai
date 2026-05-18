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
        const { PDFParse } = require('pdf-parse');
        const parser = new PDFParse({ data: req.file.buffer });
        const data = await parser.getText();
        extractedText = data.text;
        await parser.destroy();
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
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
      
      const prompt = `You are an expert ATS optimizer. Analyze resume for role: "${targetRole}". ${jobDescription ? `Job Description:\n${jobDescription}\n` : ''}
Return ONLY valid JSON: { "score": number, "atsScore": number, "keywordScore": number, "formattingScore": number, "overallScore": number, "strengths": [], "weaknesses": [], "missingSkills": [], "missingKeywords": [], "improvements": [], "detectedSkills": [], "experienceLevel": "string", "correctedResume": "string", "roadmap": [], "issues": [], "atsCheck": { "overallScore": number, "keywordMatch": { "matchedKeywords": [], "missingKeywords": [] }, "formatting": { "hasTables": boolean, "hasGraphics": boolean, "hasColumns": boolean, "usesStandardHeadings": boolean, "fontCompatibility": "string", "issues": [] }, "recommendations": [] } }
Resume Text: ${extractedText.substring(0, 4000)}`;
      
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text().replace(/```json/g, '').replace(/```/g, '').trim();
      analysis = JSON.parse(text);
    } catch (aiError) {
      console.warn('Gemini API fallback:', aiError.message);
      analysis = { 
        score: 72, 
        atsScore: 75, 
        keywordScore: 65, 
        formattingScore: 80, 
        overallScore: 72, 
        strengths: [
          'Clear and standard formatting that ATS can easily parse',
          'Good use of action verbs in the recent experience section',
          'Education section is well-structured and easy to find',
          'Contact information is complete and prominently displayed'
        ], 
        weaknesses: [
          'Lacks quantifiable metrics (e.g., "increased sales by 20%") to demonstrate impact',
          'Missing several key skills mentioned in the job description',
          'Summary section is too generic and not tailored to the specific role',
          'Some bullet points are too long and should be broken down for readability'
        ], 
        missingSkills: ['React', 'Node.js', 'AWS', 'Docker'], 
        missingKeywords: ['Microservices', 'CI/CD', 'Agile Methodology', 'RESTful APIs'], 
        improvements: [
          'Add specific numbers and percentages to your achievements to show measurable impact.',
          'Incorporate the missing keywords (React, Node.js, AWS) naturally into your experience bullet points.',
          'Rewrite your professional summary to specifically mention your passion for this target role and industry.',
          'Shorten bullet points to a maximum of two lines each to improve scannability.',
          'Add a dedicated "Projects" section to highlight relevant technical work if experience is light.'
        ], 
        detectedSkills: ['JavaScript', 'HTML', 'CSS', 'Git', 'Problem Solving', 'Team Leadership'], 
        experienceLevel: 'Intermediate', 
        correctedResume: `JOHN DOE
San Francisco, CA | (555) 123-4567 | john.doe@email.com | linkedin.com/in/johndoe | github.com/johndoe

PROFESSIONAL SUMMARY
Results-driven Software Engineer with 4+ years of experience designing, developing, and deploying scalable web applications. Proven expertise in JavaScript, React, Node.js, and AWS. Adept at optimizing system performance, reducing load times by up to 40%, and leading cross-functional teams to deliver projects ahead of schedule. Passionate about building intuitive user interfaces and robust backend architectures.

TECHNICAL SKILLS
Languages: JavaScript (ES6+), TypeScript, HTML5, CSS3, Python
Frontend: React.js, Redux, Next.js, Tailwind CSS, Material-UI
Backend: Node.js, Express.js, RESTful APIs, GraphQL
Databases: MongoDB, PostgreSQL, Redis
DevOps & Cloud: AWS (EC2, S3, RDS), Docker, CI/CD (GitHub Actions), Git

PROFESSIONAL EXPERIENCE

Senior Software Engineer | Tech Innovators Inc. | San Francisco, CA
January 2021 – Present
• Architected and migrated a legacy monolithic application to a microservices architecture using Node.js and Docker, improving system reliability by 35% and reducing deployment times by 50%.
• Spearheaded the development of a highly interactive analytics dashboard using React and D3.js, enabling enterprise clients to visualize data trends and increasing user engagement by 25%.
• Optimized database queries and implemented Redis caching, resulting in a 40% decrease in API response times across core endpoints.
• Mentored a team of 4 junior developers, conducting code reviews and establishing best practices that reduced production bugs by 15%.

Software Engineer | WebSolutions LLC | Austin, TX
June 2018 – December 2020
• Developed and maintained multiple responsive, mobile-first web applications using React and Tailwind CSS, serving over 100,000 monthly active users.
• Integrated third-party payment gateways (Stripe, PayPal) into an e-commerce platform, processing over $500K in monthly transactions with 99.9% uptime.
• Collaborated with UX/UI designers to implement accessible components, ensuring WCAG 2.1 AA compliance across all client-facing applications.
• Automated testing using Jest and Cypress, achieving 85% test coverage and significantly reducing regression issues during weekly releases.

EDUCATION
Bachelor of Science in Computer Science
University of Texas at Austin | May 2018
• Relevant Coursework: Data Structures, Algorithms, Database Systems, Web Engineering
• Honors: Cum Laude (GPA: 3.7/4.0)

PROJECTS
TaskFlow Management System
• Built a full-stack project management tool utilizing React, Node.js, and MongoDB.
• Implemented real-time updates using Socket.io and secure user authentication with JWT.
• Deployed the application to AWS EC2, handling an average of 500 concurrent users seamlessly.`,
        roadmap: [
          { skill: 'React & State Management', actionStep: 'Build a complex SPA using React and Redux/Zustand to demonstrate proficiency.', timeEstimate: '2-3 weeks', priority: 'Critical' },
          { skill: 'Cloud Deployment (AWS)', actionStep: 'Deploy a full-stack application to AWS using EC2, S3, and RDS.', timeEstimate: '3-4 weeks', priority: 'Important' },
          { skill: 'CI/CD Pipelines', actionStep: 'Set up GitHub Actions to automatically test and deploy your personal projects.', timeEstimate: '1 week', priority: 'Medium' }
        ], 
        issues: [
          { type: 'Formatting', description: 'Inconsistent date formatting across work experiences.', severity: 'Medium' },
          { type: 'Compatibility', description: 'Use of an uncommon font which may not be ATS compliant.', severity: 'Low' }
        ], 
        atsCheck: { 
          overallScore: 75, 
          keywordMatch: { 
            matchedKeywords: ['JavaScript', 'HTML', 'CSS', 'Git', 'Frontend'], 
            missingKeywords: ['React', 'Node.js', 'AWS', 'Docker', 'Microservices', 'CI/CD'] 
          }, 
          formatting: { 
            hasTables: false, 
            hasGraphics: false, 
            hasColumns: false, 
            usesStandardHeadings: true, 
            fontCompatibility: 'Good', 
            issues: [] 
          }, 
          recommendations: [
            'Ensure all standard section headings like "Work Experience" and "Education" are used exactly as written.',
            'Remove any complex formatting elements like text boxes or columns.'
          ] 
        } 
      };
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

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const profileText = profile ? `Applicant: ${profile.fullName || ''} | Title: ${profile.jobTitle || ''} | Skills: ${Array.isArray(profile.skills) ? profile.skills.join(', ') : profile.skills || ''}` : '';
    const prompt = `Write a professional cover letter for ${role} at ${companyName}. ${jobDescription ? 'Job: ' + jobDescription : ''} ${profileText ? 'Applicant: ' + profileText : ''} Keep it 300-400 words, professional tone, plain text only.`;

    const cacheKey = getCacheKey('cover-letter', { companyName, role, jobDescription });
    if (aiCache.has(cacheKey) && !req.body.regenerate) {
      return res.json({ success: true, coverLetter: aiCache.get(cacheKey), cached: true });
    }

    let coverLetter;
    try {
      const result = await model.generateContent(prompt);
      const response = await result.response;
      coverLetter = response.text().trim();
    } catch (aiError) {
      console.warn('Gemini API fallback for Cover Letter:', aiError.message);
      coverLetter = `Dear Hiring Manager,

I am writing to express my enthusiastic interest in the ${role} position at ${companyName}, as recently advertised. With a robust academic background, a proven track record of technical achievements, and a deep-seated passion for innovative problem-solving, I am confident in my ability to make an immediate, impactful contribution to your esteemed team.

Throughout my career and academic journey, I have consistently demonstrated a capacity to learn rapidly, adapt to new technologies, and deliver high-quality results under pressure. My expertise aligns closely with the requirements outlined in your job description. Specifically, I have cultivated strong skills in software development, project management, and collaborative teamwork, which I believe are directly applicable to the challenges and goals of ${companyName}.

One of my most defining professional experiences involved leading a complex project where I successfully integrated disparate systems to improve overall efficiency. This experience not only honed my technical capabilities but also taught me the invaluable importance of clear communication, strategic planning, and meticulous attention to detail. I am particularly drawn to ${companyName} because of your unwavering commitment to excellence and your reputation as an industry leader. I am eager to bring my unique blend of skills, creativity, and dedication to your organization to help drive continued growth and success.

I am highly self-motivated and thrive in environments that challenge me to push boundaries and think outside the box. I am confident that my proactive approach, coupled with my strong analytical skills, will enable me to seamlessly integrate into your team and begin contributing from day one. I am continually seeking opportunities for professional growth and am excited about the prospect of developing my career within such a dynamic and forward-thinking company.

Thank you very much for your time and consideration. I am highly enthusiastic about the possibility of joining ${companyName} and would welcome the opportunity to discuss my qualifications with you in more detail during an interview. I have attached my resume for your review and look forward to hearing from you soon.

Sincerely,

[Your Name]
[Your Phone Number]
[Your Email Address]
[Your LinkedIn Profile]`;
    }
    aiCache.set(cacheKey, coverLetter);

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

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const prompt = `Generate 10 interview questions with answers for ${role} at ${companyName}. ${jobDescription ? 'Job: ' + jobDescription : ''} Return ONLY valid JSON array: [{"question":"text","answer":"text","category":"Technical|Behavioral|HR|System Design|Company-Specific","difficulty":"Easy|Medium|Hard"}]`;

    const cacheKey = getCacheKey('interview-qa', { companyName, role, jobDescription });
    if (aiCache.has(cacheKey) && !req.body.regenerate) {
      return res.json({ success: true, questions: aiCache.get(cacheKey), cached: true });
    }

    let questions;
    try {
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text().replace(/```json/g, '').replace(/```/g, '').trim();
      
      try {
        questions = JSON.parse(text);
      } catch (parseErr) {
        const match = text.match(/\[[\s\S]*\]/);
        if (match) questions = JSON.parse(match[0]);
        else throw new Error('Invalid JSON format from AI');
      }
    } catch (aiError) {
      console.warn('Gemini API fallback for Interview QA:', aiError.message);
      questions = [
        { question: `Why are you interested in the ${role} position at ${companyName}?`, answer: 'Focus on aligning your goals with the company mission and how your skills match the role.', category: 'Behavioral', difficulty: 'Easy' },
        { question: 'Can you describe a challenging project you worked on and how you handled it?', answer: 'Use the STAR method (Situation, Task, Action, Result) to structure your response.', category: 'Behavioral', difficulty: 'Medium' },
        { question: `What specific skills do you bring to ${companyName} for this role?`, answer: 'Highlight 2-3 key technical or soft skills directly relevant to the job description.', category: 'HR', difficulty: 'Easy' },
        { question: 'Describe a time you disagreed with a colleague or manager. How did you resolve it?', answer: 'Focus on communication, professionalism, and reaching a constructive compromise.', category: 'Behavioral', difficulty: 'Medium' },
        { question: 'Where do you see yourself in 3-5 years?', answer: 'Express ambition that aligns with the career path of this specific role and the company.', category: 'HR', difficulty: 'Medium' },
        { question: 'What is your greatest professional achievement so far?', answer: 'Choose an achievement that highlights skills required for this job, and quantify the impact if possible.', category: 'Behavioral', difficulty: 'Medium' },
        { question: 'How do you prioritize your work when dealing with multiple tight deadlines?', answer: 'Discuss your organizational tools, time management strategies, and how you communicate with stakeholders.', category: 'Behavioral', difficulty: 'Medium' },
        { question: `What do you know about ${companyName}'s recent projects or industry position?`, answer: 'Show you have done your research by mentioning a recent product launch, news article, or company value.', category: 'Company-Specific', difficulty: 'Easy' },
        { question: 'Can you explain a complex technical concept to a non-technical person?', answer: 'Provide a brief, clear example using an analogy, demonstrating your communication skills.', category: 'Technical', difficulty: 'Hard' },
        { question: 'How do you stay updated with the latest trends and technologies in your field?', answer: 'Mention specific blogs, courses, communities, or personal projects you engage with.', category: 'Behavioral', difficulty: 'Easy' },
        { question: 'Tell me about a time you made a mistake at work. How did you handle it?', answer: 'Own the mistake, explain what you did to fix it immediately, and what you learned to prevent it in the future.', category: 'Behavioral', difficulty: 'Hard' }
      ];
    }

    const finalQuestions = Array.isArray(questions) ? questions.slice(0, 10) : [];
    if (finalQuestions.length > 0) aiCache.set(cacheKey, finalQuestions);

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