/**
 * TecHaven API client – matches docs at http://app.comfwb.org/api
 * Base URL and token are set from env / AsyncStorage.
 */
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE_URL = 'http://app.comfwb.org/api';
const TOKEN_KEY = '@techaven_token';

let client = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

client.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem(TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

client.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      AsyncStorage.removeItem(TOKEN_KEY);
    }
    return Promise.reject(err);
  }
);

export async function setToken(token) {
  if (token) await AsyncStorage.setItem(TOKEN_KEY, token);
  else await AsyncStorage.removeItem(TOKEN_KEY);
}

export async function getToken() {
  return AsyncStorage.getItem(TOKEN_KEY);
}

// --- Auth ---
export const auth = {
  register: (body) => client.post('/auth/register', body),
  login: (body) => client.post('/auth/login', body),
  sendLoginOtp: (body) => client.post('/auth/send-login-otp', body),
  verifyOtp: (body) => client.post('/auth/verify-otp', body),
  resendOtp: (body) => client.post('/auth/resend-otp', body),
  forgotPassword: (body) => client.post('/auth/forgot-password', body),
  resetPassword: (body) => client.post('/auth/reset-password', body),
  logout: () => client.post('/auth/logout'),
  refreshToken: (body) => client.post('/auth/refresh-token', body),
};

// --- User ---
export const user = {
  getProfile: () => client.get('/user/profile'),
  updateProfile: (body) => client.put('/user/profile', body),
  uploadAvatar: (formData) =>
    client.post('/user/avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  changePassword: (body) => client.post('/user/change-password', body),
};

// --- Products & Categories ---
export const products = {
  getAll: (params) => client.get('/products', { params }),
  getById: (id) => client.get(`/products/${id}`),
  getFeatured: () => client.get('/products/featured'),
  getHotSales: () => client.get('/products/hot-sales'),
  getSpecialOffers: () => client.get('/products/special-offers'),
  search: (params) => client.get('/products/search', { params }),
  getByCategory: (id, params) => client.get(`/products/category/${id}`, { params }),
};
export const categories = {
  getAll: () => client.get('/categories'),
};
export const banners = {
  getAll: () => client.get('/banners'),
};

// --- Shops ---
export const shops = {
  getAll: (params) => client.get('/shops', { params }),
  getById: (id) => client.get(`/shops/${id}`),
  getProducts: (id, params) => client.get(`/shops/${id}/products`, { params }),
};

// --- Orders ---
export const orders = {
  getAll: (params) => client.get('/orders', { params }),
  getById: (id) => client.get(`/orders/${id}`),
  create: (body) => client.post('/orders', body),
  payWithWallet: (id) => client.post(`/orders/${id}/pay/wallet`),
  payWithMalipo: (id, body) => client.post(`/orders/${id}/pay/malipo`, body),
  cancel: (id, body) => client.post(`/orders/${id}/cancel`, body),
};
export const paymentMethods = {
  getAll: () => client.get('/payment-methods'),
};

// --- Wallet ---
export const wallet = {
  getBalance: () => client.get('/wallet/balance'),
  topUp: (body) => client.post('/wallet/topup', body),
  getTransactions: (params) => client.get('/wallet/transactions', { params }),
};

// --- Shipping addresses ---
export const shippingAddresses = {
  getAll: () => client.get('/shipping-addresses'),
  create: (body) => client.post('/shipping-addresses', body),
  update: (id, body) => client.put(`/shipping-addresses/${id}`, body),
  delete: (id) => client.delete(`/shipping-addresses/${id}`),
  setDefault: (id) => client.post(`/shipping-addresses/${id}/set-default`),
};

// --- Notifications ---
export const notifications = {
  getAll: (params) => client.get('/notifications', { params }),
  getUnreadCount: () => client.get('/notifications/unread-count'),
  markRead: (id) => client.post(`/notifications/${id}/read`),
  markAllRead: () => client.post('/notifications/mark-all-read'),
  delete: (id) => client.delete(`/notifications/${id}`),
};

// --- Help & Support ---
export const help = {
  getTopics: () => client.get('/help/topics'),
  getFaqs: () => client.get('/help/faqs'),
  search: (params) => client.get('/help/search', { params }),
};
export const support = {
  getInfo: () => client.get('/support/info'),
};

// --- App content ---
export const about = {
  getInfo: () => client.get('/about/info'),
  getStats: () => client.get('/about/stats'),
};
export const onboarding = {
  getSlides: () => client.get('/onboarding/slides'),
};
export const countries = {
  getAll: () => client.get('/countries'),
};

export default client;
