import React from 'react';
import ReactDOM from 'react-dom/client';
import axios from 'axios';
import App from './App';

// In dev, CRA's "proxy" field forwards /api to localhost:5000.
// In production (Vercel), the frontend is a static build with no proxy,
// so every request needs an absolute base URL pointing at the deployed backend.
axios.defaults.baseURL = process.env.REACT_APP_API_URL || '';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<React.StrictMode><App /></React.StrictMode>);
