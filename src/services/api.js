import axios from 'axios';

const baseConfig = {
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
  validateStatus: (status) => (status >= 200 && status < 300) || status === 304,
};

// Customer API instance
const api = axios.create({
  ...baseConfig,
  baseURL: '/api/customers',
});

// Products API instance
const productApi = axios.create({
  ...baseConfig,
  baseURL: '/api/products',
});

// Wishlist API instance
const wishlistApi = axios.create({
  ...baseConfig,
  baseURL: '/api/wishlist',
});

// Cart API instance
const cartApi = axios.create({
  ...baseConfig,
  baseURL: '/api/cart',
});

// Order API instance
const orderApi = axios.create({
  ...baseConfig,
  baseURL: '/api/orders',
});

export const registerCustomer = async (customerData) => {
  const response = await api.post('/register', customerData);
  return response.data;
};

export const loginCustomer = async (credentials) => {
  const response = await api.post('/login', credentials);
  return response.data;
};

export const getMyProfile = async () => {
  const response = await api.get('/me');
  return response.data;
};

export const logoutCustomer = async () => {
  const response = await api.post('/logout');
  return response.data;
};

// Product Discovery API Endpoints
export const getProducts = async (search = '', category = '') => {
  const params = {};
  if (search && search.trim() !== '') params.search = search.trim();
  if (category && category.trim() !== '' && category !== 'All Categories') params.category = category.trim();

  const response = await productApi.get('', { params });
  return response.data;
};

export const getProductById = async (id) => {
  const response = await productApi.get(`/${id}`);
  return response.data;
};

// Wishlist API Endpoints
export const addToWishlist = async (productId) => {
  const response = await wishlistApi.post(`/${productId}`);
  return response.data;
};

export const getWishlist = async () => {
  const response = await wishlistApi.get('');
  return response.data;
};

export const removeFromWishlist = async (productId) => {
  const response = await wishlistApi.delete(`/${productId}`);
  return response.data;
};

// Cart API Endpoints
export const addToCart = async (productId) => {
  const response = await cartApi.post(`/${productId}`);
  return response.data;
};

export const getCart = async () => {
  const response = await cartApi.get('');
  return response.data;
};

export const updateCartQuantity = async (productId, quantity) => {
  const response = await cartApi.patch(`/${productId}`, { quantity });
  return response.data;
};

export const removeFromCart = async (productId) => {
  const response = await cartApi.delete(`/${productId}`);
  return response.data;
};

// Order API Endpoints
export const createPaymentOrder = async (shippingAddress) => {
  const response = await orderApi.post('/create-payment-order', { shippingAddress });
  return response.data;
};

export const verifyPayment = async (paymentData) => {
  const response = await orderApi.post('/verify-payment', paymentData);
  return response.data;
};

export const getOrders = async () => {
  const response = await orderApi.get('');
  return response.data;
};

export const getOrderById = async (id) => {
  const response = await orderApi.get(`/${id}`);
  return response.data;
};

export default api;
