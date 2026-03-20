import api from './api';

export const verifyEmailToken = (token) => api.get(`/verification/verify-email?token=${encodeURIComponent(token)}`).then((response) => response.data);
export const requestPasswordReset = (email) => api.post('/verification/request-password-reset', { email }).then((response) => response.data);
export const resetPasswordWithToken = (payload) => api.post('/verification/reset-password', payload).then((response) => response.data);