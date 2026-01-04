import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Video Generation API
export const generateVideo = async (formData) => {
  const response = await api.post('/api/generate', formData);
  return response.data;
};

export const uploadCustomImage = async (file) => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await api.post('/api/upload-custom-image', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  return response.data;
};

// Jobs API
export const getJobs = async () => {
  const response = await api.get('/api/jobs');
  return response.data;
};

export const getJob = async (jobId) => {
  const response = await api.get(`/api/jobs/${jobId}`);
  return response.data;
};

export const deleteJob = async (jobId) => {
  const response = await api.delete(`/api/jobs/${jobId}`);
  return response.data;
};

// Environment API
export const getKieApiKey = async () => {
  const response = await api.get('/api/env/kie-api-key');
  return response.data;
};

export const updateKieApiKey = async (apiKey) => {
  const response = await api.put('/api/env/kie-api-key', { api_key: apiKey });
  return response.data;
};

export default api;
