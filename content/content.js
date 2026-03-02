/**
 * SweetDialer Content Script
 */

(function() {
  if (window.sweetDialerLoaded) return;
  window.sweetDialerLoaded = true;
  
  console.log('[SweetDialer] Content script loaded');

  function extractContact() {
    const url = window.location.href;
    console.log('[SweetDialer] Extracting from URL:', url);
    
    // Match SuiteCRM 8+ pattern: #/contacts/record/{uuid} or #/leads/record/{uuid}
    const suite8Match = url.match(/#\/(contacts|leads|accounts)\/record\/([a-f0-9\-]+)/i);
    // Match legacy pattern: module=Contacts&record={uuid}
    const legacyMatch = url.match(/module=(contacts|leads|accounts)/i);
    
    let module = 'Unknown';
    let recordId = null;
    
    if (suite8Match) {
      module = suite8Match[1].charAt(0).toUpperCase() + suite8Match[1].slice(1);
      recordId = suite8Match[2];
      console.log('[SweetDialer] SuiteCRM 8+ detected:', module, recordId);
    } else if (legacyMatch) {
      module = legacyMatch[1].charAt(0).toUpperCase() + legacyMatch[1].slice(1);
      const recMatch = url.match(/record=([a-f0-9\-]{36})/i);
      recordId = recMatch ? recMatch[1] : null;
      console.log('[SweetDialer] Legacy detected:', module, recordId);
    }
    
    // Enhanced name detection for SuiteCRM 8
    let name = 'Unknown';
    const nameSelectors = [
      'h1',
      '.module-title', 
      '[data-field-name="name"] .field-value',
      '.record-view-header h2',
      '.record-view-header h1',
      '.name-field .field-value',
      '[field="full_name"]'
    ];
    
    for (const selector of nameSelectors) {
      const el = document.querySelector(selector);
      if (el && el.textContent.trim()) {
        name = el.textContent.trim();
        console.log('[SweetDialer] Name found:', name);
        break;
      }
    }
    
    // Enhanced phone detection
    const phones = [];
    
    // tel: links
    document.querySelectorAll('a[href^="tel:"]').forEach(a => {
      const num = a.href.replace('tel:', '').trim();
      if (num && num.length >= 10 && !phones.find(p => p.number === num)) {
        phones.push({ number: num, label: 'Phone' });
      }
    });
    
    // Phone fields
    const phoneSelectors = [
      '[data-field-name*="phone"] .field-value',
      '[data-field-name*="phone"] span[title]',
      '.phone-field',
      '.field[data-type="phone"] .field-value',
      '[field*="phone"]',
      'input[name*="phone"]'
    ];
    
    for (const selector of phoneSelectors) {
      document.querySelectorAll(selector).forEach(el => {
        const text = (el.textContent || el.title || el.value || '').trim();
        const match = text.match(/[\(\)\d\s\-\.\+]{10,}/);
        if (match) {
          const clean = match[0].replace(/[^\d\+]/g, '');
          if (clean.length >= 10 && !phones.find(p => p.number === clean)) {
            phones.push({ number: clean, label: 'Phone' });
          }
        }
      });
    }
    
    console.log('[SweetDialer] Result:', { module, recordId, name, phoneCount: phones.length });
    
    return {
      success: recordId !== null,
      module: module,
      recordId: recordId,
      name: name,
      phones: phones,
      url: url
    };
  }

  // Listen for messages
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('[SweetDialer] Received message:', request.action);
    if (request.action === 'extractContact') {
      sendResponse(extractContact());
    }
    return true;
  });
  
  // Check URL and log
  const url = window.location.href;
  const isCrm = /#\/(contacts|leads|accounts)\/record\//i.test(url) ||
                /module=(contacts|leads|accounts)/i.test(url);
  
  console.log('[SweetDialer] Page check:', isCrm ? 'CRM page detected' : 'Not CRM');
})();