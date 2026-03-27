import api from './api';

export const login = (payload) => api.post('/auth/login', payload).then(r => r.data);
export const me = () => api.get('/auth/me').then((response) => response.data);
export const logout = () => api.post('/auth/logout').then((response) => response.data);
