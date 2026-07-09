// server/services/aiCoachingService.js

// ✅ Generate real-time coaching hint via Gemini
export const generateRealTimeCoaching = async (transcript, question) => {
  const prompt = `
    You are a real-time interview coach. Analyze this response and provide ONE concise, actionable hint.
    
    Question: ${question}
    User Response: ${transcript}
    
    Choose ONE category:
    - structure: Answer organization (STAR method, clarity)
    - content: Technical accuracy, relevance to question
    - delivery: Pace, filler words, confidence markers
    - confidence: Tone, assertiveness, hesitation
    
    Respond in strict JSON:
    {
      "category": "structure|content|delivery|confidence",
      "hint": "One specific suggestion under 15 words"
    }
  `;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: 'application/json' }
        })
      }
    );

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    return JSON.parse(data.candidates[0].content.parts[0].text);
  } catch (error) {
    console.error('Real-time coaching error:', error);
    // Fallback hint
    return {
      category: 'structure',
      hint: 'Try structuring your answer with a clear beginning, middle, and end.'
    };
  }
};

// ✅ Analyze response tone/confidence
export const analyzeResponseTone = async (text) => {
  const prompt = `
    Analyze the confidence and tone of this interview response:
    "${text}"
    
    Respond in JSON:
    {
      "confidence": 0.85,  // 0 to 1 scale
      "tone": ["professional", "slightly-hesitant"],
      "suggestions": ["Speak more assertively about outcomes"]
    }
  `;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: 'application/json' }
        })
      }
    );

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    return JSON.parse(data.candidates[0].content.parts[0].text);
  } catch (error) {
    console.error('Tone analysis error:', error);
    // Fallback analysis
    return {
      confidence: 0.7,
      tone: ['professional'],
      suggestions: ['Continue practicing to build confidence']
    };
  }
};