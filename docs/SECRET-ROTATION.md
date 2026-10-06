# Secret rotation after the ECS-ENV-SETUP.md leak

## What leaked

`ECS-ENV-SETUP.md` held live values from commit `be53d67` (2025-11-15) until `0229f5e` (2026-08-13) replaced them with placeholders. The file was on `origin/main` for that whole period, and **the old values are still readable in git history**. Deleting them from the file did not un-leak them.

| Secret | What it protects |
|---|---|
| `OPENAI_API_KEY` | OpenAI billing account |
| `ACCESS_TOKEN_SECRET` | Signs access JWTs; anyone holding it can mint a token for any user |
| `REFRESH_TOKEN_SECRET` | Signs refresh JWTs, same risk for longer-lived sessions |
| `MAILER_PASSWORD` | Outbound mail account (password resets, OTPs) |
| `REDIS_PASSWORD` | Redis auth (the current stack runs Redis on a private Docker network) |

## Status

**All five rotated**, confirmed by the team on 2026-10-01. The new values live only in GitHub → Settings → Environments → `dev`, and `deploy.yml` writes them into `app.env` on the instance.

Rotating `ACCESS_TOKEN_SECRET` and `REFRESH_TOKEN_SECRET` invalidates every existing session, so every user has to log in again. That's expected, not a bug.

## History purge: not done

The old values are still in the history of every clone and fork. Since they're rotated, they no longer grant access, so purging is optional. If it's ever done (`git filter-repo --replace-text`), every collaborator has to re-clone, and open PRs have to be rebased.

## If a secret leaks again

1. Rotate it at the provider first, before touching the repo.
2. Update the GitHub Environment value and run **Deploy to EC2**.
3. Replace the value in the file with a placeholder.
4. Add a row to the table above with the date.
