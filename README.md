# Love Yoga Life

A small static website for Love Yoga Life, designed to run on GitHub Pages without a paid hosting service or application server.

## Publish with GitHub Pages

For a first deploy from Windows, the local-only `Deploy-ToGitHub.ps1` helper can push under a different GitHub account without changing your normal global Git identity or saved credentials. It is intentionally excluded by `.gitignore` and is not included in the repository:

1. Sign in to the alternate GitHub account in a browser and create a **new empty repository** for the site. Do not initialize it with a README, license, or `.gitignore`.
2. Create a fine-grained personal access token for that repository with **Contents: Read and write** permission. Keep the token private.
3. From PowerShell in this folder, run `./Deploy-ToGitHub.ps1`. Enter the repository as `owner/name`, the commit name and email to use for this site, and the token when prompted. PowerShell masks the token entry.
4. The script verifies repository access, initializes the `main` branch if needed, sets the commit identity locally for this project, commits the site, and pushes. It does not save the token in Git configuration or the repository; the temporary authentication helper is removed after the push.
5. In the repository, open **Settings → Pages** and choose **GitHub Actions** as the build and deployment source. The workflow in `.github/workflows/pages.yml` deploys whenever `main` is updated. The published address appears in **Settings → Pages**.
6. Open the published site and choose **Site editor** in the footer to manage announcements, dated events, and the recurring class timetable.

The local helper uses the GitHub API and Git directly, so GitHub CLI is not required. The first push requires an empty repository. Later runs can update the same configured `origin/main`: the helper fetches the remote and only proceeds when the histories can be fast-forwarded, refusing a different remote or diverged history. The root `.gitignore` excludes `.env` and PowerShell scripts before commits.

PowerShell may block local scripts depending on your execution policy. If that happens, run it for this invocation with `powershell -ExecutionPolicy Bypass -File .\Deploy-ToGitHub.ps1` rather than changing the machine-wide policy.

The site is plain HTML, CSS, JavaScript, and JSON; no build step or paid service is needed. The same setup works for a custom domain connected through GitHub Pages.

## Using the site editor

The editor stores content in `data/site-content.json` in this repository. It can add, edit, and remove homepage announcements, calendar events, and weekly classes. Changes stay in the current page as a draft until **Publish changes** is pressed.

To publish, enter the repository as `owner/repository` and a GitHub fine-grained personal access token that is limited to this repository, with **Contents: Read and write** permission. GitHub uses the token to commit the JSON update. The token is held only in the open tab, is not written to local storage or the site files, and is cleared after a successful publish. Do not share or embed the token in the website.

A commit to the repository starts the Pages deployment workflow. Allow a minute or two for the public site to pick up the updated content. If branch protection or rules require a review, the update may need to be merged before it appears.

## Local preview

Serve the repository root over HTTP (not by opening `index.html` directly, since browsers restrict JSON loading from `file://`). With Node.js installed, one option is:

```powershell
npx --yes serve .
```

Then open the local URL printed by the command.

## Content notes

The initial service descriptions, prices, class schedule, sound-bath details, and contact information were carried over from the existing Love Yoga Life website. Its pages contain older dates and some information may have changed since publication; please confirm current prices, weekly class details, and upcoming dates before launching. The initial calendar includes the two remaining dates from the source's 2026 sound-bath schedule: 17 October and 14 November.

The site uses remote Unsplash images as temporary placeholders. Replace them with Maureen's own photographs when they are ready.
