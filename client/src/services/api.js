import axios from 'axios';

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || '/api', withCredentials: true });

let refreshing = null;
api.interceptors.response.use(
  (r) => r,
  async (error) => {
    const { config, response } = error;
    const isAuthCall = config?.url?.startsWith('/auth/');
    if (response?.status === 401 && config && !config._retried && !isAuthCall) {
      config._retried = true;
      refreshing ||= api.post('/auth/refresh').finally(() => { refreshing = null; });
      try {
        await refreshing;
        return api(config);
      } catch { /* fall through */ }
    }
    return Promise.reject(error);
  },
);

export const errMsg = (e) => e?.response?.data?.message || e?.message || 'Something went wrong';
export const unwrap = (p) => p.then((r) => r.data.data);

export default api;
