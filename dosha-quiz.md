# Dosha Quiz — Krystine St-Laurent / Inspirata Ayurveda

Export of the Compass Quiz (Quiz Boussole) as implemented in the Krystine site.
Bilingual content (FR / EN). 10 dimensions, one pick per question, dominant
dosha = highest count. Source: `src/pages/QuizPage.tsx`, `src/lib/doshaRituals.ts`,
`src/content.ts`.

---

## Header copy

- **Eyebrow (FR):** Connaître votre nature — **(EN):** Know your nature
- **Title (FR):** Quiz Boussole — découvrez votre dosha (Vata, Pitta, Kapha)
- **Title (EN):** Compass Quiz — discover your dosha (Vata, Pitta, Kapha)

### "What is Ayurveda" intro
- **FR:** Science sœur du Yoga, l'Ayurveda est une sagesse ancestrale vieille de 5000 ans qui nous invite à reconnecter avec les rythmes de la nature. Elle ne traite pas seulement les symptômes, mais cherche à rétablir l'harmonie unique entre le corps, l'âme et l'esprit.
- **EN equivalent:** Sister science to Yoga, Ayurveda is a 5,000-year-old wisdom inviting us to reconnect with the rhythms of nature. It does not only treat symptoms — it restores the unique harmony of body, soul and mind.

### Quiz prompt
- **FR:** L'ayurveda considère que nous sommes constitués des cinq éléments – Espace, Air, Feu, Eau et Terre – et que leur combinaison donne naissance aux trois doshas : Vata (vent), Pitta (feu) et Kapha (eau). Complétez le quiz pour découvrir votre dominance actuelle.
- **EN:** Ayurveda considers us as made of five elements — Space, Air, Fire, Water and Earth — whose combination gives birth to the three doshas: Vata (wind), Pitta (fire), Kapha (water). Take the quiz to discover your current dominance.

---

## Scoring logic

- 10 questions, each offers exactly 3 options ordered **[Vata, Pitta, Kapha]**.
- User picks **one** option per question. The picked dosha gets +1.
- After all 10 answers, percentages = `count / 10 * 100` for each dosha.
- **Dominant** = the dosha with the highest count (ties resolved in order:
  Vata > Pitta > Kapha when tied — but rules cascade so the last condition
  to evaluate "wins": pitta tie-check, kapha tie-check, then vata final).
- The dominant dosha unlocks a personalized **ritual** (see end of file).
- Loyalty: completing the quiz awards 5 pts (idempotent on `quiz:{uid}`).

---

## The 10 questions

> Order is always [Vata, Pitta, Kapha]. Bilingual (FR / EN).

### 1. Constitution physique / Physical build
**FR:** Comment décririez-vous votre constitution physique ?
**EN:** How would you describe your physical build?

- **Vata —** Mince, jointures proéminentes, peu de protection sur l'ensemble du corps. / Thin, prominent joints, little padding on the body overall.
- **Pitta —** Constitution moyenne et symétrique, bonne musculature. / Medium, symmetrical build with good musculature.
- **Kapha —** Constitution solide, peau douce et bien hydratée, prend du poids facilement. / Solid build, soft well-hydrated skin, gains weight easily.

### 2. Sommeil / Sleep
**FR:** Comment dormez-vous ?
**EN:** How do you sleep?

- **Vata —** Léger, tendance à s'éveiller facilement, difficulté à me rendormir. / Light, wake easily, trouble falling back asleep.
- **Pitta —** Régulier et profond, je me rendors facilement. / Regular and deep, I fall back asleep easily.
- **Kapha —** Long et profond, difficulté à me lever le matin. / Long and deep, hard to wake up in the morning.

### 3. Digestion / Digestion
**FR:** Comment décririez-vous votre digestion ?
**EN:** How would you describe your digestion?

- **Vata —** Irrégulière, ballonnements et gaz fréquents, appétit variable d'un jour à l'autre. / Irregular, frequent bloating and gas, variable appetite day to day.
- **Pitta —** Forte, j'ai faim à heures fixes, irritable si je saute un repas. / Strong, hungry at set times, irritable if I skip a meal.
- **Kapha —** Lente mais stable, je peux facilement sauter un repas sans inconfort. / Slow but stable, I can easily skip a meal without discomfort.

### 4. Réaction au stress / Stress response
**FR:** Comment réagissez-vous au stress ?
**EN:** How do you react to stress?

