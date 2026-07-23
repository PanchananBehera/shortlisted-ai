# 🎭 Shortlisted AI — Your AI Career Coach

> Ace your dream job interview with PacoBot, your personalized AI mock interview partner.

🔗 **Live Demo**: [https://shortlisted-ai-job-alpha.vercel.app/](https://shortlisted-ai-job-alpha.vercel.app/)  
🤖 **Backend**: [https://shortlisted-ai-app.onrender.com](https://shortlisted-ai-app.onrender.com)

---

## ✨ Features

- 🤖 **PacoBot 3D Avatar**: Expressive robotic interviewer with procedural gestures & voice
- 🎯 **Personalized Interviews**: Target role, dream company, job description, experience level
- 🗣️ **Voice + Text Input**: Web Speech API + robotic voice synthesis with mechanical beeps
- 📊 **Advanced Analytics**: Score trends, skills breakdown, session comparison, PDF/email export
- 📱 **Mobile-First Design**: Flawless experience on iPhone, Android, tablet & desktop
- 🔐 **Secure Auth**: JWT-based authentication with protected API routes

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18, Vite, Tailwind CSS, React Three Fiber, Recharts |
| **Backend** | Node.js, Express, MongoDB, Mongoose |
| **AI** | Google Gemini API (prompt engineering + JSON parsing) |
| **Voice** | Web Speech API + AudioContext for robotic effects |
| **3D** | GLTF 3D model with procedural animations |
| **Deployment** | Vercel (frontend), Render (backend), MongoDB Atlas |

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- MongoDB Atlas account (free tier)
- Google Gemini API key

### Installation
```bash
# Clone repo
git clone https://github.com/yourusername/ai-job-tracker.git
cd ai-job-tracker

# Install dependencies
cd client && npm install
cd ../server && npm install

# Environment variables
# Create server/.env and client/.env.local (see .env.example)

# Run locally
cd ../client && npm run dev
# Frontend: http://localhost:5174
# Backend: http://localhost:5000
