## README.md

```md
# Tour de France – Deux interfaces (Jeune & Valideur)

Prototype sans framework, **deux pages**:
- `jeune.html` : l'apprenant entre un **code** et soumet **3 villes** + **justification**.
- `valideur.html` : le bénévole **voit les choix**, lit la justification, et **valide l'affectation** vers un poste disponible.

## Données & sécurité
- Démo 100% locale: les données sont stockées dans le **localStorage** du navigateur. Pour du multi‑utilisateur réel (jeunes sur téléphone, validateurs au centre), utilisez un backend (ex: **Firebase** Auth + Firestore) ou une API maison (Node/Express + PostgreSQL). La structure de données ici est prête à être synchronisée côté serveur.

## Démarrage
1. Copiez les fichiers dans un dossier.
2. Ouvrez `valideur.html` pour gérer villes/entreprises/postes et distribuer les **codes apprenant**.
3. Ouvrez `jeune.html` et testez avec un des codes générés/présents dans les données seed (ex: consultez `valideur.html` → bouton **Code** pour un jeune).

## Flux
1. Le **jeune** se connecte avec son **code**, choisit **3 villes distinctes** et écrit une **justification**.
2. Le **valideur** consulte la liste, filtre/recherche, lit la justification et **valide** sur une des **3 villes** ; il choisit **entreprise + poste** selon la **capacité disponible**.
3. Une fois **validé**, le jeune ne peut plus modifier ses choix.

## Extensions possibles
- Authentification (e‑mail / lien magique), historique d’actions, rôles (lecture seule), exports CSV, quotas par statut/villes, formulaires sans `prompt` pour la création de postes.
```
