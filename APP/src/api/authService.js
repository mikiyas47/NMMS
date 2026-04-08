import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = 'https://nmms-backend.onrender.com/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Add request interceptor to attach auth token
apiClient.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Detect FormData in React Native (can be _parts or FormData instance)
    const isFormData =
      config.data instanceof FormData ||
      (config.data && typeof config.data === 'object' && config.data._parts);

    if (isFormData) {
      // Let the browser/RN set the correct multipart boundary automatically
      delete config.headers['Content-Type'];
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export const login = async (email, password) => {
  try {
    const response = await apiClient.post('/login', { email, password });
    // Store the auth token
    if (response.data.access_token) {
      await AsyncStorage.setItem('authToken', response.data.access_token);
      await AsyncStorage.setItem('user', JSON.stringify(response.data.user));
    }
    return response.data;
  } catch (error) {
    throw error.response ? error.response.data : new Error('Network Error');
  }
};

export const register = async (userData) => {
  try {
    const response = await apiClient.post('/register', userData);
    // Store the auth token
    if (response.data.access_token) {
      await AsyncStorage.setItem('authToken', response.data.access_token);
      await AsyncStorage.setItem('user', JSON.stringify(response.data.user));
    }
    return response.data;
  } catch (error) {
    throw error.response ? error.response.data : new Error('Network Error');
  }
};

export const logout = async () => {
  try {
    await apiClient.post('/logout');
  } catch (error) {
    console.log('Logout error:', error);
  } finally {
    // Clear stored tokens
    await AsyncStorage.removeItem('authToken');
    await AsyncStorage.removeItem('user');
  }
};

export const getProducts = async () => {
  try {
    const response = await apiClient.get('/products');
    return response.data;
  } catch (error) {
    throw error.response ? error.response.data : new Error('Network Error');
  }
};

export const getUser = async () => {
  try {
    const user = await AsyncStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  } catch (error) {
    console.log('Get user error:', error);
    return null;
  }
};

export default apiClient;
