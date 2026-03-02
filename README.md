# SuiteCRM Twilio Dialer - Chrome Extension

A Chrome extension that integrates SuiteCRM with Twilio for click-to-call functionality. Auto-detects current lead/contact pages and provides a floating dialer widget with call logging back to SuiteCRM.

## Features

✅ **Context-Aware Detection** - Automatically detects SuiteCRM lead/contact pages
✅ **Click-to-Call** - Call directly from the browser using Twilio or system phone
✅ **Call Logging** - Log calls with duration, notes, and outcomes to SuiteCRM
✅ **Draggable Widget** - Floating dialer that stays with you on any record page
✅ **Twilio Integration** - Browser-based calling or fallback to tel: links
✅ **OAuth2 Authentication** - Secure API access to SuiteCRM v8

## Installation

### 1. Download and Prepare

```bash
# Clone or copy the extension folder
cp -r ~/.openclaw/skills/suitecrm-dialer-chrome ~/Downloads/
```

### 2. Create Icons (Optional for Testing)

Create 16x16, 48x48, and 128x128 PNG icons and place them in the `icons/` folder:
- `icons/icon16.png`
- `icons/icon48.png`
- `icons/icon128.png`

Or use a tool like ImageMagick:
```bash
cd ~/Downloads/suitecrm-dialer-chrome
./icons/create_icons.sh
```

### 3. Load Extension in Chrome

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable **Developer mode** (toggle in top-right)
3. Click **Load unpacked**
4. Select the `suitecrm-dialer-chrome` folder
5. The extension is now installed!

### 4. Configure Settings

1. Click the extension icon in Chrome toolbar
2. Click **Open Settings**
3. Enter your SuiteCRM and Twilio credentials (see below)
4. Click **Test Connection** to verify
5. Click **Save Settings**

## Configuration Guide

### SuiteCRM Setup

#### 1. Create OAuth2 Client in SuiteCRM

1. Log into SuiteCRM as admin
2. Go to **Admin > OAuth2 Clients and Tokens**
3. Click **Create OAuth2 Client**
4. Configure:
   - **Client ID**: Enter a unique identifier (e.g., `chrome-dialer-extension`)
   - **Client Secret**: Generate a secure secret
   - **Grant Type**: Select "Client Credentials"
   - **Scopes**: Select at minimum:
     - `standard:create`
     - `standard:read`
     - `standard:update`
     - `standard:delete` (optional)
5. Save the Client ID and Client Secret

#### 2. Get Your SuiteCRM URL

Your SuiteCRM URL is the base URL of your instance, e.g.:
- `https://crm.yourcompany.com`
- `https://suitecrm.yourdomain.com`

### Twilio Setup (Optional but Recommended)

#### 1. Get Twilio Credentials

