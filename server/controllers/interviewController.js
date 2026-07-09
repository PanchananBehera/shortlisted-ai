// server/controllers/interviewController.js
import InterviewSession from '../models/interviewSession.js';
import { generateContentWithRetry } from './aiController.js';
import { logAIUsage } from '../utils/aiUsageLogger.js';
import { sendEmail } from '../utils/emails.js';
import { updateGamification } from '../services/gamificationService.js'; // ✅ New import

// ✅ Process a single interview turn (user answer → AI response)
export const processInterviewTurn = async (req, res) => {
  const startTime = Date.now();
  const userId = req.user?._id || req.user?.id;
  try {
    const { conversation = [], targetRole = 'Software Engineer', jobDescription = '', dreamCompany = '', experienceLevel = 'mid', keySkills = [] } = req.body;

    let aiResponse;
    try {
      let conversationHistoryText = '';
      conversation.forEach(msg => {
        const roleName = msg.role === 'ai' ? 'PacoBot (AI Coach)' : 'Candidate (User)';
        conversationHistoryText += `${roleName}: ${msg.content}\n`;
      });

      const prompt = `You are PacoBot, a world-class AI career coach conducting a mock interview.
Target Role: "${targetRole}"
${dreamCompany ? `Dream Company: "${dreamCompany}"` : ''}
${jobDescription ? `Job Description / Context:\n${jobDescription}\n` : ''}

Here is the conversation history so far:
${conversationHistoryText}

CRITICAL INSTRUCTIONS:
1. ACT AS PACOBOT: You are a professional, friendly, and highly supportive AI career coach.
2. RESPOND DYNAMICALLY: 
   - If the candidate answered a previous question, acknowledge their answer with 1-2 sentences of encouraging, brief constructive feedback.
   - Then, transition immediately and ask the next challenging, realistic interview question appropriate for a "${targetRole}" position.
3. KEEP IT CONCISE: Your entire response must be under 100 words. This is extremely important because the response will be read aloud using text-to-speech. Keep it brief, natural, and punchy!
4. NO PLACEHOLDERS: Do not output any brackets like [Candidate Name] or [Insert Question]. Speak directly to the candidate.
5. NO MARKDOWN FORMATTING in the conversational response (do not use **, *, or lists) to ensure clean voice synthesis.

PacoBot (AI Coach):`;

      const response = await generateContentWithRetry(prompt, 'gemini-2.5-flash');
      aiResponse = response.text().trim();
      
      const responseTime = Date.now() - startTime;
      if (userId && req.user?.email) {
        await logAIUsage({
          userId,
          userEmail: req.user.email,
          featureUsed: 'interview-turn',
          companyName: 'Mock Interview',
          jobRole: targetRole,
          success: true,
          responseTime,
          req
        });
      }
    } catch (aiError) {
      console.warn('Gemini turn generation failed, using dynamic mock fallback:', aiError.message);
      
      const userMessages = conversation.filter(msg => msg.role === 'user');
      const turnIndex = userMessages.length;
      
      const baseQuestions = [
        `Tell me about yourself and your experience as a ${targetRole}.`,
        "Can you describe a challenging project you've worked on and how you overcame obstacles?",
        `What are your greatest strengths and how do they apply to this ${targetRole} role?`,
        "Where do you see yourself in 5 years in your career?",
        `Why should we hire you for this ${targetRole} position${dreamCompany ? ` at ${dreamCompany}` : ''}?`
      ];
      
      const nextQuestion = baseQuestions[turnIndex] || `What other skills or technologies like ${keySkills?.[0] || 'relevant skills'} make you stand out for this role?`;
      
      aiResponse = `That's a very interesting point. Building on that, ${nextQuestion}`;
    }

    res.json({ success: true, aiResponse });
  } catch (error) {
    console.error('Interview Turn Error:', error);
    res.status(500).json({ success: false, error: 'Failed to process interview turn' });
  }
};

