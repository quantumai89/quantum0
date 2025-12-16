import api from './api';
import { LoginCredentials, RegisterData } from '@/types';

export const authApi = {
    // Register new user
    register: async (data: RegisterData) => {
        const response = await api.post('/auth/register', data);
        return response.data;
    },

    // Login user
    login: async (credentials: LoginCredentials) => {
        const response = await api.post('/auth/login', credentials);
        return response.data;
    },

    // Logout user
    logout: async () => {
        const refreshToken = localStorage.getItem('refreshToken');
        if (refreshToken) {
            await api.post('/auth/logout', { refreshToken });
        }
    },

    // Get current user profile
    getCurrentUser: async () => {
        const response = await api.get('/auth/me');
        return response.data;
    },

    // Refresh access token
    refreshToken: async (token: string) => {
        const response = await api.post('/auth/refresh', { refreshToken: token });
        return response.data;
    }
};
