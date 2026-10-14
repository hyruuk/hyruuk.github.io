---
title: Digital Brain Project
summary: Recording brains while people learn new videogames, for an open international dataset meant to train a foundation model of the human brain — with Momchil Tomov's team at Boston College.
start: 2026
end: ongoing
sections: [research, code]
keywords: [videogames, neuro-ai, neuroimaging]
featured: true
weight: 3
# TODO(Yann): adjust your role description
role: Postdoctoral researcher in Momchil Tomov's lab — game tasks and experiment engines
collaborators: [Momchil Tomov]
links:
  - { label: "digitalbrainproject.org", url: "https://www.digitalbrainproject.org/", kind: website }
  - { label: "Press release (July 2026)", url: "https://www.fo-rothschild.fr/sites/default/files/2026-07/DigitalBrainProject-Scaling-PressRelease_EN_1.pdf", kind: other }
  - { label: "dbp_tasks — experiment engine", url: "https://github.com/hyruuk/dbp_tasks", kind: code }
  - { label: "vgdl_task — VGDL games in the scanner", url: "https://github.com/hyruuk/vgdl_task", kind: code }
  - { label: "mario_task", url: "https://github.com/hyruuk/mario_task", kind: code }
  - { label: "fmri-gym", url: "https://github.com/tomov/fmri-gym", kind: code }
---

How does a brain learn a world it has never seen before, plan in it, and generalise what it learned? The
[Digital Brain Project](https://www.digitalbrainproject.org/) attacks this question at scale: teams around the world
record brain activity while people play interactive games, solve problems and make decisions inside MEG and
high-field MRI scanners, and share everything openly. The data will train an open-source foundation model of the
human brain — a "digital twin" that should respond to a new situation the way a real brain does.

The project is coordinated by the Rothschild Hospital Foundation, funded by Meta, in partnership with the Université
de Montréal. In June 2026, nine teams were selected out of 58 applications — among them
[Momchil Tomov](https://www.bc.edu/bc-web/schools/morrissey/departments/psychology-neuroscience.html)'s team at
Boston College, where I am a postdoc.

Our part: games in which people have to *learn* — new rules, new worlds, new goals — while we image their brains.
I build the experiment side, open-source and reproducible:

- **dbp_tasks** — an engine for deterministic videogame experiments across behaviour, fMRI, MEG and intracranial EEG;
- **vgdl_task** — a runner for games written in the Video Game Description Language, reproducing the scanner task of
  Tomov et al. (2023), and contributions to **fmri-gym**, which turns Gymnasium environments into fMRI experiments;
- **mario_task** — a reproducible Super Mario Bros. runner with EEG/iEEG markers and BIDS output, building on
  [CNeuroMod Mario](/projects/cneuromod-mario/).
