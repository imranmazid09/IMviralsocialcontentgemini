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
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Server Configuration Error: API Key missing" }),
    };
  }

  try {
    // 3. Input Validation
    if (!event.body) {
      throw new Error("Request body is empty");
    }
    const { systemPrompt, userPrompt } = JSON.parse(event.body);

    // 4. Initialize Gemini
    const genAI = new GoogleGenerativeAI(apiKey);
    
    // Safety Settings: Permissive to allow "gibberish" checks without blocking
    const safetySettings = [
      { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
      { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
      { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
      { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
    ];

    // 5. ATTEMPT: Use Gemini 2.5 Flash
    // NOTE: 'responseMimeType' is removed to prevent 400 errors on this model/API version
    const model = genAI.getGenerativeModel({ 
        model: "gemini-2.5-flash", 
        safetySettings: safetySettings
    });

    const result = await model.generateContent(systemPrompt + "\n\nUSER INPUT:\n" + userPrompt);
    const response = await result.response;
    let text = response.text();

    // 6. MANUAL CLEANUP: Strip Markdown code blocks if present
    // Since we are not using JSON mode, we manually clean the output to ensure valid JSON.
    if (text) {
        text = text.replace(/^```json\s*/, "").replace(/^```\s*/, "").replace(/\s*```$/, "").trim();
    }

    return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: text,
    };

  } catch (error) {
    console.error("Backend Error:", error);
    // Return JSON even for errors so the frontend doesn't crash with "Unexpected token <"
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: `Generation Failed: ${error.message}` }),
    };
  }
};
