# Autonomy Operational Governance Framework
**Atlas (Ops) — Infrastructure & Safety Analysis**  
Date: 2026-02-10  
Status: Draft for Review

---

## Executive Summary

Autonomous agent operations require layered safety controls: automated recovery, hard resource limits, comprehensive audit trails, real-time monitoring, and a kill switch protocol. This document provides **concrete configuration values** for each governance dimension.

---

## 1. Failure Recovery

### Automated Rollback Systems

#### Git Operations
```yaml
recovery:
  git:
    auto_snapshot_before_commit: true
    snapshot_retention_days: 7
    rollback_command: "git reset --hard HEAD@{1}"
    max_auto_rollback_attempts: 3
    
    # If agent commits break tests
    post_commit_checks:
      - run: "npm test"
        timeout_seconds: 300
        on_fail: auto_revert
      - run: "npm run build"
        timeout_seconds: 180
        on_fail: alert_and_hold
```

#### File Operations
```yaml
recovery:
  filesystem:
    snapshot_schedule: "0 * * * *"  # Hourly
    snapshot_retention:
      hourly: 24    # Keep 24 hourly snapshots
      daily: 7      # Keep 7 daily snapshots
      weekly: 4     # Keep 4 weekly snapshots
    
    snapshot_paths:
      - ~/.openclaw/workspace/
      - ~/.openclaw/memory/
      - ~/projects/
    
    # Before destructive operations
    pre_operation_snapshot:
      triggers:
        - rm
        - trash
        - overwrite_file_larger_than: 100kb
      
    # Quick restore command
    restore_command: "openclaw recovery restore --snapshot {{snapshot_id}}"
```

#### Process Failures
```yaml
recovery:
  processes:
    # Auto-kill runaway processes
    resource_limits:
      cpu_percent_max: 80
      memory_mb_max: 2048
      runtime_minutes_max: 30
      
    kill_on_exceed:
      enabled: true
      grace_period_seconds: 10  # SIGTERM, then SIGKILL
      
    # Restart policies
    restart:
      max_attempts: 3
      backoff_seconds: [5, 15, 60]  # Exponential backoff
      on_third_failure: alert_human
```

#### Deployment Rollback
```yaml
recovery:
  deployments:
    sandbox:
      pre_deploy_snapshot: true
      health_check_timeout: 60
      auto_rollback_on_failure: true
      
    production:
      pre_deploy_snapshot: required
      health_check_timeout: 120
      auto_rollback_on_failure: true
      rollback_requires_approval: false  # Safety first
      
    health_checks:
      - http_200: "{{deploy_url}}/health"
      - response_time_ms_max: 500
      - error_rate_percent_max: 5
      
    rollback_command: |
      git revert {{commit_sha}}
      kubectl rollout undo deployment/{{service_name}}
      openclaw notify --priority critical "Deployment auto-rolled back"
```

#### Database Operations
```yaml
recovery:
  database:
    # Agents should NEVER touch production DB directly
    production_access: false
    
    sandbox_db:
      pre_migration_backup: required
      backup_retention_days: 14
      auto_rollback_on_error: true
      
    backup_command: |
      pg_dump {{db_name}} > /backup/{{timestamp}}_pre_migration.sql
```

---

## 2. Resource Governance

### Token Budgets (per agent per day)

```yaml
token_budgets:
  # Daily limits by agent tier
  tier_1_agents:  # Scout, Bolt, Archivist
    tokens_per_day: 1_000_000      # ~$3/day @ $3/M tokens
    burst_limit: 200_000           # Max in single request
    alert_at_percent: 80
    
  tier_2_agents:  # Atlas (me), Nova
    tokens_per_day: 500_000        # ~$1.50/day
    burst_limit: 100_000
    alert_at_percent: 80
    
  tier_3_agents:  # Future experimental agents
    tokens_per_day: 100_000        # ~$0.30/day
    burst_limit: 25_000
    alert_at_percent: 75
    
  # Sub-agents inherit parent's budget
  subagents:
    inherit_from_parent: true
    max_depth: 3                   # No sub-sub-sub-agents
    total_subagent_budget_percent: 30  # Can't spend >30% on subagents
    
  # Rollover policy
  unused_tokens:
    rollover: false                # Reset daily, don't accumulate
    reason: "Prevents hoarding for big unauthorized actions"
```

