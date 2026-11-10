import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 60000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Clear token if expired or invalid
      // localStorage.removeItem('token');
    }
    return Promise.reject(error);
  }
);

// Auth
export const loginUser = (credentials) => api.post('/auth/login', credentials);
export const registerUser = (userData) => api.post('/auth/register', userData);
export const getMe = () => api.get('/auth/me');

// System
export const getHealth = () => api.get('/health');
export const getModelStatus = () => api.get('/models/status');

// Patients
export const getPatients = (search = '') => api.get(`/patients${search ? `?search=${encodeURIComponent(search)}` : ''}`);
export const getPatient = (id) => api.get(`/patients/${id}`);
export const createPatient = (data) => api.post('/patients', data);
export const updatePatient = (id, data) => api.put(`/patients/${id}`, data);
export const deletePatient = (id) => api.delete(`/patients/${id}`);

// Analysis
export const predictLesion = (formData) => api.post('/analysis/predict', formData, {
  headers: { 'Content-Type': 'multipart/form-data' }
});
export const getAnalysis = (id) => api.get(`/analysis/${id}`);
export const getPatientAnalyses = (patientId) => api.get(`/analysis/patient/${patientId}`);
export const linkAnalysisToPatient = (analysisId, data) => api.put(`/analysis/${analysisId}/link`, data);

// Monitoring
export const compareMonitoring = (formData) => api.post('/monitoring/compare', formData, {
  headers: { 'Content-Type': 'multipart/form-data' }
});
export const getMonitoringSession = (id) => api.get(`/monitoring/${id}`);
export const getPatientMonitoring = (patientId) => api.get(`/monitoring/patient/${patientId}`);

// History & Dashboard
export const getDashboardStats = () => api.get('/history/dashboard');
export const getAllHistory = () => api.get('/history');
export const getPatientHistory = (patientId) => api.get(`/history/patient/${patientId}`);

// Reports Download helper
export const downloadAnalysisReport = (analysisId) => {
  window.open(`/api/reports/analysis/${analysisId}`, '_blank');
};

export const downloadMonitoringReport = (monitoringId) => {
  window.open(`/api/reports/monitoring/${monitoringId}`, '_blank');
};

export default api;

