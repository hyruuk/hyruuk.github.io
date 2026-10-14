---
title: Digital Brain Project
summary: Enregistrer le cerveau de personnes qui apprennent de nouveaux jeux vidéo, pour un jeu de données international et ouvert destiné à entraîner un modèle de fondation du cerveau humain — avec l'équipe de Momchil Tomov au Boston College.
---

Comment un cerveau apprend-il un monde qu'il n'a jamais vu, y planifie-t-il, et généralise-t-il ce qu'il a appris ?
Le [Digital Brain Project](https://www.digitalbrainproject.org/) s'attaque à cette question à grande échelle : des
équipes du monde entier enregistrent l'activité cérébrale de personnes qui jouent à des jeux interactifs, résolvent des
problèmes et prennent des décisions dans des scanners MEG et IRM à haut champ, et partagent tout en accès ouvert. Ces
données entraîneront un modèle de fondation libre du cerveau humain — un « jumeau numérique » qui devrait réagir à une
situation nouvelle comme le ferait un vrai cerveau.

Le projet est coordonné par la Fondation Adolphe de Rothschild, financé par Meta, en partenariat avec l'Université de
Montréal. En juin 2026, neuf équipes ont été retenues parmi 58 candidatures — dont celle de
[Momchil Tomov](https://www.bc.edu/bc-web/schools/morrissey/departments/psychology-neuroscience.html) au Boston
College, où je suis en postdoctorat.

Notre part : des jeux où il faut *apprendre* — de nouvelles règles, de nouveaux mondes, de nouveaux buts — pendant que
nous imageons le cerveau. Je construis le volet expérimental, libre et reproductible :

- **dbp_tasks** — un moteur d'expériences vidéoludiques déterministes, pour le comportement, l'IRMf, la MEG et l'EEG
  intracrânien ;
- **vgdl_task** — un lanceur de jeux écrits en Video Game Description Language, qui reproduit la tâche en scanner de
  Tomov et al. (2023), et des contributions à **fmri-gym**, qui transforme des environnements Gymnasium en expériences
  d'IRMf ;
- **mario_task** — un lanceur reproductible de Super Mario Bros. avec marqueurs EEG/iEEG et sortie BIDS, dans la
  continuité de [CNeuroMod Mario](/fr/projects/cneuromod-mario/).
