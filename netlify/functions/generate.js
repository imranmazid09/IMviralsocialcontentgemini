const { GoogleGenerativeAI } = require("@google/generative-ai");

exports.handler = async function(event, context) {
    // Only allow POST requests
    if (event.httpMethod !== "POST") {
        return { statusCode: 405, body: "Method Not Allowed" };
    }

    // Get the API Key from Netlify Environment Variables
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        return { statusCode: 500, body: JSON.stringify({ error: "Server Configuration Error: API Key missing" }) };
    }

    try {
        const { systemPrompt, userPrompt } = JSON.parse(event.body);

        // Initialize Gemini
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

        // Generate Content
        const result = await model.generateContent(systemPrompt + "\n\n" + userPrompt);
        const response = await result.response;
        let text = response.text();

        // Clean up markdown code blocks if present (common Gemini behavior)
        text = text.replace(/```json\n?|\n?```/g, '').trim();

        // Return the clean JSON to the frontend
        return {
            statusCode: 200,
            body: text 
        };

    } catch (error) {
        console.error("Backend Error:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Failed to generate content: " + error.message })
        };
    }
};