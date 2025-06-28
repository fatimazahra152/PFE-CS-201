document.addEventListener('DOMContentLoaded', () => {
  const scanBtn = document.getElementById('scanBtn');
  const reportBtn = document.getElementById('reportBtn');
  const aiChatBtn = document.getElementById('aiChatBtn'); // ADD THIS LINE

  if (scanBtn) {
   scanBtn.addEventListener('click', startScan);
  }

  if (reportBtn) {
   reportBtn.addEventListener('click', generateReport);
  }

  if (aiChatBtn) { // ADD THIS BLOCK
   aiChatBtn.addEventListener('click', () => {
    chrome.windows.create({
     url: chrome.runtime.getURL('chat.html'),
     type: 'popup',
     width: 350,
     height: 500
    });
   });
  }
});


let scanResults = null;


function startScan() {
  const statusText = document.getElementById('statusText');
  const progressBar = document.getElementById('progressBar');
  const resultsDiv = document.getElementById('results');


  // Reset UI
  statusText.textContent = 'Scanning...';
  progressBar.style.width = '0%';
  resultsDiv.innerHTML = '';


  // Animate progress bar
  let progress = 0;
  const progressInterval = setInterval(() => {
   progress += 2;
   progressBar.style.width = `${progress}%`;
   if (progress >= 100) clearInterval(progressInterval);
  }, 100);


  // Execute content script
  chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
   if (!tabs[0]) {
    statusText.textContent = 'No active tab found';
    clearInterval(progressInterval);
    return;
   }


   chrome.scripting.executeScript({
    target: {tabId: tabs[0].id},
    files: ['content.js']
   }).catch(err => {
    statusText.textContent = 'Error: ' + err.message;
    clearInterval(progressInterval);
   });
  });


  // Listen for results
  chrome.runtime.onMessage.addListener(function listener(message) {
   if (message.type === 'scanComplete') {
    clearInterval(progressInterval);
    progressBar.style.width = '100%';
    statusText.textContent = 'Scan Complete';
    scanResults = message.data;
    displayResults(message.data);
    chrome.runtime.onMessage.removeListener(listener);
   }
  });
}


function displayResults(data) {
  const resultsDiv = document.getElementById('results');


  // Display Emails
  if (data.emails && data.emails.length > 0) {
   resultsDiv.innerHTML += `<div class="result-category">Emails Found:</div>`;
   data.emails.forEach(email => {
    resultsDiv.innerHTML += `<div>${email}</div>`;
   });
  }


  // Display IPs
  if (data.ips && data.ips.length > 0) {
   resultsDiv.innerHTML += `<div class="result-category">IP Addresses:</div>`;
   data.ips.forEach(ip => {
    resultsDiv.innerHTML += `<div>${ip}</div>`;
   });
  }


  // Display Subdomains
  if (data.subdomains && data.subdomains.length > 0) {
   resultsDiv.innerHTML += `<div class="result-category">Subdomains:</div>`;
   data.subdomains.forEach(sub => {
    resultsDiv.innerHTML += `<div>${sub}</div>`;
   });
  }


  // Display Tokens
  if (data.tokens && data.tokens.length > 0) {
   resultsDiv.innerHTML += `<div class="result-category high">Tokens Found (High Risk):</div>`;
   data.tokens.forEach(token => {
    resultsDiv.innerHTML += `<div class="high">${token}</div>`;
   });
  }


  // Display APKs
  if (data.apks && data.apks.length > 0) {
   resultsDiv.innerHTML += `<div class="result-category medium">APK References Found:</div>`;
   data.apks.forEach(apk => {
    resultsDiv.innerHTML += `<div class="medium">${apk}</div>`;
   });
  }


  // Display Vulnerabilities with risk colors
  if (data.vulnerabilities && data.vulnerabilities.length > 0) {
   resultsDiv.innerHTML += `<div class="result-category">Potential Vulnerabilities:</div>`;
   data.vulnerabilities.forEach(vuln => {
    resultsDiv.innerHTML += `<div class="${vuln.severity}">${vuln.type}: ${vuln.details}</div>`;
   });
  }


  // NEW: Display Suspicious Links
  if (data.suspiciousLinks && data.suspiciousLinks.length > 0) {
   resultsDiv.innerHTML += `<div class="result-category high">Suspicious Links:</div>`;
   data.suspiciousLinks.forEach(link => {
    resultsDiv.innerHTML += `
     <div class="result-item severity-${link.severity}">
      <span class="result-url">${link.url}</span>
      <span class="result-reason">(${link.reason})</span>
     </div>
    `;
   });
  }


  // NEW: Display Suspicious IPs
  if (data.suspiciousIPs && data.suspiciousIPs.length > 0) {
   resultsDiv.innerHTML += `<div class="result-category high">Suspicious IPs:</div>`;
   data.suspiciousIPs.forEach(ip => {
    resultsDiv.innerHTML += `
     <div class="result-item severity-${ip.severity}">
      <span class="result-ip">${ip.ip}</span>
      <span class="result-reason">(${ip.reason})</span>
      ${ip.score ? `<span class="result-score">Score: ${ip.score}</span>` : ''}
      ${ip.reports ? `<span class="result-reports">Reports: ${ip.reports}</span>` : ''}
     </div>
    `;
   });
  }
}


