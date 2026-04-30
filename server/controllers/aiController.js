import { GoogleGenerativeAI } from '@google/generative-ai';

// Helper to get Gemini model after env vars are loaded
const getModel = () => {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  return genAI.getGenerativeModel({ model: 'gemini-flash-latest' });
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

    // Check if API key exists
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ 
        success: false, 
        message: 'Gemini API key not configured' 
      });
    }

    // Build personalized profile context
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

    // Add regeneration instruction for variation
    const regenerationInstruction = regenerate 
      ? '\n\n⚠️ IMPORTANT: This is a REGENERATION request. Write a COMPLETELY DIFFERENT cover letter. Use a different opening hook, different structure, and different vocabulary.' 
      : '';

    // Build the full prompt
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

    // Call Gemini API
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

    // Check if API key exists
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ 
        success: false, 
        message: 'Gemini API key not configured' 
      });
    }

    // Build personalized profile context
    const profileSection = profile ? `
CANDIDATE BACKGROUND:
- Name: ${profile.fullName || 'the candidate'}
- Role: ${profile.jobTitle || 'Professional'}
- Experience: ${profile.experience || 'Not specified'}
- Skills: ${profile.skills || 'Not specified'}
`.trim() : '';

    // Tell AI to avoid these questions if regenerating
    const avoidQuestions = (regenerate && existingQuestions?.length > 0)
      ? `\n\n⚠️ CRITICAL INSTRUCTION: DO NOT REPEAT ANY OF THESE PREVIOUS QUESTIONS:\n${existingQuestions.map((q, i) => `${i + 1}. ${q}`).join('\n')}\n\nYou MUST generate 10 COMPLETELY NEW and UNIQUE questions that were NOT asked before.`
      : '';

    // Build the full prompt
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

    // Call Gemini API
    const result = await getModel().generateContent(prompt);
    let responseText = result.response.text().trim();

    // Parse JSON (handle markdown code blocks if present)
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

    // Validate structure
    if (!Array.isArray(questions) || questions.length !== 10) {
      throw new Error('AI did not return exactly 10 questions');
    }

    // Sort by difficulty: Easy -> Medium -> Hard
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