#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

function chunkFile(filePath, options = {}) {
  const {
    chunkSize = 700,
    minChunkSize = 600,
    maxChunkSize = 800,
    overlap = 50,
    outputDir = path.join(path.dirname(filePath), '.chunks')
  } = options;

  if (!fs.existsSync(filePath)) {
    throw new Error('File not found: ' + filePath);
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');

  console.log('Chunking file: ' + filePath);
  console.log('Total lines: ' + lines.length);

  // Find natural boundaries
  const boundaryPatterns = [
    /^(export\s+)?(async\s+)?function\s*\*?\s*\w+/,
    /^(export\s+)?class\s+\w+/,
    /^(export\s+)?const\s+\w+\s*=\s*(async\s+)?\(/,
    /^(export\s+)?const\s+\w+\s*=\s*\([^)]*\)\s*=>/,
    /^(export\s+)?(abstract\s+)?class\s+\w+/,
    /^(export\s+)?interface\s+\w+/,
    /^(export\s+)?type\s+\w+/,
    /^\s+(async\s+)?\w+\s*\([^)]*\)\s*[{:]/,
    /^\(function/
  ];

  const boundaries = lines.map((line, i) => {
    if (boundaryPatterns.some(pattern => pattern.test(line.trim()))) {
      return i + 1; // 1-indexed
    }
    return null;
  }).filter(x => x !== null);

  console.log('Found ' + boundaries.length + ' natural boundaries');

  // Build chunks
  const chunks = [];
  let chunkStart = 1;
  let lastBoundary = 1;

  while (chunkStart < lines.length) {
    // Find the best boundary within target range
    const idealEnd = chunkStart + chunkSize;
    const maxEnd = chunkStart + maxChunkSize;
    
    // Find boundaries in range [chunkStart, maxEnd]
    const candidateBoundaries = boundaries.filter(b => 
      b > chunkStart && b <= maxEnd
    );
    
    let chunkEnd;
    
    if (candidateBoundaries.length > 0) {
      // Use natural boundary closest to idealEnd
      chunkEnd = candidateBoundaries.reduce((prev, curr) => {
        return Math.abs(curr - idealEnd) < Math.abs(prev - idealEnd) ? curr : prev;
      });
    } else {
      // No natural boundary available - use max size
      chunkEnd = Math.min(maxEnd, lines.length);
    }
    
    // Make sure chunk is not too small (unless it's the last chunk)
    if (chunkEnd - chunkStart < minChunkSize && chunkEnd < lines.length) {
      chunkEnd = Math.min(chunkStart + chunkSize, lines.length);
    }
    
    chunks.push({
      startLine: chunkStart,
      endLine: chunkEnd
    });
    
    // Next chunk starts with overlap
    chunkStart = chunkEnd - overlap + 1;
    
    // Don't let overlap push us backwards
    if (chunkStart <= lastBoundary) {
      chunkStart = chunkEnd + 1;
    }
    
    lastBoundary = chunkEnd;
  }

  console.log('Created ' + chunks.length + ' chunks');

  fs.mkdirSync(outputDir, {recursive: true});
  
  const chunkFiles = chunks.map((chunk, idx) => {
    const chunkId = 'chunk-' + (idx + 1);
    const chunkPath = path.join(outputDir, chunkId + '.txt');
    
    const chunkLines = lines.slice(chunk.startLine - 1, chunk.endLine);
    const chunkContent = chunkLines.join('\n');
    
    fs.writeFileSync(chunkPath, chunkContent, 'utf-8');
    
    const info = {
      id: chunkId,
      path: chunkPath,
      startLine: chunk.startLine,
      endLine: chunk.endLine,
      lineCount: chunk.endLine - chunk.startLine + 1
    };

    console.log('  ' + chunkId + ': lines ' + info.startLine + '-' + info.endLine + ' (' + info.lineCount + ' lines)');
    
    return info;
  });

  const manifest = {
    originalFile: filePath,
    totalLines: lines.length,
    chunkCount: chunkFiles.length,
    chunks: chunkFiles,
    options: {chunkSize, minChunkSize, maxChunkSize, overlap},
    timestamp: new Date().toISOString()
  };

  const manifestPath = path.join(outputDir, 'manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');

  console.log('Manifest written: ' + manifestPath);

  return {chunks: chunkFiles, manifest: manifestPath};
}

if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.error('Usage: node chunk-file.js <file-path>');
    process.exit(1);
  }
  
  const filePath = args[0];
  const options = {};
  
  args.slice(1).forEach(arg => {
    if (arg.startsWith('--')) {
      const [key, value] = arg.slice(2).split('=');
      const optKey = key.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
      options[optKey] = isNaN(value) ? value : parseInt(value);
    }
  });
  
  try {
    const result = chunkFile(filePath, options);
    console.log('\n✅ Chunking complete!');
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

module.exports = {chunkFile};