### API Rate Limits

```yaml
rate_limits:
  # Per agent, per endpoint
  anthropic_api:
    requests_per_minute: 50
    requests_per_hour: 1000
    concurrent_requests: 5
    
  openai_api:
    requests_per_minute: 60
    requests_per_day: 10000
    
  external_apis:
    default_rpm: 30
    whitelist_higher_limits:
      - endpoint: "github.com/api"
        rpm: 100
      - endpoint: "vercel.com/api"
        rpm: 50
        
  # Backoff strategy
  on_rate_limit:
    strategy: exponential_backoff
    initial_wait_seconds: 5
    max_wait_seconds: 300
    max_retries: 3
    on_max_retries: fail_gracefully_and_alert
```

### Disk Space

```yaml
disk_quotas:
  workspace:
    max_size_gb: 10
    warn_at_gb: 8
    action_on_exceed: prevent_new_writes
    
  memory_logs:
    max_size_mb: 500
    rotation_policy: daily
    retention_days: 30
    compression: gzip
    
  cache:
    max_size_gb: 5
    eviction_policy: lru
    auto_cleanup: true
    
  temp_files:
    max_age_hours: 24
    auto_cleanup_schedule: "0 3 * * *"  # 3 AM daily
    
  # Agent-specific quotas
  per_agent_quotas:
    scout: 2gb      # Research/data heavy
    bolt: 3gb       # Code artifacts
    archivist: 1gb  # Logs/summaries
    atlas: 2gb      # Infrastructure configs
```

### Process Limits

```yaml
process_limits:
  per_agent:
    max_concurrent_processes: 5
    max_background_jobs: 3
    max_subagent_sessions: 2
    
  system_wide:
    total_agent_processes: 20
    cpu_percent_total: 60     # Leave 40% for system/human
    memory_gb_total: 8        # On 16GB system
    
  individual_process:
    cpu_percent_max: 25
    memory_mb_max: 2048
    runtime_max_minutes: 30
    file_descriptors_max: 1024
    
  enforcement:
    check_interval_seconds: 30
    kill_on_exceed: true
    alert_on_kill: true
```

### Network Limits

```yaml
network_limits:
  bandwidth:
    upload_mbps_max: 5
    download_mbps_max: 20
    
  connections:
    concurrent_outbound: 10
    whitelist_domains:
      - "*.anthropic.com"
      - "*.github.com"
      - "*.vercel.com"
      - "*.brave.com"
      
  blocked_actions:
    - port_scanning
    - mass_email_send  # >10 emails/hour
    - websocket_spam   # >100 messages/minute
```

---

## 3. Audit Trail Requirements

### Required Fields (Every Autonomous Action)

```yaml
audit_log_schema:
  required_fields:
    # Identity
    agent_id: string              # "atlas", "scout", etc.
    session_id: string            # Unique session UUID
    subagent_depth: integer       # 0=main, 1=sub, 2=sub-sub
    
    # Action
    action_type: enum             # see action_types below
    command: string               # Actual command/function called
    parameters: json              # Full params (sanitized secrets)
    
    # Context
    task_description: string      # Human-readable intent
    parent_request_id: string     # Links to originating request
    autonomy_tier: enum           # 1, 2, or 3
    
    # Timing
    timestamp_start: iso8601
    timestamp_end: iso8601
    duration_ms: integer
    
    # Outcome
    status: enum                  # success, failure, partial, aborted
    exit_code: integer
    output_summary: string        # First 500 chars of output
    error_message: string         # If failed
    
    # Resources
    tokens_used: integer
    cost_usd: float
    files_modified: array[string]
    processes_spawned: array[string]
    
    # Verification
    verification_performed: boolean
    verification_result: string
    human_reviewed: boolean
    
action_types:
  - file_write
  - file_delete
  - git_commit
  - git_push
  - process_spawn
  - deploy_sandbox
  - deploy_production
  - api_call_external
  - subagent_spawn
  - cron_create
  - cron_modify
  - message_send
  - budget_spend
```