1. Sign up/log in at [twilio.com](https://twilio.com)
2. From the Console Dashboard:
   - Copy **Account SID** (looks like `ACxxxxxxxx`)
   - Copy **Auth Token**
3. Get a Phone Number:
   - Go to [Phone Numbers > Buy a Number](https://console.twilio.com/us1/develop/phone-numbers/manage/search)
   - Purchase a number for outbound calls
   - Copy the number in E.164 format (e.g., `+1234567890`)

#### 2. Enable Voice Calling

1. Go to **Runtime > TwiML Apps** in Twilio Console
2. Click **Create New TwiML App** (optional, for advanced routing)
3. Configure Voice URL if you have a server to handle calls
4. Copy the **TwiML App SID** (looks like `APxxxxxxxx`)

#### 3. Set Up TwiML for Browser Calling

For full WebRTC browser calling, you'll need a server endpoint that returns TwiML. Here's a simple Node.js example:

```javascript
// server.js - Twilio backend
const express = require('express');
const twilio = require('twilio');
const app = express();

app.post('/voice', (req, res) => {
  const twiml = new twilio.twiml.VoiceResponse();
  twiml.dial(req.body.To);
  res.type('text/xml');
  res.send(twiml.toString());
});

// Generate capability token
app.get('/token', (req, res) => {
  const identity = req.query.identity || 'chrome-dialer';
  const capability = new twilio.jwt.ClientCapability({
    accountSid: process.env.TWILIO_ACCOUNT_SID,
    authToken: process.env.TWILIO_AUTH_TOKEN
  });
  
  capability.addScope(new twilio.jwt.ClientCapability.OutgoingScope({
    applicationSid: process.env.TWILIO_APP_SID
  }));
  
  res.json({ token: capability.toJwt() });
});

app.listen(3000);
```

### Extension Settings

Navigate to the extension options page and fill in:

#### SuiteCRM Settings
- **SuiteCRM URL**: Your CRM base URL
- **Client ID**: From OAuth2 client setup
- **Client Secret**: From OAuth2 client setup

#### Twilio Settings (Optional)
- **Account SID**: From Twilio Console
- **Auth Token**: From Twilio Console
- **Twilio Phone Number**: Your purchased number
- **TwiML App SID**: For custom call routing (optional)

#### Call Settings
- **Default Dial Method**: Auto, Twilio, or System Phone
- **Auto-show widget**: Show dialer automatically on record pages
- **Confirm before dialing**: Add confirmation dialog

## Usage

### Basic Workflow

1. **Navigate to a Record** - Open any Lead or Contact in SuiteCRM
2. **Widget Appears** - The dialer widget appears (bottom-right by default)
3. **Select Number** - Choose from detected phone numbers
4. **Click Call** - Initiate the call via Twilio or system phone
5. **Take Notes** - Enter notes during the call
6. **Save Call** - Choose outcome and save to SuiteCRM

### Call Logging

After ending a call, the extension creates a "Call" record in SuiteCRM with:
- **Subject**: "Call with [Contact Name]"
- **Date**: Call start time
- **Duration**: Calculated from timer
- **Status**: "Held" (completed)
- **Direction**: "Outbound"
- **Related to**: The contact/lead
- **Description**: Your notes + outcome + phone number

### Widget Controls

- **📞 Call** - Initiate a call
- **📵 Hang Up** - End the call
- **🎤 Mute** - Mute/unmute microphone
- **−/+** - Minimize widget
- **×** - Close widget

### Keyboard Shortcuts

The extension doesn't add keyboard shortcuts by default. To add them:
1. Go to `chrome://extensions/shortcuts`
2. Click the extension and assign keyboard shortcuts
3. Possible shortcuts: Show/Hide Dialer, Quick Call, Save Notes

## Troubleshooting

### "Extension not working on SuiteCRM page"

1. Check if you're on a Lead/Contact **Detail View** page (not list view)
2. Look for URL with `module=Leads` or `module=Contacts` & `action=DetailView`
3. Check browser console for errors (F12 > Console)

### "Connection test failed"

1. Verify SuiteCRM URL includes protocol (`https://` not just domain)
2. Check OAuth2 credentials in SuiteCRM admin
3. Ensure OAuth2 client has required scopes
4. Try accessing `{suitecrm-url}/Api/oauth/access_token` directly (should return 400, not 404)

### "Calls not connecting"

**Using Twilio:**
1. Verify Account SID and Auth Token
2. Check Twilio phone number format (+1234567890)
3. Check Twilio console for [error logs](https://www.twilio.com/console/debugger)
4. Ensure your TwiML App exists (if using custom routing)

**Using tel: links:**
1. Check if system has a default phone app (Zoom, Teams, softphone)
2. Try clicking a `tel:` link manually in Chrome

### "Calls not logging to SuiteCRM"

1. Check OAuth2 client has `standard:create` scope
2. Verify API v8 is enabled in SuiteCRM
3. Check SuiteCRM logs: `logs/prod/prod.log`
4. Test connection from extension settings

## Architecture

```
suitecrm-dialer-chrome/
├── manifest.json           # Extension manifest (v3)
├── content/               # Content scripts (run in page context)
│   ├── content.js        # Detect SuiteCRM pages, extract data
│   ├── dialer-ui.js      # Widget UI logic
│   └── styles.css        # Widget styles
├── background/            # Service worker
│   ├── background.js     # Message routing, coordination
│   ├── suitecrm-api.js   # SuiteCRM API wrapper
│   └── twilio-client.js  # Twilio integration
├── popup/                 # Extension popup
├── options/               # Settings page
├── icons/                 # Extension icons
└── lib/                   # Third-party libraries
    └── twilio.min.js     # Twilio Client SDK
```

### Data Flow

1. **Content Script** detects SuiteCRM page and extracts contact data
2. **Inject Widget** into page with phone numbers
3. **User clicks Call** → send message to background
4. **Background** coordinates Twilio call or tel: link
5. **Call ends** → user saves with notes/outcome
6. **Background** creates record via SuiteCRM API

### Security Notes

- OAuth2 credentials stored in `chrome.storage.sync` (encrypted)
- Content script runs in isolated world but can access DOM
- Messages validated between content <-> background
- No credentials logged to console (production builds)

## Development

### Dev Mode

1. Load extension as "unpacked" in Chrome
2. Make changes to files
3. Go to `chrome://extensions/` and click **reload** icon
4. Check background script: `chrome://extensions/` > "service worker" link

### Testing

**Test SuiteCRM Connection:**
```javascript
// In extension service worker console
chrome.runtime.sendMessage({
  action: 'testConnection' 
}, console.log)
```

**Test Call Creation:**
```javascript
chrome.runtime.sendMessage({
  action: 'saveCall',
  callData: {
    module: 'Contacts',
    recordId: 'your-contact-id',
    contactName: 'Test Contact',
    phoneNumber: '+1234567890',
    notes: 'Test notes',
    outcome: 'Completed',
    duration: '02:30',
    startTime: new Date().toISOString()
  }
}, console.log)
```

### Building for Release

1. Update version in `manifest.json`
2. Create proper PNG icons (not placeholders)
3. Remove any debug logging
4. Zip the extension folder
5. Upload to Chrome Web Store Developer Dashboard

## API Reference

### Messages (Background Script)

#### initiateCall
```javascript
chrome.runtime.sendMessage({
  action: 'initiateCall',
  phoneNumber: '+1234567890',
  contactData: { ... }
})
```

#### saveCall
```javascript
chrome.runtime.sendMessage({
  action: 'saveCall',
  callData: {
    module: 'Leads',
    recordId: '...',
    contactName: '...',
    phoneNumber: '...',
    notes: '...',
    outcome: 'Completed',
    duration: '02:30',
    startTime: '...'
  }
})
```

#### testConnection
```javascript
chrome.runtime.sendMessage({
  action: 'testConnection'
})
// Returns: { success: true, ... } or { success: false, error: '...' }
```

## Support

### Known Issues

1. **SPA Navigation**: Some SuiteCRM themes use SPA navigation which requiresMutationObserver (implemented in content.js)
2. **CORS**: Twilio SDK may have CORS issues in some environments
3. **Icon Display**: Icons need to be proper PNG files (not placeholders) for Chrome Web Store

### Compatibility

- **SuiteCRM**: Versions 7.x and 8.x (API v8)
- **Chrome**: Version 88+ (Manifest V3)
- **Twilio**: Client JS SDK v1.14

### Contributing

To improve this extension:
1. Fork/copy the extension folder
2. Make changes and test thoroughly
3. Update this README with changes
4. Replace placeholder icons

## License

MIT License - Use at your own risk. Not affiliated with SuiteCRM or Twilio.

## Credits

- Extension built for SuiteCRM + Twilio integration
- Twilio Client SDK: https://www.twilio.com/docs/voice/client/javascript
- SuiteCRM API: https://docs.suitecrm.com/developer/api/developer-setup-guide/
