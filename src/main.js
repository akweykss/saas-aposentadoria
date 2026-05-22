import './styles/app.css';
import { initSteps } from './steps.js';
import { inject } from '@vercel/analytics';

// Initialize Vercel Web Analytics
inject();

document.addEventListener('DOMContentLoaded', () => {
  initSteps();
});
