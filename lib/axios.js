/* FILE: lib/axios.js */
import axios from 'axios';

const MICROSERVICE_URL = process.env.MICROSERVICE_URL || "http://localhost:8000";

// Create a new Axios instance with a base URL.
// All requests made with this instance will be prefixed with '/api'.
export const internalAxios = axios.create({
  baseURL: `/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Calls to the certificate microservice carry a shared internal token that
// the service verifies with a timing-safe compare before queueing a job.
export const microserviceAxios = axios.create({
  baseURL: MICROSERVICE_URL,
  headers: {
    'Content-Type': 'application/json',
    'X-Internal-Token': process.env.MICROSERVICE_TOKEN || '',
  },
})

