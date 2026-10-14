---
title: SAflow — waves of attention
summary: Why does attention wax and wane? MEG recordings during a sustained-attention task link moment-to-moment performance to both rhythmic and arrhythmic (aperiodic) brain activity.
start: 2016
end: ongoing
sections: [research, code]
keywords: [consciousness, neuroimaging, neuro-ai]
weight: 2
links:
  - { label: "Code", url: "https://github.com/hyruuk/saflow", kind: code }
  - { label: "Archived analysis code (Zenodo)", url: "https://doi.org/10.5281/zenodo.16450731", kind: code }
  - { label: "gradCPT task", url: "https://github.com/hyruuk/gradcpt", kind: code }
cover: ./cover.png
coverAlt: A brain seen from above, its 400 cortical regions drawn as coloured dots linked by thin curves
coverCredit: Schaefer atlas (400 regions, 7 networks), drawn by the SAflow analysis code
figures:
  - src: ./gradcpt-demo.png
    video: /media/saflow/gradcpt-demo.mp4
    style: small
    alt:
      en: Grey-scale city streets slowly morphing into one another inside a round frame
      fr: Des rues de ville en noir et blanc qui se fondent lentement les unes dans les autres, dans un cadre rond
    caption:
      en: "The task as participants see it (slowed down): each scene morphs into the next. Respond to cities, hold back for the rare mountains."
      fr: "La tâche telle que les participants la voient (au ralenti) : chaque scène se fond dans la suivante. On répond aux villes, on se retient pour les rares montagnes."
    credit: "Demo: gradcptpy by David Braun (MIT licence)"
  - src: ./gradcpt.png
    style: plate
    alt:
      en: Diagram of the gradCPT, with frequent city scenes, rare mountain scenes, a 853 ms trial and six task blocks
      fr: Schéma de la gradCPT, avec des scènes de ville fréquentes, de rares montagnes, un essai de 853 ms et six blocs
    caption:
      en: "The gradual-onset continuous performance task (gradCPT): a new scene every 853 ms, 90% cities and 10% mountains, in six blocks of eight minutes."
      fr: "La gradCPT (gradual-onset continuous performance task) : une nouvelle scène toutes les 853 ms, 90 % de villes et 10 % de montagnes, en six blocs de huit minutes."
  - src: ./pipeline.png
    style: wide
    alt:
      en: Analysis workflow from raw MEG through preprocessing, source reconstruction and features to statistics and machine learning
      fr: Chaîne d'analyse, du signal MEG brut au prétraitement, à la reconstruction de sources et aux mesures, jusqu'aux statistiques et à l'apprentissage automatique
    caption:
      en: From raw MEG to brain maps and classifiers, the analysis workflow.
      fr: Du signal MEG brut aux cartes cérébrales et aux classifieurs, la chaîne d'analyse.
---

Even when we try hard to stay focused, our performance drifts between steady "in the zone" periods and more erratic
ones. In the gradual-onset continuous performance task (gradCPT), these fluctuations can be tracked second by second.

Recording MEG while participants did the task, I used machine learning to decode these attentional states from brain
activity. The results point to two ingredients: classic oscillations — the periodic part of the brain's spectrum —
*and* the background, aperiodic activity that is usually treated as noise. The work was presented at OHBM 2022 and at
ASSC 2024 in Tokyo; the paper is in preparation.

This project started my PhD question: can the neural signatures of attention tell us something about flow, the
absorbed state that videogames are so good at producing?