- **Vata —** Culpabilité, tendance à l'anxiété, bavardage mental. / Guilt, tendency toward anxiety, mental chatter.
- **Pitta —** Irritabilité, impatience, tendance à vouloir contrôler. / Irritability, impatience, tendency to control.
- **Kapha —** Calme en apparence, tendance à surprotéger, résistance au changement. / Calm on the surface, tendency to overprotect, resistance to change.

### 5. Énergie dans la journée / Daytime energy
**FR:** Comment se distribue votre énergie au fil de la journée ?
**EN:** How does your energy unfold during the day?

- **Vata —** En dents de scie, pics d'énergie suivis de chutes brutales. / Jagged — energy spikes followed by sharp drops.
- **Pitta —** Soutenue et intense jusqu'en fin de journée, difficile à éteindre. / Sustained and intense through the evening, hard to turn off.
- **Kapha —** Lente à démarrer le matin, constante une fois lancée, endurance naturelle. / Slow to start in the morning, steady once going, natural endurance.

### 6. Relation au changement / Relationship to change
**FR:** Comment vivez-vous le changement ?
**EN:** How do you experience change?

- **Vata —** J'adore la nouveauté, je m'ennuie vite dans la routine. / I love novelty, I get bored quickly with routine.
- **Pitta —** J'initie le changement lorsqu'il est logique, je déteste le chaos imposé. / I initiate change when it's logical, I hate imposed chaos.
- **Kapha —** Je préfère la stabilité, le changement me demande un effort conscient. / I prefer stability, change takes conscious effort.

### 7. Qualité du mental / Mental quality
**FR:** Quelle est la qualité dominante de votre mental ?
**EN:** What is the dominant quality of your mind?

- **Vata —** Vif mais dispersé, plusieurs idées en même temps. / Quick but scattered, several ideas at once.
- **Pitta —** Précis, analytique, orienté vers la résolution, parfois trop critique. / Precise, analytical, solution-oriented, sometimes too critical.
- **Kapha —** Calme, réfléchi, prend le temps de digérer avant de répondre. / Calm, reflective, takes time to digest before answering.

### 8. Relation aux émotions / Relationship to emotions
**FR:** Comment traversez-vous vos émotions ?
**EN:** How do you move through your emotions?

- **Vata —** Je ressens intensément et brièvement, mes émotions changent vite. / I feel intensely and briefly, my emotions change quickly.
- **Pitta —** Les émotions montent en chaleur : frustration, colère, impatience. / Emotions rise as heat: frustration, anger, impatience.
- **Kapha —** Les émotions s'accumulent lentement : tristesse profonde, attachement. / Emotions accumulate slowly: deep sadness, attachment.

### 9. Type de fatigue / Type of fatigue
**FR:** À quoi ressemble votre fatigue quand elle survient ?
**EN:** What does your fatigue look like when it hits?

- **Vata —** Épuisement nerveux, sensation d'être vidé·e, surmenage mental. / Nervous exhaustion, feeling drained, mental overload.
- **Pitta —** Épuisement par surchauffe : irritabilité, yeux rouges, maux de tête. / Exhaustion from overheating: irritability, red eyes, headaches.
- **Kapha —** Lourdeur, envie de ne rien faire, difficulté à se motiver. / Heaviness, wanting to do nothing, difficulty motivating.

### 10. Tempérament / Temperament
**FR:** Comment décririez-vous votre tempérament ?
**EN:** How would you describe your temperament?

- **Vata —** Vivant, enthousiaste, parole facile, aime le changement. / Lively, enthusiastic, easy speaker, loves change.
- **Pitta —** Puissant et intense, direct, aime convaincre. / Powerful and intense, direct, loves to persuade.
- **Kapha —** Stable, adaptable, bon vivant, ancré. / Stable, adaptable, easy-going, grounded.

---

## Dosha definitions (result cards)

### Vata — Vent & Espace / Wind & Space
- **Action (FR):** Enraciner, réchauffer et apaiser
- **Action (EN):** Ground, warm and soothe
- **FR:** Vata gouverne tout ce qui bouge. Il est sec, léger, froid, rugueux, subtil et mobile.
- **EN:** Vata governs movement. It is dry, light, cold, rough, subtle and mobile.
- **Product:** Huile Corporelle Vata / Vata Body Oil
- **Accent color:** `#8F9779` (sage)

