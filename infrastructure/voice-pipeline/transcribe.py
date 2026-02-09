#!/usr/bin/env python3
"""
Voice Transcription
Accept voice notes via Telegram
Transcribe using Whisper (local) or WisprFlow
"""

import os
import json
from pathlib import Path
from datetime import datetime
from typing import Optional, Dict

# Paths
WORKSPACE = Path("/Users/jeffdaniels/.openclaw/workspace")
VOICE_DIR = WORKSPACE / "voice" / "incoming"
TRANSCRIPTS_DIR = WORKSPACE / "voice" / "transcripts"

# FIX: Singleton pattern for Whisper model to avoid loading multiple times
_WHISPER_MODEL = None
_WHISPER_METHOD = None

def get_whisper_model():
    """Get or create singleton Whisper model (lazy loading)"""
    global _WHISPER_MODEL, _WHISPER_METHOD
    if _WHISPER_MODEL is None:
        try:
            import whisper
            print("Loading Whisper model (base) - this may take a few seconds...")
            _WHISPER_MODEL = whisper.load_model("base")
            _WHISPER_METHOD = 'whisper'
            print("✓ Whisper model loaded and cached")
        except ImportError:
            print("Warning: Whisper not installed")
            print("Install with: pip3 install openai-whisper")
            _WHISPER_MODEL = None
            _WHISPER_METHOD = None
    return _WHISPER_MODEL, _WHISPER_METHOD

class VoiceTranscriber:
    """Transcribe voice notes to text"""
    
    def __init__(self, method: str = 'whisper'):
        """
        Initialize transcriber
        
        Args:
            method: 'whisper' (local) or 'wisprflow' (if available)
        """
        self.method = method
        VOICE_DIR.mkdir(parents=True, exist_ok=True)
        TRANSCRIPTS_DIR.mkdir(parents=True, exist_ok=True)
        # FIX: Don't load model on init - use lazy loading via singleton
        self.model = None
    
    def transcribe_file(self, audio_path: Path) -> Optional[Dict]:
        """
        Transcribe an audio file
        
        Returns:
            Dict with 'text', 'language', 'confidence' if successful
        """
        if not audio_path.exists():
            print(f"Error: Audio file not found: {audio_path}")
            return None
        
        print(f"Transcribing {audio_path.name}...")
        
        try:
            if self.method == 'whisper':
                # FIX: Lazy load model on first use via singleton
                self.model, method = get_whisper_model()
                if self.model is None:
                    print("Error: Whisper model not available")
                    return None
                
                result = self.model.transcribe(str(audio_path))
                
                transcript = {
                    'text': result['text'].strip(),
                    'language': result.get('language', 'en'),
                    'segments': result.get('segments', []),
                    'method': 'whisper',
                    'timestamp': datetime.now().isoformat()
                }
                
                print(f"✓ Transcribed: {transcript['text'][:100]}...")
                return transcript
            
            elif self.method == 'wisprflow':
                # Placeholder for WisprFlow integration
                print("WisprFlow integration not yet implemented")
                return None
            
            else:
                print("No transcription method available")
                return None
        
        except Exception as e:
            print(f"Error during transcription: {e}")
            return None
    
    def save_transcript(self, audio_path: Path, transcript: Dict) -> Path:
        """Save transcript to file"""
        # Create transcript filename
        audio_name = audio_path.stem
        timestamp = datetime.now().strftime("%Y%m%d-%H%M%S")
        transcript_file = TRANSCRIPTS_DIR / f"{timestamp}-{audio_name}.json"
        
        # Add metadata
        transcript['audio_file'] = str(audio_path)
        transcript['audio_filename'] = audio_path.name
        
        # Save
        with open(transcript_file, 'w') as f:
            json.dump(transcript, f, indent=2)
        
        print(f"✓ Transcript saved to {transcript_file}")
        
        # Also save plain text version
        text_file = transcript_file.with_suffix('.txt')
        with open(text_file, 'w') as f:
            f.write(transcript['text'])
        
        return transcript_file
    
    def process_voice_note(self, audio_path: Path) -> Optional[Dict]:
        """
        Full pipeline: transcribe and save
        
        Returns:
            Transcript dict if successful
        """
        transcript = self.transcribe_file(audio_path)
        
        if transcript:
            transcript_file = self.save_transcript(audio_path, transcript)
            transcript['transcript_file'] = str(transcript_file)
            return transcript
        
        return None
    
    def process_incoming(self):
        """Process all voice notes in incoming directory"""
        audio_files = list(VOICE_DIR.glob("*.mp3")) + \
                     list(VOICE_DIR.glob("*.m4a")) + \
                     list(VOICE_DIR.glob("*.ogg")) + \
                     list(VOICE_DIR.glob("*.wav"))
        
        if not audio_files:
            print("No voice notes to process")
            return []
        
        print(f"Found {len(audio_files)} voice notes to process")
        
        results = []
        for audio_file in audio_files:
            result = self.process_voice_note(audio_file)
            if result:
                results.append(result)
                
                # Move to processed
                processed_dir = WORKSPACE / "voice" / "processed"
                processed_dir.mkdir(parents=True, exist_ok=True)
                audio_file.rename(processed_dir / audio_file.name)
        
        print(f"✓ Processed {len(results)} voice notes")
        return results

def main():
    """Main entry point"""
    import sys
    
    transcriber = VoiceTranscriber(method='whisper')
    
    if len(sys.argv) > 1:
        # Transcribe specific file
        audio_path = Path(sys.argv[1])
        
        if audio_path.exists():
            transcript = transcriber.process_voice_note(audio_path)
            
            if transcript:
                print("\nTranscript:")
                print("="*60)
                print(transcript['text'])
                print("="*60)
        else:
            print(f"Error: File not found: {audio_path}")
    else:
        # Process all incoming voice notes
        results = transcriber.process_incoming()
        
        if results:
            print("\nTranscripts:")
            for i, result in enumerate(results, 1):
                print(f"\n{i}. {result['audio_filename']}")
                print(f"   {result['text'][:100]}...")

if __name__ == "__main__":
    main()
