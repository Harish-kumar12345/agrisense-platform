const mongoose = require('mongoose');
const { Query } = require('../models/Query');
const { KnowledgeBase } = require('../models/KnowledgeBase');
const { getIo } = require('../utils/io');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const dotenv = require('dotenv');
const path = require('path');

// Load .env file from the backend directory
dotenv.config({ path: path.join(__dirname, '../../.env') });

// Malayalam language detection and translation utilities
function isMalayalam(text = '') {
  return /[\u0D00-\u0D7F]/.test(text);
}

async function translateToMalayalam(text) {
  if (!model) return text;
  
  try {
    const prompt = `Translate the following text to Malayalam. Only provide the Malayalam translation, no explanations or additional text:

"${text}"`;
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const translatedText = response.text().trim();
    
    return translatedText || text;
  } catch (error) {
    console.error('❌ Translation to Malayalam failed:', error);
    return text;
  }
}

// Initialize Gemini AI with your API key
let genAI = null;
let model = null;

console.log('🔑 Checking Gemini API Key...');
if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'your_gemini_api_key_here') {
  try {
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    console.log('✅ Gemini AI initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize Gemini AI:', error.message);
  }
} else {
  console.warn('⚠️ Gemini API Key not found or not configured');
}

// Retry mechanism with exponential backoff
async function callWithRetry(fn, maxRetries = 3, baseDelay = 1000) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      console.log(`🔄 Attempt ${attempt}/${maxRetries} failed:`, error.message);
      
      // If it's a 503 (service unavailable) or rate limit error, retry
      if ((error.status === 503 || error.status === 429 || error.message.includes('overloaded')) && attempt < maxRetries) {
        const delay = baseDelay * Math.pow(2, attempt - 1); // Exponential backoff
        console.log(`⏳ Waiting ${delay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      // If it's the last attempt or non-retryable error, throw
      throw error;
    }
  }
}

async function retrieveContext(userText) {
  try {
    if (mongoose.connection.readyState !== 1) return '';
    const terms = userText.split(/\s+/).filter(Boolean).slice(0, 5);
    const found = await KnowledgeBase.find({ tags: { $in: terms } }).limit(3).lean();
    return found.map((d) => `${d.title}: ${d.content}`).join('\n\n');
  } catch (err) {
    return '';
  }
}

async function generateAIResponse({ queryId, text, roomId }) {
  try {
    console.log(`🤖 Generating AI response for query: ${text.substring(0, 50)}...`);
    
    const context = await retrieveContext(text);
    const prompt = `You are Krishi Mitra, an expert agricultural assistant helping Indian farmers. Provide practical, actionable advice in simple language. Keep responses helpful but concise (2-3 sentences max).

Context: ${context || 'None'}

Farmer's Question: ${text}

Provide helpful agricultural guidance:`;

    let answer = '';
    if (model) {
      try {
        answer = await callWithRetry(async () => {
          const result = await model.generateContent(prompt);
          const response = await result.response;
          return response.text();
        });
        console.log('✅ AI response generated successfully');
      } catch (genErr) {
        console.error('❌ AI Generation Error after retries:', genErr);
        answer = getFallbackResponse(text);
      }
    } else {
      console.log('⚠️ Gemini API not configured - using fallback');
      answer = getFallbackResponse(text);
    }

    if (!answer) {
      answer = getFallbackResponse(text);
    }
    
    // Update database
    await Query.findByIdAndUpdate(queryId, { response: answer, status: 'answered' });
    
    // Send real-time response via socket
    const io = getIo();
    if (io && roomId) {
      console.log(`📤 Sending response to room ${roomId}`);
      io.to(roomId).emit('assistant_message', { text: answer });
    }
    
    return answer;
  } catch (err) {
    console.error('❌ Error in generateAIResponse:', err);
    await Query.findByIdAndUpdate(queryId, { status: 'error' });
    throw err;
  }
}

async function getFallbackResponse(text, language = 'en') {
  const lowerText = text.toLowerCase();
  let response = '';
  
  // Weather-related queries
  if (lowerText.includes('weather') || lowerText.includes('rain') || lowerText.includes('climate')) {
    response = "🌤️ Monitor weather patterns regularly using reliable apps or IMD forecasts. Plan sowing and harvesting based on monsoon predictions. Ensure proper drainage during heavy rains and irrigation during dry spells.";
  }
  // Kerala-specific crops
  else if (lowerText.includes('kerala') || lowerText.includes('coconut') || lowerText.includes('pepper') || lowerText.includes('cardamom')) {
    response = "🌴 Kerala's tropical climate is ideal for coconut, pepper, cardamom, rubber, and spices. Focus on organic farming, proper spacing, and intercropping. Consult local KVK for variety-specific guidance.";
  }
  // Crop and planting queries
  else if (lowerText.includes('crop') || lowerText.includes('plant') || lowerText.includes('seed') || lowerText.includes('sow')) {
    response = "🌱 Choose crops based on your soil type, climate, and market demand. Ensure good quality seeds, proper spacing, and timely sowing. Consider crop rotation for soil health. Contact your local agricultural officer for region-specific varieties.";
  }
  // Pest and disease queries
  else if (lowerText.includes('pest') || lowerText.includes('disease') || lowerText.includes('insect') || lowerText.includes('fungus')) {
    response = "🐛 Early identification is key for pest management. Use integrated pest management (IPM) combining biological, cultural, and chemical methods. Neem-based solutions are effective for many pests. Consult agricultural experts for severe infestations.";
  }
  // Soil-related queries
  else if (lowerText.includes('soil') || lowerText.includes('fertilizer') || lowerText.includes('nutrient')) {
    response = "🌾 Regular soil testing helps determine nutrient needs. Use organic compost and balanced fertilizers. Maintain soil pH between 6.0-7.5 for most crops. Add organic matter to improve soil structure and water retention.";
  }
  // Water and irrigation
  else if (lowerText.includes('water') || lowerText.includes('irrigation') || lowerText.includes('drip')) {
    response = "💧 Efficient water management is crucial. Consider drip irrigation for water conservation. Water early morning or evening to reduce evaporation. Monitor soil moisture and adjust irrigation based on crop stage and weather.";
  }
  // Marketing and price queries
  else if (lowerText.includes('price') || lowerText.includes('market') || lowerText.includes('sell')) {
    response = "💰 Check current market prices through e-NAM portal or local mandis. Build relationships with buyers and consider direct marketing. Add value through processing if possible. Store properly to avoid post-harvest losses.";
  }
  // Default response
  else {
    response = "🌾 Thank you for your agricultural question! Follow good agricultural practices, consult your local Krishi Vigyan Kendra (KVK), and use modern farming techniques for better yields. Feel free to ask again!";
  }
  
  // Translate to Malayalam if requested
  if (language === 'ml') {
    try {
      response = await translateToMalayalam(response);
    } catch (error) {
      console.error('❌ Fallback translation failed:', error);
      response = "ക്ഷമിക്കണം, ഇപ്പോൾ വിശദമായ മറുപടി നൽകാൻ കഴിഞ്ഞില്ല. കൃഷി സംബന്ധിയായ സഹായത്തിന് പ്രാദേശിക കൃഷി ഓഫീസറെ സമീപിക്കുക.";
    }
  }
  
  return response;
}

// Add a simple test function
async function testAI(query = "What crops are good for monsoon season?") {
  try {
    if (!model) {
      return { success: false, message: 'AI service not configured - API key missing' };
    }
    
    const response = await callWithRetry(async () => {
      const result = await model.generateContent(query);
      const response = await result.response;
      return response.text();
    });
    
    return { success: true, response };
  } catch (error) {
    console.error('AI test error:', error);
    return { success: false, message: error.message };
  }
}

// Simple AI response for real-time chat (no database)
async function generateChatResponse(text, options = {}) {
  try {
    const language = typeof options === 'string' ? options : (options?.language || 'en');
    console.log(`🤖 Generating chat response for: ${text.substring(0, 50)}... (Language: ${language})`);
    
    const context = await retrieveContext(text);
    
    // Create language-specific prompt
    const basePrompt = `You are Krishi Mitra, an expert agricultural assistant helping Indian farmers. Provide practical, actionable advice in simple language. Keep responses helpful but concise (2-3 sentences max).

Context: ${context || 'None'}

Farmer's Question: ${text}

Provide helpful agricultural guidance`;
    
    const prompt = language === 'ml' 
      ? `${basePrompt}. IMPORTANT: Reply ONLY in Malayalam language. Use Malayalam script (മലയാളം).`
      : `${basePrompt}:`;

    let answer = '';
    if (model) {
      try {
        answer = await callWithRetry(async () => {
          const result = await model.generateContent(prompt);
          const response = await result.response;
          return response.text();
        });
        
        // If Malayalam was requested but response is in English, translate it
        if (language === 'ml' && answer && !isMalayalam(answer)) {
          console.log('🔄 Response not in Malayalam, translating...');
          answer = await translateToMalayalam(answer);
        }
        
        console.log('✅ Chat response generated successfully');
      } catch (genErr) {
        console.error('❌ AI Generation Error after retries:', genErr);
        answer = await getFallbackResponse(text, language);
      }
    } else {
      console.log('⚠️ Gemini API not configured - using fallback');
      answer = await getFallbackResponse(text, language);
    }

    if (!answer) {
      answer = await getFallbackResponse(text, language);
    }
    
    return answer;
  } catch (err) {
    console.error('❌ Error in generateChatResponse:', err);
    const language = typeof options === 'string' ? options : (options?.language || 'en');
    return await getFallbackResponse(text, language);
  }
}

// Generate treatment recommendations for plant diseases
async function generateDiseaseRecommendation(diseaseData, language = 'en') {
  try {
    console.log(`🩺 Generating treatment recommendation for: ${diseaseData.primaryDisease?.disease} (${language})`);
    
    const { primaryDisease, predictions } = diseaseData;
    
    // Create language-specific prompt
    let prompt = `You are an expert plant pathologist and agricultural advisor. A farmer has uploaded an image of their plant, and our AI analysis has identified:

PRIMARY DISEASE: ${primaryDisease.disease} (${primaryDisease.confidence}% confidence, ${primaryDisease.severity} severity)

${predictions.length > 1 ? `ALTERNATIVE POSSIBILITIES:
${predictions.slice(1).map((pred, i) => `${i + 2}. ${pred.disease} (${pred.confidence}% confidence)`).join('\n')}` : ''}

Please provide a well-formatted treatment plan with the following structure:

🚨 **IMMEDIATE ACTIONS** (what to do right now)
🌿 **ORGANIC TREATMENT** (natural/biological solutions)  
💊 **CHEMICAL TREATMENT** (if organic fails)
🛡️ **PREVENTION STRATEGIES** (avoid future occurrences)
⚠️ **WARNING SIGNS** (when to seek expert help)

Make it practical for Indian farmers, especially in Kerala. Use emojis and clear formatting. Focus on cost-effective, locally available solutions. Keep each section concise but actionable.`;

    // Add language instruction for Malayalam
    if (language === 'ml') {
      prompt += '\n\nIMPORTANT: Please respond in Malayalam language only. Use Malayalam text throughout the entire response.';
    }

    let recommendation = '';
    if (model) {
      try {
        recommendation = await callWithRetry(async () => {
          const result = await model.generateContent(prompt);
          const response = await result.response;
          return response.text();
        });
        console.log(`✅ Disease treatment recommendation generated successfully in ${language}`);
        
        // Verify Malayalam response and translate if needed
        if (language === 'ml' && !isMalayalam(recommendation)) {
          console.log('⚠️ Gemini responded in English, translating to Malayalam...');
          try {
            recommendation = await translateToMalayalam(recommendation);
          } catch (translateErr) {
            console.error('❌ Translation failed:', translateErr);
            recommendation = await getFallbackDiseaseRecommendation(primaryDisease.disease, language);
          }
        }
        
      } catch (genErr) {
        console.error('❌ AI Generation Error for disease recommendation:', genErr);
        recommendation = await getFallbackDiseaseRecommendation(primaryDisease.disease, language);
      }
    } else {
      console.log('⚠️ Gemini API not configured - using fallback disease recommendation');
      recommendation = await getFallbackDiseaseRecommendation(primaryDisease.disease, language);
    }

    if (!recommendation) {
      recommendation = await getFallbackDiseaseRecommendation(primaryDisease.disease, language);
    }
    
    return recommendation;
  } catch (err) {
    console.error('❌ Error in generateDiseaseRecommendation:', err);
    return await getFallbackDiseaseRecommendation('Unknown Disease', language);
  }
}

async function getFallbackDiseaseRecommendation(diseaseName, language = 'en') {
  let recommendation = `🩺 **Treatment Plan for ${diseaseName}**

🚨 **IMMEDIATE ACTIONS**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔹 Remove and destroy affected plant parts immediately
🔹 Isolate infected plants from healthy ones
🔹 Improve air circulation around plants
🔹 Stop overhead watering, water at root level only

🌿 **ORGANIC TREATMENT**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔹 **Neem Oil Spray**: Mix 2-3ml neem oil per liter water, spray evening time
🔹 **Baking Soda Solution**: 1 tsp per liter water for fungal issues
🔹 **Turmeric Paste**: Mix with water, apply on affected areas
🔹 **Compost Tea**: Boost plant immunity naturally

💊 **CHEMICAL TREATMENT** (if organic fails)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔹 Visit local agricultural store for specific fungicides
🔹 Use copper-based fungicides for bacterial/fungal diseases
🔹 Always wear protective equipment during application
🔹 Follow label instructions strictly

🛡️ **PREVENTION STRATEGIES**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔹 Maintain proper plant spacing for air circulation
🔹 Apply balanced NPK fertilizer regularly
🔹 Mulch around plants to retain moisture
🔹 Regular inspection (weekly check-ups)

⚠️ **SEEK EXPERT HELP IF:**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔹 Disease spreads rapidly despite treatment
🔹 Multiple plants are affected
🔹 Crop yield is significantly reduced
🔹 Unusual symptoms appear

📞 **Contact**: Your local Krishi Vigyan Kendra (KVK) or agricultural extension officer for region-specific guidance.`;

  // Translate to Malayalam if requested
  if (language === 'ml') {
    try {
      recommendation = await translateToMalayalam(recommendation);
    } catch (error) {
      console.error('❌ Fallback disease recommendation translation failed:', error);
      // Provide a basic Malayalam version if translation fails
      recommendation = `🩺 **${diseaseName} ചികിത്സാ പദ്ധതി**

🚨 **അടിയന്തര നടപടികൾ**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔹 രോഗബാധിതമായ ഭാഗങ്ങൾ ഉടനെ നീക്കം ചെയ്യുക
🔹 രോഗബാധിത സസ്യങ്ങളെ ആരോഗ്യമുള്ളവയിൽ നിന്ന് വേർതിരിക്കുക
🔹 സസ്യങ്ങൾക്ക് ചുറ്റും വായു സഞ്ചാരം മെച്ചപ്പെടുത്തുക

🌿 **ജൈവ ചികിത്സ**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔹 വേപ്പെണ്ണ സ്പ്രേ ഉപയോഗിക്കുക
🔹 മഞ്ഞൾ പേസ്റ്റ് പ്രയോഗിക്കുക
🔹 കമ്പോസ്റ്റ് ടീ ഉപയോഗിക്കുക

📞 **സഹായത്തിനായി പ്രാദേശിക കൃഷി വിദഗ്ധനെ സമീപിക്കുക**`;
    }
  }

  return recommendation;
}

module.exports = { generateAIResponse, generateChatResponse, testAI, generateDiseaseRecommendation, translateToMalayalam };


