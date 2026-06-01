import Interview from '../models/Interview.js';
import { generateContentWithRetry } from './aiController.js';
import { logAIUsage } from '../utils/aiUsageLogger.js';

// ✅ Dynamic turn processing using Gemini
export const processInterviewTurn = async (req, res) => {
  const startTime = Date.now();
  const { conversation = [], targetRole = 'Software Engineer', jobDescription = '', userMessage = '' } = req.body;
  const userId = req.user?._id || req.user?.id;

  if (!userId) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  try {
    // Construct a high-quality prompt for PacoBot
    let conversationHistoryText = '';
    conversation.forEach(msg => {
      const roleName = msg.role === 'ai' ? 'PacoBot (AI Coach)' : 'Candidate (User)';
      conversationHistoryText += `${roleName}: ${msg.content}\n`;
    });

    if (userMessage) {
      conversationHistoryText += `Candidate (User): ${userMessage}\n`;
    }

    const prompt = `You are PacoBot, a world-class AI career coach conducting a mock interview.
Target Role: "${targetRole}"
${jobDescription ? `Job Description / Context:\n${jobDescription}\n` : ''}

Here is the conversation history so far:
${conversationHistoryText}

CRITICAL INSTRUCTIONS:
1. ACT AS PACOBOT: You are a professional, friendly, and highly supportive AI career coach.
2. RESPOND DYNAMICALLY: 
   - If the candidate just introduced themselves, welcome them warmly, acknowledge their target role, and ask the first relevant interview question.
   - If the candidate answered a previous question, acknowledge their answer with 1-2 sentences of encouraging, brief constructive feedback (e.g. "Excellent explanation! I liked your focus on collaboration...").
   - Then, transition immediately and ask the next challenging, realistic interview question appropriate for a "${targetRole}" position.
3. KEEP IT CONCISE: Your entire response must be under 100 words. This is extremely important because the response will be read aloud using text-to-speech. Keep it brief, natural, and punchy!
4. NO PLACEHOLDERS: Do not output any brackets like [Candidate Name] or [Insert Question]. Speak directly to the candidate.
5. NO MARKDOWN FORMATTING in the conversational response (do not use **, *, or lists) to ensure clean voice synthesis.

PacoBot (AI Coach):`;

    const response = await generateContentWithRetry(prompt, 'gemini-2.5-flash');
    const aiResponse = response.text().trim();

    const responseTime = Date.now() - startTime;
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

    res.json({ success: true, aiResponse });

  } catch (error) {
    console.error('Interview Turn Error:', error);
    res.status(500).json({ success: false, error: 'Failed to process interview turn. ' + error.message });
  }
};

// ✅ Final mock interview evaluation & saving to DB
export const evaluateInterview = async (req, res) => {
  const startTime = Date.now();
  const { conversation = [], targetRole = 'Software Engineer', jobDescription = '' } = req.body;
  const userId = req.user?._id || req.user?.id;

  if (!userId) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  if (conversation.length < 2) {
    return res.status(400).json({ success: false, error: 'Not enough conversation turns to evaluate.' });
  }

  try {
    let transcriptText = '';
    conversation.forEach(msg => {
      const roleName = msg.role === 'ai' ? 'PacoBot (AI Coach)' : 'Candidate (User)';
      transcriptText += `${roleName}: ${msg.content}\n\n`;
    });

    const prompt = `You are an expert executive recruiter and senior career coach.
Review the following Mock Interview transcript for a candidate targeting the role of "${targetRole}".
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

    let feedback;
    try {
      const cleanText = text.replace(/```json/gi, '').replace(/```/g, '').trim();
      feedback = JSON.parse(cleanText);
    } catch (parseErr) {
      const match = text.match(/\{[\s\S]*\}/);
      if (match) {
        feedback = JSON.parse(match[0]);
      } else {
        throw new Error('Failed to parse evaluation response from Gemini: ' + text);
      }
    }

    // Save to database
    const completedInterview = await Interview.create({
      userId,
      targetRole,
      jobDescription,
      conversation,
      feedback
    });

    const responseTime = Date.now() - startTime;
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

    res.json({
      success: true,
      message: 'Interview evaluated successfully!',
      interview: completedInterview
    });

  } catch (error) {
    console.error('Interview Evaluation Error:', error);
    res.status(500).json({ success: false, error: 'Failed to evaluate interview. ' + error.message });
  }
};

// ✅ Get all completed interviews for a user
export const getInterviewHistory = async (req, res) => {
  const userId = req.user?._id || req.user?.id;

  if (!userId) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  try {
    const history = await Interview.find({ userId })
      .select('targetRole createdAt feedback.overallScore')
      .sort({ createdAt: -1 });

    res.json({ success: true, history });
  } catch (error) {
    console.error('Get Interview History Error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch interview history.' });
  }
};

// ✅ Get a specific interview details
export const getInterviewDetail = async (req, res) => {
  const userId = req.user?._id || req.user?.id;
  const { id } = req.params;

  if (!userId) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  try {
    const interview = await Interview.findOne({ _id: id, userId });

    if (!interview) {
      return res.status(404).json({ success: false, error: 'Interview report not found.' });
    }

    res.json({ success: true, interview });
  } catch (error) {
    console.error('Get Interview Detail Error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch interview details.' });
  }
};

export default {
  processInterviewTurn,
  evaluateInterview,
  getInterviewHistory,
  getInterviewDetail
};
