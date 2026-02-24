import * as SecureStore from 'expo-secure-store';

const API_BASE_URL = 'https://api.mozhost.topaziocoin.online/api';

export const getToken = async (): Promise<string | null> => {
  return await SecureStore.getItemAsync('mozhost_token');
};

export const setToken = async (token: string): Promise<void> => {
  await SecureStore.setItemAsync('mozhost_token', token);
};

export const removeToken = async (): Promise<void> => {
  await SecureStore.deleteItemAsync('mozhost_token');
};

export const getAuthHeaders = async () => {
  const token = await getToken();
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
};

export const api = {
  async get(endpoint: string) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}${endpoint}`, { headers });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw { status: response.status, ...error };
    }
    return response.json();
  },

  async post(endpoint: string, body?: any) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw { status: response.status, ...data };
    }
    return data;
  },

  async put(endpoint: string, body?: any) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'PUT',
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw { status: response.status, ...data };
    }
    return data;
  },

  async patch(endpoint: string, body?: any) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'PATCH',
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw { status: response.status, ...data };
    }
    return data;
  },

  async delete(endpoint: string, body?: any) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'DELETE',
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw { status: response.status, ...data };
    }
    return data;
  },

  // Auth endpoints (no token needed)
  async login(login: string, password: string) {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ login, password }),
    });
    const data = await response.json();
    if (!response.ok) {
      throw { status: response.status, ...data };
    }
    return data;
  },

  async register(userData: {
    username: string;
    email: string;
    password: string;
    phone?: string;
    countryCode?: string;
    preferredVerificationMethod?: string;
  }) {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData),
    });
    const data = await response.json();
    if (!response.ok) {
      throw { status: response.status, ...data };
    }
    return data;
  },

  async verifyCode(code: string, method: string) {
    const endpoint =
      method === 'whatsapp'
        ? '/auth/verify-whatsapp'
        : method === 'sms'
        ? '/auth/verify-sms'
        : '/auth/verify-email';
    return api.post(endpoint, { code });
  },

  async resendCode(method: string) {
    return api.post('/auth/resend-code', { method });
  },

  async verifyToken() {
    return api.get('/auth/verify');
  },
};
