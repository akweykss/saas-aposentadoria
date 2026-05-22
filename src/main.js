import './styles/app.css';
import { initSteps } from './steps.js';
import { inject } from '@vercel/analytics';

// Ativa Vercel Analytics (page views, visitors, etc.)
inject();

document.addEventListener('DOMContentLoaded', () => {
  initSteps();
});