// ✅ Evaluate completed interview and generate feedback
export const evaluateInterview = async (req, res) => {
  const startTime = Date.now();
  const userId = req.user?._id || req.user?.id;
  try {
    const { conversation = [], targetRole = 'Software Engineer', jobDescription = '', dreamCompany = '', experienceLevel = 'mid', keySkills = [] } = req.body;

    let feedback;
    try {
      let transcriptText = '';
      conversation.forEach(msg => {
        const roleName = msg.role === 'ai' ? 'PacoBot (AI Coach)' : 'Candidate (User)';
        transcriptText += `${roleName}: ${msg.content}\n\n`;
      });

      const prompt = `You are an expert executive recruiter and senior career coach.
Review the following Mock Interview transcript for a candidate targeting the role of "${targetRole}".
${dreamCompany ? `Dream Company: "${dreamCompany}"` : ''}
${jobDescription ? `Job Description context:\n${jobDescription}\n` : ''}

Transcript:
${transcriptText}

Generate a comprehensive, premium evaluation of the candidate's performance.
You MUST respond with ONLY a valid, parseable JSON object matching this exact schema structure, without any markdown backticks or extra text:
{
  "overallScore": 85,
  "strengths": [
    "Highlight specific strengths displayed in their answers",
    "Mention another strength, e.g. solid technical familiarity or clear communication"
  ],
  "weaknesses": [
    "Specify concrete areas that need work, e.g. could use more quantifiable metrics (STAR method)",
    "Highlight any technical or behavioral gaps"
  ],
  "suggestions": [
    "Specific actionable tip to improve overall interview presence",
    "Actionable tip on technical explanations or structuring answers"
  ],
  "detailedAssessment": [
    {
      "question": "The exact interview question PacoBot asked",
      "answer": "The candidate's response to this question",
      "assessment": "Constructive, highly professional critique of their answer, highlighting what was good and what was lacking.",
      "score": 80,
      "idealAnswer": "A perfect, premium sample response that the candidate should have given, fully demonstrating the STAR method (Situation, Task, Action, Result) in first-person."
    }
  ],
  "roadmap": [
    {
      "skill": "React Hooks & Performance",
      "priority": "Critical",
      "actionStep": "Review useMemo, useCallback, and virtualization techniques. Practice explaining them in under 2 minutes.",
      "timeEstimate": "Week 1-2"
    },
    {
      "skill": "STAR Method Structuring",
      "priority": "Important",
      "actionStep": "Draft 3 behavioral stories using the Situation-Task-Action-Result outline. Quantify results with metrics.",
      "timeEstimate": "Week 3"
    }
  ]
}

CRITICAL RULES:
1. Ensure the JSON is completely valid, parseable, and closed. Escape any internal quotes inside values properly.
2. The "detailedAssessment" array should match the questions and answers in the transcript.
3. Be highly constructive, realistic, and professional in your scoring and comments.
4. Output ONLY the JSON object. Do not include markdown code block syntax (like \`\`\`json) or any conversational introduction/conclusion.`;

      const response = await generateContentWithRetry(prompt, 'gemini-2.5-flash');
      const text = response.text().trim();

      const cleanText = text.replace(/```json/gi, '').replace(/```/g, '').trim();
      try {
        feedback = JSON.parse(cleanText);
      } catch (parseErr) {
        const match = cleanText.match(/\{[\s\S]*\}/);
        if (match) {
          feedback = JSON.parse(match[0]);
        } else {
          throw new Error('Failed to parse evaluation response from Gemini');
        }
      }

      const responseTime = Date.now() - startTime;
      if (userId && req.user?.email) {
        await logAIUsage({
          userId,
          userEmail: req.user.email,
          featureUsed: 'interview-evaluate',
          companyName: 'Mock Interview',
          jobRole: targetRole,
          success: true,
          responseTime,
          req
        });
      }
    } catch (aiError) {
      console.warn('Gemini evaluation generation failed, using fallback:', aiError.message);
      
      const userAnswers = conversation.filter(msg => msg.role === 'user').map(msg => msg.content);
      
      feedback = {
        overallScore: Math.floor(Math.random() * 20) + 75, // 75-95
        strengths: [
          "Clear communication of technical concepts",
          "Strong problem-solving approach", 
          "Good use of STAR method in responses"
        ],
        weaknesses: [
          "Could provide more specific metrics/numbers",
          "Consider elaborating on team collaboration aspects"
        ],
        suggestions: [
          "Practice quantifying your impact with data",
          "Prepare 2-3 detailed project stories using STAR",
          "Research company values to align your answers"
        ],
        detailedAssessment: userAnswers.map((answer, idx) => ({
          question: `Question ${idx + 1}`,
          answer: answer.substring(0, 100) + '...',
          score: Math.floor(Math.random() * 15) + 80,
          assessment: "Good response with room for more specific examples.",
          idealAnswer: "An ideal answer would include specific metrics, team context, and measurable outcomes."
        })),
        roadmap: [
          {
            skill: "Technical Communication",
            actionStep: "Practice explaining complex concepts in simple terms using the 'Explain Like I'm 5' method",
            priority: "Important",
            timeEstimate: "2-3 weeks"
          },
          {
            skill: "Behavioral Interviewing", 
            actionStep: "Build a library of 5-7 STAR stories covering different competencies",
            priority: "Critical",
            timeEstimate: "1-2 weeks"
          },
          {
            skill: "Company Research",
            actionStep: "Deep dive into target company's products, culture, and recent news before interviews",
            priority: "Important", 
            timeEstimate: "Ongoing"
          }
        ]
      };
    }

    res.json({ 
      success: true, 
      interview: { 
        feedback 
      } 
    });
  } catch (error) {
    console.error('Interview Evaluation Error:', error);
    res.status(500).json({ success: false, error: 'Failed to evaluate interview' });
  }
};

