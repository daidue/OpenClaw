#!/usr/bin/env python3
"""
Health check system for all infrastructure components
"""

import json
import sys
from pathlib import Path
from datetime import datetime, timedelta
from typing import Dict, List

WORKSPACE = Path("/Users/jeffdaniels/.openclaw/workspace")
VECTOR_DIR = WORKSPACE / "memory" / "vector"
MEMORY_DIR = WORKSPACE / "memory" / "hourly"
FEEDBACK_DIR = WORKSPACE / "feedback"
LOG_DIR = WORKSPACE / "logs" / "cron"

class HealthChecker:
    """Health check for infrastructure components"""
    
    def __init__(self):
        self.checks = []
        self.status = "healthy"
    
    def check_vector_memory(self) -> Dict:
        """Check if vector memory system is healthy"""
        index_file = VECTOR_DIR / "faiss.index"
        metadata_file = VECTOR_DIR / "metadata.pkl"
        
        if not index_file.exists():
            return {
                'component': 'vector_memory',
                'status': 'warning',
                'message': 'FAISS index not found - no memories stored yet'
            }
        
        # Check file age
        index_age = datetime.now().timestamp() - index_file.stat().st_mtime
        if index_age > 7 * 24 * 60 * 60:  # Older than 7 days
            return {
                'component': 'vector_memory',
                'status': 'warning',
                'message': f'FAISS index not updated in {index_age / 86400:.1f} days'
            }
        
        # Check metadata
        if not metadata_file.exists():
            return {
                'component': 'vector_memory',
                'status': 'error',
                'message': 'Metadata file missing - index corrupted'
            }
        
        return {
            'component': 'vector_memory',
            'status': 'healthy',
            'message': f'Index size: {index_file.stat().st_size / 1024:.1f} KB',
            'last_updated': datetime.fromtimestamp(index_file.stat().st_mtime).isoformat()
        }
    
    def check_hourly_summaries(self) -> Dict:
        """Check if hourly summarizer is running"""
        today = datetime.now().strftime("%Y-%m-%d")
        summary_file = MEMORY_DIR / f"{today}.md"
        
        if not summary_file.exists():
            return {
                'component': 'hourly_summaries',
                'status': 'warning',
                'message': 'No summaries today yet'
            }
        
        # Check file age (should update every hour during active hours)
        file_age_seconds = datetime.now().timestamp() - summary_file.stat().st_mtime
        hour = datetime.now().hour
        
        # If during active hours (8am-10pm) and no update in >2 hours
        if 8 <= hour <= 22 and file_age_seconds > 7200:
            return {
                'component': 'hourly_summaries',
                'status': 'error',
                'message': f'No update in {file_age_seconds / 3600:.1f} hours (cron may be down)'
            }
        
        return {
            'component': 'hourly_summaries',
            'status': 'healthy',
            'message': f'Last update {file_age_seconds / 60:.0f} minutes ago'
        }
    
    def check_feedback_system(self) -> Dict:
        """Check if feedback system is operational"""
        current_week = datetime.now().isocalendar()[1]
        week_id = f"{datetime.now().year}-W{current_week:02d}"
        feedback_file = FEEDBACK_DIR / f"feedback-{week_id}.json"
        
        if not feedback_file.exists():
            return {
                'component': 'feedback_system',
                'status': 'info',
                'message': 'No feedback this week yet'
            }
        
        # Load and check
        try:
            with open(feedback_file, 'r') as f:
                data = json.load(f)
                total = data.get('total', 0)
                
                return {
                    'component': 'feedback_system',
                    'status': 'healthy',
                    'message': f'{total} feedback entries this week'
                }
        except json.JSONDecodeError:
            return {
                'component': 'feedback_system',
                'status': 'error',
                'message': 'Feedback file corrupted'
            }
    
    def check_cron_logs(self) -> Dict:
        """Check if cron jobs are running"""
        if not LOG_DIR.exists():
            return {
                'component': 'cron_system',
                'status': 'error',
                'message': 'Cron log directory missing - jobs may not be running'
            }
        
        # Check for recent log entries
        recent_logs = []
        cutoff_time = datetime.now() - timedelta(hours=3)
        
        for log_file in LOG_DIR.glob("*.log"):
            if log_file.stat().st_mtime > cutoff_time.timestamp():
                recent_logs.append(log_file.name)
        
        if not recent_logs:
            return {
                'component': 'cron_system',
                'status': 'warning',
                'message': 'No cron activity in last 3 hours'
            }
        
        return {
            'component': 'cron_system',
            'status': 'healthy',
            'message': f'{len(recent_logs)} jobs ran recently'
        }
    
    def check_disk_space(self) -> Dict:
        """Check available disk space"""
        import shutil
        
        total, used, free = shutil.disk_usage(WORKSPACE)
        percent_used = (used / total) * 100
        
        if percent_used > 95:
            status = 'error'
            message = 'Critical: Disk almost full'
        elif percent_used > 85:
            status = 'warning'
            message = 'Warning: Disk space running low'
        else:
            status = 'healthy'
            message = f'{free / (1024**3):.1f} GB free'
        
        return {
            'component': 'disk_space',
            'status': status,
            'message': message,
            'percent_used': f'{percent_used:.1f}%'
        }
    
    def run_all_checks(self) -> Dict:
        """Run all health checks and return status"""
        checks = [
            self.check_vector_memory(),
            self.check_hourly_summaries(),
            self.check_feedback_system(),
            self.check_cron_logs(),
            self.check_disk_space()
        ]
        
        # Determine overall status
        if any(c['status'] == 'error' for c in checks):
            overall_status = 'unhealthy'
        elif any(c['status'] == 'warning' for c in checks):
            overall_status = 'degraded'
        else:
            overall_status = 'healthy'
        
        return {
            'timestamp': datetime.now().isoformat(),
            'overall_status': overall_status,
            'checks': checks
        }
    
    def print_report(self, health_data: Dict):
        """Print health check report"""
        print("\n" + "="*60)
        print("INFRASTRUCTURE HEALTH CHECK")
        print("="*60)
        print(f"\nTimestamp: {health_data['timestamp']}")
        print(f"Overall Status: {health_data['overall_status'].upper()}\n")
        
        for check in health_data['checks']:
            status = check['status']
            symbol = {
                'healthy': '✓',
                'info': 'ℹ',
                'warning': '⚠',
                'error': '✗'
            }.get(status, '?')
            
            print(f"{symbol} {check['component'].replace('_', ' ').title()}: {check['message']}")
        
        print("\n" + "="*60 + "\n")

def main():
    """Run health checks"""
    checker = HealthChecker()
    health_data = checker.run_all_checks()
    
    # Print report
    checker.print_report(health_data)
    
    # Save to file
    health_file = WORKSPACE / "logs" / "health" / f"health-{datetime.now().strftime('%Y%m%d-%H%M%S')}.json"
    health_file.parent.mkdir(parents=True, exist_ok=True)
    
    with open(health_file, 'w') as f:
        json.dump(health_data, f, indent=2)
    
    # Exit with appropriate code
    if health_data['overall_status'] == 'unhealthy':
        sys.exit(1)
    elif health_data['overall_status'] == 'degraded':
        sys.exit(2)
    else:
        sys.exit(0)

if __name__ == "__main__":
    main()
