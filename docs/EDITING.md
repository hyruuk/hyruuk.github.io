# Working on the site — a practical guide

This is the manual for **https://hyruuk.github.io**. You don't need to know web development: almost everything is
plain text files (Markdown and YAML) in this repository. When you push a change, GitHub rebuilds the site and puts it
online in about two minutes.

- [1. The idea in one page](#1-the-idea-in-one-page)
- [2. Three ways to edit](#2-three-ways-to-edit)
- [3. Adding something new](#3-adding-something-new-automatic-placement)
- [4. "I want to…" — which file to edit](#4-i-want-to--which-file-to-edit)
- [5. Projects in detail](#5-projects-in-detail)
- [6. Papers, talks and other entries](#6-papers-talks-and-other-entries)
- [7. Places on the artwork](#7-places-on-the-artwork-keywords-and-regions)
- [8. French](#8-french)
- [9. HYRUUK, music, Discord](#9-hyruuk-music-discord)
- [10. Publishing, and when a build fails](#10-publishing-and-when-a-build-fails)
- [11. Changing the artwork](#11-changing-the-artwork)
- [12. Cheat sheet](#12-cheat-sheet)

---

## 1. The idea in one page

**The artwork is a world map.** Every page of the site is a *place* in that world, with a camera position on the
picture. Moving between pages flies the camera from one place to the next.

There are **two ways in**, showing the same projects arranged differently:

| | What | Where it comes from |
|---|---|---|
| **Places** (themes) | the clickable regions of the art: Videogames, Neuroimaging, Brain–computer interfaces, Neuro-AI, Music, Consciousness & flow, Art & creativity | each item's `keywords:` |
| **Rooms** (types) | the right-hand menu: Research & Publications · Data & Code · Art & Music · About | each project's `sections:` |

A project with `keywords: [videogames, neuroimaging]` and `sections: [research, code]` appears in two places and
two rooms — automatically. **You never place anything by hand**: the collages, lists and counts are recomputed at
every build.

The colours of the three rooms are the three segments of the little bar under the wave:
**blue = research, violet = code, pink = art & music.**

## 2. Three ways to edit

1. **On github.com, from anywhere (even your phone).** Open the file, click the ✏️ pencil, edit, then
   **Commit changes**. The site updates about 2 minutes later — follow it in the **Actions** tab.
   Tip: press `.` on the repository page to open a full VS Code editor in the browser.
2. **The "New item" form** — for adding things (next section).
3. **On your computer**, with a live preview:

   ```bash
   npm install          # once (and after pulling changes to package.json)
   npm run dev          # → http://localhost:4321 — updates as you save files
   npm run dev -- --host   # same, reachable from your phone on the same Wi-Fi
   ```

   When you're happy: `git add -A && git commit -m "…" && git push`.
   Before a big push you can check everything exactly like GitHub will: `npm run ci`.

## 3. Adding something new (automatic placement)

Two front doors, same robot (`scripts/add-item.mjs`):

**A. On GitHub:** *Issues → New issue → New item.* Fill what you know — **a link is often enough**:

| You paste | The robot fills in |
|---|---|
| a DOI (`10.xxxx/…` or a doi.org link) | title, authors (your name is highlighted), journal, year |
| a GitHub repository | name, description, topics, website, start year |
| a YouTube / Vimeo / SoundCloud / Spotify link | the embedded player and its title |

Then it **places the item for you**:
- **rooms** from the type (paper/talk/poster → Research, dataset/software → Data & Code, performance/demo → Art & Music);
- **places** by matching the text against each place's `match:` words (e.g. "fMRI" → Neuroimaging, "Mario" →
  Videogames). Tick places in the form to override.

It opens a **pull request** listing the files and its choices. Look at it, fix anything by editing the files in the
pull request, then **Merge** → live in about 2 minutes. Tick *publish directly* in the form to skip the review.

**B. In the terminal:** `npm run add` asks the same questions (you can start with `npm run add -- --link 10.1162/…`).

Where things go: papers and preprints → `src/content/publications.yaml`; talks, posters, performances, demos, media,
teaching → `src/content/events.yaml`; projects, datasets and software → a new folder in `src/content/projects/`.
Give a paper or a talk a **project** (its folder name) and it automatically shows up on that project's page.

## 4. "I want to…" — which file to edit

| I want to… | Edit |
|---|---|
| add a project, paper, talk, performance… | the **New item** form, or `npm run add` |
| change my position, profiles, email, Discord invite | `src/data/site.yaml` |
| change the About text | `src/content/pages/about-en.md` and `about-fr.md` |
| change the timeline on About | `src/data/timeline.yaml` |
| move an item to other places or rooms | its `keywords:` and `sections:` lists |
| make an item bigger in the collages | `featured: true` or `weight: 2` / `3` |
| hide an item without deleting it | `draft: true` (project) — it stays out of the live site |
| edit a project's text or links | `src/content/projects/<name>/en.md` (and `fr.md`) |
| add a cover image to a project | put `cover.jpg` next to `en.md`, add `cover: ./cover.jpg` and `coverAlt: …` |
| add figures, GIFs or short videos to a project | `figures:` in its `en.md` (section 5, "Images, figures and animations") |
| change the HYRUUK words | `src/data/hyruuk.yaml` |
| add or remap a place | `src/content/keywords.yaml` + draw it (section 7) |
| translate interface words | `src/i18n/ui.ts` |
| refresh the music | section 9 |

## 5. Projects in detail

Each project is a folder in `src/content/projects/`. The folder name is the address: `…/projects/<folder>/`.

```markdown
---
title: Gamer in the scanner
summary: One or two sentences (shown on tiles and lists, max ~260 characters).
start: 2020            # 2020, 2020-09 or 2020-09-15
end: 2026              # or "ongoing", or leave it out
sections: [research, code]          # rooms: research | code | art-music
keywords: [videogames, neuroimaging] # places — the FIRST one is where the project "lives"
featured: true          # optional: bigger tile
weight: 3               # optional: 1 (default) to 3 = importance in the collages
role: First author — experiment, analysis, paper    # optional
collaborators: [Lune Bellec, Karim Jerbi]           # optional
cover: ./cover.jpg      # optional (without it, the tile shows the matching part of the artwork)
coverAlt: Brain maps of videogame play               # required if cover is set
coverCredit: "Figure from Harel et al. 2026, CC BY 4.0"   # optional
links:
  - { label: "Paper", url: "https://doi.org/…", kind: paper }   # kind: paper preprint code data video audio demo website slides poster docs other
media:
  - { kind: youtube, id: 7iOb3PV1-dQ, title: "Numina" }        # youtube | vimeo | spotify | soundcloud
draft: false
---

The story of the project, in Markdown: **bold**, *italics*, [links](https://…), lists…
```

- Put labels in "quotes" if they contain a comma or a colon.
- Papers and talks are **not** listed in the project file: they point to the project (`projects: [folder]`) and
  appear on its page automatically.
- Embedded players (`media:`) only load when a visitor clicks them.

### Images, figures and animations

Put image files next to `en.md`; the site makes every size and format it needs (AVIF/WebP) when it builds.

```yaml
cover: ./cover.png                 # the tile picture (circle for research, 16:10 for code, 4:5 for art & music)
coverAlt: What the picture shows   # for screen readers
coverCredit: "Adapted from Fig. 3 of Doe et al. (2026) — CC BY 4.0"   # optional, shown under the cover
coverFocus: "50% 30%"              # optional: which part to keep when a tile crops it (left→right, top→bottom)
coverVideo: /media/<folder>/loop.mp4   # optional silent loop: plays on the project page, and on hover in tiles
figures:                           # shown after the text, in this order
  - src: ./figure1.png
    alt: What the figure shows                          # or  alt: { en: "…", fr: "…" }
    caption:
      en: "One or two sentences."
      fr: "Une ou deux phrases."
    credit: "Doe et al. (2026), Journal, Fig. 1 — CC BY 4.0"   # optional
    style: plate      # normal (default) · wide (full width) · plate (white backing, for paper figures) · small
  - src: ./demo.png                 # a still frame…
    video: /media/<folder>/demo.mp4 # …and the silent loop that replaces it
    alt: What the animation shows
```

- **GIFs work** as `src:` (the site keeps them animated). Long or large GIFs are much lighter as MP4 videos: put the
  video in `public/media/<folder>/` and convert it with
  `ffmpeg -i demo.gif -an -vf "fps=25,format=yuv420p" -c:v libx264 -crf 26 -movflags +faststart demo.mp4`
  (and `ffmpeg -i demo.mp4 -frames:v 1 demo.png` for the still frame).
- Videos play muted and loop, only while they are on screen, never for visitors who ask their system for reduced
  motion, and always with a pause button.
- **Licences:** figures from open-access papers under CC BY can be used and adapted with a credit (say "adapted" if
  you cropped or recoloured them). CC BY-NC-ND figures may only be shown unchanged. Third-party posters and photos need
  the owner's permission.

## 6. Papers, talks and other entries

`src/content/publications.yaml` and `src/content/events.yaml` are lists; each entry starts with `- id:`. Copy an
existing entry and change it, or use the New item form. Notes:

- `authors: ["Harel, Y.", "Bellec, L."]` — keep the quotes (each name contains a comma).
- `doi:` without `https://doi.org/`.
- `status:` for unpublished work: `in-preparation`, `under-review`, `in-press`, `preprint`.
- `keywords:` only if the entry has no `projects:` (an entry inherits its project's places).

## 7. Places on the artwork (keywords and regions)

A place has two parts:

1. **Its definition** in `src/content/keywords.yaml`: `id` (used in addresses — lowercase and dashes), `label` and
   `blurb` in English and French, an `accent` colour, its `order` along the panorama, and `match:` words used to
   suggest it for new items. A new place gets its page immediately.
2. **Its region on the art** in `src/data/regions.yaml` — draw it with the **region editor**:
   `npm run dev`, then open **http://localhost:4321/dev/regions/**:
   - pick the place, click on the art to add points (click the first point to close a shape; "New shape" for
     another area of the same place);
   - **Shift**+click sets the label position, **Alt**+drag draws the camera rectangle (what the place page zooms on);
   - drag points to adjust, Ctrl/⌘+Z to undo;
   - copy the YAML and paste it over that place's block in `regions.yaml` (keep the `extras:` block at the end).

After adding a place, run `npm run sync:forms` so the New item form lists it (the build reminds you if you forget).

## 8. French

English pages live at `/…`, French at `/fr/…`. For a project, add `fr.md` next to `en.md` with a French `title`,
`summary` and text. Without it, the French page shows the English text with a small notice — nothing breaks.
Places have `label:`/`blurb:` with `en` and `fr`. Interface words (menus, buttons) are in `src/i18n/ui.ts`.
The French texts were written in neutral form; adjust them to your taste.

## 9. HYRUUK, music, Discord

- **HYRUUK** (`src/data/hyruuk.yaml`): "Harel Yann's {R} {U} of {U} {K}". Add or remove words; give a word
  `weight: 0.3` to make it rare, `0` (or a `#` in front of the line) to disable it. The build refuses words that don't
  start with their letter.
- **Music**: the wave plays random tracks from `public/data/liked-tracks.json`. To refresh it, export your playlist
  as CSV with [Exportify](https://exportify.app), then `npm run spotify -- ~/Downloads/Liked_Songs.csv` and commit.
  (Visitors not logged in to Spotify hear 30-second previews — a Spotify rule; the player then shows a short note.
  Spotify's player has no volume control, so the music cannot fade in.) Until a visitor first uses it, the wave gently
  "breathes" and a small "♪ play music" hint appears once per visit.
- **Brains & Games**: paste the permanent invite link in `site.yaml → discord.invite`; the description is in
  `src/content/projects/brains-and-games/en.md` / `fr.md`. For a live "N online" count, enable the server widget in
  Discord (Server Settings → Widget) and put the server ID in `discord.serverId`.

## 10. Publishing, and when a build fails

Every push to `main` runs the **Deploy** workflow: checks → tests → build → publish. Follow it in the **Actions** tab
(or `gh run watch`).

If something is wrong, the run turns **red ✗**, GitHub emails you, and **nothing is published — the live site stays
on its last good version.** Open the failed run; the message names the file and the field, for example:

```
[InvalidContentEntryDataError] projects → cneuromod-mario data does not match collection schema.

  keywords.0: Invalid option: expected one of "videogames"|"neuroimaging"|"bci"|"neuro-ai"|"music"|"consciousness"|"creativity"
```

Read it as *collection → entry → field (`keywords.0` = the first keyword): what was expected*. Fix the file and push again. Common causes: a misspelled
place or room, a missing quote around a label with a comma, a date like `2024/05` (use `2024-05`), a project
folder name that doesn't exist. From the terminal: `gh run view --log-failed`.

To undo a change: `git revert <commit>` then push (or revert it on github.com).

## 11. Changing the artwork

The art is stored as a master image (`assets-src/world/world-master.webp`), turned into web-ready sizes by:

```bash
npm run world -- --import path/to/new-image.png   # must keep the 1210 × 900 proportions
```

Positions on the art are in "world units" (the art is always 1210 × 900 units, whatever its resolution), so a sharper
version of the *same* picture needs nothing else. A *different* picture needs its regions redrawn (section 7).

## 12. Cheat sheet

```bash
npm run dev            # live preview at http://localhost:4321 (region editor at /dev/regions/)
npm run add            # add an item, placed automatically
npm run ci             # everything GitHub checks before publishing
npm run build          # build the site into dist/ (+ link check)
npm run preview        # serve dist/ locally
npm test               # unit tests       ·   npm run e2e   # browser tests (after a build)
npm run sync:forms     # refresh the New item form after editing keywords.yaml
npm run spotify -- file.csv   # refresh the music list
npm run world -- --import img # replace the artwork
```
