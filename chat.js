// chat.js
document.addEventListener('DOMContentLoaded', () => {
    const chatLog = document.getElementById('chat-log');
    const chatInput = document.getElementById('chat-input');
    const sendButton = document.getElementById('send-button');
    
    // --- IMPORTANT: REPLACE THIS WITH THE ACTUAL NGROK PUBLIC URL FROM COLAB !!! ---
    // Example: const RAG_API_BASE_URL = 'https://a8f4cde.ngrok-free.app';
    const RAG_API_BASE_URL = 'https://1d7c-34-86-1-220.ngrok-free.app'; // <--- PASTE YOUR CURRENT NGROK URL HERE
    // ----------------------------------------------------------------------------------

    const aiResponses = {
        "how does scanning work": "When you click 'Start Scan', the extension analyzes the current web page's HTML and JavaScript code.",
        "how are vulnerabilities detected": "Vulnerabilities are detected by matching patterns.",
        "what is the overall risk score": "The overall risk score indicates the page's security posture.",
        "what is the report for": "The report provides a detailed summary of the scan findings.",
        "what is auto scan": "Auto-scan automatically scans pages on load.",
        "what are alerts": "Alerts highlight new vulnerabilities or sensitive data.",
        "what about settings": "The Settings page allows you to customize the extension.",
        "tell me more": "This extension helps identify common security issues.",
        "help": "Here are some common questions:\n- How does scanning work?\n- How are vulnerabilities detected?\n- What is the overall risk score?\n- What is the report for?\n- What is auto scan?\n- What are alerts?\n- What about settings?\n- Tell me more"
    };

    sendButton.addEventListener('click', () => {
        handleSendMessage();
    });

    chatInput.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
            handleSendMessage();
        }
    });

    function handleSendMessage() {
        const userQuestion = chatInput.value.trim();
        if (userQuestion === '') return;

        addMessage(userQuestion, 'user-message');
        chatInput.value = '';

        const normalizedQuestion = userQuestion.toLowerCase();

        const hardcodedResponse = aiResponses[normalizedQuestion];
        if (hardcodedResponse) {
            setTimeout(() => {
                addMessage(hardcodedResponse, 'ai-message');
                chatLog.scrollTop = chatLog.scrollHeight;
            }, 500);
        } else {
            sendToRAGAPI(userQuestion);
        }
    }

    function addMessage(message, senderClass, isHtml = false) {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', senderClass);
        if (isHtml) {
            messageDiv.innerHTML = message;
        } else {
            messageDiv.textContent = message;
        }
        chatLog.appendChild(messageDiv);
        chatLog.scrollTop = chatLog.scrollHeight;
    }

    async function sendToRAGAPI(question) {
        const thinkingId = 'thinking-message-' + Date.now();
        addMessage(`<span id="${thinkingId}">Thinking...</span>`, 'ai-message', true);

        try {
            const response = await fetch(`${RAG_API_BASE_URL}/ask`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({ query: question })
            });

            const thinkingMsgElement = document.getElementById(thinkingId);

            if (!response.ok) {
                const errorData = await response.json();
                const errorMessage = `Error: ${response.status} - ${errorData.error || 'Unknown API error'}`;
                if (thinkingMsgElement) {
                    thinkingMsgElement.textContent = `Assistant: ${errorMessage}`;
                } else {
                    addMessage(`Assistant: ${errorMessage}`, 'ai-message');
                }
                console.error('API Error:', errorData);
                return;
            }

            const data = await response.json();
            const answer = data.answer;
            const sources = data.sources; // Keep this line to still receive sources in the response

            if (thinkingMsgElement) {
                thinkingMsgElement.textContent = answer;
            } else {
                addMessage(answer, 'ai-message');
            }

            // REMOVED: No longer displaying sources.
            // if (sources && sources.length > 0) {
            //     const uniqueSourceNames = [...new Set(sources.map(s => {
            //         const parts = s.split(/[/\\]/); 
            //         return parts[parts.length - 1]; 
            //     }))];
            //     addMessage(`(Sources: ${uniqueSourceNames.join(', ')})`, 'ai-message');
            // }

        } catch (error) {
            console.error('Network or API Error:', error);
            const thinkingMsgElement = document.getElementById(thinkingId);
            if (thinkingMsgElement) {
                thinkingMsgElement.textContent = `Assistant: Network Error or RAG API is not reachable. (${error.message})`;
            } else {
                addMessage(`Assistant: Network Error or RAG API is not reachable. (${error.message})`, 'ai-message');
            }
        } finally {
            chatLog.scrollTop = chatLog.scrollHeight;
        }
    }

    async function checkBackendStatus() {
        try {
            const healthResponse = await fetch(`${RAG_API_BASE_URL}/health`);
            const healthData = await healthResponse.json();
            console.log("RAG API Health Status:", healthData.status, healthData.message);
            if (healthData.status === "initializing") {
                addMessage('RAG API is still initializing. Please wait a moment before asking questions.', 'ai-message');
            } else if (healthData.status === "ready" || healthData.rag_ready === true) {
                // addMessage('RAG API is ready!', 'ai-message');
            }
        } catch (error) {
            console.error("Failed to reach RAG API health endpoint:", error);
            addMessage('Could not connect to RAG API backend. Ensure Colab API is running.', 'ai-message');
        }
    }

    checkBackendStatus();
});