### Log Format & Storage

```yaml
audit_logging:
  format: jsonl                   # One JSON object per line
  location: ~/.openclaw/audit/
  filename_pattern: "{{agent_id}}_{{date}}.jsonl"
  
  # Example log line:
  # {"agent_id":"atlas","session_id":"abc123","action_type":"git_commit","command":"git commit -m 'Fix deploy script'","timestamp_start":"2026-02-10T07:30:00Z","status":"success","tokens_used":1200,"cost_usd":0.0036,"files_modified":["deploy.sh"],"verification_performed":true}
  
  rotation:
    policy: daily
    compression: gzip_after_7_days
    
  retention:
    tier_1_actions: 90_days       # Keep longer for full autonomy
    tier_2_actions: 60_days
    tier_3_actions: 30_days       # Should be rare, review manually
    
  indexing:
    create_daily_index: true
    searchable_fields:
      - agent_id
      - action_type
      - status
      - timestamp_start
      
  real_time_stream:
    enabled: true
    socket_path: /tmp/openclaw_audit.sock
    consumers:
      - monitoring_dashboard
      - alert_system
```

### Special Case Logging

```yaml
enhanced_logging:
  # These actions get extra scrutiny
  sensitive_actions:
    - deploy_production
    - message_send_external
    - budget_spend
    - file_delete
    
  enhanced_fields:
    - full_output: true           # Not just summary
    - stack_trace: true           # Full context
    - approval_chain: array       # Who approved what
    - rollback_command: string    # Pre-computed rollback
    
  # Screen recording for deploys
  screen_capture:
    on_production_deploy: true
    format: mp4
    retention_days: 30
```

---

## 4. Monitoring & Alerting

### Alert Triggers (Immediate Human Notification)

```yaml
alerts:
  critical:
    # These page immediately
    triggers:
      - production_deploy_failed
      - data_corruption_detected
      - token_budget_exceeded_by: 20%
      - security_violation
      - agent_loop_detected         # Same action >5 times in 10 min
      - process_killed_resource_limit
      - emergency_stop_activated
      
    delivery:
      - telegram: "@taylor"
      - sms: "+1-xxx-xxx-xxxx"      # For true emergencies
      - sound: "alarm.mp3"
      
    priority: critical
    retry_until_ack: true
    
  warning:
    # These notify but don't page
    triggers:
      - sandbox_deploy_failed
      - token_budget_at: 80%
      - disk_space_at: 80%
      - api_rate_limit_hit
      - process_restarted_3_times
      - verification_failed
      
    delivery:
      - telegram: "@taylor"
      
    priority: high
    retry_until_ack: false
    
  info:
    # Logged, shown in dashboard, no active notification
    triggers:
      - tier_2_action_completed
      - subagent_spawned
      - cron_job_created
      - daily_budget_report
      
    delivery:
      - dashboard_only: true
      - daily_digest: true
```

### Anomaly Detection

```yaml
anomaly_detection:
  # Detect agents behaving strangely
  patterns:
    - name: "stuck_in_loop"
      condition: "same_command_repeated > 5 within 10_minutes"
      action: kill_session_and_alert
      
    - name: "token_burn_spike"
      condition: "tokens_per_minute > 10x_daily_average"
      action: pause_session_and_alert
      
    - name: "file_thrashing"
      condition: "same_file_modified > 10 within 5_minutes"
      action: alert_warning
      
    - name: "failed_action_cascade"
      condition: "5_consecutive_failures"
      action: pause_agent_and_alert
      
    - name: "unusual_network_activity"
      condition: "outbound_requests > 100_per_minute"
      action: throttle_and_alert
      
    - name: "midnight_activity"
      condition: "autonomous_action between 00:00-06:00"
      action: alert_info  # Unusual but maybe legitimate
      
  learning:
    baseline_period_days: 14
    update_baseline: weekly
    sensitivity: medium           # low/medium/high
```

