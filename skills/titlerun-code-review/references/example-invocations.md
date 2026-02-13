<!-- Summary: Example scenarios showing how the code review skill is invoked by Rush, Jeff, and cron.
     Read when: Understanding workflow integration or debugging invocation issues. -->

# Example Invocations

## By Rush (in heartbeat after 3+ commits)
```
I've committed 4 changes to the trade evaluator. Running code review before continuing...
[loads titlerun-dev, then titlerun-code-review]
[executes review process]
[reads results]
[fixes Critical/Major issues or logs them to WORKQUEUE.md]
```

## By Jeff (manual)
```
@dev Review Rush's work from the last 4 hours
[spawns reviewer agent]
[loads titlerun-dev, titlerun-code-review]
[executes review]
[outputs summary to Jeff]
```

## By Cron (automatic)
```
[10am/3pm/9pm: cron triggers titlerun agent]
[Rush loads titlerun-code-review]
[executes review]
[writes to reviews/ and Jeff's inbox]
[exits]
```
