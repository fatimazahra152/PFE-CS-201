// Main scanning function
function performScan() {
    return {
     emails: findEmails(),
     ips: findIPs(),
     subdomains: findSubdomains(),
     tokens: findTokens(),
     apks: findAPKs(),
     vulnerabilities: findVulnerabilities(),
     suspiciousLinks: findSuspiciousLinks(), // ADDED
     suspiciousIPs: findSuspiciousIPs()     // ADDED
    };
   }
   
  
   // Email detection
   function findEmails() {
    const emailRegex = /[\w.-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const emails = document.body.innerHTML.match(emailRegex) || [];
    return [...new Set(emails)]; // Remove duplicates
   }
   
  
   // IP detection
   function findIPs() {
    const ipv4Regex = /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g;
    const ips = document.body.innerHTML.match(ipv4Regex) || [];
    return [...new Set(ips)]; // Remove duplicates
   }
   
  
   // Subdomain detection
   function findSubdomains() {
    const domain = window.location.hostname;
    const baseDomain = domain.split('.').slice(-2).join('.');
    const subdomainRegex = new RegExp(`(?:https?:\/\/)?([a-zA-Z0-9.-]+)\\.${baseDomain.replace('.', '\\.')}`, 'g');
   
  
    const allText = document.body.innerHTML +
     Array.from(document.getElementsByTagName('script'))
      .map(script => script.src).join(' ');
   
  
    const matches = allText.match(subdomainRegex) || [];
    return [...new Set(matches.map(m => m.replace(/https?:\/\//, '')))];
   }
   
  
   // Token detection
   function findTokens() {
    // Common token patterns
    const tokenPatterns = [
     /[A-Za-z0-9]{32}/g,                                 // Generic 32-char token
     /[A-Za-z0-9\-_]{24}\.[A-Za-z0-9\-_]{6}\.[A-Za-z0-9\-_]{27}/g,  // JWT
     /gh[pousr]_[A-Za-z0-9]{36}/g,                        // GitHub tokens
     /xox[baprs]-[A-Za-z0-9-]+/g,                        // Slack tokens
     /sk_live_[0-9a-zA-Z]{24}/g,                         // Stripe tokens
     /AKIA[0-9A-Z]{16}/g,                               // AWS access key
     /[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/g  // UUID
    ];
   
  
    const tokens = [];
    const pageContent = document.body.innerHTML;
   
  
    tokenPatterns.forEach(pattern => {
     const matches = pageContent.match(pattern) || [];
     matches.forEach(match => {
      if (!tokens.includes(match)) {
       tokens.push(match);
      }
     });
    });
   
  
    return tokens;
   }
   
  
   // APK detection
   function findAPKs() {
    const apkRegex = /[^"'\\s]+\.apk(\?[^"'\\s]*)?/gi;
    const apks = [];
   
  
    // Check in links
    document.querySelectorAll('a[href]').forEach(link => {
     const match = link.href.match(apkRegex);
     if (match) apks.push(link.href);
    });
   
  
    // Check in scripts and page content
    const pageContent = document.body.innerHTML;
    const contentMatches = pageContent.match(apkRegex) || [];
    contentMatches.forEach(match => {
     if (!apks.includes(match)) apks.push(match);
    });
   
  
    return apks;
   }
   
  
   // Vulnerability detection with severity levels
   function findVulnerabilities() {
    const vulns = [];
   
  
    // Check for jQuery versions with known vulnerabilities (Critical)
    if (typeof jQuery !== 'undefined') {
     if (jQuery.fn.jquery.match(/^1\.[0-6]|^2\.[0-2]/)) {
      vulns.push({
       type: 'Outdated jQuery',
       details: `Version ${jQuery.fn.jquery} has known vulnerabilities`,
       severity: 'critical'
      });
     }
    }
   
  
    // Check for forms without CSRF protection (High)
    document.querySelectorAll('form').forEach(form => {
     if (!form.querySelector('input[name="_csrf"]') &&
       !form.querySelector('input[name="csrf_token"]')) {
      vulns.push({
       type: 'Potential CSRF',
       details: 'Form missing CSRF token',
       severity: 'high'
      });
     }
    });
   
  
    // Check for mixed content (Medium)
    if (window.location.protocol === 'https:') {
     document.querySelectorAll('script[src^="http:"], img[src^="http:"], link[href^="http:"]').forEach(el => {
      vulns.push({
       type: 'Mixed Content',
       details: `Insecure resource loaded: ${el.src || el.href}`,
       severity: 'medium'
      });
     });
    }
   
  
    // Check for autocomplete on password fields (Low)
    document.querySelectorAll('input[type="password"][autocomplete="off"]').forEach(input => {
     vulns.push({
      type: 'Password Autocomplete Disabled',
      details: 'Password field has autocomplete disabled which may impact usability',
      severity: 'low'
     });
    });
   
  
    return vulns;
   }
   
  
   // NEW FUNCTIONS (Rule-Based AI additions)
   
  
   // Suspicious Link Detection
   function findSuspiciousLinks() {
    const suspiciousLinks = [];
    const linkElements = document.querySelectorAll('a[href]');
   
  
    const suspiciousExtensions = /\.(exe|bat|sh|ps1|jar|msi|app)/i; // More extensions
    const domainBlacklist = [
     'example.com',       // Replace with real blacklisted domains
     'anothersuspicious.net'
    ];
   
  
    linkElements.forEach(link => {
     const href = link.href;
   
  
     // Check for dangerous file extensions
     if (suspiciousExtensions.test(href)) {
      suspiciousLinks.push({
       url: href,
       reason: 'Dangerous file extension',
       severity: 'high'
      });
     }
   
  
     // Check against domain blacklist (basic string match - can be improved)
     if (domainBlacklist.some(badDomain => href.includes(badDomain))) {
      suspiciousLinks.push({
       url: href,
       reason: 'Blacklisted domain',
       severity: 'high'
      });
     }
   
  
     // Check for HTTP on HTTPS pages (Mixed Content - already partially covered in vulnerabilities)
     if (window.location.protocol === 'https:' && href.startsWith('http:')) {
      suspiciousLinks.push({
       url: href,
       reason: 'Insecure link on secure page',
       severity: 'medium'
      });
     }
   
  
     // Add more sophisticated checks here (e.g., regex for obfuscated URLs)
    });
   
  
    return suspiciousLinks;
   }
   
  
   // Suspicious IP Address Detection (using a simplified check - API integration is better)
   function findSuspiciousIPs() {
    const ips = findIPs();
    const suspiciousIPs = [];
   
  
    const knownBadIPRanges = [
     /^192\.168\./,       // Private IPs (usually not directly linked from public pages)
     /^10\./,
     /^172\.(1[6-9]|2\d|3[0-1])\./
     // Add more ranges or use a regex for known botnet/malware IPs
    ];
   
  
    ips.forEach(ip => {
     if (knownBadIPRanges.some(range => range.test(ip))) {
      suspiciousIPs.push({
       ip: ip,
       reason: 'IP in suspicious range',
       severity: 'medium'
      });
     }
     // In a real scenario, you'd replace this with an API call to AbuseIPDB or similar
    });
   
  
    return suspiciousIPs;
   }
   
  
   // Send results when done
   chrome.runtime.sendMessage({
    type: 'scanComplete',
    data: performScan()
   });