### Monitoring Dashboard Metrics

```yaml
dashboard_metrics:
  real_time:
    - active_agent_sessions
    - tokens_used_today_per_agent
    - cost_usd_today_total
    - current_cpu_percent
    - current_memory_gb
    - autonomous_actions_last_hour
    - failed_actions_last_hour
    
  daily_summary:
    - total_tokens_by_agent
    - total_cost_usd
    - action_count_by_type
    - success_rate_percent
    - average_action_duration_ms
    - top_5_most_expensive_actions
    
  weekly_trends:
    - token_usage_trend
    - failure_rate_trend
    - autonomy_tier_distribution
    - most_active_agents
    
  export:
    format: json
    schedule: daily
    destination: ~/.openclaw/monitoring/reports/
```

---

## 5. Cron/Scheduled Task Governance

### Agent Permissions for Cron

```yaml
cron_governance:
  # Can agents create cron jobs?
  tier_1_agents:
    can_create: true
    requires_approval: false
    max_jobs: 5
    
  tier_2_agents:
    can_create: true
    requires_approval: true       # Propose, human approves
    max_jobs: 3
    
  tier_3_agents:
    can_create: false
    
  # Frequency limits
  frequency_limits:
    min_interval_minutes: 15      # No faster than every 15 min
    max_daily_executions: 96      # 24 hours ÷ 15 min
    
  # Job quotas
  system_wide:
    max_total_cron_jobs: 20
    max_concurrent_executions: 5
    
  # Auto-expiration
  expiration:
    default_ttl_days: 30
    max_ttl_days: 90
    require_renewal_after: 30_days
    auto_delete_on_expire: true
    alert_before_expiry_days: 7
```

### Cron Job Requirements

```yaml
cron_job_schema:
  required_fields:
    - job_id: uuid
    - created_by_agent: string
    - created_at: timestamp
    - schedule: cron_expression     # e.g., "0 9 * * 1"
    - command: string
    - description: string           # Human-readable purpose
    - expires_at: timestamp
    - resource_limits:
        max_runtime_minutes: 10
        max_memory_mb: 512
        max_tokens: 50000
        
  optional_fields:
    - notify_on_failure: boolean
    - retry_on_failure: boolean
    - max_retries: integer
    
  validation:
    - schedule_valid: true
    - no_duplicate_jobs: true
    - within_frequency_limits: true
    - command_whitelisted: true
```

### Cron Modification Rules

```yaml
cron_modifications:
  can_modify_own_jobs: true
  can_modify_other_agent_jobs: false
  can_delete_own_jobs: true
  
  require_approval_for:
    - schedule_change: true
    - command_change: true
    - resource_limit_increase: true
    
  auto_approve:
    - description_change: true
    - notification_settings: true
    
  # Emergency override
  human_override:
    can_disable_any_job: true
    can_delete_any_job: true
    command: "openclaw cron delete {{job_id}} --force"
```

### Cron Safety Guardrails

```yaml
cron_safety:
  # Prevent dangerous patterns
  blocked_patterns:
    - recursive_cron_creation      # Cron job that creates cron jobs
    - self_modifying_schedule      # Job that changes its own schedule
    - resource_intensive:
        - "npm install"            # Can be huge
        - "git clone"              # Unbounded size
        - "curl {{unverified_url}}"
        
  # Required wrapping
  wrapper_script: |
    #!/bin/bash
    # All cron jobs run through this wrapper
    source ~/.openclaw/cron-env.sh
    
    JOB_ID=$1
    COMMAND=$2
    
    # Log start
    openclaw audit log-cron-start --job-id $JOB_ID
    
    # Run with timeout & resource limits
    timeout 10m \
      nice -n 10 \
      bash -c "$COMMAND"
    
    EXIT_CODE=$?
    
    # Log completion
    openclaw audit log-cron-end --job-id $JOB_ID --exit-code $EXIT_CODE
    
    # Alert on failure
    if [ $EXIT_CODE -ne 0 ]; then
      openclaw notify --priority warning "Cron job $JOB_ID failed"
    fi
```

