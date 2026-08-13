<h1 align="center">🌾 AgriSense — AI-Powered Agricultural Assistant</h1>

<p align="center">
  Transforming traditional farming through AI-driven insights, real-time weather data, and intelligent crop management — built for agricultural communities.
</p>

---

<p align="center">
  <img alt="React" src="https://img.shields.io/badge/React-18.0+-61DAFB?style=for-the-badge&logo=react&logoColor=white"/>
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5.0+-3178C6?style=for-the-badge&logo=typescript&logoColor=white"/>
  <img alt="Node.js" src="https://img.shields.io/badge/Node.js-18.0+-339933?style=for-the-badge&logo=node.js&logoColor=white"/>
  <img alt="MongoDB" src="https://img.shields.io/badge/MongoDB-Atlas-47A248?style=for-the-badge&logo=mongodb&logoColor=white"/>
  <img alt="Socket.io" src="https://img.shields.io/badge/Socket.io-4.0+-010101?style=for-the-badge&logo=socket.io&logoColor=white"/>
</p>

---

## 🚀 Overview

**AgriSense** is an AI-powered agricultural platform designed to empower farmers with intelligent recommendations, hyperlocal weather insights, and smart crop management. It supports multilingual chat (Malayalam and English), real-time AI assistance, plant disease detection with solutions, soil health analysis, and an integrated dashboard for agricultural officers.

---

## ✨ Key Highlights

### 🤖 AI Chat Assistant
- Context-aware conversations for personalized farming guidance
- Real-time communication via **Socket.io**
- **Speech-to-Text / Voice interaction** support
- Multilingual support (Malayalam & English)

### 🌿 Plant Disease Detection & Soil Analysis
- AI vision models to detect and identify plant diseases from photos
- Actionable remedies and prevention tips tailored for regional crops
- Soil health evaluation and crop suitability analysis

### 🌤️ Smart Weather Intelligence
- Real-time weather forecasts and district-wise climate data
- AI-generated agricultural advice based on local weather conditions
- Seasonal planting and irrigation advice

### 🧑‍💼 Agricultural Officer Dashboard
- Manage and review farmer queries in real-time
- Direct communication channel between officers and farmers
- Analytics and query tracking

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18, TypeScript, TailwindCSS, Lucide React, Recharts |
| **Backend** | Node.js, Express.js, Socket.io |
| **Database** | MongoDB Atlas |
| **AI & APIs** | Google Gemini AI, Hugging Face Vision Models, OpenWeatherMap API |
| **Build Tools** | Vite |

---

## ⚡ Quick Start

### 🔧 Prerequisites
- Node.js (v18 or higher)
- npm or yarn
- MongoDB Atlas cluster
- API Keys: Google Gemini API, OpenWeatherMap API, Hugging Face Token

---

### 📦 Installation & Setup

#### 1. Clone the Repository
```bash
git clone https://github.com/Harish-kumar12345/agrisense-platform.git
cd agrisense-platform
```

#### 2. Backend Setup
```bash
cd backend
npm install
```
Create a `.env` file in the `backend/` directory:
```env
PORT=3001
MONGODB_URI=your_mongodb_connection_string
GEMINI_API_KEY=your_gemini_api_key
OPENWEATHER_API_KEY=your_openweather_api_key
HF_TOKEN=your_huggingface_token
```
Start backend server:
```bash
npm run dev
```

#### 3. Frontend Setup
```bash
cd ../frontend
npm install
```
Create a `.env` file in the `frontend/` directory:
```env
VITE_BACKEND_URL=http://localhost:3001
VITE_OPENWEATHER_API_KEY=your_openweather_api_key
```
Start frontend development server:
```bash
npm run dev
```

#### 4. Access Application
- **Frontend App**: `http://localhost:5173`
- **Backend API**: `http://localhost:3001`

---

## 🌍 Environment Variables Reference

### Backend (`backend/.env`)
| Variable | Description |
|---|---|
| `PORT` | Port for Express server (default `3001`) |
| `MONGODB_URI` | MongoDB Atlas Connection String |
| `GEMINI_API_KEY` | Google Gemini API Key for AI responses |
| `OPENWEATHER_API_KEY` | OpenWeatherMap API Key |
| `HF_TOKEN` | Hugging Face Access Token |

### Frontend (`frontend/.env`)
| Variable | Description |
|---|---|
| `VITE_BACKEND_URL` | URL of the backend API server |
| `VITE_OPENWEATHER_API_KEY` | OpenWeatherMap API Key |

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📜 License

This project is open source and available under the [MIT License](LICENSE).
