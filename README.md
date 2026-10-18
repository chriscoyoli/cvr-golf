# Carmel Valley Ranch Golf Academy: page editor prototype

A copy of [carmelvalleyranch.com/golf/golf-academy](https://carmelvalleyranch.com/golf/golf-academy/) that the Golf Academy team can edit themselves. They change text and photos in a simple editor, see the real page update as they type, and share a preview link by email. Layout, colors, fonts and formatting stay exactly as they are on the live site.

Built by Carmel Valley Technologies. Hosted free on GitHub Pages. No server, no database, no WordPress access needed.

## What's in it

| Address | What it is |
| --- | --- |
| `https://<owner>.github.io/<repo>/` | The prototype page, showing the **published** content |
| `.../editor.html` | The editor (text, photos, prices, buttons, team bios) |
| `.../?draft=<name>` | A **saved preview**. This is the link you paste into an email |

How it stays identical: the page uses the live site's exact HTML (checked byte for byte against carmelvalleyranch.com on Oct 18, 2026) and loads the site's own stylesheet, so it inherits every color, size and spacing rule. Only the words and photos come from a content file the editor writes.

## One-time setup (about 10 minutes)

1. **Create a repository** on GitHub, for example `cvr-golf-academy`. Public is simplest (see "Privacy" below).
2. **Upload everything in this folder** to it (drag the files into "Add file > Upload files", or `git push`). Keep the folder structure, including the hidden `.nojekyll` file and `.github` folder.
3. **Turn on GitHub Pages**: repository **Settings > Pages**, Source **Deploy from a branch**, Branch **main**, folder **/ (root)**, Save. After a minute the site is live at `https://<owner>.github.io/<repo>/`.
4. **Open `.../editor.html`**. The repository is detected automatically from the address.
5. **Add an access key** so the editor can save (gear icon > Settings):
   - GitHub **Settings > Developer settings > Personal access tokens > Fine-grained tokens > Generate new token**
   - Repository access: **Only select repositories**, pick this repository
   - Repository permissions: **Contents: Read and write** (nothing else)
   - Paste the key into the editor and click **Save and test**.

The key is stored only in that browser. Nothing else is needed to view the page or preview links.

## Giving the Golf Academy team access

Pick one:

- **Their own GitHub accounts (recommended).** Add each person as a collaborator (repository **Settings > Collaborators**). Each creates their own key with the steps above. You can remove anyone at any time.
- **One shared key.** Create a key limited to this one repository with an expiry date and send it to them through a secure channel (not plain email). Anyone holding it can edit this repository only.

Then send them the editor link.

## Using the editor

- **Edit**: open a section on the left. Text, headings, prices, buttons and photos update in the preview immediately. Click anything in the preview to jump to its fields.
- **Photos**: click **Replace photo** or drag one onto the thumbnail. Large photos are resized automatically. Fill in the photo description for accessibility.
- **Programs and prices**: pick a tab, then add, remove, reorder or duplicate programs. Put each price on its own line. Tabs can be added, renamed, reordered and removed.
- **Team members**: edit, duplicate, reorder or add a new bio.
- **Share preview**: name the version (for example "Winter pricing update") and you get a link to copy or drop into an email. Saving again under the same name updates the same link.
- **Saved previews**: reopen, copy the link of, or delete earlier previews.
- **Publish**: makes the current version the main prototype page. It does **not** touch carmelvalleyranch.com.
- Unsaved edits are kept in the browser if the tab closes, and the editor offers to restore them.
- Device buttons above the preview show desktop, tablet and phone layouts.

## Fonts: one thing to decide

The site's headline and body fonts (Alternate Gothic, Sabon, Trade Gothic) are commercial fonts licensed to Carmel Valley Ranch and hosted on their server. Browsers will not load fonts from another site's server unless that server allows it, and carmelvalleyranch.com does not. So on github.io the prototype shows close fallback fonts; everything else matches.

To show the real fonts, copy them into this repository, **only if CVR confirms its font license covers this use**:

- **Actions** tab > **Copy theme files** > **Run workflow**, tick **fonts** (and optionally **images** to also copy the photos so nothing depends on the live site). It commits the files for you.
- Or locally: `node scripts/vendor-theme.mjs --fonts --images` (Node 18+).

If the repository is public, copied font files are publicly downloadable from it, which is the main thing to check with CVR. A private repository avoids that, but GitHub Pages on a private repository needs a paid GitHub plan.

## Privacy and what's visible

- Preview links are unlisted, not secret: anyone with the link can open it, and in a public repository anyone can browse the files.
- Every page has `noindex`, so search engines won't list it, and a small "not the live website" note in the corner (visitors can close it; add `&badge=0` to a link to hide it for screenshots).
- Every save is a Git commit, so every version is recoverable from the repository history.

## Known limits of the prototype

- The header and footer are fixed copies. Their links still go to the real site.
- The weather in the header shows the value captured on Oct 18 (69°), since the live weather feed belongs to the WordPress site.
- Section order is fixed apart from tabs, programs and team members. Sections can't be added from scratch.
- Saving needs GitHub's API to be reachable from the editor's network.

## Files

```
index.html                 the page (header, footer, icons; body filled from content)
editor.html                the editor
cms.config.json            repository settings (blank = auto-detect on github.io)
content/published.json     the published content
content/drafts/*.json      saved previews
uploads/                   photos added through the editor
assets/cms/render.js       turns content into the site's exact markup; tabs and mobile menu
assets/cms/common.js       loading content, GitHub saving
assets/cms/editor.js/.css  the editor
scripts/vendor-theme.mjs   copies the theme stylesheet, fonts and photos into the repo
.github/workflows/         "Copy theme files" action
```

The content file is plain, structured JSON (blocks for banner, text, headings, program tabs with rows and prices, feature, bios), so the same content could later be imported into WordPress if CVR wants this editing flow on the real site.
