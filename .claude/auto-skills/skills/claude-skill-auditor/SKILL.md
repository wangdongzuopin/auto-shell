---
name: claude-skill-auditor
description: Audit a Claude skill library for redundancy, trigger conflicts, broken dependencies, and health risks. Do not use for running the skills themselves.
tags: [claude, skills, governance, audit]
created_at: 2026-04-02
last_validated: 2026-04-02
trigger_count_30d: 0
success_rate: 1.0
usage_pattern: standard
pinned: true
---

# Purpose

Use this skill when a Claude skills directory needs to be reviewed for quality, overlap, conflict risk, or maintenance issues.

# Steps

1. Scan the skill library and collect all `SKILL.md` definitions.
2. Compare descriptions to find redundancy and trigger overlap.
3. Check skill dependencies, missing referenced files, and circular links.
4. Score quality and health, then summarize the most important fixes.

# Success Criteria

- The output identifies high-risk conflicts or confirms none were found.
- The output includes concrete remediation advice.
- The output clearly distinguishes redundancy, conflict, dependency, and health findings.

# Outputs

- audit summary
- prioritized action items
- conflict and health findings
