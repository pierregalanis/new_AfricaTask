import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const apiClient = axios.create({
  baseURL: `${API_URL}/api`,
});

// Add auth token to requests
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default apiClient;

// API functions
export const categoriesAPI = {
  getAll: () => apiClient.get('/categories'),
  getById: (id) => apiClient.get(`/categories/${id}`),
};

export const tasksAPI = {
  create: (data) => apiClient.post('/tasks', data),
  getAll: (params) => apiClient.get('/tasks', { params }),
  getById: (id) => apiClient.get(`/tasks/${id}`),
  updateStatus: (id, status) => apiClient.put(`/tasks/${id}/status`, null, { params: { new_status: status } }),
  apply: (id, data) => apiClient.post(`/tasks/${id}/apply`, data),
  getApplications: (id) => apiClient.get(`/tasks/${id}/applications`),
  assignTasker: (taskId, taskerId) => apiClient.post(`/tasks/${taskId}/assign/${taskerId}`),
  acceptTask: (id) => apiClient.post(`/tasks/${id}/accept`),
  rejectTask: (id) => apiClient.post(`/tasks/${id}/reject`),
};

export const taskersAPI = {
  search: (params) => apiClient.get('/taskers/search', { params }),
  updateProfile: (data) => apiClient.put('/taskers/profile', data),
  uploadCertification: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.post('/taskers/certifications', formData);
  },
  uploadPortfolio: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.post('/taskers/portfolio', formData);
  },
  getApplications: () => apiClient.get('/taskers/applications'),
};

export const usersAPI = {
  updateProfile: (data) => apiClient.put('/users/profile', data),
  uploadProfileImage: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.post('/users/profile/image', formData);
  },
  getById: (id) => apiClient.get(`/users/${id}`),
};

export const reviewsAPI = {
  create: (data) => apiClient.post('/reviews', data),
  getByTasker: (taskerId) => apiClient.get(`/reviews/tasker/${taskerId}`),
};

export const locationAPI = {
  update: (data) => apiClient.post('/location/update', data),
  getTaskerLocation: (taskerId, taskId) => apiClient.get(`/location/tasker/${taskerId}/task/${taskId}`),
};

export const paymentsAPI = {
  create: (data) => apiClient.post('/payments', data),
  complete: (id) => apiClient.post(`/payments/${id}/complete`),
  getByTask: (taskId) => apiClient.get(`/payments/task/${taskId}`),
};
