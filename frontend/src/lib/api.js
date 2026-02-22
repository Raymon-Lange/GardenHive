import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
});

// Mutable ref so GardenContext can set the active garden owner
let _activeOwnerId = null;
export function setApiOwnerId(id) { _activeOwnerId = id; }

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('gh_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  if (_activeOwnerId) config.params = { ...(config.params || {}), ownerId: _activeOwnerId };
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('gh_token');
      localStorage.removeItem('gh_user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export function uploadUrl(filePath) {
  if (!filePath) return null;
  const base = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/api$/, '');
  return `${base}${filePath}`;
}

export default api;
