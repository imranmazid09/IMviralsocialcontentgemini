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

    // 3. Initialize Gemini
    const genAI = new GoogleGenerativeAI(apiKey);
    
    // Safety Settings: Permissive to allow "gibberish" checks without 500 errors
    const safetySettings = [
      { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
      { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
      { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
      { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
    ];

    // 4. ATTEMPT: Use Gemini 2.5 Flash
    // FIX: Removed 'responseMimeType' to prevent 400 Bad Request errors
    const model = genAI.getGenerativeModel({ 
        model: "gemini-2.5-flash", 
        // generationConfig: { responseMimeType: "application/json" }, <--- REMOVED TO PREVENT 400 ERROR
        safetySettings: safetySettings
    });

    const result = await model.generateContent(systemPrompt + "\n\nUSER INPUT:\n" + userPrompt);
    const response = await result.response;
    let text = response.text();

    // 5. MANUAL CLEANUP: Strip Markdown code blocks if present
    // Since we removed JSON mode, we must clean the output manually to ensure valid JSON.
    text = text.replace(/^```json\s*/, "").replace(/^```\s*/, "").replace(/\s*```$/, "").trim();

    return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: text,
    };

  } catch (error) {
    console.error("Backend Error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: `Generation Failed: ${error.message}` }),
    };
  }
};
