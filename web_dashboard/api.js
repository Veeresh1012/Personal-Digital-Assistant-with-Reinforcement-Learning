const API_URL = "http://localhost:3000/chat";

async function sendMessageToBrain(text) {
    console.log("🚀 Sending:", text);
    try {
        const response = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: text })
        });

        const data = await response.json();
        console.log("🤖 Reply:", data);
        return data.reply;
    } catch (error) {
        console.error(error);
        return "Error: Check server console.";
    }
}

// Global Export
window.askAI = sendMessageToBrain;