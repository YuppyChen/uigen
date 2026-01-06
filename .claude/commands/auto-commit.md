---
description: Auto-commit and push changes with AI-generated commit message
allowed-tools: Bash(git status:*), Bash(git diff:*), Bash(git add:*), Bash(git commit:*), Bash(git push:*)
---

Automatically commit and push all changes with an intelligently generated commit message.

Execute the following steps:

1. Run `git status` to check current repository status
2. Run `git diff` to see all changes (both staged and unstaged)
3. Run `git log --oneline -5` to understand recent commit message style

Based on the changes:
- Analyze the modified files and their changes
- Generate a clear, concise commit message following conventional commits format:
  - Format: `<type>(<scope>): <subject>`
  - Types: feat, fix, docs, style, refactor, perf, test, chore
  - Example: `feat(preview): add JSX hot reload support`
  - Keep subject line under 72 characters
  - Focus on "what" and "why", not "how"

4. Stage all changes using `git add .`
5. Create commit with the generated message
6. Push to the remote repository

Commit message template:
```
<type>(<scope>): <subject>

<optional detailed description if changes are complex>

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
```

IMPORTANT:
- Do NOT commit files that likely contain secrets (.env, credentials.json, etc)
- Warn if staging sensitive files
- Use HEREDOC for commit message formatting
- Follow the git commit guidelines from project documentation
