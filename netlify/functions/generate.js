const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } = require("@google/generative-ai");

exports.handler = async (event, context) => {
  // 1. Security: Only allow POST requests
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  // 2. Security: Check for API Key
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("Error: GEMINI_API_KEY is missing in Netlify environment variables.");
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Server Configuration Error: API Key missing" }),
    };
  }

  try {
    const { systemPrompt, userPrompt } = JSON.parse(event.body);

    // 3. Initialize Gemini with JSON Enforcement & Safety Settings
    const genAI = new GoogleGenerativeAI(apiKey);
    
    // Configure safety settings to be permissive so it doesn't block "gibberish" or "harsh" critiques
    // This fixes the "Analysis Failed" error when the AI thinks the input is spam.
    const safetySettings = [
      { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
      { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
      { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
      { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
    ];

    const model = genAI.getGenerativeModel({ 
        model: "gemini-2.5-flash", 
        generationConfig: { responseMimeType: "application/json" }, // Forces strict JSON
        safetySettings: safetySettings // Prevents 500 errors on bad input
    });

    // 4. Generate Content
    const result = await model.generateContent(systemPrompt + "\n\nUSER INPUT:\n" + userPrompt);
    const response = await result.response;
    const text = response.text();

    // 5. Return success
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: text,
    };

  } catch (error) {
    console.error("Backend API Error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Failed to generate content. Please try again." }),
    };
  }
};
