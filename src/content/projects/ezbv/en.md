---
title: ezbv — EZ Brain Viewer
summary: A small Python tool to highlight brain regions in 3D and export figure-ready PNGs and GIFs.
start: 2026
end: ongoing
sections: [code]
keywords: [neuroimaging]
links:
  - { label: "Code", url: "https://github.com/hyruuk/ezbv", kind: code }
cover: ./cover.png
coverAlt: Brain slices lit in rainbow colours along a glowing curve, from the ezbv banner
figures:
  - src: ./rotation.png
    video: /media/ezbv/rotation.mp4
    alt:
      en: A translucent 3D brain slowly rotating, with a few structures inside it highlighted in colour
      fr: Un cerveau 3D translucide qui tourne lentement, quelques structures internes surlignées en couleur
    caption:
      en: A rotating GIF exported by ezbv.
      fr: Un GIF rotatif exporté par ezbv.
  - src: ./cortex.png
    alt:
      en: Side view of a translucent brain with four cortical regions highlighted and labelled
      fr: Vue latérale d'un cerveau translucide, quatre régions corticales surlignées et nommées
    caption:
      en: Labelled regions, ready for a slide.
      fr: Des régions nommées, prêtes pour une diapositive.
---

Making a clean 3D brain figure that highlights a few regions should not take an afternoon. ezbv does it in a couple of
lines of Python and exports PNG images or rotating GIFs ready for slides and papers.
