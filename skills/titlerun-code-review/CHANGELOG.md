# Changelog — titlerun-code-review

All notable changes to this skill will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.0] - 2026-03-01

### Added

**Orchestrator (SKILL.md):**
- 8-step phase detection and routing system
- 4 pre-delivery validation gates (CI, file count, merge conflicts, change count)
- Progressive disclosure (3-tier loading: always-on, on-demand, verification)
- 3-retry logic with human escalation
- Non-negotiables at START and END (recency bias applied)

**Workflows:**
- `workflows/backend-review.md` — OWASP Security + Google SRE Performance
- `workflows/frontend-review.md` — Nielsen UX Heuristics + Performance
- `workflows/database-review.md` — Performance-focused (migrations, indexes, types)

**References:**
- `references/titlerun-anti-patterns.md` — 6 domain-specific patterns (#1 recurring bug documented)
- `references/production-incidents.md` — 5 real incidents with root causes, impact, fixes
- `references/banned-phrases.md` — 75 forbidden phrases (contrarian frame)
- `references/tech-stack.md` — TypeScript, React, Prisma, Express, TanStack Query best practices

**Templates:**
- `templates/finding-template.md` — 5 required elements (file, line, code, impact, fix)
- `templates/review-report.md` — Full review structure with score justification
- `templates/summary-template.md` — Brief format for Jeff's inbox

**Cognitive Frameworks (Loaded from ../../cognitive-profiles/):**
- OWASP Security (owasp-security.md) — 10 security checks
- Google SRE Performance (google-sre-performance.md) — Query optimization, algorithmic complexity
- Nielsen UX Heuristics (nielsen-ux-heuristics.md) — 10 usability heuristics

**Contrarian Frame:**
- 75 banned phrases across 4 categories
- Required inversions: hedge → definitive, vague → quantified
- 3 auto-fail verification checks
- Loaded last (Tier 3) for recency bias

**Quality Standards:**
- Every finding MUST have 5 elements (file, line, code, impact, fix)
- Every impact MUST be quantified (numbers + scale)
- NO banned phrases allowed (auto-fail)
- Score MUST have justification

**Integration:**
- Posts to `workspace-titlerun/reviews/YYYY-MM-DD-[identifier].md`
- Sends summary to `inboxes/jeff-inbox.md`
- Integrates with OpenClaw cron system

**Performance Targets:**
- Review time: <10 min for <100 files
- Token usage: <20K per review
- False positive rate: <10%
- Critical issues caught: >90%

### Build Methodology

**Built with:** meta-skill-forge v2.0.0

**Process:**
- Phase 1: Context Ingestion (existing materials + first principles)
- Phase 2: Targeted Extraction (4 rounds of questions)
- Phase 3: Contrarian Analysis (75 banned phrases identified)
- Phase 4: Architecture Decisions (modular structure chosen)
- Phase 5: Writing Content (systematic file creation)
- Phase 6: Cognitive Review (TBD — adversarial audit before ship)
- Phase 7: Ship (TBD — after audit passes)
- Phase 8: Evolve (post-ship metrics + pattern learning)

**Time to build:** ~5 hours (Phase 1-5)

**Files created:** 13 files, ~70KB total

**Token efficiency:** 60-70% reduction vs monolithic (progressive disclosure)

---

## Versioning Strategy

**Major version (X.0.0):** Breaking changes to skill interface or required inputs  
**Minor version (1.X.0):** New workflows, new cognitive profiles, new reference materials  
**Patch version (1.0.X):** Bug fixes, improved wording, minor refinements

---

## Future Roadmap

**Planned for v1.1.0:**
- Python backend review workflow (FastAPI/Django patterns)
- Rust review workflow (if TitleRun adds Rust services)
- Performance benchmark tracking (actual vs target metrics)
- Pattern learning system (what issues recur most?)

**Planned for v1.2.0:**
- Auto-fix suggestions (generate PR with fixes for simple issues)
- Dependency vulnerability check (npm audit integration)
- License compliance check

**Planned for v2.0.0:**
- Multi-repo review (review across titlerun-api + titlerun-app in single pass)
- Historical trend analysis (is code quality improving?)
- Developer coaching mode (explain WHY, not just WHAT)

---

## Migration Guide

**From:** No code review skill → v1.0.0

**Setup:**
1. Ensure cognitive profiles exist in `~/.openclaw/workspace/cognitive-profiles/`
2. Create `workspace-titlerun/reviews/` directory
3. Add cron job to HEARTBEAT.md (if not already present)
4. Test with sample PR

**Cron configuration:**
```bash
# Add to Rush's HEARTBEAT.md (or separate cron)
# Every commit to main:
openclaw run "review commits since last review" --skill titlerun-code-review
```

**First run checklist:**
- [ ] Cognitive profiles exist (owasp-security.md, google-sre-performance.md, nielsen-ux-heuristics.md)
- [ ] Review output directory created (`workspace-titlerun/reviews/`)
- [ ] Jeff's inbox exists (`inboxes/jeff-inbox.md`)
- [ ] Test with 1-2 files first (not full codebase)
- [ ] Verify score calculation makes sense
- [ ] Check that banned phrases are actually blocked

---

## Known Limitations (v1.0.0)

1. **Frontend can't be tested locally** — Skill can review code but can't run app to verify fixes work
2. **No auto-fix capability** — Skill identifies issues but doesn't generate PRs with fixes
3. **Single-repo only** — Can't review changes across titlerun-api + titlerun-app in coordinated way
4. **No historical tracking** — Each review is independent, no trend analysis yet
5. **Manual re-review** — Have to manually request re-review after fixes applied

---

## Credits

**Built by:** Jeff Daniels (AI Portfolio Manager)  
**Built with:** meta-skill-forge v2.0.0  
**Cognitive profiles created by:** Jeff Daniels (2026-03-01)  
**Domain knowledge from:** TitleRun production incidents (2026-02-10 to 2026-03-01)

**Special thanks:**
- Taylor (product vision, business requirements)
- Rush (TitleRun engineering, bug reports)
- Elvis (agent swarm methodology inspiration)

---

**Last updated:** 2026-03-01  
**Current version:** 1.0.0  
**Status:** Production candidate (pending adversarial audit)
