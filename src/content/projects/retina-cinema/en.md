---
title: ReTiNA-Cinema
summary: Real-time neuro-augmented cinema — a viewer's EEG complexity steers a generative image model that remixes the film as they watch it.
start: 2024
end: 2024
sections: [art-music, research]
keywords: [bci, creativity, neuro-ai]
links:
  - { label: "Paper (NeurIPS 2024 workshop)", url: "https://creativity-ai.github.io/assets/papers/55.pdf", kind: paper }
  - { label: "Code", url: "https://github.com/KairosHive/retina-cinema", kind: code }
  - { label: "Videos", url: "https://www.youtube.com/playlist?list=PLMu36WzSQKiVeBnrUdwUAoUhqLqGX3_bw", kind: video }
media:
  - { kind: youtube, id: c55yhkRjims, title: "ReTiNA-Cinema demo" }
cover: ./cover.jpg
coverAlt: A frame of the film transformed by the generative model into a surreal painting of a giant figure lying by the sea
coverCredit: Frame from the ReTiNA-Cinema demo (Kairos ~ Hive), sharpened for display
figures:
  - src: ./poster.jpg
    style: wide
    alt:
      en: The NeurIPS 2024 poster, with the EEG feature extractor, the generative pipeline, the software patches and original versus augmented film frames
      fr: L'affiche NeurIPS 2024, avec l'extraction des mesures EEG, la chaîne générative, les patchs logiciels et des images de films originales et augmentées
    caption:
      en: "The NeurIPS 2024 poster: EEG complexity, computed in goofi-pipe, moves StreamDiffusion between two prompts while TouchDesigner remixes the film."
      fr: "L'affiche NeurIPS 2024 : la complexité de l'EEG, calculée dans goofi-pipe, fait glisser StreamDiffusion entre deux prompts pendant que TouchDesigner remixe le film."
    credit: Poster by Bellemare-Pepin, Thölke, Harel & Jerbi, NeurIPS 2024 Creative AI workshop
---

What if a film could see how you see it? ReTiNA-Cinema measures the complexity of a viewer's EEG in real time and uses
it to drive a generative image model that transforms the film as it plays. Built by Kairos ~ Hive with TouchDesigner
and goofi-pipe, and presented at the NeurIPS 2024 workshop on creativity and generative AI.
