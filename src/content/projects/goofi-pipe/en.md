---
title: goofi-pipe
summary: An open-source, node-based framework for real-time biosignal processing — patch EEG, heart or breath signals into sound, visuals and AI without heavy coding.
start: 2023
end: ongoing
sections: [code]
keywords: [bci, music]
role: Contributor
links:
  - { label: "Code", url: "https://github.com/dav0dea/goofi-pipe", kind: code }
  - { label: "Kairos ~ Hive fork", url: "https://github.com/KairosHive/goofi", kind: code }
cover: ./cover.png
coverAlt: The goofi-pipe logo, a teal coral-like tree with an eye at its base
figures:
  - src: ./patch.png
    alt:
      en: "A goofi-pipe patch: nodes linked by cables, from a signal source through filters to plots"
      fr: "Un patch goofi-pipe : des nœuds reliés par des câbles, d'une source de signal à des filtres puis à des graphiques"
    caption:
      en: A basic signal-processing patch.
      fr: Un patch de traitement du signal de base.
    credit: goofi-pipe documentation
  - src: ./connectivity.png
    alt:
      en: A patch computing brain connectivity matrices and a spectrogram in real time
      fr: Un patch qui calcule en temps réel des matrices de connectivité cérébrale et un spectrogramme
    caption:
      en: Real-time connectivity and spectrogram.
      fr: Connectivité et spectrogramme en temps réel.
    credit: goofi-pipe documentation
  - src: ./classification.png
    alt:
      en: A patch classifying EEG states, with a scalp map of feature importances
      fr: Un patch qui classe des états EEG, avec une carte du scalp de l'importance des variables
    caption:
      en: Classifying mental states from EEG on the fly, with the most informative electrodes shown on the scalp.
      fr: Classer des états mentaux à partir de l'EEG à la volée, avec les électrodes les plus informatives sur le scalp.
    credit: goofi-pipe documentation
---

goofi-pipe is a visual, node-based environment for building real-time biofeedback systems: stream signals from EEG or
other sensors, process them, and send the results to music software, visuals or generative models. It powers several
of our art-science projects, ReTiNA-Cinema among them. I contribute to the code base and presented it at CuttingGardens
2023 in Montréal.