### Pitta — Feu & Eau / Fire & Water
- **Action (FR):** Rafraîchir, apaiser et adoucir
- **Action (EN):** Cool, soothe and soften
- **FR:** Pitta gouverne la digestion et le métabolisme. Il est chaud, tranchant, léger, liquide et huileux.
- **EN:** Pitta governs digestion and metabolism. It is hot, sharp, light, liquid and oily.
- **Product:** Huile Corporelle Pitta / Pitta Body Oil
- **Accent color:** `#BC4A3C` (terracotta)

### Kapha — Eau & Terre / Water & Earth
- **Action (FR):** Activer et stimuler
- **Action (EN):** Activate and stimulate
- **FR:** Kapha gouverne la structure et la lubrification. Il est lourd, froid, lent, onctueux, doux et statique.
- **EN:** Kapha governs structure and lubrication. It is heavy, cold, slow, unctuous, soft and static.
- **Product:** Huile Corporelle Kapha / Kapha Body Oil
- **Accent color:** `#4A7C9D` (slate-blue)

---

## Rituals (unlocked by dominant dosha)

> Transcribed from Krystine's "Guide Rituels Inspirata Ayurveda — Partie 1".

### Vata — Rituel du soir / Evening ritual
- **Subtitle (FR):** Automassage apaisant à l'Huile Corporelle Apaisante VATA
- **Subtitle (EN):** Soothing self-massage with the Soothing Vata Body Oil
- **Moment (FR):** Le soir, avant le coucher
- **Moment (EN):** Evening, before bed
- **Accent:** `#8F9779`

**Steps (FR):**
1. Avant de vous coucher, prenez un moment pour un automassage des plus relaxants.
2. Prenez une pompe de l'Huile Corporelle Apaisante VATA et massez vos avant-bras et vos jambes.
3. Laissez vos muscles se détendre et sentez votre esprit se bercer, porté par les douces odeurs de lavande et de mélisse.

**Steps (EN):**
1. Before bed, take a moment for a deeply relaxing self-massage.
2. Take a pump of the Soothing Vata Body Oil and massage your forearms and legs.
3. Let your muscles soften and your mind drift into the gentle scents of lavender and lemon balm.

### Pitta — Rituel matinal / Morning ritual
- **Subtitle (FR):** Automassage rafraîchissant à l'Huile Corporelle Rafraîchissante PITTA
- **Subtitle (EN):** Cooling self-massage with the Refreshing Pitta Body Oil
- **Moment (FR):** Le matin, sous la douche
- **Moment (EN):** Morning, in the shower
- **Accent:** `#BC4A3C`

**Steps (FR):**
1. Durant la douche matinale à l'eau fraîche, une fois le corps lavé, déposez une petite quantité d'Huile Corporelle Rafraîchissante PITTA et mélangez-la à l'eau pour un massage frais et tonifiant.
2. Prenez le temps de masser pour bien faire pénétrer l'huile.
3. Sortez ensuite de la douche et épongez, ou rincez à l'eau un peu plus froide pour un effet rafraîchissant.
4. Environ 10 minutes plus tard, la peau aura absorbé l'huile et vous pourrez vous habiller sans risquer de tâcher vos vêtements.

**Steps (EN):**
1. During a cool morning shower, once your body is washed, apply a small amount of the Refreshing Pitta Body Oil and blend it with the water for a fresh, tonifying massage.
2. Take your time to massage so the oil penetrates.
3. Step out and pat dry, or rinse with slightly cooler water for an even fresher finish.
4. About 10 minutes later, the skin will have absorbed the oil and you can dress without staining your clothes.

### Kapha — Rituel matinal / Morning ritual
- **Subtitle (FR):** Automassage vigoureux à l'Huile Corporelle Énergisante KAPHA
- **Subtitle (EN):** Vigorous self-massage with the Energizing Kapha Body Oil
- **Moment (FR):** Le matin, après le brossage à sec et la douche
- **Moment (EN):** Morning, after dry brushing and showering
- **Accent:** `#4A7C9D`

**Steps (FR):**
1. Commencez par le brossage à sec avant la douche (environ 3 fois par semaine).
2. Après la douche, le corps encore enduit d'eau et les pores ouverts, prenez une petite quantité d'Huile Corporelle Énergisante KAPHA et massez les bras, la poitrine et le ventre avec des mouvements vigoureux pour activer la circulation.
3. Reprenez un peu d'huile au besoin et massez sous les aisselles en levant le bras, avec des mouvements dirigés vers le coeur.
4. Massez le contour des seins et de la poitrine, idem pour le ventre.
5. Environ 10 minutes plus tard, la peau aura absorbé l'huile et vous pourrez vous habiller.

