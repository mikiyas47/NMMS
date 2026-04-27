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

export const deleteProduct = async (productId) => {
  try {
    const response = await apiClient.delete(`/products/${productId}`);
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

export const updatePassword = async (data) => {
  try {
    const response = await apiClient.put('/profile/password', data);
    return response.data;
  } catch (error) {
    throw error.response ? error.response.data : new Error('Network Error');
  }
};

// ── Contacts (Prospects) ──────────────────────────────────────────────────────
export const getContacts = async () => {
  const response = await apiClient.get('/contacts');
  return response.data;
};

export const createContact = async (data) => {
  const response = await apiClient.post('/contacts', data);
  return response.data;
};

export const updateContact = async (id, data) => {
  const response = await apiClient.put(`/contacts/${id}`, data);
  return response.data;
};

export const deleteContact = async (id) => {
  const response = await apiClient.delete(`/contacts/${id}`);
  return response.data;
};

// ── Follow-ups ────────────────────────────────────────────────────────────────
export const getFollowups = async () => {
  const response = await apiClient.get('/contacts/followups');
  return response.data;
};

export const createFollowup = async (contactId, data) => {
  const response = await apiClient.post(`/contacts/${contactId}/followups`, data);
  return response.data;
};

// ── Closing Attempts ──────────────────────────────────────────────────────────
export const getClosings = async () => {
  const response = await apiClient.get('/contacts/closings');
  return response.data;
};

export const createClosing = async (contactId, data) => {
  const response = await apiClient.post(`/contacts/${contactId}/closings`, data);
  return response.data;
};
// ── Goals ─────────────────────────────────────────────────────────────────────
export const getGoals = async () => {
  const response = await apiClient.get('/goals');
  return response.data;
};

export const createGoal = async (data) => {
  const response = await apiClient.post('/goals', data);
  return response.data;
};

export const updateGoal = async (id, data) => {
  const response = await apiClient.put(`/goals/${id}`, data);
  return response.data;
};

export const deleteGoal = async (id) => {
  const response = await apiClient.delete(`/goals/${id}`);
  return response.data;
};

export const logGoalActivity = async (goalId, data) => {
  const response = await apiClient.post(`/goals/${goalId}/activities`, data);
  return response.data;
};

export const addGoalMilestone = async (goalId, targetValue) => {
  const response = await apiClient.post(`/goals/${goalId}/milestones`, { target_value: targetValue });
  return response.data;
};
// ─────────────────────────────────────────────────────────────────────────────

// ── Payments ──────────────────────────────────────────────────────────────────

/**
 * Initiate a Chapa payment.
 * Backend locks price, creates tx_ref, calls Chapa and returns checkout URL.
 */
export const initiatePayment = async (data) => {
  try {
    const response = await apiClient.post('/payments/initiate', data);
    return response.data;
  } catch (error) {
    const errData = error.response?.data;
    let errorMsg = errData?.message ?? 'Payment initiation failed';
    
    // If it's a Laravel validation error, it might have an 'errors' object
    if (errData?.errors && typeof errData.errors === 'object') {
      const firstError = Object.values(errData.errors)[0];
      if (Array.isArray(firstError)) errorMsg = firstError[0];
      else if (typeof firstError === 'string') errorMsg = firstError;
    }
    
    // If Chapa or another service returns an object in 'message'
    if (typeof errorMsg === 'object') {
      errorMsg = JSON.stringify(errorMsg);
    }

    throw new Error(errorMsg);
  }
};

/**
 * Poll backend to check if a payment has been confirmed via Chapa webhook.
 */
export const verifyPayment = async (txRef) => {
  try {
    const response = await apiClient.get(`/payments/verify/${txRef}`);
    return response.data;
  } catch (error) {
    throw error.response ? error.response.data : new Error('Network Error');
  }
};

/**
 * Fetch the distributor's sales / commission history.
 * Pass distributor_id to filter by distributor.
 */
export const getSalesHistory = async (distributorId) => {
  try {
    const response = await apiClient.get('/payments', {
      params: distributorId ? { distributor_id: distributorId } : {},
    });
    return response.data;
  } catch (error) {
    throw error.response ? error.response.data : new Error('Network Error');
  }
};
// ─────────────────────────────────────────────────────────────────────────────

export default apiClient;
