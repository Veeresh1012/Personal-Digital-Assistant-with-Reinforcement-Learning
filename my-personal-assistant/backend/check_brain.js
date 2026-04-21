// backend/check_brain.js
require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function testModel(modelName) {
    console.log(`Testing model: ${modelName}...`);
    try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent("Say hello");
        console.log(`✅ SUCCESS! ${modelName} is working.`);
        return true;
    } catch (error) {
        console.log(`❌ FAILED. ${modelName} gave error: ${error.message.substring(0, 60)}...`);
        return false;
    }
}

async function runDiagnostics() {
    console.log("--- DIAGNOSTIC START ---");
    // We will test the 3 most likely models
    await testModel("gemini-1.5-flash");
    await testModel("gemini-1.5-pro");
    await testModel("gemini-pro"); 
    console.log("--- DIAGNOSTIC END ---");
}

runDiagnostics();