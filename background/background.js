/**
 * SuiteCRM Dialer - Background Service Worker
 * Handles API coordination, Twilio integration, and call management
 */

// Global state
let currentCall = null;
let twilioDevice = null;
let suiteCRMAPI = null;

// Import scripts (for Manifest V3)
importScripts('suitecrm-api.js', 'twilio-client.js');

/**
 * Initialize on service worker startup
 */
chrome.runtime.onStartup.addListener(() => {
  console.log('[SuiteCRM Dialer] Service worker started');
  init();
});

/**
 * Initialize on extension install
 */
chrome.runtime.onInstalled.addListener(() => {
  console.log('[SuiteCRM Dialer] Extension installed');
  init();
});

/**
 * Initialize the extension
 */
async function init() {
  try {
    // Load settings
    const settings = await chrome.storage.sync.get([
      'suitecrmUrl',
      'clientId',
      'clientSecret',
      'twilioAccountSid',
      'twilioAuthToken',
      'twilioAppSid',
      'twilioPhoneNumber'
    ]);

    if (!settings.suitecrmUrl) {
      console.log('[SuiteCRM Dialer] SuiteCRM not configured yet');
    }

    // Initialize SuiteCRM API client
    suiteCRMAPI = new SuiteCRMAPI(settings);

  } catch (error) {
    console.error('[SuiteCRM Dialer] Initialization error:', error);
  }
}

/**
 * Handle messages from content scripts and popup
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // Return true to indicate async response
  const handleAsync = true;

  switch (request.action) {
    case 'initiateCall':
      handleInitiateCall(request, sender, sendResponse);
      return handleAsync;

    case 'hangupCall':
      handleHangupCall(request, sender, sendResponse);
      return handleAsync;

    case 'muteCall':
      handleMuteCall(request, sender, sendResponse);
      return handleAsync;

    case 'saveCall':
      handleSaveCall(request, sender, sendResponse);
      return handleAsync;

    case 'makeCall':
      handleMakeCall(request, sender, sendResponse);
      return handleAsync;

    case 'saveNotes':
      handleSaveNotes(request, sender, sendResponse);
      return handleAsync;

    case 'contentScriptLoaded':
      console.log('[SweetDialer] Content script loaded on:', request.url);
      sendResponse({ success: true });
      return false;

    case 'testConnection':
      handleTestConnection(request, sender, sendResponse);
      return handleAsync;

    case 'getSettings':
      handleGetSettings(request, sender, sendResponse);
      return handleAsync;

    case 'saveSettings':
      handleSaveSettings(request, sender, sendResponse);
      return handleAsync;

    default:
      sendResponse({ error: 'Unknown action' });
      return false;
  }
});

/**
 * Handle initiating a call
 */
async function handleInitiateCall(request, sender, sendResponse) {
  try {
    const settings = await chrome.storage.sync.get([
      'twilioAccountSid',
      'twilioAuthToken',
      'twilioPhoneNumber',
      'twilioAppSid'
    ]);

    if (!settings.twilioAccountSid || !settings.twilioAuthToken) {
      // Fallback: use tel: link
      chrome.tabs.sendMessage(sender.tab.id, {
        action: 'showMessage',
        message: 'Using tel: fallback (Twilio not configured)',
        type: 'warning'
      });
      
      // Open tel: link as fallback
      chrome.tabs.update(sender.tab.id, {
        url: 'tel:' + request.phoneNumber
      });
      
      sendResponse({ success: true, fallback: true });
      return;
    }

    // Initialize Twilio if needed
    if (!twilioDevice) {
      twilioDevice = new TwilioClient(settings);
    }

    // Make the call via Twilio
    const result = await twilioDevice.connect(request.phoneNumber);
    
    if (result.success) {
      currentCall = {
        connection: result.connection,
        phoneNumber: request.phoneNumber,
        contactData: request.contactData,
        startTime: new Date()
      };

      sendResponse({ success: true });
    } else {
      sendResponse({ success: false, error: result.error });
    }

  } catch (error) {
    console.error('[SuiteCRM Dialer] Initiate call error:', error);
    sendResponse({ 
      success: false, 
      error: error.message || 'Failed to initiate call' 
    });
  }
}

/**
 * Handle hanging up a call
 */
async function handleHangupCall(request, sender, sendResponse) {
  try {
    if (twilioDevice && currentCall) {
      await twilioDevice.disconnect();
    }

    currentCall = null;
    sendResponse({ success: true });

  } catch (error) {
    console.error('[SuiteCRM Dialer] Hangup error:', error);
    sendResponse({ success: false, error: error.message });
  }
}

/**
 * Handle muting a call
 */
async function handleMuteCall(request, sender, sendResponse) {
  try {
    if (twilioDevice && currentCall) {
      await twilioDevice.mute(request.muted);
    }
    sendResponse({ success: true });
  } catch (error) {
    sendResponse({ success: false, error: error.message });
  }
}

/**
 * Handle saving a call to SuiteCRM
 */
async function handleSaveCall(request, sender, sendResponse) {
  try {
    const callData = request.callData;
    
    if (!suiteCRMAPI) {
      const settings = await chrome.storage.sync.get(['suitecrmUrl', 'clientId', 'clientSecret']);
      suiteCRMAPI = new SuiteCRMAPI(settings);
    }

    // Create the call record in SuiteCRM
    const result = await suiteCRMAPI.createCallRecord(callData);

    sendResponse({ 
      success: result.success,
      callId: result.callId,
      error: result.error 
    });

  } catch (error) {
    console.error('[SuiteCRM Dialer] Save call error:', error);
    sendResponse({ 
      success: false, 
      error: error.message || 'Failed to save call' 
    });
  }
}

/**
 * Handle testing SuiteCRM connection
 */
