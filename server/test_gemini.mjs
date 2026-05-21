import dotenv from 'dotenv';
dotenv.config();
import { GoogleGenerativeAI } from '@google/generative-ai';

async function test() {
  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const result = await model.generateContent("Say hello!");
    const response = await result.response;
    console.log("SUCCESS:", response.text());
  } catch (e) {
    console.error("ERROR:", e.message);
  }
}
test();
