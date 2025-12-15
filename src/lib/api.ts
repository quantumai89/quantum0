import axios from 'axios';

// Create Axios instance
const api = axios.create({
  baseURL: import.meta.env.VITE_AUTH_API_URL || 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for adding auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for handling token expiry
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // If error is 401 and not already retrying
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');

        if (!refreshToken) {
          // No refresh token, clear storage but don't redirect if on public pages
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('user');
          
          // Only redirect to login if not already on auth pages
          const currentPath = window.location.pathname;
          if (!['/login', '/register', '/'].includes(currentPath)) {
            window.location.href = '/login';
          }
          return Promise.reject(error);
        }

        // Try to refresh token
        const response = await axios.post(`${import.meta.env.VITE_AUTH_API_URL || 'http://localhost:5000/api'}/auth/refresh`, {
          refreshToken,
        });

        const { accessToken, user } = response.data;

        // Save new tokens
        localStorage.setItem('accessToken', accessToken);
        if (user) {
          localStorage.setItem('user', JSON.stringify(user));
        }

        // Retry original request with new token
        originalRequest.headers['Authorization'] = `Bearer ${accessToken}`;
        return api(originalRequest);

      } catch (refreshError) {
        // Refresh failed, clear storage
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        
        // Only redirect to login if not already on auth pages
        const currentPath = window.location.pathname;
        if (!['/login', '/register', '/'].includes(currentPath)) {
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);


// Lip-sync Generation API
export const generateTTS = async (text: string, voice_id: string = 'default') => {
  const response = await api.post('/tts/generate', { text, voice_id });
  return response.data;
};

export const generateWav2Lip = async (audio_path: string, avatar_id: string = 'default') => {
  const response = await api.post('/wav2lip/generate', { audio_path, avatar_id });
  return response.data;
};

export const getJobStatus = async (job_id: string) => {
  const response = await api.get(`/job/${job_id}/status`);
  return response.data;
};

export default api;

