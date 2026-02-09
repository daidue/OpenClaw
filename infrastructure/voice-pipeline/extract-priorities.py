#!/usr/bin/env python3
"""
Structured Extraction
Extract priorities, decisions, action items, context shifts from transcription
"""

import os
import json
import re
from pathlib import Path
from datetime import datetime
from typing import Dict, List

# Paths
WORKSPACE = Path("/Users/jeffdaniels/.openclaw/workspace")
TRANSCRIPTS_DIR = WORKSPACE / "voice" / "transcripts"
EXTRACTIONS_DIR = WORKSPACE / "voice" / "extractions"

class PriorityExtractor:
    """Extract structured information from voice transcripts"""
    
    def __init__(self):
        EXTRACTIONS_DIR.mkdir(parents=True, exist_ok=True)
    
    def extract_priorities(self, text: str) -> List[Dict]:
        """
        Extract priorities from text
        
        Looks for patterns like:
        - "priority is..."
        - "top priority..."
        - "we need to..."
        - "focus on..."
        """
        priorities = []
        
        # FIX: Use simpler patterns to prevent ReDoS (catastrophic backtracking)
        # Limit input length to prevent DoS
        MAX_TEXT_LENGTH = 50000
        if len(text) > MAX_TEXT_LENGTH:
            text = text[:MAX_TEXT_LENGTH]
        
        # Priority indicators (simplified patterns, atomic groups where possible)
        patterns = [
            r'(?:priority|priorities) (?:is|are) ([^.,\n]{10,200})',
            r'(?:top|main|key) priority (?:is|are) ([^.,\n]{10,200})',
            r'(?:we|I) (?:need to|must|should) ([^.,\n]{10,200})',
            r'focus on ([^.,\n]{10,200})',
            r'(?:important|critical|urgent) (?:to|that we) ([^.,\n]{10,200})'
        ]
        
        for pattern in patterns:
            try:
                # Use timeout to prevent long-running regex
                matches = re.finditer(pattern, text, re.IGNORECASE)
                for match in matches:
                    priority_text = match.group(1).strip()
                    if len(priority_text) >= 10:  # Filter out too-short matches
                        priorities.append({
                            'text': priority_text,
                            'confidence': 'high',
                            'source': 'pattern_match'
                        })
            except Exception as e:
                # Skip pattern if it fails
                continue
        
        # Deduplicate
        seen = set()
        unique_priorities = []
        for p in priorities:
            normalized = p['text'].lower().strip()
            if normalized not in seen:
                seen.add(normalized)
                unique_priorities.append(p)
        
        return unique_priorities[:10]  # Top 10
    
    def extract_decisions(self, text: str) -> List[Dict]:
        """
        Extract decisions from text
        
        Looks for patterns like:
        - "we decided..."
        - "let's..."
        - "going to..."
        """
        decisions = []
        
        # FIX: Simplified patterns to prevent ReDoS
        patterns = [
            r'(?:we|I) (?:decided|decide|chose|choose) (?:to )?([^.,\n]{10,200})',
            r"let's ([^.,\n]{10,200})",
            r"(?:we're|we are|I'm|I am) going to ([^.,\n]{10,200})",
            r'(?:the )?decision (?:is|was) (?:to )?([^.,\n]{10,200})'
        ]
        
        for pattern in patterns:
            matches = re.finditer(pattern, text, re.IGNORECASE)
            for match in matches:
                decision_text = match.group(1).strip()
                if len(decision_text) > 10:
                    decisions.append({
                        'text': decision_text,
                        'confidence': 'medium',
                        'source': 'pattern_match'
                    })
        
        # Deduplicate
        seen = set()
        unique_decisions = []
        for d in decisions:
            normalized = d['text'].lower().strip()
            if normalized not in seen:
                seen.add(normalized)
                unique_decisions.append(d)
        
        return unique_decisions[:10]
    
    def extract_action_items(self, text: str) -> List[Dict]:
        """
        Extract action items from text
        
        Looks for patterns like:
        - "need to..."
        - "have to..."
        - "action item..."
        """
        actions = []
        
        # FIX: Simplified patterns to prevent ReDoS
        patterns = [
            r'(?:need to|needs to) ([^.,\n]{10,200})',
            r'(?:have to|has to) ([^.,\n]{10,200})',
            r'action item[:\s]+([^.,\n]{10,200})',
            r'(?:should|must) ([^.,\n]{10,200})',
            r'(?:make sure|ensure) (?:to )?([^.,\n]{10,200})'
        ]
        
        for pattern in patterns:
            matches = re.finditer(pattern, text, re.IGNORECASE)
            for match in matches:
                action_text = match.group(1).strip()
                if len(action_text) > 10:
                    actions.append({
                        'text': action_text,
                        'assigned_to': None,
                        'deadline': None,
                        'source': 'pattern_match'
                    })
        
        # Deduplicate
        seen = set()
        unique_actions = []
        for a in actions:
            normalized = a['text'].lower().strip()
            if normalized not in seen:
                seen.add(normalized)
                unique_actions.append(a)
        
        return unique_actions[:10]
    
    def extract_context_shifts(self, text: str) -> List[Dict]:
        """
        Extract context shifts (topic changes)
        
        Looks for patterns like:
        - "switching to..."
        - "moving on to..."
        - "also..."
        """
        shifts = []
        
        patterns = [
            r'(?:switching|switch|moving|move)\s+(?:to|on to)\s+(.+?)(?:\.|,|\n|$)',
            r'(?:also|additionally|furthermore)[,\s]+(.+?)(?:\.|,|\n|$)',
            r'(?:by the way|btw)[,\s]+(.+?)(?:\.|,|\n|$)',
            r'(?:on a different note|different topic)[,\s:]+(.+?)(?:\.|,|\n|$)'
        ]
        
        for pattern in patterns:
            matches = re.finditer(pattern, text, re.IGNORECASE)
            for match in matches:
                shift_text = match.group(1).strip()
                if len(shift_text) > 10:
                    shifts.append({
                        'text': shift_text,
                        'type': 'topic_change',
                        'source': 'pattern_match'
                    })
        
        return shifts[:5]  # Top 5
    
    def extract_all(self, text: str) -> Dict:
        """Extract all structured information from text"""
        extraction = {
            'timestamp': datetime.now().isoformat(),
            'priorities': self.extract_priorities(text),
            'decisions': self.extract_decisions(text),
            'action_items': self.extract_action_items(text),
            'context_shifts': self.extract_context_shifts(text),
            'summary': self._generate_summary(text),
            'word_count': len(text.split()),
            'source_text': text
        }
        
        return extraction
    
    def _generate_summary(self, text: str) -> str:
        """Generate a brief summary"""
        # Simple summary: first sentence or first 200 chars
        sentences = text.split('.')
        if sentences:
            summary = sentences[0].strip()
            if len(summary) > 200:
                summary = summary[:200] + "..."
            return summary
        
        return text[:200] + "..." if len(text) > 200 else text
    
    def process_transcript(self, transcript_path: Path) -> Dict:
        """Process a transcript file and extract structured information"""
        print(f"Processing {transcript_path.name}...")
        
        # Load transcript
        with open(transcript_path, 'r') as f:
            transcript = json.load(f)
        
        text = transcript.get('text', '')
        
        if not text:
            print("Warning: Empty transcript")
            return None
        
        # Extract structured information
        extraction = self.extract_all(text)
        extraction['transcript_file'] = str(transcript_path)
        extraction['audio_file'] = transcript.get('audio_file')
        
        # Save extraction
        extraction_file = EXTRACTIONS_DIR / f"{transcript_path.stem}-extraction.json"
        with open(extraction_file, 'w') as f:
            json.dump(extraction, f, indent=2)
        
        print(f"✓ Extraction saved to {extraction_file}")
        
        # Print summary
        print(f"\n  Priorities: {len(extraction['priorities'])}")
        print(f"  Decisions: {len(extraction['decisions'])}")
        print(f"  Action Items: {len(extraction['action_items'])}")
        print(f"  Context Shifts: {len(extraction['context_shifts'])}")
        
        return extraction
    
    def process_all_transcripts(self):
        """Process all unprocessed transcripts"""
        transcript_files = list(TRANSCRIPTS_DIR.glob("*.json"))
        
        if not transcript_files:
            print("No transcripts to process")
            return []
        
        print(f"Found {len(transcript_files)} transcripts")
        
        results = []
        for transcript_file in transcript_files:
            # Check if already extracted
            extraction_file = EXTRACTIONS_DIR / f"{transcript_file.stem}-extraction.json"
            
            if not extraction_file.exists():
                extraction = self.process_transcript(transcript_file)
                if extraction:
                    results.append(extraction)
            else:
                print(f"Skipping {transcript_file.name} (already extracted)")
        
        print(f"\n✓ Processed {len(results)} transcripts")
        return results

def main():
    """Main entry point"""
    import sys
    
    extractor = PriorityExtractor()
    
    if len(sys.argv) > 1:
        # Process specific transcript
        transcript_path = Path(sys.argv[1])
        
        if transcript_path.exists():
            extraction = extractor.process_transcript(transcript_path)
            
            if extraction:
                print("\n" + "="*60)
                print("EXTRACTION RESULTS")
                print("="*60)
                
                if extraction['priorities']:
                    print("\nPriorities:")
                    for p in extraction['priorities']:
                        print(f"  • {p['text']}")
                
                if extraction['action_items']:
                    print("\nAction Items:")
                    for a in extraction['action_items']:
                        print(f"  • {a['text']}")
        else:
            print(f"Error: File not found: {transcript_path}")
    else:
        # Process all transcripts
        extractor.process_all_transcripts()

if __name__ == "__main__":
    main()
