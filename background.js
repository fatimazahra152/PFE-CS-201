let previousScanResults = null;

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'performScan') {
        handleScanRequest(request, sendResponse);
        return true; // Keeps the sendResponse channel open for async
    }
});

async function handleScanRequest(request, sendResponse) {
    try {
        console.log('Starting scan for tab:', request.tabId);

        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab?.url) throw new Error('No active tab with a valid URL.');

        // 1. Get IP Address of user (not site)
        let ipAddress = 'N/A';
        try {
            const response = await fetch(`https://api.ipify.org?format=json`);
            const data = await response.json();
            ipAddress = data.ip;
        } catch (error) {
            console.warn("Unable to fetch public IP:", error);
        }

        // 2. Get full HTML of the page
        let htmlContent = '';
        try {
            const [htmlResult] = await chrome.scripting.executeScript({
                target: { tabId: request.tabId },
                func: () => document.documentElement.outerHTML
            });
            htmlContent = htmlResult?.result || '';
        } catch (error) {
            console.error("Cannot extract page HTML:", error);
            throw new Error("Failed to retrieve page content. Check permissions.");
        }

        // 3. Scan for sensitive data
        const sensitiveData = detectSensitiveData(htmlContent);

        // 4. (Optional) Add static vulnerability detection here
        const vulnerabilities = [];

        // 5. Calculate risk score
        const riskScore = calculateOverallRisk([
            ...sensitiveData.map(item => ({
                type: item.type,
                score: item.score,
                severity: item.score >= 8 ? 'High' : item.score >= 5 ? 'Medium' : 'Low'
            }))
        ]);

        const result = {
            ipAddress,
            riskScore,
            vulnerabilities,
            sensitiveData,
            alerts: []
        };

        previousScanResults = result;
        sendResponse(result);

    } catch (error) {
        console.error("Scan error:", error);
        sendResponse({
            error: error.message,
            ipAddress: 'N/A',
            riskScore: { score: 0, severity: 'Error' },
            vulnerabilities: [],
            sensitiveData: [],
            alerts: []
        });
    }
}

// ------------------------------------
// 📦 Sensitive Data Detection Logic
// ------------------------------------
function detectSensitiveData(html) {
    const results = [];

    // Emails
    const emailMatches = html.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [];
    if (emailMatches.length) {
        results.push({
            type: 'Email Address',
            count: emailMatches.length,
            matches: [...new Set(emailMatches)],
            score: 6
        });
    }

    // API Tokens
    const tokenMatches = html.match(/\b[A-Za-z0-9-_]{32,64}\b/g) || [];
    const tokens = tokenMatches.filter(t => !/^\d+$/.test(t));
    if (tokens.length) {
        results.push({
            type: 'Possible API Tokens',
            count: tokens.length,
            matches: [...new Set(tokens)],
            score: 8
        });
    }

    // IP Addresses
    const ipMatches = html.match(/\b\d{1,3}(?:\.\d{1,3}){3}\b/g) || [];
    if (ipMatches.length) {
        results.push({
            type: 'IP Address',
            count: ipMatches.length,
            matches: [...new Set(ipMatches)],
            score: 5
        });
    }

    // Suspicious Domains/APKs
    const urlMatches = html.match(/https?:\/\/[^\s"'<>]+/g) || [];
    const suspicious = urlMatches.filter(url =>
        /(apk$|\.xyz|\.top|mega\.nz|\.onion|drive\.google\.com\/file)/.test(url)
    );
    if (suspicious.length) {
        results.push({
            type: 'Suspicious URLs/APKs',
            count: suspicious.length,
            matches: [...new Set(suspicious)],
            score: 7
        });
    }

    // Subdomains
    const subdomainMatches = html.match(/\b([a-z0-9]+)\.([a-z0-9-]+\.[a-z]{2,})\b/gi) || [];
    const subs = [...new Set(subdomainMatches)].filter(d => d.split('.').length >= 3);
    if (subs.length) {
        results.push({
            type: 'Subdomain Calls',
            count: subs.length,
            matches: subs,
            score: 4
        });
    }

    return results;
}

// ------------------------------------
// 🧮 Risk Score Calculation
// ------------------------------------
function calculateOverallRisk(items) {
    if (!items || items.length === 0) return { score: 0, severity: 'None' };

    const score = items.reduce((sum, item) => sum + item.score, 0) / items.length;

    let severity = 'Low';
    if (score >= 8) severity = 'High';
    else if (score >= 5) severity = 'Medium';

    return { score, severity };
}
