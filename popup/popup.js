/* SweetDialer - Working Dialer */

let selectedPhone = '';
let currentContact = null;

// Debug logging
function log(msg) {
  console.log('[SweetDialer]', msg);
}

// Wait for DOM
window.addEventListener('DOMContentLoaded', () => {
  log('=== Loading ===');
  
  // Get elements
  const els = {
    status: document.getElementById('pageStatus'),
    card: document.getElementById('contactCard'),
    error: document.getElementById('notCrmMessage'),
    type: document.getElementById('contactType'),
    name: document.getElementById('contactName'),
    phones: document.getElementById('phoneList'),
    callBtn: document.getElementById('callBtn'),
    callStatus: document.getElementById('callStatus'),
  };
  
  log('Elements found');
  
  // Get current tab
  chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
    const tab = tabs[0];
    const url = tab.url;
    
    log('Tab URL: ' + url);
    
    // Check if SuiteCRM
    if (!url.match(/#\/(contacts|leads)\/record\//i)) {
      els.status.textContent = 'Not SuiteCRM';
      els.error.classList.remove('hidden');
      return;
    }
    
    // Extract contact info via script injection
    chrome.scripting.executeScript({
      target: {tabId: tab.id},
      func: () => {
        const url = location.href;
        const match = url.match(/#\/(contacts|leads)\/record\/([a-f0-9-]+)/i);
        if (!match) return null;
        
        const type = match[1][0].toUpperCase() + match[1].slice(1);
        const id = match[2];
        
        // Get name
        let name = 'Unknown';
        const h1 = document.querySelector('h1');
        if (h1) name = h1.textContent.trim();
        
        // Get phones
        const phones = [];
        document.querySelectorAll('a[href^="tel:"]').forEach(a => {
          const n = a.href.replace('tel:', '').trim();
          if (n && !phones.includes(n)) phones.push(n);
        });
        
        return {type, id, name, phones};
      }
    }, (results) => {
      const data = results && results[0] && results[0].result;
      
      if (!data) {
        els.status.textContent = 'No contact found';
        return;
      }
      
      currentContact = data;
      log('Contact: ' + JSON.stringify(data));
      
      // Show contact
      els.status.textContent = 'Ready';
      els.card.classList.remove('hidden');
      els.type.textContent = data.type;
      els.name.textContent = data.name;
      
      // Show phones
      if (data.phones.length === 0) {
        els.phones.innerHTML = '<p style="color:#999">No phones found</p>';
        els.callBtn.disabled = true;
      } else {
        els.phones.innerHTML = data.phones.map((num, i) => `
          <div class="phone-option" data-num="${num}" style="
            padding: 12px;
            background: #f5f5f5;
            border-radius: 6px;
            margin-bottom: 8px;
            cursor: pointer;
            border: 2px solid transparent;
          ">
            <span style="font-family:monospace;font-size:16px;font-weight:600">${num}</span>
          </div>
        `).join('');
        
        // Auto-select first
        selectedPhone = data.phones[0];
        const first = els.phones.querySelector('.phone-option');
        if (first) {
          first.style.borderColor = '#28a745';
          first.style.background = '#d4edda';
        }
        
        // Phone click handlers
        els.phones.querySelectorAll('.phone-option').forEach(el => {
          el.onclick = function() {
            selectedPhone = this.dataset.num;
            // Reset all
            els.phones.querySelectorAll('.phone-option').forEach(e => {
              e.style.borderColor = 'transparent';
              e.style.background = '#f5f5f5';
            });
            // Highlight selected
            this.style.borderColor = '#28a745';
            this.style.background = '#d4edda';
            els.callBtn.disabled = false;
            log('Selected: ' + selectedPhone);
          };
        });
        
        els.callBtn.disabled = false;
      }
      
      // Call button - SIMPLE
      els.callBtn.onclick = function() {
        log('CALL CLICKED - Number: ' + selectedPhone);
        
        if (!selectedPhone) {
          els.callStatus.textContent = 'Select a phone number';
          return;
        }
        
        // Direct window.open
        const telUrl = 'tel:' + selectedPhone;
        log('Opening: ' + telUrl);
        
        window.open(telUrl, '_blank');
        
        els.callStatus.textContent = 'Calling ' + selectedPhone + '...';
        els.callStatus.style.color = '#28a745';
      };
    });
  });
});