---

## 6. Inter-Agent Authorization

### Trust Matrix

```yaml
authorization:
  # Who can do what without approval
  
  scout:  # Research & intelligence
    can_autonomously:
      - web_search
      - web_fetch
      - file_read
      - write_to_research_folder
      - spawn_subagents_for_research
      
    requires_approval:
      - send_messages_external
      - spend_money
      - git_commit
      
    cannot_do:
      - deploy_any_environment
      - modify_production_config
      - delete_files_outside_research
      
  bolt:  # Engineering
    can_autonomously:
      - file_write_in_projects
      - git_commit
      - git_push_to_feature_branches
      - run_tests
      - deploy_sandbox
      - spawn_subagents_for_coding
      
    requires_approval:
      - deploy_production
      - git_push_to_main
      - delete_files
      - install_dependencies  # Can break things
      
    cannot_do:
      - send_external_messages
      - spend_money
      - modify_infrastructure_config
      
  archivist:  # Memory & organization
    can_autonomously:
      - read_all_memory_files
      - write_memory_files
      - organize_workspace
      - git_commit_memory_changes
      
    requires_approval:
      - delete_memory_files  # Permanent loss
      - modify_SOUL_or_USER_files
      
    cannot_do:
      - deploy_anything
      - send_messages
      - spawn_subagents
      
  atlas:  # Infrastructure (me!)
    can_autonomously:
      - deploy_sandbox
      - modify_infrastructure_config
      - create_cron_jobs
      - spawn_subagents
      - restart_services
      - file_operations_anywhere
      
    requires_approval:
      - deploy_production
      - modify_security_rules
      - delete_databases
      
    cannot_do:
      - spend_money_over_$10
      - send_external_messages  # Not my job
```

### Approval Chain

```yaml
approval_chains:
  # When agent needs approval, who can approve?
  
  tier_3_actions:
    approvers:
      - human_primary: "Taylor"
      - human_fallback: "Jeff"  # If Taylor unavailable >1hr
      
    approval_method:
      - telegram_inline_button: true
      - timeout_minutes: 60
      - auto_reject_on_timeout: true
      
  cross_agent_triggers:
    # Can one agent trigger another's actions?
    
    scout_can_request:
      - bolt: "write code based on research"
        requires: human_approval
      - archivist: "save research findings"
        requires: no_approval  # Safe operation
        
    bolt_can_request:
      - atlas: "deploy to sandbox"
        requires: no_approval  # Bolt can auto-trigger Atlas sandbox deploys
      - atlas: "deploy to production"
        requires: human_approval
        
    atlas_can_request:
      - bolt: "fix broken deployment"
        requires: human_approval  # Don't auto-fix without review
```

### Veto Authority

```yaml
veto_rules:
  # Who can stop what
  
  human_veto:
    can_stop: all_agents
    can_kill: all_sessions
    can_rollback: all_actions
    method: "openclaw emergency-stop"
    
  agent_veto:
    # Can agents stop each other?
    atlas_can_stop:
      - runaway_processes: true
      - resource_exceeded: true
      - security_violation: true
      
    # But agents cannot veto human-approved actions
    cannot_stop:
      - human_approved_tier_3_actions: true
```

### Delegation Rules

