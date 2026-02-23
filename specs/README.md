# GardenHive — Feature Development Workflow

This doc describes how the team uses speckit to build new features consistently
and keep Claude's output aligned with the codebase.

---

## Daily Loop

```
New feature → update spec → plan → tasks → implement → review against spec → PR
Bug fix     → implement directly (no spec update needed unless it reveals a design gap)
Refactor    → update plan first → implement → update spec if behaviour changed
```

---

## Phase 3 — Building New Features

### Step 7: Write the spec first

Before any code, run:

```
/speckit.specify

We are adding a new feature: [describe it in plain English — what the user
does, what happens, what the outcome is].
```

Review the output. Make sure it matches your actual intent before moving on.

### Step 8: Create an implementation plan

```
/speckit.plan

Based on the new feature in the spec, create an implementation plan.
We are using our existing MERN stack. Identify which existing files will
be modified and what new files will be created.
```

### Step 9: Generate tasks

```
/speckit.tasks
```

Each task should be completable and reviewable by one person independently.
Use this to divide work across the team.

### Step 10: Implement

```
/speckit.implement
```

Or tackle tasks individually if splitting across the team. Claude stays
consistent because it always works from the same spec and constitution.

---

## Phase 4 — Reducing Bugs

### Step 11: Pre-PR review

Before opening a pull request, run:

```
Review the changes in [file or feature]. Check them against the constitution
and spec. Flag any inconsistencies, missing error handling, or deviations
from the patterns we've established.
```

### Step 12: Keep the spec in sync

Any time a feature changes significantly during implementation, update the
spec to reflect reality. If the spec drifts from the code, Claude's future
output will drift too.

**Rule**: spec updates are part of the PR — not an afterthought.

---

## File Locations

| Artifact | Path |
|---|---|
| Constitution | `.specify/memory/constitution.md` |
| Spec template | `.specify/templates/spec-template.md` |
| Plan template | `.specify/templates/plan-template.md` |
| Tasks template | `.specify/templates/tasks-template.md` |
| Feature specs | `specs/<###-feature-name>/` |
| Agent context | `CLAUDE.md` |