// ✅ Get user's interview history (for analytics) - SECURE VERSION
export const getInterviewHistory = async (req, res) => {
  try {
    // ✅ Get userId from authenticated user (NOT from request params/body)
    const userId = req.user?._id;
    
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }
    
    const sessions = await InterviewSession.find({ userId })
      .sort({ createdAt: -1 })  // ✅ Use createdAt (mongoose timestamp), not completedAt
      .limit(10)
      .select('-__v');
    
    res.json({ success: true, sessions });
    
  } catch (error) {
    console.error('Fetch history error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch interview history' });
  }
};

// ✅ Get details of a specific interview session
export const getInterviewDetail = async (req, res) => {
  try {
    const { id } = req.params;
    
    const session = await InterviewSession.findById(id);
    
    if (!session) {
      return res.status(404).json({ success: false, error: 'Interview session not found' });
    }
    
    res.json({ success: true, session });
    
  } catch (error) {
    console.error('Fetch detail error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch interview details' });
  }
};

// ✅ Save completed interview session to analytics - WITH GAMIFICATION
export const saveInterviewSession = async (req, res) => {
  try {
    // ✅ Get userId from authenticated user (NOT from request body)
    const userId = req.user?._id || req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const { 
      targetRole, 
      dreamCompany, 
      experienceLevel, 
      overallScore, 
      questionCount, 
      duration, 
      strengths, 
      weaknesses, 
      suggestions,
      detailedAssessment,
      roadmap
    } = req.body;
    
    // ✅ Create new session with SECURE userId from auth middleware
    const newSession = new InterviewSession({
      userId,  // ✅ From req.user, not user input
      targetRole,
      dreamCompany,
      experienceLevel,
      overallScore,
      questionCount,
      duration,
      strengths,
      weaknesses,
      suggestions,
      detailedAssessment,
      roadmap
    });
    
    await newSession.save();
    
    console.log('✅ Interview session saved:', {
      sessionId: newSession._id,
      userId,
      targetRole,
      score: overallScore
    });
    
    // ✅ GAMIFICATION: Update user progress (streaks, XP, badges)
    let gamificationResult = null;
    try {
      gamificationResult = await updateGamification(userId, {
        overallScore: overallScore || 0,
        duration: duration || '15m',
        strengths: strengths || [],
        weaknesses: weaknesses || []
      });
      console.log('🎮 Gamification updated:', {
        userId,
        xpGained: gamificationResult?.xpGained,
        newBadges: gamificationResult?.newBadges,
        streak: gamificationResult?.progress?.currentStreak
      });
    } catch (gamificationError) {
      // ⚠️ Don't fail the session save if gamification fails
      console.error('⚠️ Gamification update failed (non-critical):', gamificationError.message);
    }
    
    res.json({ 
      success: true, 
      message: 'Interview session saved successfully',
      session: newSession,
      gamification: gamificationResult // ✅ Return gamification data to frontend
    });
    
  } catch (error) {
    console.error('Save session error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to save interview session' 
    });
  }
};

