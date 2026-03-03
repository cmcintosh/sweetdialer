/**
 * SweetDialer Popup - Twilio Version
 * Calls go through Twilio API
 */

let selectedPhone = '';
let currentContact = null;

// Debug logging
function log(msg) {
  console.log('[SweetDialer]', msg);
}

// Wait for DOM
window.addEventListener('DOMContentLoaded', () => {
  log('=== Loading popup ===');
  
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
    notes: document.getElementById('callNotes'),
    saveBtn: document.getElementById('saveNotesBtn')
  };
  
  // Get current tab
  chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
    const tab = tabs[0];
    const url = tab.url;
    
    log('Tab URL: ' + url);
    
    // Check if SuiteCRM
    if (!url.match(/#\/(contacts|leads)\/record\//i)) {
      els.status.textContent = 'Not on SuiteCRM page';
      els.error.classList.remove('hidden');
      return;
    }
    
    // Extract contact info
    chrome.scripting.executeScript({
      target: {tabId: tab.id},
      func: () => {
        const url = location.href;
        const match = url.match(/#\/(contacts|leads)\/record\/([a-f0-9-]+)/i);
        if (!match) return null;
        
        const type = match[1][0].toUpperCase() + match[1].slice(1);
        const id = match[2];
        
        let name = 'Unknown';
        const h1 = document.querySelector('h1');
        if (h1) name = h1.textContent.trim();
        
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
        els.status.textContent = 'No contact data found';
        return;
      }
      
      currentContact = data;
      log('Contact loaded: ' + data.name);
      
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
        els.phones.innerHTML = data.phones.map((num) => `
          <div class="phone-option" data-num="${num}"
               style="padding:12px;background:#f5f5f5;border-radius:6px;margin-bottom:8px;cursor:pointer;border:2px solid transparent;"
          >
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
            els.phones.querySelectorAll('.phone-option').forEach(e => {
              e.style.borderColor = 'transparent';
              e.style.background = '#f5f5f5';
            });
            this.style.borderColor = '#28a745';
            this.style.background = '#d4edda';
            els.callBtn.disabled = false;
            els.callStatus.textContent = '';
          };
        });
        
        els.callBtn.disabled = false;
      }
      
      // CALL BUTTON - TWILIO VERSION
      els.callBtn.onclick = function() {
        log('Call button clicked, number: ' + selectedPhone);
        
        if (!selectedPhone) {
          els.callStatus.textContent = 'Select a phone number first';
          els.callStatus.style.color = '#dc3545';
          return;
        }
        
        // Check if Twilio is configured
        chrome.storage.sync.get(['twilioAccountSid'], (result) => {
          if (!result.twilioAccountSid) {
            els.callStatus.textContent = '⚠️ Twilio not configured - go to Settings';
            els.callStatus.style.color = '#ffc107';
            return;
          }
          
          // Call via Twilio
          els.callBtn.disabled = true;
          els.callBtn.textContent = 'Calling...';
          els.callStatus.textContent = 'Connecting via Twilio...';
          els.callStatus.style.color = '#007bff';
          
          chrome.runtime.sendMessage({
            action: 'makeTwilioCall',
            phoneNumber: selectedPhone
          }, (response) => {
            els.callBtn.disabled = false;
            els.callBtn.textContent = '📞 Call';
            
            if (response && response.success) {
              log('Call initiated: ' + response.callSid);
              els.callStatus.textContent = '✓ Calling ' + selectedPhone;
              els.callStatus.style.color = '#28a745';
            } else {
              log('Call failed: ' + (response?.error || 'Unknown error'));
              els.callStatus.textContent = '✗ ' + (response?.error || 'Failed');
              els.callStatus.style.color = '#dc3545';
            }
          });
        });
      };
      
      // SAVE NOTES BUTTON
      if (els.saveBtn) {
        els.saveBtn.onclick = function() {
          const notes = els.notes?.value?.trim();
          
          if (!notes) {
            els.callStatus.textContent = 'Enter notes first';
            return;
          }
          
          if (!currentContact || !currentContact.id) {
            els.callStatus.textContent = 'No contact data';
            return;
          }
          
          els.saveBtn.disabled = true;
          els.saveBtn.textContent = 'Saving...';
          
          chrome.runtime.sendMessage({
            action: 'saveNotes',
            notes: notes,
            recordId: currentContact.id,
            module: currentContact.type,
            phoneNumber: selectedPhone
          }, (response) => {
            els.saveBtn.disabled = false;
            
            if (response && response.success) {
              els.saveBtn.textContent = '✓ Saved!';
              els.notes.value = '';
              setTimeout(() => {
                els.saveBtn.textContent = 'Save to SuiteCRM';
              }, 2000);
            } else {
              els.saveBtn.textContent = '✗ Failed: ' + (response?.error?.substring(0, 50) || '');
              setTimeout(() => {
                els.saveBtn.textContent = 'Save to SuiteCRM';
              }, 3000);
            }
          });
        };
      }
    });
  });
});