```yaml
delegation:
  # When can agents delegate to subagents?
  
  subagent_inheritance:
    # Subagents inherit parent's permissions
    permissions: inherit_parent
    budget: inherit_from_parent  # Up to 30%
    
    # But some actions cannot be delegated
    non_delegatable:
      - production_deploy
      - external_messaging
      - spending_money
      - creating_more_subagents  # No sub-sub-agents spawning subs
      
  subagent_limits:
    max_depth: 3
    max_concurrent_per_parent: 2
    max_lifetime_minutes: 60
    auto_kill_on_parent_exit: true
```

---

## 7. Emergency Stop Protocol

### Kill Switch Implementation

```yaml
emergency_stop:
  # Single command to halt everything
  
  command: "openclaw emergency-stop"
  
  aliases:
    - "openclaw killall"
    - "openclaw halt"
    - "🛑"  # Emoji trigger in Telegram
    
  actions_taken:
    - kill_all_agent_sessions: immediate
    - kill_all_subagent_sessions: immediate
    - disable_all_cron_jobs: immediate
    - kill_running_processes: graceful_then_force
    - pause_heartbeat_polling: true
    - block_new_sessions: true
    
  process:
    1_send_sigterm: 
        timeout_seconds: 5
    2_send_sigkill:
        if_still_running: true
    3_log_audit:
        emergency_stop_triggered: true
        triggered_by: human_or_system
        reason: required_parameter
    4_notify:
        channels: [telegram, sms]
        message: "🛑 EMERGENCY STOP ACTIVATED - All agents halted"
    5_create_snapshot:
        state_before_stop: true
        for_forensics: true
```

### Stop Levels

```yaml
stop_levels:
  # Different severities of stopping
  
  level_1_pause:
    command: "openclaw pause {{agent_id}}"
    effect: "Pause specific agent, allow current task to finish"
    resume: "openclaw resume {{agent_id}}"
    use_case: "Agent behaving oddly, investigate before killing"
    
  level_2_stop:
    command: "openclaw stop {{agent_id}}"
    effect: "Stop specific agent immediately, kill current task"
    resume: "openclaw start {{agent_id}}"
    use_case: "Single agent problem, others can continue"
    
  level_3_emergency_stop:
    command: "openclaw emergency-stop"
    effect: "Stop ALL agents, ALL processes, ALL crons"
    resume: "openclaw resume-all --confirm-safe"
    use_case: "System-wide problem, nothing should be running"
    
  level_4_lockdown:
    command: "openclaw lockdown"
    effect: "Emergency stop + prevent any new sessions until unlocked"
    resume: "openclaw unlock --password {{secret}}"
    use_case: "Security breach, nothing should run until investigated"
```

### Recovery After Emergency Stop

```yaml
recovery_protocol:
  # What happens after emergency stop?
  
  immediate:
    - log_full_state: true
    - create_audit_report: true
    - notify_human: true
    
  investigation:
    - review_audit_logs: true
    - check_for_damage:
        - corrupted_files
        - failed_deploys
        - data_loss
    - identify_root_cause: required
    
  resume_checklist:
    - root_cause_identified: required
    - damage_assessed: required
    - fixes_applied: required
    - human_approval: required
    
  resume_command: |
    openclaw resume-all \
      --root-cause "{{explanation}}" \
      --fixes-applied "{{list_of_fixes}}" \
      --confirm-safe
      
  graduated_restart:
    # Don't restart everything at once
    1_tier_1_agents_first: true
    2_wait_5_minutes_observe: true
    3_tier_2_agents_if_stable: true
    4_tier_3_resume_manually: true
```

### Automated Emergency Triggers

```yaml
auto_emergency_stop:
  # System can trigger emergency stop automatically
  
  triggers:
    - security_breach_detected: true
    - data_corruption_detected: true
    - cost_exceeded_$100_in_1_hour: true
    - agent_loop_infinite: true
    - memory_exceeded_90_percent: true
    - disk_exceeded_95_percent: true
    
  confirmation:
    require_human_confirm: false  # Auto-trigger, safety first
    notify_immediately: true
    
  false_positive_handling:
    log_trigger_reason: true
    allow_resume_after_review: true
    learn_from_false_positives: true
```

