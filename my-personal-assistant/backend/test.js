async function testServer() {
    console.log("⏳ Testing Multi-Domain Brain...");
    
    // TEST CASE 1: Investment
    // const message = "I bought 5 shares of Apple for $150 each as an investment.";
    
    // TEST CASE 2: Travel Schedule
    // const message = "Schedule a work trip to London on December 5th.";

    // TEST CASE 3: Gym PR
    const message = "I hit a new PR on Bench Press today: 100kg!";

    try {
        const response = await fetch('http://localhost:3000/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: message })
        });

        const data = await response.json();
        console.log("\n🤖 SERVER RESPONSE:", data);
    } catch (error) {
        console.error("❌ Error:", error.message);
    }
}

testServer();