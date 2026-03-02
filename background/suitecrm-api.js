/**
 * SuiteCRM/SugarCRM API Client
 * Supports OAuth2 Password Grant flow
 * FIXED: Added null checks for API responses
 */

class SuiteCRMAPI {
  constructor() {
    this.baseUrl = '';
    this.accessToken = null;
    this.tokenExpiry = null;
    this.refreshPromise = null;
  }

  async getConfig() {
    try {
      const result = await chrome.storage.sync.get([
        'suitecrmUrl',
        'clientId',
        'clientSecret',
        'username',
        'password'
      ]);
      return result || {};
    } catch (error) {
      console.error('[SweetDialer] Failed to get config:', error);
      return {};
    }
  }

  async authenticate() {
    const config = await this.getConfig();
    
    if (!config || !config.suitecrmUrl || !config.clientId || !config.username) {
      throw new Error('SuiteCRM configuration incomplete');
    }

    this.baseUrl = config.suitecrmUrl.replace(/\/+$/, '');

    const authUrl = this.baseUrl + '/legacy/Api/access_token';
    
    const requestBody = {
      grant_type: 'password',
      client_id: config.clientId,
      client_secret: config.clientSecret || '',
      username: config.username,
      password: config.password || ''
    };

    console.log('[SweetDialer] Authenticating...');

    try {
      const response = await fetch(authUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[SweetDialer] Auth failed:', response.status, errorText);
        throw new Error('Auth failed: ' + response.status);
      }

      const data = await response.json();
      
      if (!data || !data.access_token) {
        throw new Error('Invalid auth response');
      }
      
      this.accessToken = data.access_token;
      const expiresIn = data.expires_in || 3600;
      this.tokenExpiry = Date.now() + (expiresIn * 1000);
      
      console.log('[SweetDialer] Auth success');
      
      return this.accessToken;
    } catch (error) {
      console.error('[SweetDialer] Auth error:', error);
      throw error;
    }
  }

  async getAccessToken() {
    if (this.accessToken && this.tokenExpiry && (Date.now() < this.tokenExpiry - 60000)) {
      return this.accessToken;
    }

    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = this.authenticate().finally(() => {
      this.refreshPromise = null;
    });

    return this.refreshPromise;
  }

  async request(endpoint, options = {}) {
    try {
      const token = await this.getAccessToken();
      
      if (!this.baseUrl) {
        const config = await this.getConfig();
        this.baseUrl = (config.suitecrmUrl || '').replace(/\/+$/, '');
      }
      
      if (!this.baseUrl) {
        throw new Error('No valid SuiteCRM URL configured');
      }
      
      const url = this.baseUrl + endpoint;
      
      const headers = {
        'Authorization': 'Bearer ' + token,
        'Content-Type': 'application/vnd.api+json',
        'Accept': 'application/vnd.api+json'
      };

      const response = await fetch(url, Object.assign({}, options, {
        headers: Object.assign({}, headers, options.headers || {})
      }));

      if (response.status === 401) {
        this.accessToken = null;
        this.tokenExpiry = null;
        return this.request(endpoint, options);
      }

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error('API error: ' + response.status);
      }

      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const data = await response.json();
        return data || {};
      }
      
      return {};
    } catch (error) {
      console.error('[SweetDialer] Request error:', error);
      throw error;
    }
  }

  async getRecord(module, id) {
    try {
      if (!module || !id) {
        console.warn('[SweetDialer] getRecord: missing module or id');
        return {};
      }
      const data = await this.request('/legacy/Api/V8/module/' + module + '/' + id);
      return data || {};
    } catch (error) {
      console.error('[SweetDialer] Get record error:', error);
      return {};
    }
  }

  async getRecords(module, filters) {
    filters = filters || {};
    try {
      if (!module) {
        console.warn('[SweetDialer] getRecords: missing module');
        return { data: [] };
      }
      
      const params = new URLSearchParams();
      
      if (filters.fields && Array.isArray(filters.fields)) {
        params.append('fields', filters.fields.join(','));
      }
      
      if (filters.filter && typeof filters.filter === 'object') {
        Object.keys(filters.filter).forEach(function(key) {
          const value = filters.filter[key];
          if (value != null) {
            params.append('filter[' + key + ']', value);
          }
        });
      }
      
      const queryString = params.toString() ? '?' + params.toString() : '';
      const data = await this.request('/legacy/Api/V8/module/' + module + queryString);
      
      return data || { data: [] };
    } catch (error) {
      console.error('[SweetDialer] Get records error:', error);
      return { data: [] };
    }
  }

  async createRecord(module, attributes) {
    try {
      if (!module || !attributes || typeof attributes !== 'object') {
        console.warn('[SweetDialer] createRecord: invalid parameters');
        return {};
      }

      const payload = {
        data: {
          type: module,
          attributes: attributes
        }
      };

      const data = await this.request('/legacy/Api/V8/module/' + module, {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      
      return data || {};
    } catch (error) {
      console.error('[SweetDialer] Create error:', error);
      throw error;
    }
  }

  async searchByPhone(phone) {
    if (!phone) return [];
    
    const cleanPhone = phone.replace(/\D/g, '');
    if (!cleanPhone) return [];
    
    const results = [];
    const modules = ['Contacts', 'Leads'];
    
    for (let i = 0; i < modules.length; i++) {
      const module = modules[i];
      try {
        const data = await this.getRecords(module, {
          filter: { phone_mobile: cleanPhone },
          fields: ['id', 'first_name', 'last_name', 'phone_mobile']
        });
        
        const records = data && data.data ? data.data : [];
        if (Array.isArray(records) && records.length > 0) {
          for (let j = 0; j < records.length; j++) {
            const r = records[j];
            if (r) {
              results.push(Object.assign({}, r, { module: module }));
            }
          }
        }
      } catch (error) {
        console.warn('[SweetDialer] Search error for ' + module + ':', error);
      }
    }
    
    return results;
  }

  async createCallRecord(callData) {
    if (!callData) {
      console.warn('[SweetDialer] createCallRecord: no call data');
      throw new Error('No call data');
    }

    const attributes = {
      name: callData.name || 'Call',
      date_start: callData.date_start,
      duration_minutes: String(callData.duration_minutes || 0),
      duration_hours: String(callData.duration_hours || 0),
      status: callData.status || 'Planned',
      direction: callData.direction || 'Outbound',
      description: callData.description || ''
    };

    if (callData.parent_type && callData.parent_id) {
      attributes.parent_type = callData.parent_type;
      attributes.parent_id = callData.parent_id;
    }

    return await this.createRecord('Calls', attributes);
  }
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { SuiteCRMAPI: SuiteCRMAPI };
}
