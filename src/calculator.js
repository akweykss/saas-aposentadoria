/**
 * Estate & Medicaid Shield Calculator — Core Calculation Engine
 * Pure functions with no DOM dependencies.
 */

import { STATE_TAX_DATA } from './stateTaxData.js';

/**
 * Calculate all risk components.
 * @param {Object} input
 * @param {number} input.homeValue - Primary home value in USD
 * @param {number} input.liquidAssets - Liquid assets (IRAs, 401k, stocks, cash) in USD
 * @param {string} input.state - 2-letter US state code
 * @param {boolean} input.hasTrust - Whether user has a Living Trust
 * @param {boolean} input.isMarried - Whether user is married
 * @returns {Object} Calculated risk breakdown
 */
export function calculateRisk({ homeValue, liquidAssets, state, hasTrust, isMarried }) {
  const totalNetWorth = homeValue + liquidAssets;

  // Rule 1: Probate Cost
  const probateCost = hasTrust ? 0 : Math.round(totalNetWorth * 0.05);

  // Rule 2: Medicaid Risk (Nursing Home Spend-Down)
  let medicaidRisk;
  if (isMarried) {
    // Spousal Impoverishment Rules — spouse retains roughly half
    medicaidRisk = Math.round(liquidAssets * 0.50);
  } else {
    // Single/Widowed — can only retain $2,000
    medicaidRisk = Math.max(0, Math.round(liquidAssets - 2000));
  }

  // Rule 3: State Estate Tax
  let stateTax = 0;
  const stateData = STATE_TAX_DATA[state];
  if (stateData && totalNetWorth > stateData.threshold) {
    stateTax = Math.round((totalNetWorth - stateData.threshold) * stateData.rate);
  }

  // Total
  const totalAtRisk = probateCost + medicaidRisk + stateTax;

  // Risk level classification
  const riskPercentage = totalNetWorth > 0 ? (totalAtRisk / totalNetWorth) * 100 : 0;
  let riskLevel;
  if (riskPercentage < 10) {
    riskLevel = 'low';
  } else if (riskPercentage < 25) {
    riskLevel = 'moderate';
  } else if (riskPercentage < 45) {
    riskLevel = 'high';
  } else {
    riskLevel = 'critical';
  }

  return {
    totalNetWorth,
    probateCost,
    medicaidRisk,
    stateTax,
    totalAtRisk,
    riskPercentage: Math.round(riskPercentage * 10) / 10,
    riskLevel,
    stateHasTax: !!stateData,
    stateName: stateData?.name || null,
  };
}

/**
 * Format a number as USD currency string.
 * @param {number} value
 * @returns {string} e.g. "$1,234,567"
 */
export function formatCurrency(value) {
  if (value == null || isNaN(value)) return '$0';
  return '$' + Math.round(value).toLocaleString('en-US');
}

/**
 * Get risk level display properties.
 * @param {string} level - 'low' | 'moderate' | 'high' | 'critical'
 * @returns {Object} { label, color, badgeClass }
 */
export function getRiskDisplay(level) {
  const map = {
    low: { label: 'Low Risk', color: '#2ed573', badgeClass: 'badge-success' },
    moderate: { label: 'Moderate Risk', color: '#fbbf24', badgeClass: 'badge-warning' },
    high: { label: 'High Risk', color: '#ff9f43', badgeClass: 'badge-warning' },
    critical: { label: 'Critical Risk', color: '#ff4757', badgeClass: 'badge-danger' },
  };
  return map[level] || map.high;
}
