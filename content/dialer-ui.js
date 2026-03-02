/**
 * SuiteCRM Dialer - UI Component
 * Creates and manages the floating dialer widget
 */

(function() {
  'use strict';

  // Make available globally
  window.SuiteCRMDialerUI = {
    widget: null,
    isCallActive: false,
    callStartTime: null,
    currentPhoneNumber: null,
    contactData: null,
    connection: null,
    callTimer: null
  };

  const NAMESPACE = 'suitecrm-dialer';

  /**
   * Create the dialer widget
   */
  function createWidget(contactData) {
    // Remove existing widget if present
    if (window.SuiteCRMDialerUI.widget) {
      window.SuiteCRMDialerUI.widget.remove();
    }

    window.SuiteCRMDialerUI.contactData = contactData;

    const widget = document.createElement('div');
    widget.id = NAMESPACE + '-widget';
    widget.className = NAMESPACE + '-widget';
    widget.innerHTML = getWidgetHTML(contactData);

    document.body.appendChild(widget);
    window.SuiteCRMDialerUI.widget = widget;

    // Setup event listeners
    setupEventListeners(widget, contactData);

    // Make draggable
    makeDraggable(widget);

    return widget;
  }

  /**
   * Get the widget HTML
   */
  function getWidgetHTML(contactData) {
    const phoneOptions = contactData.phoneNumbers.map((phone) => 
      '<option value="' + phone.number + '"\u003e' + phone.label + ': ' + phone.number + '</option\u003e'
    ).join('');

    const hasPhones = contactData.phoneNumbers.length > 0;

    return '<div class="' + NAMESPACE + '-header"\u003e\n' +
      '  <div class="' + NAMESPACE + '-title"\u003e\n' +
      '    <span class="' + NAMESPACE + '-icon"\u003e📞</span\u003e\n' +
      '    <span\u003eSuiteCRM Dialer</span\u003e\n' +
      '  </div\u003e\n' +
      '  <div class="' + NAMESPACE + '-controls"\u003e\n' +
      '    <button class="' + NAMESPACE + '-minimize" title="Minimize"\u003e−</button\u003e\n' +
      '    <button class="' + NAMESPACE + '-close" title="Close"\u003e×</button\u003e\n' +
      '  </div\u003e\n' +
      '</div\u003e\n' +
      '<div class="' + NAMESPACE + '-body"\u003e\n' +
      '  <div class="' + NAMESPACE + '-contact"\u003e\n' +
      '    <div class="' + NAMESPACE + '-contact-name"\u003e' + escapeHtml(contactData.name || 'Unknown Contact') + '</div\u003e\n' +
      (contactData.company ? '    <div class="' + NAMESPACE + '-contact-company"\u003e' + escapeHtml(contactData.company) + '</div\u003e\n' : '') +
      '  </div\u003e\n' +
      '  <div class="' + NAMESPACE + '-phone-section"\u003e\n' +
      '    <label class="' + NAMESPACE + '-label"\u003eCall Number:</label\u003e\n' +
      '    <select class="' + NAMESPACE + '-phone-select" id="' + NAMESPACE + '-phone" ' + (!hasPhones ? 'disabled' : '') + '\u003e\n' +
      (phoneOptions || '<option>No phone numbers found</option\u003e') +
      '    </select\u003e\n' +
      '  </div\u003e\n' +
      '  <div class="' + NAMESPACE + '-status" id="' + NAMESPACE + '-status"\u003eReady to call</div\u003e\n' +
      '  <div class="' + NAMESPACE + '-timer" id="' + NAMESPACE + '-timer" style="display: none;"\u003e00:00</div\u003e\n' +
      '  <div class="' + NAMESPACE + '-call-controls"\u003e\n' +
      '    <button class="' + NAMESPACE + '-btn ' + NAMESPACE + '-btn-dial" id="' + NAMESPACE + '-dial-btn" ' + (!hasPhones ? 'disabled' : '') + '\u003e\n' +
      '      <span class="' + NAMESPACE + '-btn-icon"\u003e📞</span\u003e\u003cspan>Call</span\u003e\n' +
      '    </button\u003e\n' +
      '    <button class="' + NAMESPACE + '-btn ' + NAMESPACE + '-btn-hangup" id="' + NAMESPACE + '-hangup-btn" disabled\u003e\n' +
      '      <span class="' + NAMESPACE + '-btn-icon"\u003e📵</span\u003e\u003cspan>Hang Up</span\u003e\n' +
      '    </button\u003e\n' +
      '    <button class="' + NAMESPACE + '-btn ' + NAMESPACE + '-btn-mute" id="' + NAMESPACE + '-mute-btn" disabled\u003e\n' +
      '      <span class="' + NAMESPACE + '-btn-icon"\u003e🎤</span\u003e\u003cspan>Mute</span\u003e\n' +
      '    </button\u003e\n' +
      '  </div\u003e\n' +
      '  <div class="' + NAMESPACE + '-notes-section" id="' + NAMESPACE + '-notes-section" style="display: none;"\u003e\n' +
      '    <label class="' + NAMESPACE + '-label"\u003eCall Notes:</label\u003e\n' +
      '    <textarea class="' + NAMESPACE + '-notes-textarea" id="' + NAMESPACE + '-notes" placeholder="Enter call notes here..." rows="3"></textarea>\n' +
      '  </div\u003e\n' +
      '  <div class="' + NAMESPACE + '-outcome-section" id="' + NAMESPACE + '-outcome-section" style="display: none;"\u003e\n' +
      '    <label class="' + NAMESPACE + '-label"\u003eCall Outcome:</label\u003e\n' +
      '    <select class="' + NAMESPACE + '-outcome-select" id="' + NAMESPACE + '-outcome"\u003e\n' +
      '      <option value="">Select outcome...</option\u003e\n' +
      '      <option value="No Answer">No Answer</option\u003e\n' +
      '      <option value="Left Message">Left Message</option\u003e\n' +
      '      <option value="Interested">Interested</option\u003e\n' +
      '      <option value="Not Interested">Not Interested</option\u003e\n' +
      '      <option value="Callback Scheduled">Callback Scheduled</option\u003e\n' +
      '      <option value="Wrong Number">Wrong Number</option\u003e\n' +
      '      <option value="Completed">Completed</option\u003e\n' +
      '    </select\u003e\n' +
      '    <button class="' + NAMESPACE + '-btn ' + NAMESPACE + '-btn-save" id="' + NAMESPACE + '-save-btn"\u003e\n' +
      '      <span class="' + NAMESPACE + '-btn-icon"\u003e💾</span\u003e\u003cspan>Save Call to SuiteCRM</span\u003e\n' +
      '    </button\u003e\n' +
      '  </div\u003e\n' +
      '  <div class="' + NAMESPACE + '-message-log" id="' + NAMESPACE + '-message-log"\u003e</div\u003e\n' +
      '</div\u003e';
  }

  /**
   * Setup event listeners for the widget
   */
  function setupEventListeners(widget, contactData) {
    // Close button
    const closeBtn = widget.querySelector('.' + NAMESPACE + '-close');
    closeBtn.addEventListener('click', function() {
      widget.remove();
      window.SuiteCRMDialerUI.widget = null;
    });

    // Minimize button
    const minimizeBtn = widget.querySelector('.' + NAMESPACE + '-minimize');
    let isMinimized = false;
    minimizeBtn.addEventListener('click', function() {
      const body = widget.querySelector('.' + NAMESPACE + '-body');
      isMinimized = !isMinimized;
      body.style.display = isMinimized ? 'none' : 'block';
      minimizeBtn.textContent = isMinimized ? '+' : '−';
    });

    // Dial button
    const dialBtn = widget.querySelector('#' + NAMESPACE + '-dial-btn');
    dialBtn.addEventListener('click', handleDial);

    // Hangup button
    const hangupBtn = widget.querySelector('#' + NAMESPACE + '-hangup-btn');
    hangupBtn.addEventListener('click', handleHangup);

    // Mute button
    const muteBtn = widget.querySelector('#' + NAMESPACE + '-mute-btn');
    muteBtn.addEventListener('click', handleMute);

    // Save button
    const saveBtn = widget.querySelector('#' + NAMESPACE + '-save-btn');
    saveBtn.addEventListener('click', handleSaveCall);

    // Phone select change
    const phoneSelect = widget.querySelector('.' + NAMESPACE + '-phone-select');
    if (phoneSelect) {
      phoneSelect.addEventListener('change', function(e) {
        window.SuiteCRMDialerUI.currentPhoneNumber = e.target.value;
      });
      // Set initial value
      if (contactData.phoneNumbers.length > 0) {
        window.SuiteCRMDialerUI.currentPhoneNumber = contactData.phoneNumbers[0].number;
      }
    }
  }

  /**
   * Handle dial button click
   */
  function handleDial() {
    const phoneSelect = window.SuiteCRMDialerUI.widget.querySelector('#' + NAMESPACE + '-phone');
    const phoneNumber = phoneSelect ? phoneSelect.value : null;

    if (!phoneNumber) {
      showMessage('No phone number selected', 'error');
      return;
    }

    window.SuiteCRMDialerUI.currentPhoneNumber = phoneNumber;
    window.SuiteCRMDialerUI.isCallActive = true;
    window.SuiteCRMDialerUI.callStartTime = new Date();

    // Update UI
    updateCallState('calling');

    // Send message to background script to initiate call
    chrome.runtime.sendMessage({
      action: 'initiateCall',
      phoneNumber: phoneNumber,
      contactData: window.SuiteCRMDialerUI.contactData
    }, function(response) {
      if (chrome.runtime.lastError) {
        console.error('[SuiteCRM Dialer] Error:', chrome.runtime.lastError);
        showMessage('Failed to initiate call. Check configuration.', 'error');
        updateCallState('ready');
        return;
      }

      if (response && response.success) {
        showMessage('Calling ' + phoneNumber + '...', 'info');
      } else {
        showMessage((response && response.error) || 'Failed to initiate call', 'error');
        updateCallState('ready');
      }
    });
  }

  /**
   * Handle hangup button click
   */
  function handleHangup() {
    chrome.runtime.sendMessage({
      action: 'hangupCall'
    });

    endCall();
  }

  /**
   * Handle mute button click
   */
  function handleMute() {
    const muteBtn = window.SuiteCRMDialerUI.widget.querySelector('#' + NAMESPACE + '-mute-btn');
    const isMuted = muteBtn.classList.toggle(NAMESPACE + '-muted');
    
    chrome.runtime.sendMessage({
      action: 'muteCall',
      muted: isMuted
    });

    muteBtn.querySelector('span:last-child').textContent = isMuted ? 'Unmute' : 'Mute';
    muteBtn.style.opacity = isMuted ? '0.6' : '1';
  }

  /**
   * Handle save call button click
   */
  function handleSaveCall() {
    const notesEl = window.SuiteCRMDialerUI.widget.querySelector('#' + NAMESPACE + '-notes');
    const outcomeEl = window.SuiteCRMDialerUI.widget.querySelector('#' + NAMESPACE + '-outcome');

    const notes = notesEl ? notesEl.value : '';
    const outcome = outcomeEl ? outcomeEl.value : '';

    const callData = {
      module: window.SuiteCRMDialerUI.contactData.module,
      recordId: window.SuiteCRMDialerUI.contactData.recordId,
      contactName: window.SuiteCRMDialerUI.contactData.name,
      phoneNumber: window.SuiteCRMDialerUI.currentPhoneNumber,
      notes: notes,
      outcome: outcome,
      duration: calculateDuration(),
      startTime: window.SuiteCRMDialerUI.callStartTime ? window.SuiteCRMDialerUI.callStartTime.toISOString() : null
    };

    // Show loading state
    const saveBtn = window.SuiteCRMDialerUI.widget.querySelector('#' + NAMESPACE + '-save-btn');
    const originalText = saveBtn.innerHTML;
    saveBtn.innerHTML = '<span>Saving...</span>';
    saveBtn.disabled = true;

    chrome.runtime.sendMessage({
      action: 'saveCall',
      callData: callData
    }, function(response) {
      saveBtn.innerHTML = originalText;
      saveBtn.disabled = false;

      if (response && response.success) {
        showMessage('Call logged successfully!', 'success');
        // Reset UI after a delay
        setTimeout(function() {
          resetCallUI();
        }, 2000);
      } else {
        showMessage((response && response.error) || 'Failed to save call', 'error');
      }
    });
  }

  /**
   * End the current call
   */
  function endCall() {
    if (!window.SuiteCRMDialerUI.isCallActive) return;

    window.SuiteCRMDialerUI.isCallActive = false;

    // Stop timer
    if (window.SuiteCRMDialerUI.callTimer) {
      clearInterval(window.SuiteCRMDialerUI.callTimer);
      window.SuiteCRMDialerUI.callTimer = null;
    }

    updateCallState('ended');
    showMessage('Call ended. Duration: ' + calculateDuration(), 'info');
  }

  /**
   * Update UI based on call state
   */
  function updateCallState(state) {
    const dialBtn = window.SuiteCRMDialerUI.widget.querySelector('#' + NAMESPACE + '-dial-btn');
    const hangupBtn = window.SuiteCRMDialerUI.widget.querySelector('#' + NAMESPACE + '-hangup-btn');
    const muteBtn = window.SuiteCRMDialerUI.widget.querySelector('#' + NAMESPACE + '-mute-btn');
    const statusEl = window.SuiteCRMDialerUI.widget.querySelector('#' + NAMESPACE + '-status');
    const timerEl = window.SuiteCRMDialerUI.widget.querySelector('#' + NAMESPACE + '-timer');
    const notesSection = window.SuiteCRMDialerUI.widget.querySelector('#' + NAMESPACE + '-notes-section');
    const outcomeSection = window.SuiteCRMDialerUI.widget.querySelector('#' + NAMESPACE + '-outcome-section');

    switch (state) {
      case 'calling':
        dialBtn.disabled = true;
        hangupBtn.disabled = false;
        muteBtn.disabled = false;
        statusEl.textContent = 'Calling...';
        timerEl.style.display = 'block';
        notesSection.style.display = 'block';
        startTimer();
        break;

      case 'connected':
        statusEl.textContent = 'On Call';
        break;

      case 'ended':
        dialBtn.disabled = false;
        hangupBtn.disabled = true;
        muteBtn.disabled = true;
        statusEl.textContent = 'Call Ended';
        outcomeSection.style.display = 'block';
        break;

      case 'ready':
        dialBtn.disabled = false;
        hangupBtn.disabled = true;
        muteBtn.disabled = true;
        statusEl.textContent = 'Ready to call';
        break;
    }
  }

  /**
   * Start the call timer
   */
  function startTimer() {
    const timerEl = window.SuiteCRMDialerUI.widget.querySelector('#' + NAMESPACE + '-timer');
    
    window.SuiteCRMDialerUI.callTimer = setInterval(function() {
      timerEl.textContent = calculateDuration();
    }, 1000);
  }

  /**
   * Calculate call duration
   */
  function calculateDuration() {
    if (!window.SuiteCRMDialerUI.callStartTime) return '00:00';

    const duration = Math.floor((new Date() - window.SuiteCRMDialerUI.callStartTime) / 1000);
    const minutes = Math.floor(duration / 60).toString().padStart(2, '0');
    const seconds = (duration % 60).toString().padStart(2, '0');
    
    return minutes + ':' + seconds;
  }

  /**
   * Reset the call UI after saving
   */
  function resetCallUI() {
    const notesSection = window.SuiteCRMDialerUI.widget.querySelector('#' + NAMESPACE + '-notes-section');
    const outcomeSection = window.SuiteCRMDialerUI.widget.querySelector('#' + NAMESPACE + '-outcome-section');
    const timerEl = window.SuiteCRMDialerUI.widget.querySelector('#' + NAMESPACE + '-timer');
    const notesEl = window.SuiteCRMDialerUI.widget.querySelector('#' + NAMESPACE + '-notes');
    const outcomeEl = window.SuiteCRMDialerUI.widget.querySelector('#' + NAMESPACE + '-outcome');

    if (notesEl) notesEl.value = '';
    if (outcomeEl) outcomeEl.value = '';
    if (notesSection) notesSection.style.display = 'none';
    if (outcomeSection) outcomeSection.style.display = 'none';
    if (timerEl) {
      timerEl.style.display = 'none';
      timerEl.textContent = '00:00';
    }

    window.SuiteCRMDialerUI.callStartTime = null;
    updateCallState('ready');
  }

  /**
   * Show a message in the log
   */
  function showMessage(message, type) {
    type = type || 'info';
    const logEl = window.SuiteCRMDialerUI.widget.querySelector('#' + NAMESPACE + '-message-log');
    if (!logEl) return;

    const entry = document.createElement('div');
    entry.className = NAMESPACE + '-message ' + NAMESPACE + '-message-' + type;
    entry.textContent = '[' + new Date().toLocaleTimeString() + '] ' + message;
    
    logEl.appendChild(entry);
    logEl.scrollTop = logEl.scrollHeight;

    // Keep only last 10 messages
    while (logEl.children.length > 10) {
      logEl.removeChild(logEl.firstChild);
    }
  }

  /**
   * Make the widget draggable
   */
  function makeDraggable(widget) {
    const header = widget.querySelector('.' + NAMESPACE + '-header');
    let isDragging = false;
    let currentX, currentY, initialX, initialY;
    let xOffset = 0, yOffset = 0;

    header.addEventListener('mousedown', dragStart);
    document.addEventListener('mouseup', dragEnd);
    document.addEventListener('mousemove', drag);

    function dragStart(e) {
      initialX = e.clientX - xOffset;
      initialY = e.clientY - yOffset;

      if (e.target === header || e.target.parentElement === header) {
        isDragging = true;
      }
    }

    function dragEnd() {
      initialX = currentX;
      initialY = currentY;
      isDragging = false;
    }

    function drag(e) {
      if (isDragging) {
        e.preventDefault();
        currentX = e.clientX - initialX;
        currentY = e.clientY - initialY;
        xOffset = currentX;
        yOffset = currentY;

        widget.style.transform = 'translate(' + currentX + 'px, ' + currentY + 'px)';
      }
    }
  }

  /**
   * Escape HTML to prevent XSS
   */
  function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Listen for call events from background
  chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.action === 'callConnected') {
      updateCallState('connected');
      showMessage('Call connected!', 'success');
    }
    
    if (request.action === 'callEnded') {
      endCall();
    }

    if (request.action === 'callError') {
      showMessage(request.error || 'Call error occurred', 'error');
      endCall();
    }
  });

  // Expose createWidget
  window.SuiteCRMDialerUI.createWidget = createWidget;

})();
