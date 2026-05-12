import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = 'https://nmms-backend.onrender.com/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
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
    // Append a timestamp to bust any HTTP cache layer
    const response = await apiClient.get('/products', {
      params: { _t: Date.now() },
    });
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

// ── Contacts (raw contact storage) ───────────────────────────────────────────
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

export const convertContactToProspect = async (id, data) => {
  const response = await apiClient.post(`/contacts/${id}/convert`, data);
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

// ── Performance Operating System ─────────────────────────────────────────────

// Presentations
// Fetch both owner-uploaded global presentations and distributor's own presentations
export const getPresentations = async () => (await apiClient.get('/presentations')).data;
export const createPresentation = async (data) => (await apiClient.post('/presentations', data)).data;
export const updatePresentation = async (id, data) => (await apiClient.put(`/presentations/${id}`, data)).data;
export const deletePresentation = async (id) => (await apiClient.delete(`/presentations/${id}`)).data;
export const assignPresentation = async (data) => (await apiClient.post('/presentations/assign', data)).data;
export const getProspectAssignments = async (prospectId) => (await apiClient.get(`/prospects/${prospectId}/assignments`)).data;
export const logPresentationCallOutcome = async (data) => (await apiClient.post('/presentations/call-outcome', data)).data;

// Invitations
export const createInvitation = async (data) => (await apiClient.post('/invitations', data)).data;
export const getProspectInvitations = async (prospectId) => (await apiClient.get(`/prospects/${prospectId}/invitations`)).data;
export const updateInvitationStatus = async (id, status) => (await apiClient.patch(`/invitations/${id}/status`, { status })).data;

// Automation
export const getAutomationRules = async () => (await apiClient.get('/automation-rules')).data;
export const createAutomationRule = async (data) => (await apiClient.post('/automation-rules', data)).data;
export const toggleAutomationRule = async (id) => (await apiClient.patch(`/automation-rules/${id}/toggle`)).data;

// Priority
export const getPriorityLeads = async () => (await apiClient.get('/prospect-priority')).data;

// Daily dashboard
export const getDailyDashboard = async () => (await apiClient.get('/daily-dashboard')).data;
export const completeTask = async (data) => (await apiClient.post('/daily-dashboard/complete', data)).data;

// Behavioral intelligence
export const getActiveRecommendations = async () => (await apiClient.get('/recommendations/active')).data;
export const getProspectRecommendations = async (id) => (await apiClient.get(`/prospects/${id}/recommendations`)).data;
export const markRecommendationRead = async (id) => (await apiClient.patch(`/recommendations/${id}/read`)).data;

// Onboarding
export const getOnboardingStatus = async () => (await apiClient.get('/onboarding/status')).data;

// Playbooks & duplication
export const getPlaybooks = async () => (await apiClient.get('/playbooks')).data;
export const createPlaybook = async (data) => (await apiClient.post('/playbooks', data)).data;
export const getScript = async (invitationType, prospectId) => (await apiClient.get('/scripts', { params: { invitation_type: invitationType, prospect_id: prospectId } })).data;
export const getWeeklyGoals = async () => (await apiClient.get('/duplication/weekly-goals')).data;

// Funnel analytics
export const getFunnelReport = async (params = {}) => (await apiClient.get('/funnel/report', { params })).data;
// ─────────────────────────────────────────────────────────────────────────────
export const getProspectDashboard = async () => {
  try {
    const response = await apiClient.get('/prospect-dashboard');
    return response.data;
  } catch (error) {
    const detail = error.response?.data;
    console.error('Prospect dashboard detail:', JSON.stringify(detail), 'status:', error.response?.status);
    throw error;
  }
};

export const getProspectPipeline = async () => {
  const response = await apiClient.get('/prospect-pipeline');
  return response.data;
};

export const getProspects = async (params = {}) => {
  const response = await apiClient.get('/prospects', { params });
  return response.data;
};

export const createProspect = async (data) => {
  const response = await apiClient.post('/prospects', data);
  return response.data;
};

export const getProspect = async (id) => {
  const response = await apiClient.get(`/prospects/${id}`);
  return response.data;
};

export const updateProspect = async (id, data) => {
  const response = await apiClient.put(`/prospects/${id}`, data);
  return response.data;
};

export const deleteProspect = async (id) => {
  const response = await apiClient.delete(`/prospects/${id}`);
  return response.data;
};

export const moveProspectStage = async (id, data) => {
  const response = await apiClient.patch(`/prospects/${id}/stage`, data);
  return response.data;
};

export const addProspectFollowup = async (id, data) => {
  const response = await apiClient.post(`/prospects/${id}/followups`, data);
  return response.data;
};

export const addProspectClosing = async (id, data) => {
  const response = await apiClient.post(`/prospects/${id}/closings`, data);
  return response.data;
};

export const addProspectNote = async (id, note) => {
  const response = await apiClient.post(`/prospects/${id}/notes`, { note });
  return response.data;
};

export const getProspectActivities = async (id) => {
  const response = await apiClient.get(`/prospects/${id}/activities`);
  return response.data;
};
// ── Goals ─────────────────────────────────────────────────────────────────────
export const getGoalEngine = async () => {
  try {
    const response = await apiClient.get('/goal-engine');
    return response.data;
  } catch (error) {
    const detail = error.response?.data;
    console.error('Goal engine 500 detail:', JSON.stringify(detail));
    throw error;
  }
};

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

// ── MLM Wallet & Stats ────────────────────────────────────────────────────────
export const getWallet = async () => {
  const response = await apiClient.get('/wallet');
  return response.data;
};

// ── Customer → Distributor Upgrade ───────────────────────────────────────────
/**
 * Called after a successful customer payment when the customer chooses to
 * become a distributor. Sets their real password and activates their account.
 * Returns a Sanctum token so they can log in immediately.
 */
export const upgradeToDistributor = async ({ email, password, password_confirmation, tx_ref }) => {
  try {
    const response = await apiClient.post('/customer/upgrade', {
      email,
      password,
      password_confirmation,
      tx_ref,
    });
    // Auto-store token so they are logged in right away
    if (response.data.access_token) {
      await AsyncStorage.setItem('authToken', response.data.access_token);
      await AsyncStorage.setItem('user', JSON.stringify(response.data.user));
    }
    return response.data;
  } catch (error) {
    const errData = error.response?.data;
    let msg = errData?.message ?? 'Upgrade failed. Please try again.';
    if (errData?.errors) {
      const first = Object.values(errData.errors)[0];
      msg = Array.isArray(first) ? first[0] : first;
    }
    throw new Error(msg);
  }
};

/**
 * Check whether a customer email already has an active distributor account.
 * Used to skip the upgrade prompt for returning distributors.
 */
export const checkCustomerStatus = async (email, txRef) => {
  try {
    const response = await apiClient.get('/customer/status', {
      params: { email, tx_ref: txRef },
    });
    return response.data;
  } catch {
    return { is_distributor: false };
  }
};

// ── Tree ──────────────────────────────────────────────────────────────────────
export const getMyTree = async () => {
  const response = await apiClient.get('/tree');
  return response.data;
};

export const getSubtreeData = async (nodeId) => {
  const response = await apiClient.get(`/tree/${nodeId}`);
  return response.data;
};
// ── Distributor MLM Join ──────────────────────────────────────────────────────
/**
 * Join the MLM network by purchasing a product package.
 * quantity: 1=single, 2=double, 3=triple, 4=quadruple (more legs)
 */
export const joinNetwork = async ({ product_id, sponsor_id, quantity = 1 }) => {
  const response = await apiClient.post('/distributor/join', { product_id, sponsor_id, quantity });
  return response.data;
};

export const getDistributorStatus = async () => {
  const response = await apiClient.get('/distributor/status');
  return response.data;
};
// ─────────────────────────────────────────────────────────────────────────────

export default apiClient;
