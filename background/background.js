/**
 * SweetDialer Background Script
 * Handles Twilio calls and SuiteCRM API
 */

// Import Twilio client helper
// Simple Twilio Call Initiator via REST API

// Handle messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('[SweetDialer] Received message:', request.action);
  
  switch (request.action) {
    case 'makeTwilioCall':
      makeTwilioCall(request.phoneNumber, sendResponse);
      return true; // Async response
      
    case 'saveNotes':
      saveNotesToCRM(request, sendResponse);
      return true;
      
    default:
      sendResponse({ error: 'Unknown action' });
      return false;
  }
});

async function makeTwilioCall(phoneNumber, sendResponse) {
  console.log('[SweetDialer] Making Twilio call to:', phoneNumber);
  
  try {
    // Get Twilio credentials
    const settings = await chrome.storage.sync.get([
      'twilioAccountSid',
      'twilioAuthToken',
      'twilioFromNumber'
    ]);

    if (!settings.twilioAccountSid || !settings.twilioAuthToken) {
      console.error('[SweetDialer] Twilio not configured');
      sendResponse({ 
        success: false, 
        error: 'Twilio not configured. Add credentials in Settings.' 
      });
      return;
    }

    // Format phone number
    let toNumber = phoneNumber.replace(/\s/g, '');
    if (!toNumber.startsWith('+')) {
      // Assume US number, add +1
      toNumber = '+1' + toNumber.replace(/\D/g, '');
    }

    const fromNumber = settings.twilioFromNumber || settings.twilioPhoneNumber;

    if (!fromNumber) {
      console.error("[SweetDialer] From number not set");
      sendResponse({ success: false, error: "Twilio From number not configured" });
      return;
    }

    console.log('[SweetDialer] From:', fromNumber, 'To:', toNumber);

    // Twilio REST API endpoint
    const url = `https://api.twilio.com/2010-04-01/Accounts/${settings.twilioAccountSid}/Calls.json`;
    
    const params = new URLSearchParams();
    params.append('To', toNumber);
    params.append('From', fromNumber);
    // Simple TwiML - says a greeting then hangs up
    // Replace this URL with your own TwiML Bin or server endpoint for custom flow
    params.append('Url', 'http://demo.twilio.com/docs/voice.xml');

    const auth = btoa(`${settings.twilioAccountSid}:${settings.twilioAuthToken}`);

    console.log('[SweetDialer] POST to Twilio API...');
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params
    });

    console.log('[SweetDialer] Twilio response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[SweetDialer] Twilio error:', errorText);
      sendResponse({ 
        success: false, 
        error: 'Twilio error: ' + errorText.substring(0, 150) 
      });
      return;
    }

    const data = await response.json();
    console.log('[SweetDialer] Call initiated:', data.sid);
    
    sendResponse({ 
      success: true, 
      callSid: data.sid,
      status: data.status 
    });

  } catch (error) {
    console.error('[SweetDialer] Call error:', error);
    sendResponse({ 
      success: false, 
      error: error.message || 'Failed to initiate call' 
    });
  }
}

async function saveNotesToCRM(request, sendResponse) {
  console.log('[SweetDialer] Saving notes to CRM...');
  
  try {
    const settings = await chrome.storage.sync.get([
      'suitecrmUrl',
      'clientId',
      'clientSecret',
      'username',
      'password'
    ]);

    if (!settings.suitecrmUrl || !settings.clientId) {
      sendResponse({ success: false, error: 'SuiteCRM not configured' });
      return;
    }

    const baseUrl = settings.suitecrmUrl.replace(/\/$/, '');
    
    // Authenticate
    console.log('[SweetDialer] Authenticating with CRM...');
    const tokenResp = await fetch(`${baseUrl}/legacy/Api/access_token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'password',
        client_id: settings.clientId,
        client_secret: settings.clientSecret || '',
        username: settings.username,
        password: settings.password
      })
    });

    if (!tokenResp.ok) {
      const err = await tokenResp.text();
      sendResponse({ success: false, error: 'Auth failed: ' + err.substring(0, 100) });
      return;
    }

    const tokenData = await tokenResp.json();
    const accessToken = tokenData.access_token;

    // Try to save to CRM - use fallback endpoints
    const endpoints = [
      '/Api/V8/module/Calls',
      '/Api/V8/module/Calls/',
      '/legacy/Api/V8/module/Calls'
    ];
    
    const record = {
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

    for (const endpoint of endpoints) {
      console.log('[SweetDialer] Trying endpoint:', endpoint);
      
      try {
        const resp = await fetch(`${baseUrl}${endpoint}`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(record)
        });

        console.log('[SweetDialer] Endpoint status:', resp.status);

        if (resp.status === 200 || resp.status === 201) {
          const result = await resp.json();
          sendResponse({ success: true, callId: result.data?.id });
          return;
        }
      } catch (e) {
        console.log('[SweetDialer] Endpoint error:', e.message);
      }
    }

    sendResponse({ success: false, error: 'Failed to save to CRM (tried multiple endpoints)' });

  } catch (error) {
    console.error('[SweetDialer] Save error:', error);
    sendResponse({ success: false, error: error.message });
  }
}

console.log('[SweetDialer] Background script loaded');
