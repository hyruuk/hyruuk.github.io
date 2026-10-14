import { describe, expect, it } from 'vitest';
import { loadKeywords, slugify, suggestPlaces, suggestRooms } from '../../scripts/lib/classify.mjs';
import { formFields, parseIssueBody } from '../../scripts/lib/form.mjs';
import { detectLink, initials } from '../../scripts/lib/metadata.mjs';

const keywords = loadKeywords(process.cwd());
const top = (text: string) => suggestPlaces(text, keywords).map((s: { id: string }) => s.id);

describe('automatic placement', () => {
  it('suggests places for existing items like a human would', () => {
    expect(top('Event-related analysis of fMRI activity during retro videogame play')).toEqual(expect.arrayContaining(['videogames', 'neuroimaging']));
    expect(top('Divergent creativity in humans and large language models')).toEqual(expect.arrayContaining(['creativity', 'neuro-ai']));
    expect(top('Real-time sonification of brain waves: a mobile EEG drives generative music')).toEqual(expect.arrayContaining(['bci', 'music']));
    expect(top('LSD reconfigures cortical dynamics through faster brain rhythms')).toEqual(expect.arrayContaining(['consciousness', 'neuroimaging']));
    expect(top('Fluctuations in sustained attention performance and the MEG spectrum')).toEqual(expect.arrayContaining(['consciousness', 'neuroimaging']));
    expect(top('An adaptive horror film whose soundtrack adapts to the viewer’s EEG')).toEqual(expect.arrayContaining(['creativity']));
    expect(top('Human-AI alignment of learning trajectories: a reinforcement learning benchmark in Super Mario')).toEqual(expect.arrayContaining(['neuro-ai', 'videogames']));
    expect(top('Brain-computer interface for locked-in patients')).toContain('bci');
    expect(top('Behind the decks: DJ set at the closing party')).toContain('music');
    expect(top('A large longitudinal fMRI dataset of people playing Super Mario Bros.')).toEqual(expect.arrayContaining(['videogames', 'neuroimaging']));
  });

  it('chooses rooms from the type', () => {
    expect(suggestRooms('paper')).toEqual(['research']);
    expect(suggestRooms('software')).toEqual(['code']);
    expect(suggestRooms('performance')).toEqual(['art-music']);
  });

  it('makes clean slugs and initials', () => {
    expect(slugify('Gamer in the scanner: Événements & jeux!')).toBe('gamer-in-the-scanner-evenements-jeux');
    expect(initials('Jean-François')).toBe('J.-F.');
    expect(initials('Pierre Henri')).toBe('P. H.');
  });

  it('recognises links', () => {
    expect(detectLink('https://doi.org/10.1371/journal.pone.0290158')).toMatchObject({ kind: 'doi', id: '10.1371/journal.pone.0290158' });
    expect(detectLink('10.1162/IMAG.a.1256')).toMatchObject({ kind: 'doi' });
    expect(detectLink('https://github.com/hyruuk/ezbv')).toMatchObject({ kind: 'github', id: 'hyruuk/ezbv' });
    expect(detectLink('https://youtu.be/7iOb3PV1-dQ')).toMatchObject({ kind: 'youtube', id: '7iOb3PV1-dQ' });
    expect(detectLink('https://open.spotify.com/track/2Xoi5QFiVByJM1dBHd7M5b')).toMatchObject({ kind: 'spotify', id: 'track/2Xoi5QFiVByJM1dBHd7M5b' });
  });

  it('parses the GitHub issue form', () => {
    const fields = formFields(keywords);
    const body = `### Type\n\ntalk\n\n### Title\n\nHello\n\n### Places\n\n- [X] music — Music\n- [ ] bci — Brain–computer interfaces\n\n### Summary (English)\n\n_No response_`;
    const parsed = parseIssueBody(body, fields);
    expect(parsed).toEqual({ type: 'talk', title: 'Hello', places: ['music'] });
  });
});
