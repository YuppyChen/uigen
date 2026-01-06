---
description: Add GitHub remote repository
argument-hint: [github-repo-url]
allowed-tools: Bash(git remote:*), Bash(git push:*)
---

Add GitHub repository as remote and push the current branch.

GitHub repository URL: $ARGUMENTS

Steps to execute:
1. Check current git remotes using `git remote -v`
2. If 'origin' already exists, ask user if they want to:
   - Replace it (remove old origin and add new one)
   - Add as a different remote name (suggest 'upstream' or 'github')
3. Add the remote repository
4. Push the current branch to the remote
5. Set upstream tracking for the current branch

Please execute these steps carefully and confirm each action before proceeding.