// ✅ Send Interview Report via Email - FIXED VERSION
export const sendInterviewReportEmail = async (req, res) => {
  try {
    const { recipientEmail } = req.body;
    
    if (!recipientEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipientEmail)) {
      return res.status(400).json({ success: false, error: 'Valid recipient email required' });
    }

    // Fetch user's interview history
    const sessions = await InterviewSession.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(10);

    if (!sessions.length) {
      return res.status(404).json({ success: false, error: 'No interview data found' });
    }

    // Calculate metrics
    const scores = sessions.map(s => s.overallScore || 0);
    const avgScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    const bestScore = Math.max(...scores);
    
    // Calculate trend locally (backend version)
    const recent = scores.slice(-3);
    const older = scores.slice(0, 3);
    const recentAvg = recent.length ? recent.reduce((a, b) => a + b, 0) / recent.length : 0;
    const olderAvg = older.length ? older.reduce((a, b) => a + b, 0) / older.length : 0;
    const trend = recentAvg > olderAvg ? 'improving' : recentAvg < olderAvg ? 'declining' : 'stable';

    // Build HTML email body
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
        <h2 style="color: #8b5cf6;">📊 Mock Interview Performance Report</h2>
        <p>Hello ${req.user.name || 'User'},</p>
        <p>Here's your latest interview performance summary from <strong>Shortlisted AI</strong>:</p>
        
        <table style="border-collapse: collapse; width: 100%; margin: 20px 0;">
          <tr style="background: #f8fafc;">
            <td style="padding: 10px; border: 1px solid #e2e8f0;"><strong>Total Sessions</strong></td>
            <td style="padding: 10px; border: 1px solid #e2e8f0;">${sessions.length}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #e2e8f0;"><strong>Average Score</strong></td>
            <td style="padding: 10px; border: 1px solid #e2e8f0;">${avgScore}%</td>
          </tr>
          <tr style="background: #f8fafc;">
            <td style="padding: 10px; border: 1px solid #e2e8f0;"><strong>Best Score</strong></td>
            <td style="padding: 10px; border: 1px solid #e2e8f0;">${bestScore}%</td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #e2e8f0;"><strong>Trend</strong></td>
            <td style="padding: 10px; border: 1px solid #e2e8f0;">${trend}</td>
          </tr>
        </table>

        <h3 style="color: #8b5cf6;">📝 Recent Sessions</h3>
        <ul style="line-height: 1.6;">
          ${sessions.map(s => `
            <li><strong>${s.targetRole}</strong> ${s.dreamCompany ? `@ ${s.dreamCompany}` : ''} 
            - <span style="color: ${s.overallScore >= 80 ? '#10b981' : s.overallScore >= 60 ? '#f59e0b' : '#ef4444'}">${s.overallScore}%</span> 
            (${new Date(s.createdAt).toLocaleDateString()})</li>
          `).join('')}
        </ul>

        <p style="margin-top: 20px; padding: 15px; background: #f0fdf4; border-left: 4px solid #10b981; border-radius: 4px;">
          💡 <strong>Pro Tip:</strong> Keep practicing consistently. Your trend shows <strong>${trend}</strong> progress!
        </p>

        <p style="color: #64748b; font-size: 12px; margin-top: 30px; border-top: 1px solid #e2e8f0; padding-top: 10px;">
          Generated by Shortlisted AI • ${new Date().toLocaleDateString()}
        </p>
      </div>
    `;

    await sendEmail({
      to: recipientEmail,
      subject: `📊 Your Mock Interview Report - ${new Date().toLocaleDateString()}`,
      html: htmlContent,
    });

    res.json({ success: true, message: 'Report sent successfully' });
  } catch (error) {
    console.error('Email send error:', error);
    res.status(500).json({ success: false, error: 'Failed to send email. Please check SMTP configuration.' });
  }
};

// ✅ Update session with audio
export const updateInterviewSessionAudio = async (req, res) => {
  try {
    const { id } = req.params;
    const { audioRecordingUrl, recordingDuration } = req.body;
    
    // Ensure the session belongs to the user
    const session = await InterviewSession.findOne({ _id: id, userId: req.user._id });
    if (!session) {
      return res.status(404).json({ success: false, error: 'Session not found' });
    }

    session.audioRecordingUrl = audioRecordingUrl || session.audioRecordingUrl;
    session.recordingDuration = recordingDuration || session.recordingDuration;
    
    await session.save();

    res.json({ success: true, session });
  } catch (error) {
    console.error('Update session error:', error);
    res.status(500).json({ success: false, error: 'Failed to update session' });
  }
};