function generateReport() {
  if (!scanResults) {
   alert('Please run a scan first');
   return;
  }


  let reportContent = `
PFE-CS-201 Security Scan Report
===============================
Date: ${new Date().toLocaleString()}
URL: ${window.location.href}


`;


  // Add scan results to report
  if (scanResults.emails && scanResults.emails.length > 0) {
   reportContent += `\nEmails Found:\n----------------\n`;
   reportContent += scanResults.emails.join('\n') + '\n';
  }


  if (scanResults.ips && scanResults.ips.length > 0) {
   reportContent += `\nIP Addresses:\n----------------\n`;
   reportContent += scanResults.ips.join('\n') + '\n';
  }


  if (scanResults.subdomains && scanResults.subdomains.length > 0) {
   reportContent += `\nSubdomains:\n----------------\n`;
   reportContent += scanResults.subdomains.join('\n') + '\n';
  }


  if (scanResults.tokens && scanResults.tokens.length > 0) {
   reportContent += `\nTokens Found (High Risk):\n----------------\n`;
   reportContent += scanResults.tokens.join('\n') + '\n';
  }


  if (scanResults.apks && scanResults.apks.length > 0) {
   reportContent += `\nAPK References Found (Medium Risk):\n----------------\n`;
   reportContent += scanResults.apks.join('\n') + '\n';
  }


  if (scanResults.vulnerabilities && scanResults.vulnerabilities.length > 0) {
   reportContent += `\nVulnerabilities:\n----------------\n`;
   scanResults.vulnerabilities.forEach(vuln => {
    reportContent += `[${vuln.severity.toUpperCase()}] ${vuln.type}: ${vuln.details}\n`;
   });
  }


  // NEW: Add Suspicious Links to Report
  if (scanResults.suspiciousLinks && scanResults.suspiciousLinks.length > 0) {
   reportContent += `\nSuspicious Links:\n----------------\n`;
   scanResults.suspiciousLinks.forEach(link => {
    reportContent += `${link.url} (${link.reason}, Severity: ${link.severity})\n`;
   });
  }


  // NEW: Add Suspicious IPs to Report
  if (scanResults.suspiciousIPs && scanResults.suspiciousIPs.length > 0) {
   reportContent += `\nSuspicious IPs:\n----------------\n`;
   scanResults.suspiciousIPs.forEach(ip => {
    reportContent += `${ip.ip} (${ip.reason}`;
    if (ip.score) reportContent += `, AbuseIPDB Score: ${ip.score}`;
    if (ip.reports) reportContent += `, AbuseIPDB Reports: ${ip.reports}`;
    reportContent += `)\n`;
   });
  }


  // Create download link
  const blob = new Blob([reportContent], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `PFE-CS-201_Scan_Report_${new Date().toISOString().slice(0,10)}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}