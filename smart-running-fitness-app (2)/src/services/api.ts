// API Service để kết nối với Backend

// @ts-ignore
const API_URL = import.meta.env?.VITE_API_URL || 'http://localhost:5000/api';

interface ApiResponse<T = unknown> {
  success: boolean;
  error?: string;
  data?: T;
}

class ApiService {
  private token: string | null = null;

  constructor() {
    this.token = localStorage.getItem('runmate_token');
  }

  setToken(token: string) {
    this.token = token;
    localStorage.setItem('runmate_token', token);
  }

  clearToken() {
    this.token = null;
    localStorage.removeItem('runmate_token');
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.token) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers,
      });

      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.error || 'Đã xảy ra lỗi' };
      }

      return { success: true, data };
    } catch (error) {
      console.error('API Error:', error);
      return { success: false, error: 'Không thể kết nối đến server' };
    }
  }

  // Auth
  async register(email: string, password: string, name: string) {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    });
  }

  async login(email: string, password: string) {
    const result = await this.request<{ token: string; user: unknown }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    
    if (result.success && result.data?.token) {
      this.setToken(result.data.token);
    }
    
    return result;
  }

  async verifyToken() {
    return this.request('/auth/verify');
  }

  async logout() {
    const result = await this.request('/auth/logout', { method: 'POST' });
    this.clearToken();
    return result;
  }

  getGoogleAuthUrl() {
    return `${API_URL}/auth/google`;
  }

  getFacebookAuthUrl() {
    return `${API_URL}/auth/facebook`;
  }

  // User
  async getProfile() {
    return this.request('/user/profile');
  }

  async updateProfile(data: { name?: string; profile?: unknown; settings?: unknown }) {
    return this.request('/user/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async updateStats(stats: unknown) {
    return this.request('/user/stats', {
      method: 'PUT',
      body: JSON.stringify({ stats }),
    });
  }

  async syncData(data: { profile?: unknown; stats?: unknown; badges?: unknown }) {
    return this.request('/user/sync', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Activities
  async createActivity(data: {
    type: string;
    duration: number;
    distance: number;
    steps: number;
    calories: number;
    route?: Array<{ lat: number; lng: number }>;
  }) {
    return this.request('/activity', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getActivities(params?: { page?: number; limit?: number; startDate?: string; endDate?: string }) {
    const query = new URLSearchParams(params as Record<string, string>).toString();
    return this.request(`/activity?${query}`);
  }

  async getDailyRecords(startDate?: string, endDate?: string) {
    const query = new URLSearchParams({ startDate: startDate || '', endDate: endDate || '' }).toString();
    return this.request(`/activity/daily/records?${query}`);
  }

  async updateWater(glasses: number, date?: string) {
    return this.request('/activity/daily/water', {
      method: 'PUT',
      body: JSON.stringify({ glasses, date }),
    });
  }

  async getStatsSummary(period: 'week' | 'month' = 'week') {
    return this.request(`/activity/stats/summary?period=${period}`);
  }
}

export const api = new ApiService();
export default api;
