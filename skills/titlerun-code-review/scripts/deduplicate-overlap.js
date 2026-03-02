#!/usr/bin/env node

/**
 * deduplicate-overlap.js - Remove duplicate findings in chunk overlap zones
 * 
 * When chunks overlap (e.g., chunk1 ends at line 750, chunk2 starts at line 701),
 * the same issue may be reported by the same reviewer in both chunks.
 * This script removes duplicates, keeping the first occurrence.
 */

const OVERLAP_LINES = 50;
const DUPLICATE_LINE_THRESHOLD = 5;  // Lines within ±5 considered same location

/**
 * Deduplicate findings across chunks
 * @param {Array} chunkResults - [{chunkId, reviewer, findings: [{line, category, message}]}]
 * @param {Array} chunks - [{id, startLine, endLine}] from manifest
 * @returns {Array} Deduplicated findings
 */
function deduplicateOverlap(chunkResults, chunks) {
  const allFindings = [];
  
  // Collect all findings with chunk metadata
  chunkResults.forEach(result => {
    const chunk = chunks.find(c => c.id === result.chunkId);
    if (!chunk) {
      console.warn('Warning: Chunk ' + result.chunkId + ' not found in manifest');
      return;
    }
    
    result.findings.forEach(finding => {
      allFindings.push({
        ...finding,
        chunkId: result.chunkId,
        reviewer: result.reviewer,
        chunkStart: chunk.startLine,
        chunkEnd: chunk.endLine
      });
    });
  });
  
  console.log('Total findings before deduplication: ' + allFindings.length);
  
  // Sort by line number
  allFindings.sort((a, b) => a.line - b.line);
  
  const deduplicated = [];
  const seen = new Map();  // Key: "reviewer:line:category" → finding
  
  allFindings.forEach(finding => {
    // Check if this is a duplicate
    let isDuplicate = false;
    
    for (const [key, existingFinding] of seen.entries()) {
      const [existingReviewer, existingLine, existingCategory] = key.split(':');
      
      // Same reviewer, same category, similar line number?
      if (
        finding.reviewer === existingReviewer &&
        finding.category === existingCategory &&
        Math.abs(finding.line - parseInt(existingLine)) <= DUPLICATE_LINE_THRESHOLD
      ) {
        // Check if they're in overlap zone of adjacent chunks
        const inOverlap = isInOverlapZone(finding, existingFinding, chunks);
        
        if (inOverlap) {
          console.log('  Duplicate: ' + finding.reviewer + ' line ' + finding.line + 
                     ' (chunk ' + finding.chunkId + ') matches line ' + existingLine + 
                     ' (chunk ' + existingFinding.chunkId + ')');
          isDuplicate = true;
          break;
        }
      }
    }
    
    if (!isDuplicate) {
      const key = finding.reviewer + ':' + finding.line + ':' + finding.category;
      seen.set(key, finding);
      deduplicated.push(finding);
    }
  });
  
  console.log('Total findings after deduplication: ' + deduplicated.length);
  console.log('Removed ' + (allFindings.length - deduplicated.length) + ' duplicates');
  
  return deduplicated;
}

/**
 * Check if two findings are in overlap zone of adjacent chunks
 */
function isInOverlapZone(finding1, finding2, chunks) {
  const chunk1 = chunks.find(c => c.id === finding1.chunkId);
  const chunk2 = chunks.find(c => c.id === finding2.chunkId);
  
  if (!chunk1 || !chunk2 || chunk1.id === chunk2.id) {
    return false;
  }
  
  // Check if chunks are adjacent
  const overlapStart = Math.max(chunk1.startLine, chunk2.startLine);
  const overlapEnd = Math.min(chunk1.endLine, chunk2.endLine);
  
  if (overlapEnd < overlapStart) {
    return false;  // Chunks don't overlap
  }
  
  // Check if both findings are in the overlap zone
  const inOverlap1 = finding1.line >= overlapStart && finding1.line <= overlapEnd;
  const inOverlap2 = finding2.line >= overlapStart && finding2.line <= overlapEnd;
  
  return inOverlap1 && inOverlap2;
}

module.exports = {deduplicateOverlap};

// Example usage
if (require.main === module) {
  console.log('Overlap deduplication module loaded');
  console.log('Usage:');
  console.log('  const {deduplicateOverlap} = require("./deduplicate-overlap.js");');
  console.log('  const unique = deduplicateOverlap(chunkResults, chunks);');
}
