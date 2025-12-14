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

    // 4. ATTEMPT 1: Try the requested gemini-2.5-flash model
    try {
        const model = genAI.getGenerativeModel({ 
            model: "gemini-2.5-flash", 
            generationConfig: { responseMimeType: "application/json" },
            safetySettings: safetySettings
        });

        const result = await model.generateContent(systemPrompt + "\n\nUSER INPUT:\n" + userPrompt);
        const response = await result.response;
        return {
            statusCode: 200,
            headers: { "Content-Type": "application/json" },
            body: response.text(),
        };

    } catch (primaryError) {
        console.warn("Primary model (gemini-2.5-flash) failed. Attempting fallback.", primaryError.message);

        // 5. ATTEMPT 2: Fallback to gemini-1.5-flash if 2.5 fails (usually due to 404/Not Found)
        // This ensures the tool works for students even if the specific model string is rejected.
        const fallbackModel = genAI.getGenerativeModel({ 
            model: "gemini-1.5-flash", 
            generationConfig: { responseMimeType: "application/json" },
            safetySettings: safetySettings
        });

        const result = await fallbackModel.generateContent(systemPrompt + "\n\nUSER INPUT:\n" + userPrompt);
        const response = await result.response;
        
        return {
            statusCode: 200,
            headers: { "Content-Type": "application/json" },
            body: response.text(),
        };
    }

  } catch (error) {
    // 6. CRITICAL FIX: improved error logging
    // We now return the REAL error message to the frontend so you can see if it's "Model not found" or something else.
    console.error("All generation attempts failed:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: `Generation Failed: ${error.message}` }),
    };
  }
};
