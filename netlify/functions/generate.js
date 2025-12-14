const { GoogleGenerativeAI } = require("@google/generative-ai");

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

    // 3. Initialize Gemini with JSON Enforcement
    const genAI = new GoogleGenerativeAI(apiKey);
    
    // Note: Used 'gemini-1.5-flash' as '2.5' is not yet a standard public endpoint.
    // If you specifically have access to a preview model, you can change this back.
    const model = genAI.getGenerativeModel({ 
        model: "gemini-2.5-flash", 
        generationConfig: { responseMimeType: "application/json" } // <--- CRITICAL: Forces strict JSON
    });

    // 4. Generate Content
    // We combine prompts to ensure the system instruction is strictly followed
    const result = await model.generateContent(systemPrompt + "\n\nUSER INPUT:\n" + userPrompt);
    const response = await result.response;
    const text = response.text();

    // 5. Return success with correct headers
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
