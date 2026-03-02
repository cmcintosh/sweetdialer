/**
 * Twilio Client Wrapper
 * Handles WebRTC calling via Twilio
 */

class TwilioClient {
  constructor(settings) {
    this.accountSid = settings.twilioAccountSid || '';
    this.authToken = settings.twilioAuthToken || '';
    this.appSid = settings.twilioAppSid || '';
    this.fromNumber = settings.twilioPhoneNumber || '';
    this.device = null;
    this.currentConnection = null;
  }

  /**
   * Initialize Twilio Device
   */
  async initialize() {
    if (!this.accountSid || !this.authToken) {
      throw new Error('Twilio credentials not configured');
    }

    try {
      // For production, you'd typically fetch a capability token from your server
      // For this extension, we'll use a simplified approach
      // Device should be loaded from twilio.min.js (loaded in content script or via CDN)
      
      if (typeof Twilio === 'undefined') {
        throw new Error('Twilio SDK not loaded');
      }

      // Initialize the device (would normally need a token from your server)
      // This is a placeholder - in production, get a token from your backend
      this.device = new Twilio.Device();

      // Set up device event handlers
      this.device.on('ready', () => {
        console.log('[Twilio] Device ready');
      });

      this.device.on('error', (error) => {
        console.error('[Twilio] Device error:', error);
      });

      return true;

    } catch (error) {
      console.error('[Twilio] Initialize error:', error);
      throw error;
    }
  }

  /**
   * Get capability token from server
   * In production, this should call your backend API
   */
  async getCapabilityToken() {
    // This is a placeholder - in production, make authenticated request to your backend
    // Your backend should generate a capability token using Twilio's helper libraries
    throw new Error('Token generation not implemented - configure your Twilio backend');
  }

  /**
   * Connect a call
   */
  async connect(phoneNumber) {
    try {
      if (!this.device) {
        await this.initialize();
      }

      // Format phone number (ensure + prefix for international)
      let formattedNumber = phoneNumber.replace(/\s/g, '');
      if (!formattedNumber.startsWith('+') && formattedNumber.length === 10) {
        formattedNumber = '+1' + formattedNumber; // Assume US if no country code
      } else if (!formattedNumber.startsWith('+')) {
        formattedNumber = '+' + formattedNumber;
      }

      // Make the call
      this.currentConnection = this.device.connect({
        To: formattedNumber,
        From: this.fromNumber
      });

      // Set up connection handlers
      this.currentConnection.accept(() => {
        console.log('[Twilio] Call accepted');
        this.notifyContentScript({ action: 'callConnected' });
      });

      this.currentConnection.disconnect(() => {
        console.log('[Twilio] Call disconnected');
        this.notifyContentScript({ action: 'callEnded' });
        this.currentConnection = null;
      });

      this.currentConnection.error((error) => {
        console.error('[Twilio] Connection error:', error);
        this.notifyContentScript({ 
          action: 'callError', 
          error: error.message 
        });
      });

      return {
        success: true,
        connection: this.currentConnection
      };

    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Disconnect the current call
   */
  async disconnect() {
    try {
      if (this.currentConnection) {
        this.currentConnection.disconnect();
        this.currentConnection = null;
      }
      
      if (this.device) {
        this.device.disconnectAll();
      }

      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error.message 
      };
    }
  }

  /**
   * Mute/unmute the current call
   */
  async mute(shouldMute) {
    try {
      if (this.currentConnection) {
        this.currentConnection.mute(shouldMute);
      }
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error.message 
      };
    }
  }

  /**
   * Send message to content script
   */
  notifyContentScript(message) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, message);
      }
    });
  }
}

// Make available globally for service worker
if (typeof self !== 'undefined') {
  self.TwilioClient = TwilioClient;
}

/**
 * Alternative: Simple click-to-call fallback using Twilio REST API
 * This uses the Twilio REST API to initiate a call
 */
class TwilioRESTFallback {
  constructor(settings) {
    this.accountSid = settings.twilioAccountSid || '';
    this.authToken = settings.twilioAuthToken || '';
    this.fromNumber = settings.twilioPhoneNumber || '';
    this.appSid = settings.twilioAppSid || '';
  }

  /**
   * Initiate a call via Twilio REST API
   * This creates an outbound call that connects to your TwiML app
   */
  async initiateCall(toNumber) {
    try {
      if (!this.accountSid || !this.authToken) {
        throw new Error('Twilio credentials not configured');
      }

      // Format phone number
      let formattedNumber = toNumber.replace(/\s/g, '');
      if (!formattedNumber.startsWith('+')) {
        formattedNumber = '+' + formattedNumber.replace(/^1/, '');
      }

      const url = 'https://api.twilio.com/2010-04-01/Accounts/' + this.accountSid + '/Calls.json';
      
      const auth = btoa(this.accountSid + ':' + this.authToken);
      
      const params = new URLSearchParams();
      params.append('To', formattedNumber);
      params.append('From', this.fromNumber);
      params.append('ApplicationSid', this.appSid);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': 'Basic ' + auth,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: params
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to initiate call');
      }

      const result = await response.json();
      
      return {
        success: true,
        callSid: result.sid,
        status: result.status
      };

    } catch (error) {
      console.error('[Twilio REST] Error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

// Make available globally
if (typeof self !== 'undefined') {
  self.TwilioRESTFallback = TwilioRESTFallback;
}
