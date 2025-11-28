/* FILE: lib/axios.js (Create this new file) */
import axios from 'axios';

const MICROSERVICE_URL = process.env.MICROSERVICE_URL || "http://localhost:8000";
const NEXTJS_APP_URL = process.env.NEXTAUTH_URL || "http://localhost:3000";
const INTERNAL_API_URL = process.env.INTERNAL_API_URL || 'http://localhost:3000'

// Create a new Axios instance with a base URL.
// All requests made with this instance will be prefixed with '/api'.
export const internalAxios = axios.create({
  baseURL: `/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});
export const microserviceAxios = axios.create({
  baseURL: MICROSERVICE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

export const GeneralAxios = axios.create()

