/* FILE: lib/axios.js */
import axios from 'axios';

// Client-side instance: all requests are prefixed with '/api' (relative to the
// browser origin). Server-side calls use native fetch instead (see
// lib/certificateRender.js and the admin/dashboard server components), which
// avoids axios's Node adapter pulling in the deprecated url.parse path.
export const internalAxios = axios.create({
  baseURL: `/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