async function handleTestConnection(request, sender, sendResponse) {
  try {
    const settings = await chrome.storage.sync.get([
      'suitecrmUrl',
      'clientId',
      'clientSecret'
    ]);

    const testAPI = new SuiteCRMAPI(settings);
    const result = await testAPI.testConnection();
    
    sendResponse(result);
  } catch (error) {
    sendResponse({ 
      success: false, 
      error: error.message 
    });
  }
}

/**
 * Handle getting settings
 */
async function handleGetSettings(request, sender, sendResponse) {
  try {
    const settings = await chrome.storage.sync.get([
      'suitecrmUrl',
      'clientId',
      'twilioAccountSid'
    ]);
    
    // Remove sensitive data before sending to content scripts
    const safeSettings = {
      suitecrmUrl: settings.suitecrmUrl,
      twilioAccountSid: settings.twilioAccountSid ? '***' + settings.twilioAccountSid.slice(-4) : null,
      configured: !!(settings.suitecrmUrl && settings.clientId)
    };

    sendResponse({ success: true, settings: safeSettings });
  } catch (error) {
    sendResponse({ success: false, error: error.message });
  }
}

/**
 * Handle saving settings
 */
async function handleSaveSettings(request, sender, sendResponse) {
  try {
    await chrome.storage.sync.set(request.settings);
    
    // Re-initialize API with new settings
    const settings = await chrome.storage.sync.get(['suitecrmUrl', 'clientId', 'clientSecret']);
    suiteCRMAPI = new SuiteCRMAPI(settings);
    
    sendResponse({ success: true });
  } catch (error) {
    sendResponse({ success: false, error: error.message });
  }
}

// Log when service worker awakens
console.log('[SuiteCRM Dialer] Service worker loaded');

/**
 * Additional handlers for SweetDialer popup
 */

// Handle simple makeCall request from popup
async function handleMakeCall(request, sender, sendResponse) {
  try {
    // For now, open tel: link as the primary method
    // This will be replaced with actual Twilio integration
    const phoneUrl = 'tel:' + request.phoneNumber;
    
    // Open the tel: link
    await chrome.tabs.create({ url: phoneUrl });
    
    // Store call info for notes
    await chrome.storage.local.set({
      currentCall: {
        phoneNumber: request.phoneNumber,
        recordId: request.recordId,
        module: request.module,
        startTime: new Date().toISOString(),
        status: 'initiated'
      }
    });
    
    sendResponse({ success: true, method: 'tel' });
  } catch (error) {
    console.error('[SweetDialer] Make call error:', error);
    sendResponse({ success: false, error: error.message });
  }
}

// Handle saveNotes request from popup
async function handleSaveNotes(request, sender, sendResponse) {
  try {
    // Get settings
    const settings = await chrome.storage.sync.get([
      'suitecrmUrl',
      'clientId',
      'clientSecret',
      'username',
      'password'
    ]);

    if (!settings.suitecrmUrl || !settings.clientId) {
      sendResponse({ 
        success: false, 
        error: 'SuiteCRM not configured' 
      });
      return;
    }

    // Build API URL
    const baseUrl = settings.suitecrmUrl.replace(/\/$/, '');
    const tokenUrl = `${baseUrl}/legacy/Api/access_token`;
    
    // Get OAuth token
    const tokenResponse = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        grant_type: 'password',
        client_id: settings.clientId,
        client_secret: settings.clientSecret || '',
        username: settings.username,
        password: settings.password
      })
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('[SweetDialer] Auth failed:', errorText);
      sendResponse({ 
        success: false, 
        error: 'Authentication failed. Check credentials.' 
      });
      return;
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    // Try multiple API endpoints - SuiteCRM v8 can vary by installation
    const endpoints = [
      '/Api/V8/module/Calls',
      '/Api/V8/module/Calls/',
      '/api/V8/module/Calls',
      '/Api/V8/Calls',
      '/legacy/Api/V8/module/Calls'
    ];
    
    const callRecord = {
      data: {
        type: 'Calls',
        attributes: {
          name: `Call to ${request.phoneNumber}`,
          description: request.notes,
          direction: 'Outbound',
          status: 'Held',
          duration_minutes: 0,
          date_start: new Date().toISOString().replace('T', ' ').substring(0, 19),
          parent_type: request.module,
          parent_id: request.recordId,
          phone_number: request.phoneNumber
        }
      }
    };
    
    let createResponse = null;
    let lastError = null;
    
    for (const endpoint of endpoints) {
      const apiUrl = `${baseUrl}${endpoint}`;
      console.log('[SweetDialer] Trying:', endpoint);
      
      try {
        const resp = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`
          },
          body: JSON.stringify(callRecord)
        });
        
        console.log('[SweetDialer]', endpoint, 'status:', resp.status);
        
        if (resp.status === 200 || resp.status === 201) {
          createResponse = resp;
          console.log('[SweetDialer] ✓ Working endpoint:', endpoint);
          break;
        } else {
          const text = await resp.text().catch(() => '');
          lastError = `${resp.status}: ${text.substring(0, 100)}`;
        }
      } catch (e) {
        lastError = e.message;
      }
    }
    
    if (!createResponse) {
      console.error('[SweetDialer] All endpoints failed:', lastError);
      sendResponse({ 
        success: false, 
        error: 'API error: ' + lastError + '. Tried: ' + endpoints.join(', ')
      });
      return;
    }

    
    // Clear current call
    await chrome.storage.local.remove(['currentCall']);
    
    sendResponse({ 
      success: true, 
      callId: result.data?.id 
    });

  } catch (error) {
    console.error('[SweetDialer] Save notes error:', error);
    sendResponse({ 
      success: false, 
      error: error.message 
    });
  }
}

console.log('[SweetDialer] Additional handlers loaded');
