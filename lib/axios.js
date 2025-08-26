/* FILE: lib/axios.js (Create this new file) */
import axios from 'axios';

// Create a new Axios instance with a base URL.
// All requests made with this instance will be prefixed with '/api'.
const axiosInstance = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

export default axiosInstance;
