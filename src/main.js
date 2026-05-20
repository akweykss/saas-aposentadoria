/**
 * Estate & Medicaid Shield Calculator — Entry Point
 */
import './styles/app.css';
import { initSteps } from './steps.js';
import { initParticles } from './components/particles.js';

document.addEventListener('DOMContentLoaded', () => {
  initParticles();
  initSteps();
});