**Steps (EN):**
1. Start with dry brushing before your shower (about three times a week).
2. After showering, while the body is still damp and pores are open, take a small amount of the Energizing Kapha Body Oil and massage arms, chest and belly with vigorous strokes to wake circulation.
3. Reapply as needed and massage under the arms, raising the arm and sweeping strokes toward the heart.
4. Massage around the chest and belly.
5. About 10 minutes later, the skin will have absorbed the oil and you can dress.

---

## SEO / AEO body copy on the quiz page

### À quoi sert ce quiz ? (FR)
Le Quiz Boussole identifie en cinq questions votre dosha dominant — *Vata* (mouvement, vent, espace), *Pitta* (transformation, feu, eau), ou *Kapha* (structure, terre, eau). Cette signature ayurvédique sert de point d'ancrage pour orienter votre alimentation, votre rythme de vie et vos rituels. Le résultat n'a pas vocation à remplacer un avis clinique : il propose une porte d'entrée fidèle à la tradition, alignée avec les définitions reconnues par la National Ayurvedic Medical Association et la lecture transmise par le Chopra Center — où Krystine s'est formée comme Ayurvedic Lifestyle trainer.

> Note: the page copy says "cinq questions" but the implementation has 10. This is a known marketing/implementation drift — confirm whether to harmonise.

### Et après le résultat ? (FR)
Selon votre dominante, le quiz oriente vers une lecture, un programme ou un rituel adapté à votre saison personnelle. Une dominante Vata appelle souvent les programmes saisonniers d'apaisement et d'ancrage ; toutes les constitutions trouvent un cadre dans l'Expérience Origine, le parcours de douze semaines qui réunit le travail de la Trilogie d'Origine. Pour aller plus loin, le guide personnalisé rassemble vos prochaines étapes après le quiz.

### Pourquoi cinq questions seulement ? (FR)
L'objectif n'est pas de poser un diagnostic, mais d'ouvrir une conversation avec votre corps. Cinq questions suffisent pour relever vos tendances dominantes ; le travail d'observation se poursuit ensuite, idéalement sur plusieurs cycles, comme le détaille le podcast Au-delà des tendances. Les doshas ne sont pas des cases : ce sont des forces qui montent et descendent avec les saisons, l'âge, l'alimentation et le stress.

### EN equivalents
- **What this quiz is for** — five-question entry point, not a diagnosis, aligned with NAMA + Chopra Center reference frames.
- **What comes after the result** — points to seasonal programs, the 12-week Origin Experience, the Origin Trilogy, or the personalized guide.
- **Why only five questions** — observation continues across cycles; doshas are forces, not boxes.

---

## Implementation notes (for the next Claude conversation)

- **Source files:**
  - `src/pages/QuizPage.tsx` — quiz UI, state machine, scoring, result modal.
  - `src/lib/doshaRituals.ts` — `RITUALS` map + `ritualForDosha()` helper.
  - `src/content.ts` — `CONTENT.{FR,EN}.ayurveda` block (intro copy + doshas array).
- **Persistence:** `addDoshaQuizResult()` writes to Firestore (`firebase/firestore`), `updateMember(uid, { dosha })` updates the member doc, `points.quizCompleted(uid)` grants 5 loyalty pts (idempotent).
- **Auth flow:** user must sign in to save; if they finish the quiz signed-out, a teaser is shown and `setSignInOpen(true)` opens the sign-in modal. The effect at `QuizPage.tsx` lines 323–328 auto-saves when sign-in completes mid-flow.
- **Cart hookup:** result CTA adds the dominant dosha's body oil to cart via `findOilForDosha(products, doshaName)` (`src/lib/shopifyOil.ts`), falling back to `/boutique/huiles-corporelles` if not found.
- **Tie-break (current code):**
  ```ts
  let dominant = ay.doshas[0];                                  // default Vata
  if (pitta >= vata && pitta >= kapha) dominant = ay.doshas[1]; // Pitta wins ties
  if (kapha >= vata && kapha >= pitta) dominant = ay.doshas[2]; // Kapha overrides if it ties top
  if (vata >= pitta && vata >= kapha)  dominant = ay.doshas[0]; // Vata is last, so Vata wins all-three ties
  ```
  Worth a sanity-check if dominance behaviour ever feels off — the cascade order matters.
