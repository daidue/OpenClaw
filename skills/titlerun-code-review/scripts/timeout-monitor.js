#!/usr/bin/env node

/**
 * timeout-monitor.js - Monitor and kill reviewers that exceed timeout
 * 
 * This script is meant to be required as a module, not run standalone.
 * It provides a monitorTimeouts function that watches running reviewers.
 */

const TIMEOUT_MS = 10 * 60 * 1000;  // 10 minutes
const POLL_INTERVAL_MS = 30 * 1000;  // 30 seconds

/**
 * Monitor running reviewers and kill those that timeout
 * @param {Array} expectedReviewers - [{label: 'security-reviewer', sessionKey: '...'}]
 * @param {Function} onTimeout - Callback (reviewer) => void
 * @param {Function} subagentsKill - Function to kill subagent (sessionKey) => void
 * @param {Object} options - {timeoutMs, pollIntervalMs, outputCheckFn}
 * @returns {Function} stop - Call to stop monitoring
 */
function monitorTimeouts(expectedReviewers, onTimeout, subagentsKill, options = {}) {
  const {
    timeoutMs = TIMEOUT_MS,
    pollIntervalMs = POLL_INTERVAL_MS,
    outputCheckFn = null  // Function to check if output file exists
  } = options;

  const startTimes = {};
  const fs = require('fs');
  
  // Record start times
  expectedReviewers.forEach(r => {
    startTimes[r.sessionKey] = Date.now();
    console.log('[Timeout Monitor] Monitoring ' + r.label + ' (session: ' + r.sessionKey + ')');
  });
  
  let activeReviewers = [...expectedReviewers];
  
  const interval = setInterval(() => {
    const now = Date.now();
    
    // Check each reviewer
    activeReviewers.forEach(r => {
      const elapsed = now - startTimes[r.sessionKey];
      
      if (elapsed > timeoutMs) {
        console.warn('[Timeout] ' + r.label + ' exceeded ' + (timeoutMs/1000) + 's — checking for completion');
        
        // CRITICAL-1: Check for race condition - did reviewer just finish?
        if (outputCheckFn) {
          const outputInfo = outputCheckFn(r);
          if (outputInfo && outputInfo.exists) {
            const outputAge = now - outputInfo.mtime;
            if (outputAge < 5000) {  // Written in last 5 seconds
              console.log('[Timeout] ' + r.label + ' completed just before timeout — allowing');
              // Remove from active monitoring
              activeReviewers = activeReviewers.filter(rev => rev.sessionKey !== r.sessionKey);
              return;
            }
          }
        }
        
        // Otherwise, kill
        console.warn('[Timeout] Killing ' + r.label);
        try {
          subagentsKill(r.sessionKey);
        } catch (err) {
          console.error('Failed to kill ' + r.label + ':', err.message);
        }
        
        // Trigger error recovery
        onTimeout(r);
        
        // Remove from monitoring
        activeReviewers = activeReviewers.filter(rev => rev.sessionKey !== r.sessionKey);
      }
    });
    
    // Stop if all reviewers completed or timed out
    if (activeReviewers.length === 0) {
      console.log('[Timeout Monitor] All reviewers completed or timed out. Stopping monitor.');
      clearInterval(interval);
    }
  }, pollIntervalMs);
  
  // Return stop function
  return () => {
    console.log('[Timeout Monitor] Manually stopped');
    clearInterval(interval);
  };
}

module.exports = {monitorTimeouts, TIMEOUT_MS, POLL_INTERVAL_MS};

// Example usage (for testing)
if (require.main === module) {
  console.log('Timeout monitor module loaded');
  console.log('Default timeout: ' + (TIMEOUT_MS / 1000) + ' seconds');
  console.log('Default poll interval: ' + (POLL_INTERVAL_MS / 1000) + ' seconds');
  console.log('');
  console.log('Usage:');
  console.log('  const {monitorTimeouts} = require("./timeout-monitor.js");');
  console.log('  const stopMonitor = monitorTimeouts(reviewers, onTimeoutCallback, killFn);');
}
