/**
 * SweetDialer Options Page
 * Handles settings for SugarCRM password grant authentication
 */

// Load saved settings
async function loadSettings() {
  try {
    const result = await chrome.storage.sync.get([
      'suitecrmUrl',
      'clientId', 
      'clientSecret',
      'username',
      'password',
      'twilioAccountSid',
      'twilioAuthToken',
      'twilioFromNumber'
    ]);

    if (result.suitecrmUrl) {
      document.getElementById('suitecrmUrl').value = result.suitecrmUrl;
    }
    if (result.clientId) {
      document.getElementById('clientId').value = result.clientId;
    }
    if (result.clientSecret) {
      document.getElementById('clientSecret').value = result.clientSecret;
    }
    if (result.username) {
      document.getElementById('username').value = result.username;
    }
    if (result.twilioAccountSid) {
      document.getElementById('twilioAccountSid').value = result.twilioAccountSid;
    }
    if (result.twilioAuthToken) {
      document.getElementById('twilioAuthToken').value = result.twilioAuthToken;
    }
    if (result.twilioFromNumber) {
      document.getElementById('twilioFromNumber').value = result.twilioFromNumber;
    }
  } catch (error) {
    console.error('[SweetDialer] Error loading settings:', error);
  }
}

// Initialize AFTER DOM is ready - this was the bug!
document.addEventListener('DOMContentLoaded', function() {
  loadSettings();
  
  const saveBtn = document.getElementById('save');
  const testBtn = document.getElementById('testConnection');
  
  if (saveBtn) {
    saveBtn.addEventListener('click', saveSettings);
  }
  if (testBtn) {
    testBtn.addEventListener('click', testConnection);
  }
});

// Save settings
async function saveSettings() {
  const saveBtn = document.getElementById('save');
  
  if (!saveBtn) return;
  
  saveBtn.disabled = true;
  saveBtn.textContent = 'Saving...';

  const settings = {
    suitecrmUrl: document.getElementById('suitecrmUrl').value.trim(),
    clientId: document.getElementById('clientId').value.trim(),
    clientSecret: document.getElementById('clientSecret').value.trim(),
    username: document.getElementById('username').value.trim(),
    password: document.getElementById('password').value,
    twilioAccountSid: document.getElementById('twilioAccountSid').value.trim(),
    twilioAuthToken: document.getElementById('twilioAuthToken').value,
    twilioFromNumber: document.getElementById('twilioFromNumber').value.trim()
  };

  if (!settings.suitecrmUrl || !settings.clientId || !settings.username) {
    showStatus('Please fill in all required fields (marked with *)', 'error');
    saveBtn.disabled = false;
    saveBtn.textContent = 'Save Settings';
    return;
  }

  try {
    await chrome.storage.sync.set(settings);
    showStatus('Settings saved successfully!', 'success');
  } catch (error) {
    showStatus('Error saving settings: ' + error.message, 'error');
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = 'Save Settings';
  }
}

// Test connection
async function testConnection() {
  const testBtn = document.getElementById('testConnection');
  
  if (!testBtn) return;
  
  testBtn.disabled = true;
  testBtn.textContent = 'Testing...';

  const settings = {
    suitecrmUrl: document.getElementById('suitecrmUrl').value.trim(),
    clientId: document.getElementById('clientId').value.trim(),
    clientSecret: document.getElementById('clientSecret').value.trim(),
    username: document.getElementById('username').value.trim(),
    password: document.getElementById('password').value
  };

  if (!settings.suitecrmUrl || !settings.clientId || !settings.username || !settings.password) {
    showStatus('Please fill in SugarCRM URL, Client ID, Username, and Password', 'error');
    testBtn.disabled = false;
    testBtn.textContent = 'Test Connection';
    return;
  }

  settings.suitecrmUrl = settings.suitecrmUrl.replace(/\/$/, '');
  const authUrl = settings.suitecrmUrl + '/legacy/Api/access_token';
  
  try {
    const response = await fetch(authUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'  
      },
      body: JSON.stringify({
        grant_type: 'password',
        client_id: settings.clientId,
        client_secret: settings.clientSecret || '',
        username: settings.username,
        password: settings.password
      })
    });

    const data = await response.json();

    if (response.ok && data.access_token) {
      showStatus('Connection successful! Token expires in ' + data.expires_in + ' seconds.', 'success');
    } else {
      const errorMsg = data.message || data.error_description || 'Authentication failed';
      showStatus('Connection failed: ' + errorMsg, 'error');
    }
  } catch (error) {
    showStatus('Connection failed: ' + error.message + '. Check that the URL is correct.', 'error');
  } finally {
    testBtn.disabled = false;
    testBtn.textContent = 'Test Connection';
  }
}

function showStatus(message, type) {
  const status = document.getElementById('status');
  status.textContent = message;
  status.className = 'status ' + type;
  status.style.display = 'block';
  
  setTimeout(function() {
    status.style.display = 'none';
    status.className = 'status';
  }, 5000);
}
