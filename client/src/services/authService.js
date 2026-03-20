import api from './api';

export const login = (payload) => api.post('/auth/login', payload).then(r => r.data);
export const me = () => api.get('/auth/me');
