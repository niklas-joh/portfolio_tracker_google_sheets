# AI Coding Guide

This guide explains how coding agents should contribute to this repository.

## Git workflow
- **Create a branch** from `main` for each change (e.g. `feature/task-42`).
- Keep commits small and descriptive. Check changes with `git status` before committing.
- Push the branch and open a pull request once work is complete.

## Checking issues
- Use `gh issue list` to view open tasks on GitHub.
- Reference the relevant issue number in your PR body.

## Coding style
- Follow the folder responsibilities outlined in [ARCHITECTURE.md](ARCHITECTURE.md).
- Apply DRY principles and keep functions well documented with JSDoc.
- Maintain separation of responsibilities between `api/`, `data/`, `ui/` and other modules.
- Aim for incremental, maintainable changes that do not break existing behaviour.

## Deploying with clasp
- Authenticate once with `clasp login` and ensure `appsscript.json` is present.
- After merging to `main`, run `clasp push` to sync files with the Apps Script project.
