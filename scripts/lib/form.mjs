/**
 * The "New item" form, defined once and used twice:
 *   - scripts/sync-forms.mjs turns it into .github/ISSUE_TEMPLATE/new-item.yml (GitHub issue form)
 *   - scripts/add-item.mjs parses issues created with it
 * Labels matter: the parser finds fields by their label.
 */
import { ROOMS, TYPES } from './classify.mjs';

export function formFields(keywords) {
  return [
    { id: 'type', label: 'Type', kind: 'dropdown', options: TYPES, required: true },
    {
      id: 'link',
      label: 'Main link',
      kind: 'input',
      description: 'A DOI (10.xxxx/…), a GitHub repository, a YouTube / Vimeo / SoundCloud / Spotify link, or any web page. Most fields are filled in from it.',
    },
    { id: 'title', label: 'Title', kind: 'input', description: 'Leave empty to use the title found from the link.' },
    { id: 'date', label: 'Date', kind: 'input', description: '2026, 2026-05 or 2026-05-14. Empty = from the link, or today.' },
    { id: 'summary', label: 'Summary (English)', kind: 'textarea', description: '1–3 sentences, shown on tiles and lists.' },
    { id: 'summary_fr', label: 'Summary (French, optional)', kind: 'textarea' },
    { id: 'event', label: 'Event or venue', kind: 'input', description: 'For talks, posters, performances, media: e.g. "OHBM 2027". For papers: the journal (filled from the DOI).' },
    { id: 'location', label: 'Location', kind: 'input', description: 'City, country — or "Online".' },
    { id: 'project', label: 'Part of project', kind: 'input', description: 'Optional: the folder name of an existing project, e.g. cneuromod-mario. The item then appears on that project page.' },
    {
      id: 'rooms',
      label: 'Rooms',
      kind: 'checkboxes',
      description: 'Leave empty to choose automatically from the type.',
      options: ROOMS.map((r) => ({ value: r, label: r })),
    },
    {
      id: 'places',
      label: 'Places',
      kind: 'checkboxes',
      description: 'Leave empty to let the robot suggest places from the text (the pull request will say which).',
      options: keywords.map((k) => ({ value: k.id, label: `${k.id} — ${k.label.en}` })),
    },
    { id: 'links', label: 'Other links', kind: 'textarea', description: 'One per line: `Label | https://…`' },
    { id: 'image', label: 'Cover image', kind: 'textarea', description: 'Projects only: drag and drop an image here.' },
    {
      id: 'options',
      label: 'Options',
      kind: 'checkboxes',
      options: [
        { value: 'featured', label: 'featured — show it bigger' },
        { value: 'publish', label: 'publish directly — skip the pull request' },
      ],
    },
  ];
}

/** Parse the Markdown body GitHub generates for an issue form. */
export function parseIssueBody(body, fields) {
  const sections = {};
  const parts = String(body ?? '').split(/^###\s+/m).slice(1);
  for (const part of parts) {
    const nl = part.indexOf('\n');
    const label = part.slice(0, nl).trim();
    sections[label] = part.slice(nl + 1).trim();
  }
  const out = {};
  for (const f of fields) {
    const raw = sections[f.label];
    if (raw === undefined || raw === '_No response_' || raw === 'None') continue;
    if (f.kind === 'checkboxes') {
      const checked = [...raw.matchAll(/^- \[[xX]\] (.+)$/gm)].map((m) => m[1].trim());
      out[f.id] = f.options.filter((o) => checked.includes(o.label)).map((o) => o.value);
    } else {
      out[f.id] = raw;
    }
  }
  return out;
}

/** GitHub issue-form YAML for the fields. */
export function issueFormYaml(fields) {
  const body = [
    {
      type: 'markdown',
      attributes: {
        value:
          'Add something to the website. A link is often enough: the robot fills in the rest, places the item in the right rooms and places, and opens a pull request for you to check. Merge it and the site updates in about 2 minutes.',
      },
    },
    ...fields.map((f) => {
      const attributes = { label: f.label };
      if (f.description) attributes.description = f.description;
      if (f.kind === 'dropdown') attributes.options = f.options;
      if (f.kind === 'checkboxes') attributes.options = f.options.map((o) => ({ label: o.label }));
      const item = { type: f.kind, id: f.id, attributes };
      if (f.required) item.validations = { required: true };
      return item;
    }),
  ];
  return {
    name: 'New item',
    description: 'Add a project, paper, talk, performance… to the website',
    title: '[new] ',
    labels: ['new-item'],
    body,
  };
}
