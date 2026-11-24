# Project rules

@AGENTS.md
Before any non-trivial change, read the relevant files in docs/.
If code and docs conflict, name the conflict and ask. Never guess.
A task is done only when checks pass and docs reflect the change.

## Git permissions

- Commit normally after checks pass. Push only when I say "push".
- When I say "force push", run git push --force-with-lease to the current branch.
- When I say "force commit", commit even if checks fail (git commit --no-verify) and tell me which checks failed.
- Do these only when my latest message says so; a permission given once does not carry over to later steps.
