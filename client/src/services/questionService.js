import api from './api';

export const createQuestion = (payload) => api.post('/questions', payload).then(r => r.data);
export const uploadQuestionImage = (file) => {
  const formData = new FormData();
  formData.append('image', file);

  return api.post('/questions/upload-image', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  }).then(r => r.data);
};
export const deleteQuestionImage = (publicId) => api.post('/questions/delete-image', { publicId }).then(r => r.data);
export const fetchQuestions = (categoryOrOptions, difficulty) => {
  const params = new URLSearchParams();
  const options = typeof categoryOrOptions === 'object' && categoryOrOptions !== null
    ? categoryOrOptions
    : { category: categoryOrOptions, difficulty };

  if (options.category) params.append('category', options.category);
  if (options.difficulty) params.append('difficulty', options.difficulty);
  if (options.mine) params.append('mine', 'true');
  if (options.scope) params.append('scope', options.scope);
  return api.get(`/questions?${params.toString()}`).then(r => r.data);
};
export const getQuestionById = (id) => api.get(`/questions/${id}`).then(r => r.data);
export const updateQuestion = (id, payload) => api.put(`/questions/${id}`, payload).then(r => r.data);
export const deleteQuestion = (id) => api.delete(`/questions/${id}`).then(r => r.data);
export const bulkCreateQuestions = (payload) => api.post('/questions/bulk', payload).then(r => r.data);