### Manual Override Keys

```yaml
override_keys:
  # Physical security for true emergencies
  
  hardware_kill_switch:
    enabled: false  # Optional: USB device that triggers emergency stop
    device_path: "/dev/emergency_stop"
    
  secret_password:
    for_lockdown_unlock: true
    stored_in: "1Password / Emergency Kit"
    rotated: quarterly
    
  multi_factor:
    for_production_resume: true
    methods:
      - password: true
      - telegram_confirmation: true
      - sms_code: true
```

---

## Recommended Configuration Profile

### Starter Config (Conservative)

```yaml
# Good for first 30 days of autonomous operation
starter_profile:
  token_budget_per_agent_per_day: 500_000
  max_concurrent_agents: 3
  tier_1_autonomous_actions: [research, organize_files, git_commit]
  tier_2_require_approval: [sandbox_deploy, subagent_spawn]
  tier_3_require_approval: [everything_else]
  
  monitoring:
    alert_threshold: low  # Alert on anything unusual
    
  recovery:
    auto_rollback: enabled_for_all
    
  emergency_stop:
    hair_trigger: true  # Better safe than sorry initially
```

### Production Config (Balanced)

```yaml
# After agents have proven reliability
production_profile:
  token_budget_per_agent_per_day: 1_000_000
  max_concurrent_agents: 5
  tier_1_autonomous_actions: [research, organize, git_commit, git_push_feature, sandbox_deploy]
  tier_2_do_then_report: [subagent_spawn, quality_iteration]
  tier_3_require_approval: [production_deploy, external_messages, spend_money]
  
  monitoring:
    alert_threshold: medium
    
  recovery:
    auto_rollback: enabled_for_tier_1_and_2
    
  emergency_stop:
    balanced_trigger: true
```

---

## Implementation Checklist

### Phase 1: Foundation (Week 1)
- [ ] Implement audit logging (all actions to JSONL)
- [ ] Set up token budget tracking
- [ ] Create emergency stop command
- [ ] Configure basic alerts (Telegram)

### Phase 2: Safety (Week 2)
- [ ] Implement automated snapshots (hourly)
- [ ] Add resource limits (CPU, memory, disk)
- [ ] Create rollback scripts for git/deploys
- [ ] Set up monitoring dashboard

### Phase 3: Governance (Week 3)
- [ ] Implement authorization matrix
- [ ] Add approval workflow for Tier 3 actions
- [ ] Configure cron governance
- [ ] Set up anomaly detection

### Phase 4: Refinement (Week 4)
- [ ] Tune alert thresholds based on real data
- [ ] Optimize resource limits
- [ ] Document learned lessons
- [ ] Train agents on new protocols

---

## Open Questions for Review

1. **Token budgets**: Are 1M tokens/day too conservative for Tier 1 agents? Too generous?
2. **Cron limits**: Is 15-minute minimum frequency too restrictive? Some tasks need faster polling.
3. **Emergency stop**: Should there be a "soft stop" that finishes current tasks vs "hard stop" that kills immediately?
4. **Inter-agent auth**: Should Bolt be able to auto-trigger Atlas sandbox deploys, or require approval?
5. **Audit retention**: 90 days for Tier 1 actions might be overkill. Storage costs?
6. **Subagent depth**: Max depth of 3 — is that enough for complex research tasks?
7. **Anomaly detection sensitivity**: Start with "medium" or "high"? Too many false positives will train humans to ignore alerts.

---

## Metrics for Success

After 30 days of autonomous operation, measure:

- **Safety**: Zero unrecoverable failures, zero security breaches
- **Efficiency**: <5% of actions require rollback
- **Cost**: Agents stay within budget >95% of time
- **Reliability**: >99% action success rate
- **Trust**: Taylor comfortable with current autonomy levels

If all metrics green → expand autonomy. If any red → tighten controls.

---

**Atlas out.** Ready for review and implementation. 🏗️
