// Rapatriement de « 21 jours de rituels : calendrier de l'Avent réinventé »,
// cohorte DÉCEMBRE 2025, depuis Kajabi (Krystine, 4 oct. 2026).
// Les leçons ont été relevées dans Kajabi (session de Krystine, lecture seule) :
// titre, module, texte du corps (sans les commentaires des participantes),
// vidéo ou audio Wistia, fichiers à télécharger. Les PDF et l'image ont été
// téléchargés dans le navigateur (l'accès exige la session Kajabi) puis déposés
// dans le dossier DOSSIER_FICHIERS ci-dessous, que ce script lit.
// Vidéos et audios : tirés du JSON public de Wistia. Le script les dépose dans
// Storage, puis écrit la formation MASQUÉE et ses leçons dans Firestore, au même
// format que rapatrier-rituels-vivants.mjs. Les leçons « hors parcours » sont
// placées à la fin avec horsParcours: true (Krystine tranche leur statut).
// Rien n'est publié : Krystine décide du prix et de l'ouverture.
// Usage : node scripts/kajabi/rapatrier-calendrier-avent.mjs [--a-blanc]
import { readFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { homedir } from 'node:os';
import { join } from 'node:path';

const A_BLANC = process.argv.includes('--a-blanc');
const PROJET = 'krystinestlaurent-87566';
const BUCKET = 'krystinestlaurent-87566.firebasestorage.app';
const ID = 'calendrier-avent';
const FS = `https://firestore.googleapis.com/v1/projects/${PROJET}/databases/(default)/documents`;
const DOSSIER_FICHIERS = '/private/tmp/claude-501/-Users-ksl-Documents-Inspira-Nature/531dbe96-e52e-4629-8067-ffc6c238b6a7/scratchpad/avent';
const TYPES = { pdf: 'application/pdf', png: 'image/png', jpg: 'image/jpeg', mp3: 'audio/mpeg', mp4: 'video/mp4' };

// Chaque leçon : titre, module, texte, wistia (hash, vidéo ou audio), audio (true si audio),
// horsParcours, fichiers [{ local, nom }] (téléchargés depuis Kajabi).
const LECONS = [
 {
  "titre": "BIENVENUE DANS CES 21 JOURS DE RITUELS",
  "module": "Bienvenue",
  "texte": "Bienvenue dans ces 21 jours de rituels.\n\nVous arrivez ici au moment où un cycle important se termine.\nParfois, ce cycle dure plusieurs années. Parfois, il se mesure en saisons, en grandes étapes de vie. Dans tous les cas, vous sentez qu’une page est en train de se tourner et que vous ne voulez plus traverser cette transition sur le pilote automatique.\n\nCe programme est une invitation à ralentir, à revenir à ce qui compte vraiment pour vous, et à remettre de l’ordre dans votre rythme intérieur.\n\nPendant ces 21 jours, nous allons :\n\nrelire les dernières années avec honnêteté et douceur,\n\nidentifier ce qui n’a plus sa place dans la suite, \n\nvous offrir des rituels courts pour revenir à vous, chaque jour, sans performance,\n\nentraîner une nouvelle façon de choisir vos journées, plutôt que de seulement réagir à ce qui arrive.\n\nAvant de commencer : poser votre base\n\nAujourd’hui, l’étape clé n’est pas de “réussir” quoi que ce soit.\nC’est de préparer le terrain, en dedans et autour de vous, pour accueillir ces 21 jours avec une intention simple.\n\nJe vous propose trois questions :\n\nSi je regarde les dernières années comme un grand chapitre, qu’est-ce que j’ai le plus envie d’honorer ?\n\nQu’est-ce que je sais, au fond, que je ne veux plus continuer de la même façon ?\n\nÀ la fin de ce parcours, qu’est-ce que j’aimerais ressentir un peu plus dans mes journées ?\n\nLaissez une phrase émerger. Pas un slogan parfait. Juste une phrase vraie pour vous, maintenant.\n\nVotre rendez-vous quotidien\n\nPour que ces 21 jours vous soutiennent vraiment, choisissez dès maintenant :\n\nUn moment dédié\nIdéalement le matin, avant que le monde extérieur prenne toute la place.\nCela peut être 5 à 15 minutes. L’important est que ce soit un rendez-vous avec vous-même, régulier.\n\nUn petit coin pour vous\nUne chaise, un carnet, une tisane, une bougie si vous le souhaitez.\nRien d’extraordinaire : simplement un endroit où votre corps comprend que “ici, on se dépose, on se recentre”.\n\nComment aborder ces 21 jours\n\nCe parcours n’est pas un défi à accomplir, ni une course pour “être parfaite”.\nVous n’avez pas à faire tous les rituels à la lettre.\n\nVoyez-le plutôt comme :\n\nun fil conducteur pour traverser une période chargée,\n\nun entraînement en douceur à ne plus suivre toutes les vagues,\n\nun espace pour réapprendre, jour après jour, à choisir ce qui vous nourrit vraiment.\n\nSi vous manquez un jour, vous ne êtes pas en retard. Vous revenez simplement au prochain rituel, et vous continuez.\n\nMerci d’être là.\nC’est en marchant chacune de notre côté, mais reliées par la même intention, que nous commencçons à changer la façon dont nous habitons nos journées, et nos cycles! \n\n \n\nAvec douceur \n\nKrystine et TeamKSL",
  "wistia": "",
  "audio": false,
  "horsParcours": false,
  "fichiers": []
 },
 {
  "titre": "Rediffusion de la session du 3 décembre !",
  "module": "Dates et rediffusion des rencontres lives",
  "texte": "Rediffusion de la rencontre du 3 décembre. \n\nVous trouverez également le pdf de la discussion de groupe dans les éléments à télécharger.",
  "wistia": "w4itw36wur",
  "audio": false,
  "horsParcours": false,
  "fichiers": [
   {
    "local": "01-1-discussion_clavardage_rencontre_du_3_de_cembre_.pdf",
    "nom": "discussion_clavardage_rencontre_du_3_de_cembre_.pdf"
   }
  ]
 },
 {
  "titre": "Rediffusion de la session de clôture- Solstice 21 décembre",
  "module": "Dates et rediffusion des rencontres lives",
  "texte": "Rencontre du solstice – intégrer et laisser entrer la lumière\n\n \n\nMerci à toutes celles et ceux qui se sont joints à cette rencontre! \n\nMerci à celles et ceux qui l'écouteront en différé! Merci pour votre présence, vos partages et votre confiance!",
  "wistia": "u1e1kme37o",
  "audio": false,
  "horsParcours": false,
  "fichiers": []
 },
 {
  "titre": "JOUR 1 : 5 clés pour débuter le parcours en conscience",
  "module": "Jour 1",
  "texte": "Ca y est!  Le premier décembre est arrivé! \n\n 🕊 Invitation du Jour 1 : revoir  le chemin parcouru\n\nCe matin, nous vous proposons un premier geste simple :\n\nPrenez quelques minutes pour revoir les neuf dernières années.\nOù étiez-vous en 2017 ?\nQuels événements ont marqué ce cycle (santé, famille, travail, relations, déménagements, naissances, séparations, tournants intérieurs) ?\nNotez 3 à 5 moments clés dans votre journal (ou sur une feuille si vous n’avez pas encore imprimé le PDF).\nAjoutez cette question :\n\n« Qu’est-ce que ces années ont forgé en moi, même si je ne le voyais pas complètement jusqu’ici ? »\n\nCe moment est clé , de voir ou d'observer, non seulement les moments charnières qui réchauffent le coeur mais aussi  ce que les défis ont amenés, même en cadeau parfois mal emballés.\n\nIl n’y a rien à analyser en détail pour l’instant. Le simple fait de reconnaître le chemin ouvre déjà un espace nouveau.\n\nCet exercice d'observation est clé, non seulement pour voir le chemin parcouru, mais aussi, pour célébrer toutes les étapes qui vous ont menées jusqu'ici! \n\nInscrivez le dans votre journal, et prenez le temps d'y revenir aujourd'hui et dans les prochains jours... Peut être d'autres perles vont se manifester! \n\n______\n\nLa course autour du monde! ❤️ \n\nAvez vous l'impression parfois de courir dans toutes les directions?\n\nLa vie moderne nous pousse souvent à la sur-stimulation, à jongler avec nos responsabilités, et à ignorer les appels de notre corps et de notre esprit.\n\nCe défi de 21 jours n’est pas une course, mais une invitation. Une invitation à ralentir, à écouter, et à renouer avec ce qui compte vraiment.\n\nChaque jour, à travers des rituels simples mais puissants, vous explorerez des pratiques qui apaisent, nourrissent et équilibrent. Ces rituels ne sont pas seulement des actions ; ils sont des moments sacrés pour vous, une chance de cultiver intentionnellement votre énergie, votre clarté et votre sérénité.\n\nEn participant à ce défi, vous choisissez de vous recentrer, de vous libérer du bruit extérieur et d’honorer un engagement essentiel : celui de prendre soin de vous.\n\nCe que vous découvrirez au fil des 21 jours\nDes pratiques ancrées dans la sagesse ancienne, adaptées à votre vie moderne.\nDes rituels pour renforcer votre corps, apaiser votre esprit et nourrir votre âme.\nUne connexion plus profonde avec vous-même et le monde qui vous entoure.\nVotre engagement\n\nNous vous invitons à aborder ces 21 jours avec une intention claire et un esprit ouvert. Vous n’avez pas besoin d’être parfait(e) ou de tout faire à la lettre. L’essentiel est de créer un espace pour vous, un moment chaque jour où vous choisissez de vous prioriser.\n\nPrenez chaque jour comme une nouvelle page de votre voyage.\n\nLaissez vos rituels devenir des ancres de sérénité et d’équilibre, vous guidant doucement vers une version de vous-même plus alignée et ancrée. \n\n Journal  d'accompagnement: 5 clés pour débuter le parcours\n\nDans la section téléchargement, nous avons mis à votre disposition un journal PDF avec 5 clés pour débuter votre parcours. Aussi, il y a une section où vous pourrez prendre des notes. (vous pouvez le télécharger en cliquant à droite sur journal PDF)\n\nLe journal est un outil puissant pour accompagner votre transformation. Chaque jour, prenez quelques instants pour noter vos pensées, vos ressentis et vos observations.\n\nQuels changements avez-vous remarqués, aussi subtils soient-ils ?\nComment ces rituels influencent-ils votre énergie, votre humeur ou vos perspectives ?\nQuelles résistances, inspirations ou découvertes ont émergé ?\n\nIl n’y a pas de bonne ou de mauvaise manière de remplir ce journal. L’important est d’être honnête avec vous-même et de laisser vos mots capturer l’essence de votre expérience. Au fil des jours, vous découvrirez peut-être des schémas, des transformations et des révélations qui nourriront votre cheminement.\n\nSuggestion : Vous pourriez également inclure une phrase ou une question clé à la fin de chaque journée,  au moment d'aller au lit ,comme par exemple :\n\n\"Pour qui et pour quoi ai-je de la gratitude aujourd'hui ?\"\n\"Quel mot résume mon état d’esprit à cet instant ?\"\n\nN'oubliez pas, 5 minutes ou 10 minutes par jour peut littéralement donner une direction différente à votre journée! Un mini pas à la fois! \n\nÀ demain! \n\nKrystine & TeamKSL",
  "wistia": "",
  "audio": false,
  "horsParcours": false,
  "fichiers": [
   {
    "local": "03-1-5_cle_s_pour_de_buter_21_jours_de_rituels.pdf",
    "nom": "5_cle_s_pour_de_buter_21_jours_de_rituels.pdf"
   }
  ]
 },
 {
  "titre": "JOUR 2: Observer nos réflexes inconscients",
  "module": "Jour 2",
  "texte": "Jour 2 ! \n\nUne petite note: vous n'êtes pas en retard!  Que ce soit le 1, 10, ou 13 du mois, chaque fois que votre attention viens avec une intention, c'est le plus important) xx\n\n__________________\n\nUn des plus grands cadeaux à s’offrir, pour revenir au coeur de l'essentiel (notre nature profonde) c’est d’observer nos tendances et nos réflexes.\n\nPorteurs d’habitudes qui nourrissent profondément, ou bien  font l’effet inverse. \n\nParfois, ils sont inculqués depuis notre tendre enfance. Parfois suite à des expériences qui nous ont bousculées, parfois : parce que c'est ainsi parce-que c'est ainsi ( comme disait nos aïeuls) . \n\nChaque fois que nous ralentissons un réflexe automatique, nous créons un espace pour une intention nouvelle. Mais pour instaurer le changement, il faut prendre le temps de voir, de réaliser, de se donner l'espace pour se rendre compte que notre vie, parfois, peut être remplie d'automatismes. \n\nManger 3 fois par jour, se brosser les dents de la même main, dormir sur le même côté du lit depuis 20 ans.\n\nSi , en prenant le temps d'observer, pourriez vous nommer 1 seule habitude que vous répétez et qui ne vous rend pas service? .... ( relire ici :) \n\n(matière à cogiter! ) \n\nPour revenir à l'essence du jour 2: \n\nCombien de fois par jour croyez-vous que nous touchons à notre téléphone? Que nous allons vers nos courriels? Que nous ouvrons une application pour «scroller? »\n\nLes résultats sont impressionnants, et mis à jour chaque année, parce que les statistiques continuent d’augmenter.\n\nL’idée est d’observer, et non pas de devenir rigide ou stressé, mais au minimum de voir plus clairement la cadence.\n\nAujourd’hui, nous ouvrons la porte sur l’importance de prendre conscience de nos habitudes. Chaque fois que notre main s’étire vers un téléphone, un sac de chips ou un autre réflexe inconscient, seulement observer. \n\nPour accompagner cette réflexion, nous avons préparé un PDF avec un rituel simple et nourrissant. Nous y abordons aussi l’importance de la lecture en soirée. Ce moment calme, loin des écrans, peut devenir une source d’inspiration et d’apaisement.\n\nDans les commentaires, merci de partager vos observations. Chaque personne qui lit a le potentiel de se reconnaître. \nQu’observez-vous de vos tendances? (Rien n’est « trop », rien n’est à juger. Nous sommes toutes et tous dans le même bain de changement en ce moment.)\n\nEt, si le cœur vous en dit :\nQuelle lecture vous inspire avant de dormir? Nous avons hâte de lire vos suggestions dans les commentaires.",
  "wistia": "",
  "audio": false,
  "horsParcours": false,
  "fichiers": [
   {
    "local": "04-1-Rituel_2_DE_TOX_E_LECTRONIQUE_._RITUEL_21_JOURS_2_.pdf",
    "nom": "Rituel_2_DE_TOX_E_LECTRONIQUE_._RITUEL_21_JOURS_2_.pdf"
   }
  ]
 },
 {
  "titre": "JOUR 3 Le Mental agité et son plus grand allié",
  "module": "Jour 3",
  "texte": "JOUR 3: UN MENTAL AGITÉ ET SON PLUS GRAND ALLIÉ. \n\nHier, avec le Jour 2, nous avons pris le temps d’observer nos réflexes automatiques : le téléphone qui se glisse dans la main, les gestes sur « pilote automatique », les habitudes du soir…\n\nVos partages dans les commentaires le montrent : nous sommes plusieurs à vivre les mêmes élans, les mêmes défis, les mêmes envies de changement. Les lire crée un effet d’entraînement précieux pour tout le groupe.\n\nAujourd’hui, pour le Jour 3, nous ajoutons une pièce essentielle :\nle calme intérieur par la respiration.\n\nQuand le mental ralentit, tout devient plus lisible.\n\nEn revenant au souffle, nous créons quelques instants d’espace pour entendre ce qui est vraiment important, plutôt que le bruit extérieur ou les automatismes.\n\n🕊 Thème du jour\n\n« Apaiser le bruit intérieur avec le souffle, la respiration de l'abeille \n\n \n\nNous poursuivons le fil de l'épuration et du nettoyage, mais cette fois en entrant à l’intérieur :\n3 minutes où rien n’est à comprendre, seulement à ressentir le souffle, le son, et la vibration dans le corps.\n\n⏱ Temps nécessaire\n\nDurée du rituel : 3 à 7 minutes\n\nMoment idéal :\n\nle matin, pour commencer la journée avec un esprit plus posé\n\nou en fin de journée, pour relâcher ce qui s’est accumulé\n\n🌬 Effets possibles du rituel\n\nCe court temps avec vous-même peut soutenir :\n\nun apaisement du système nerveux\n\nune diminution des tensions mentales et physiques\n\nune impression de plus grande stabilité intérieure\n\nun ressenti plus net de ce qui est vraiment prioritaire pour vous\n\n🎧 Format du rituel\n\nType : audio guidé d’environ 3 minutes\n\nà écouter directement dans votre espace membre, autant de fois que vous le souhaitez\n\nen soutien : un PDF récapitulatif pour retrouver facilement les étapes et intégrer la pratique dans votre quotidien\n\nPourquoi cette respiration compte dans votre parcours\n\nLa respiration de l’abeille (Bhramari pranayama) est une pratique ancienne utilisée pour apaiser le système nerveux.\nLe doux bourdonnement crée une vibration intérieure qui aide à faire descendre la pression, à ramener l’attention vers le cœur et à poser un peu plus de douceur sur la journée. De plus, le système nerveux est bercé par ce son universel qu'il reconnait! \n\nAujourd’hui, l’invitation est simple :\n\nFermer les écrans quelques minutes, déposer les épaules, et laisser le son de votre souffle calmer ce qui tourne trop vite.\n\nAprès votre rituel, vous êtes invitée à venir noter dans les commentaires, en un mot ou une courte phrase, une chose que vous avez observée en vous après ces quelques minutes : un changement de rythme, une sensation différente, un réflexe qui s’est apaisé.\nVos mots encouragent d’autres participantes à poursuivre elles aussi.",
  "wistia": "5hmg3axd13",
  "audio": true,
  "horsParcours": false,
  "fichiers": [
   {
    "local": "05-1-Rituel_3_respiration_de_l_abeille_4_.pdf",
    "nom": "Rituel_3_respiration_de_l_abeille_4_.pdf"
   }
  ]
 },
 {
  "titre": "JOUR 4: Observer les Schémas et nourrir l'équilibre",
  "module": "Jour 4",
  "texte": "Dans ce passage de clôture d’un cycle de 9 ans, l’invitation du jour est d’observer vos schémas avec douceur : ces gestes répétitifs qui, sans que l’on s’en rende compte, renforcent ou fragilisent notre équilibre intérieur.\n\nAujourd’hui, nous allons  un petit peu plus loin : il est question de voir les schémas qui se répètent et de décider, en conscience, lesquels ont encore leur place… et lesquels appartiennent à l’ancien cycle, ou l'ancienne version de nous. \n\nDans cette période de clôture d’un cycle de 9 ans, ce regard est précieux.\nIl ne s’agit pas de refaire le passé, mais de reconnaître :\n\nce qui, depuis des années, vous soutient vraiment\n\nce qui, au contraire, draine votre énergie ou vous éloigne de ce que vous souhaitez vivre\n\nSelon l’Ayurveda, chaque geste, chaque pensée, chaque environnement nourrit ou perturbe notre constitution unique (prakriti). Même les habitudes qui paraissent anodines modulent notre équilibre intérieur.\n\nLe PDF du Jour 4 vous accompagne pas à pas à travers trois mouvements simples :\n\nObserver vos schémas – repérer ce qui revient souvent dans vos journées\n\nNourrir ce qui vous soutient – choisir une habitude qui vous fait du bien et l’honorer\n\nRéorienter ce qui perturbe – ajuster, même légèrement, un geste qui ne vous sert plus\n\nUn des rappels :\n\nUn bateau, avec 1 % de changement d’angle sur son GPS, finit par arriver à un endroit complètement différent.\nUn petit ajustement posé aujourd’hui peut transformer la direction de vos prochaines années.\n\nTemps nécessaire\n5 à 10 minutes avec le PDF, puis une attention douce tout au long de la journée pour observer ce qui se rejoue.\n\n👉 Téléchargez votre PDF dans la section « Téléchargements ».\n\nPiste d’intégration proposée\n\nEn parcourant le rituel, laissez émerger :\n\nune habitude qui vous soutient et que vous choisissez de nourrir davantage\n\nune habitude qui vous perturbe et que vous acceptez de réorienter, un petit geste à la fois\n\nSi vous en avez envie après votre pratique, vous pourrez venir écrire, dans l’espace d’échange :\n\nun geste que vous avez décidé de nourrir\n\nou une habitude que vous choisissez de transformer en douceur",
  "wistia": "",
  "audio": false,
  "horsParcours": false,
  "fichiers": [
   {
    "local": "06-1-Rituel_4_observer_les_sche_mas_et_nourrir_l_e_quilibre_1_.pdf",
    "nom": "Rituel_4_observer_les_sche_mas_et_nourrir_l_e_quilibre_1_.pdf"
   }
  ]
 },
 {
  "titre": "JOUR 5: Revenir au centre: un état de neutralité?",
  "module": "Jour 5",
  "texte": "Jour 5 – Revenir au centre\n\n(ni trop, ni pas assez), juste retrouver le milieu. En douceur.\n\nProposer au corps une pause, un espace où il n’a ni besoin de performer, ni de faire une tâche, ni de comprendre ou d’assimiler quoi que ce soit, ni d’être quoi que ce soit de plus.\n\nCombien de fois un tel espace a-t-il été offert à votre  corps dans les 5, 10 ou 20 dernières années ?\n\nProposition: Un instant pourrait être pris avec le café, la tisane ou le premier breuvage du matin pour laisser cette question résonner\n\nEn bonus....\n\nEn regardant les 40, 50 ou 60 dernières années…\ncombien de moments de ce type viennent réellement en mémoire ?\n\nDepuis le début du cycle, quelque chose s’est mis en mouvement, liant cœur, corps et esprit :\n\nJour 1 : invitation à se déposer dans le cycle du changement.\n\nJour 2 : exploration des réflexes automatiques.\n\nJour 3 : observation du mental et de ses scénarios.\n\nJour 4 : mise en lumière de ce qui nourrit et de ce qui perturbe le quotidien.\n\nLe Jour 5 agit comme un espace avec un potentiel d'intensifier: \n\nLe corps est invité à s’installer dans un état de neutralité : système nerveux ramené au neutre, ni trop, ni pas assez, rien à performer, rien à forcer, aucune attente précise.\n\nDans cet espace neutre :\nce qui a besoin de se déposer descend,\nce qui a besoin d’émerger remonte.\n\nLa respiration de l’abeille et le regard d’observation sont déjà là, comme des outils discrets, prêts au besoin.\n\nPeu à peu, ce terrain, cet espace, ce terreau fertile permet de se tourner doucement vers la gratitude,\net d’y déposer une richesse déjà présente intérieurement.\n\n \n \n\n \n\nInvitations du Jour 5\n\nÉcouter la capsule audio du jour et laisser le corps trouver son propre point de neutralité, sans objectif.\n\nEn bonus, regarder la vidéo de gratitude (Louie Schwartzberg / Frère David Steindl-Rast) si le moment s’y prête.\n\nDans les commentaires, noter trois choses pour lesquelles un sentiment de gratitude est présent, ici et maintenant, en quelques mots.\n\nPrenez un moment pour inscrire dans les commentaires trois choses pour lesquelles vous ressentez de la gratitude, aujourd’hui, EN CE MOMENT.\nLaissez ces pratiques éclaire votre journée et ajouter une touche de légèreté. Un rappel de notre nature profonde.   🌿\n\nhttps://www.youtube.com/watch?v=-Gm-G_4c5a8&t=4s",
  "wistia": "jtw4ozwz0m",
  "audio": true,
  "horsParcours": false,
  "fichiers": []
 },
 {
  "titre": "JOUR 6: Comprendre la danse de nos énergies (+ capsule audio)",
  "module": "Jour 6",
  "texte": "Rituel #6 – Reconnaître les énergies qui nous portent\nAprès le Jour 5, plusieurs personnes ont partagé une grande douceur, une gratitude simple, presque lumineuse.\nCette qualité intérieure n’est pas qu’une émotion :\nc’est déjà une énergie, une façon d’habiter la journée, un mouvement intérieur qui éclaire ce qui nous traverse.\nAujourd’hui, le Rituel #6 propose d’observer la couleur de cette énergie.\nDans la tradition ayurvédique, on décrit trois tonalités possibles : légèreté, mouvement, lourdeur.\nElles se mêlent, changent, se répondent — et influencent la façon dont on pense, ressent et agit.\nL’intention du jour n’est pas de comprendre tout cela en profondeur.\nC’est simplement de remarquer, avec honnêteté et simplicité :\nquand l’énergie est plus claire, douce, stable ;\nquand elle devient un peu plus agitée ;\nquand elle se densifie ou ralentit.\nCe rituel vous invite à :\nobserver vos gestes et vos choix comme des petites portes vers ces énergies ;\nrepérer la tonalité dominante du moment ;\nchoisir une intention qui soutient un mouvement plus doux, plus lumineux, déjà présent depuis la gratitude du Jour 5.\n📄 Le PDF du Rituel #6 est disponible dans la section Téléchargements. ( pour les appareils mobile, cette section est à la toute fin de la page, sous les commentaires). \n\n🎙️ Une capsule audio a été ajoutée pour approfondir \n\nLa gratitude d’hier a déjà ouvert un terrain intérieur.\nAujourd’hui, il s’agit simplement d’en reconnaître la qualité énergétique — sans jugement, sans analyse, comme un miroir posé devant vous.\nInvitation à partager\nUne prise de conscience, une sensation, un mot, une nuance d’énergie :\nQuelque chose a-t-il émergé en regardant votre journée sous cet angle ?\nDéposer une trace dans l’espace de commentaires permet à ce cycle de prendre encore plus de sens.",
  "wistia": "ump13ke8u2",
  "audio": true,
  "horsParcours": false,
  "fichiers": [
   {
    "local": "09-1-Rituel_6_les_gunas.pdf",
    "nom": "Rituel_6_les_gunas.pdf"
   }
  ]
 },
 {
  "titre": "JOUR 7: Une journée pour laisser percoler",
  "module": "Jour 7",
  "texte": "Depuis quelques jours, plusieurs partages ont fait émerger des moments d’une grande richesse :\nGratitude spontanée au lever du jour, beauté d’un ciel clair, présence d’un être aimé, douceur retrouvée dans le silence du matin, ou encore un geste simple qui transforme le ton d’une journée.\n\nUne cohorte très dynamique s’est dessinée.\nLes partages circulent, inspirent, réconfortent… et sont lus par beaucoup, parfois en silence.\nCette ouverture, cette générosité, créent un mouvement collectif qui porte l’ensemble du cycle.\n\nAujourd’hui, le Jour 7 offre un temps pour reconnaître ces perles — les vôtres et celles qui ont résonné en vous — sans en ajouter de nouvelles.\nUn moment pour laisser doucement se déposer tout ce qui s’est ouvert depuis le Jour 1.\n\n📄La fiche éclair du jour accompagne ce retour vers l’essentiel, retour vers les énergies.  *PDF À TÉLÉCHARGER  \n\n🎧 Et une capsule audio a été ajoutée au Jour 6 pour approfondir l’exploration des énergies intérieures, à écouter librement, au moment choisi. \n\nExercice d’approfondissement (optionnel)\n\nPrendre quelques minutes pour revisiter la première semaine avec une seule question à la fois :\n\nQuel moment des jours 1 à 6 a créé un léger déplacement en moi ?\n(une pensée, une sensation, un geste, un mot, un silence)\n\nQu’est-ce qui a été le plus facile à accueillir cette semaine ?\n(un rituel, une observation, un état intérieur)\n\nQu’est-ce qui a demandé un peu plus de présence ou de douceur ?\n\nQuelle nuance revient spontanément lorsque je repense aux six premiers jours ?\n(une couleur, une émotion, une image, une phrase, …)\n\nIl n’est pas nécessaire de répondre à tout.\nChoisir une seule question, laisser percoler, et noter une phrase ou un mot dans un carnet si quelque chose se précise.\n\nUn geste supplémentaire, si l’élan est là\n\nPrendre un moment pour lire les commentaires déposés, laisser résonner ce qui touche, et répondre si le cœur en a envie.\n\nAujourd’hui, il n’y a rien à réussir.\nSeulement reconnaître les perles de la première semaine et laisser doucement le cycle se déposer.\n\nDouce journée\n\nL'équipe bienveillante TeamKSL & Krystine xx",
  "wistia": "",
  "audio": false,
  "horsParcours": false,
  "fichiers": [
   {
    "local": "10-1-Fiche_e_clair_.pdf",
    "nom": "Fiche_e_clair_.pdf"
   }
  ]
 },
 {
  "titre": "Le GPS et le 1% de changement",
  "module": "Jour 8",
  "texte": "Nous sous-estimons souvent l'impact d'un mini choix, un petit changement maintenu sur le fil du temps. Contrairement à ce que nous pouvons penser, les changements ne s'opèrent pas à coup de grandes décisions, mais plutôt de petits pas menant vers une direction. \nUne première courbe  de changement de direction s’est formée au fil des sept derniers jours.\nPar des mouvements parfois infimes — une respiration plus lente, une nuance observée, un moment de gratitude — le GPS intérieur s’est déjà réorienté.\nCette deuxième semaine s’ouvre dans le même esprit :\ncontinuer le mouvement, mais toujours par un léger déplacement.\nUn 1 %.\n\nL’invitation du Jour 8 est simple :\nobserver un geste du quotidien et l’ajuster d’un seul degré, sans chercher à transformer l’ensemble.\nUn micro-ajustement suffit pour influencer la trajectoire de la journée.\n\nExemples de micro-ajustements possibles\n\n(un seul suffit pour aujourd’hui)\n\nRetirer une chose de la liste du jour\nCréer de l’espace plutôt que d’ajouter.\n\nCréer une courte “not-to-do list”\nNommer une seule chose que l’on choisit consciemment de ne pas faire.\n\nAlléger une transition\nRalentir légèrement entre deux moments : avant un appel, avant de sortir, avant un repas.\n\nChanger la manière de faire un geste automatique\nModifier un geste familier : marcher sans téléphone, boire le premier café/thé assise plutôt que debout.\n\nS’offrir une mini-pause sans objectif\nTrente secondes les deux pieds au sol.\nUne respiration plus profonde.\nUn regard vers l’extérieur.\n\nDéplacer un geste à un moment qui convient mieux au corps\nAvancer une pause, reculer un courriel, fermer un écran plus tôt.\n\nSimplifier un choix\nAlléger une décision pour libérer l’esprit.\n\nNommer simplement : “Aujourd’hui, je ne pousse pas ici.”\nUn ajustement minimal, mais souvent décisif.\n\nPartagez votre prise de conscience, votre expérience, défis ou perles  dans la communauté! \n\nRituel de la semaine — Bain détente pour faire le point\n\nLe rituel proposé pour cette nouvelle semaine est une invitation à déposer le corps dans la chaleur de l’eau, pour relâcher tout ce qui a été porté et ouvrir un espace pour l’intention des jours à venir.\n\nLe sel d’Epsom et les huiles essentielles (toujours diluées au préalable) servent ici à soutenir la détente.\nIl n’y a rien à “réussir” : simplement laisser l’eau faire son œuvre, sentir ce qui se dépose, ce qui s’adoucit.\n\nLe rituel complet se trouve dans la fiche de la semaine, disponible dans l’espace Téléchargements.\n\nQuestion du Jour\n\nQuel petit geste du quotidien pourrait être déplacé de 1 % aujourd’hui pour influencer subtilement le ton de la journée ?\n\nNoter une phrase ou une nuance si cela aide à l’intégrer.\nIl n’y a rien d’autre à faire.",
  "wistia": "",
  "audio": false,
  "horsParcours": false,
  "fichiers": [
   {
    "local": "11-1-Bain_de_tente_pour_faire_le_point._Fiche_rituel.pdf",
    "nom": "Bain_de_tente_pour_faire_le_point._Fiche_rituel.pdf"
   }
  ]
 },
 {
  "titre": "JOUR 9: Les marmas: une conversation silencieuse avec notre système nerveux!",
  "module": "Jour 9",
  "texte": "Avez-vous parfois tendance à mettre de côté la petite douceur qui vous apaise? Comme si prendre soin de vous était au dernier rang des priorités? (Si oui, inscrivez-le en commentaire dans la communauté!)\n\nUn geste d'intention au corps, quel qu'il soit, nourrit et rééquilibre. Nous avons souvent tendance à penser qu'il faut AJOUTER des choses pour revenir en état d'équilibre lors de nos mouvements intérieurs. Et pourtant, c'est peut-être SIMPLIFIER dont le corps a besoin. Simplifier et faire un geste avec intention.\n\nLes marmas : une cartographie subtile\n\nL'Ayurveda reconnaît 107 points marmas dans le corps, dont 37 se trouvent au visage et à la tête. Ces points sont des carrefours où convergent tissus, vaisseaux et prana. Les textes classiques les décrivent comme des lieux de vulnérabilité, mais aussi de grande puissance thérapeutique.\n\nQuand vos doigts effleurent ces points avec conscience, ils engagent une conversation avec votre système nerveux.\n\nL'Abhyanga du visage : nourrir par le toucher\n\nL'Abhyanga appliqué au visage est un rituel qui calme le système nerveux, relâche les tensions accumulées et revitalise la peau. En appliquant de l'huile nourrissante avec intention sur les points marmas, vous stimulez la circulation tout en hydratant en profondeur.\n\nUn geste simple et puissant qui rappelle que prendre soin de soi cultive sérénité et vitalité. Par des mouvements doux et intentionnels, l'Abhyanga du visage devient un moment de calme, une reconnexion avec soi-même.\n\nCe rituel vous invite à ralentir, à écouter les besoins de votre visage et à vous offrir un soin régénérant, ancré dans les sagesses de l'Ayurveda.\n\nInvitation: \n\nTéléchargez la carte des marmas du visage. Observer la vision ancestrale de ces points clés qui peuvent être activés avec le massage et l'intention. \n\nTéléchargez une invittaion au rituel Abhyanga du visage\n\nAprès votre pratique\n\nPrenez un instant pour noter vos ressentis. Avez-vous remarqué une détente dans votre visage ou une sensation de calme intérieur?\n\nMerci de partager dans la conversation ce que ce rituel ancestral vous fait découvrir!\n\nVotre lumière inspire les autres à ralentir, et anime l'ensemble de la communauté! \n\n___________________________________\n\n À la question fréquemment posée: Quelles huiles INSPIRATA utiliser?\n\nL'huile visage défripante infusée de calendule est parfaite pour ce rituel (infusée de calendule cicatrisante)\n\nL'Huile féminité également pour son côté soie douce (infusée de boutons de rose)\n\nEt si vous n'avez pas d'huile infusée  à portée de main, une huile neutre ( jojoba ou tournesol) peut supporter le processus.",
  "wistia": "",
  "audio": false,
  "horsParcours": false,
  "fichiers": [
   {
    "local": "12-2-Rituel_9_L_abhyanga_du_visage_.pdf",
    "nom": "Rituel_9_L_abhyanga_du_visage_.pdf"
   },
   {
    "local": "12-1-Marmas_du_visage.png",
    "nom": "Marmas_du_visage.png"
   }
  ]
 },
 {
  "titre": "Jour 10 : poser un regard vers tout ce qui a été accompli",
  "module": "Jour 10",
  "texte": "Depuis le début de ce 21 jours, quelque chose s'est déplacé à l'intérieur. Aujourd'hui, l'invitation est de prendre un pas de recul, pour se donner le temps de célébrer le chemin parcouru. Ce n'est pas anodin, car des virages, il y en a eu. Des soubresauts, des défis, des passages étroits, des moments où le sol semblait se dérober. Et pourtant, vous êtes encore là.\n\nNous sommes à l’approche du solstice, la nuit la plus longue. \nNous approchons d'un moment ou l'énergie sera déjà vers l'avant, les projets et le mouvement du début d'année. \n\nAvant d'y arriver, nous vous proposons une pause. Un moment privilégié de réflexion  parce que sans que l’on s’en rende compte, le corps, le cœur et le mental ont enregistré des mouvements, des virages, des passages et l'approche du solstice, ne serait-ce qu'en changement de luminosité. :) \n\nIl ne s’agit pas ici de faire un bilan de performance.\n\nL’invitation est plus simple :\nposer un regard honnête et doux sur le chemin parcouru.\n\nUn grand mouvement intérieur\n\nSi vous regarder  les neuf dernières années comme un seul grand mouvement :\n\nQuels thèmes semblent revenir, en filigrane?\n\nQu’est-ce qui, malgré les détours, a continué de vous traverser?\n\nOù sentez-vous qu’un cycle arrive naturellement à sa fin?\n\nIl n’est pas nécessaire d’avoir toutes les réponses.\nL’essentiel est de laisser remonter ce qui se présente spontanément, sans forcer.\n\nCe qui demande encore une place\n\nLorsqu’un cycle se termine, ce qui est resté en suspens se manifeste souvent plus clairement :\nune conversation intérieure qui revient, une fatigue particulière, un souhait mis de côté, un besoin du corps longtemps repoussé.\n\nLaisser venir une seule chose qui semble demander encore une place dans votre attention.\n\nRituel du jour – Un moment privilégié «de moi à moi»\n\nChoisir un moment de la journée (matin ou soir), où quelques minutes sont disponibles.\n\nAllumer une chandelle, comme repère silencieux et lumineux que ce temps est pour vous.\n\nS’installer confortablement, avec un cahier ou un journal, et éventuellement une musique douce si cela soutient.\n\nFermer les yeux quelques instants, prendre trois respirations plus lentes que d’habitude.\n\nPuis, ouvrir le cahier, prendre le temps de noter\n\nQu’est-ce qui ne m’accompagnera pas dans le prochain cycle?\n\nEt qu'est ce qui m'accompagne absolument? \n\nQu'est ce que j'ai envie de déployer?\n\nIl peut s’agir d’une habitude, d’un rythme, d’une façon de se parler intérieurement, d’une manière de porter les responsabilités.\nCela peut tenir en un mot, une phrase, une image.\n\nCe rituel peut durer 5 minutes, ou s’étendre à 15 ou 20 minutes si le moment le permet.\nIl n’y a pas de durée idéale : seulement un temps consacré à reconnaître qu’un cycle se termine.\n\nPour refermer le rituel, il est possible de :\n\nremercier intérieurement pour le chemin parcouru,\n\npuis éteindre la chandelle, ou la laisser continuer doucement, selon ce qui semble juste.\n\nEspace de partage\n\nDans la conversation du groupe, il est possible de déposer :\n\nun mot qui décrit les neuf dernières années,\n\nou une phrase courte en réponse aux questions :\n\nQu’est-ce qui ne m’accompagnera pas dans le prochain cycle? »\n\nEt qu'est ce qui m'accompagne absolument? \n\nCes partages peuvent aider d’autres personnes à reconnaître, elles aussi, qu’un cycle se termine et qu’une nouvelle courbe commence à se tracer.\n\nMerci pour chaque expérience vécue, chaque réflexion et chaque mot partagé.",
  "wistia": "",
  "audio": false,
  "horsParcours": false,
  "fichiers": []
 },
 {
  "titre": "JOUR 11: un rituel ancestral prisé depuis des millénaires!",
  "module": "Jour 11",
  "texte": "Aujourd’hui, nous plongeons dans un rituel profondément nourrissant : l’Abhyanga, l’art de l’auto-massage ayurvédique.\n\nEn sanskrit, le mot Sneha signifie à la fois « huile » et « amour ». Cette double signification n’est pas un hasard. Dans la tradition ayurvédique, oindre le corps d’huile tiède est considéré comme un acte d’amour fondamental, un geste aussi essentiel que se nourrir ou dormir.\n\nLa peau est notre plus grand organe. Elle enveloppe, protège, respire. Elle enregistre aussi. Les tensions accumulées, les rythmes effrénés, les passages difficiles, tout cela se dépose dans les tissus, dans les fascias, dans les couches profondes que l’on oublie de visiter. L’Abhyanga est une façon de revenir. De poser les mains là où le corps a tenu bon, souvent en silence.\n\nCe que l’huile transporte\n\nL’huile tiède ne fait pas que glisser sur la peau. Elle pénètre. En une vingtaine de minutes, elle traverse les couches superficielles et atteint des tissus plus profonds. Elle transporte avec elle la chaleur, qui assouplit. La lourdeur douce, qui ancre. Et l’intention avec laquelle on l’applique, qui informe le système nerveux qu’il peut relâcher une partie de sa vigilance.\n\nLes recherches contemporaines confirment ce que l’Ayurveda observe depuis des millénaires : un massage lent et enveloppant peut activer le nerf vague, ce long chemin qui relie le cerveau aux organes et qui orchestre une grande partie de notre capacité à nous déposer, à digérer, à récupérer. Quand le système nerveux reçoit le signal qu’il est en sécurité, quelque chose se détend à un niveau que la volonté seule atteint difficilement.\n\nLes marmas : une cartographie subtile\n\nL’Ayurveda décrit 107 marmas répartis sur le corps, des points où le Prana, l’énergie de vie, se concentre et circule. Le Sushruta Samhita, l’un des grands textes fondateurs, les identifiait à la fois comme points vulnérables et points de guérison. Là où quelque chose peut se bloquer, quelque chose peut aussi se libérer.\n\nOn peut concevoir les marmas comme des carrefours. Des endroits où les couches du corps – physique, énergétique, émotionnelle – se rencontrent. Quand on y dépose de l’attention et de l’huile tiède, on ne masse pas seulement un muscle. On parle à l’ensemble du système.\n\nCertains marmas sont facilement accessibles dans l’auto-massage :\n\nles pieds, particulièrement le point Kshipra entre le gros orteil et le deuxième orteil, et Talahridaya au centre de la plante, en lien avec le cœur et l’ancrage ;\n\nles mains, miroir des pieds, avec des points similaires qui soutiennent la circulation et peuvent favoriser l’apaisement du mental ;\n\nle crâne, où Adhipati au sommet de la tête et les tempes permettent de relâcher une partie des tensions accumulées dans la pensée.\n\nSoutenir ce qui digère, ce qui s’adapte\n\nL’Abhyanga nourrit ce que l’Ayurveda appelle Ojas, cette réserve profonde qui sous-tend l’immunité, la capacité de récupération, l’éclat. Quand Ojas est solide, le corps s’adapte mieux : il traverse les changements de saison, les périodes exigeantes, les transitions, avec plus de souplesse.\n\nCe rituel soutient aussi Agni, le feu digestif, en stimulant la circulation et en aidant le corps à mobiliser ce qui stagne. La digestion n’est pas seulement ce qui se passe dans l’estomac. Elle se produit à chaque niveau : digérer les aliments, les expériences, les émotions, les années. L’Abhyanga accompagne ce mouvement.\n\nUn geste de contre-culture\n\nDans un monde qui valorise la vitesse, l’efficacité, la performance, choisir de s’enduire d’huile tiède et de masser son propre corps pendant vingt minutes est un acte à contre-courant.\nC’est dire au système nerveux : tu peux déposer les armes.\nC’est dire au corps : je te vois, je te remercie, je prends soin de ce qui m’a portée jusqu’ici.\n\nVotre rituel\n\nDans la capsule audio d’aujourd’hui, je vous guide pas à pas pour découvrir et pratiquer ce rituel.\n\nVous avez simplement besoin de :\n\nune huile de tournesol biologique, neutre et simple, que l’on trouve facilement dans la plupart des régions.\n\nSi vous avez déjà à la maison une huile infusée de plantes – par exemple une huile Inspirata pour celles qui y ont accès – vous pouvez aussi l’utiliser pour ce rituel. Les huiles Féminité ou apaisante Vata accompagnent particulièrement bien la saison d’hiver.\n\nUne huile neutre offre un geste simple, accessible, comme une première porte.\nUne huile infusée de plantes apporte une autre densité, une autre texture de perception. Ce ne sont pas deux niveaux hiérarchisés, mais deux façons différentes d’entrer en relation avec le corps. À chacune de sentir ce qui lui convient aujourd’hui.\n\nInstallez-vous dans un espace calme pour vous déposer quelques minutes.\nLaissez le moment venir à vous. Certaines journées appellent le matin, d’autres le soir. Le corps sait.\n\nPourquoi pratiquer l’Abhyanga ?\n\nApaiser le mental et réduire le stress.\n\nSoutenir la circulation sanguine et lymphatique.\n\nNourrir et hydrater la peau en profondeur.\n\nRenforcer la connexion avec votre corps.\n\nAstuce : choisissez le moment qui vous convient le mieux, matin pour soutenir l’élan de la journée, ou soir pour relâcher les tensions et préparer un sommeil plus réparateur.\n\nNous vous souhaitons une belle découverte de ce rituel précieux, un véritable acte d’amour !",
  "wistia": "c6nsniv8su",
  "audio": true,
  "horsParcours": false,
  "fichiers": []
 },
 {
  "titre": "JOUR 12: Le feu qui voit",
  "module": "Jour 12",
  "texte": "Depuis le début de ce cycle, le 1% de mouvement s'active de façon subtile autant que concrète : prises de conscience, mots, sensations qui ont tracé un fil.\nL'Ayurveda reconnaît cinq couches de l'être :\nle corps physique, l'énergie vitale, le mental, la sagesse profonde, la plénitude ( ou la grâce, bliss en anglais) .\n(relire ici, car c'est un enseignement subtil, mais important). \nUne seule se voit et se touche : le corps physique. Les quatre autres se ressentent, se devinent, se traversent. Ce cycle de 21 jours introduit doucement un travail dans ces espaces-là.\nTRATAKA : UNE PRATIQUE ANCESTRALE\nTrataka est une technique de concentration par le regard, présente dans plusieurs grandes traditions de l'Inde : le Hatha Yoga, le Tantra et l'Ayurveda. Une pratique qui a traversé les âges et les enseignements.\nElle travaille directement avec l'élément feu, les yeux et l'attention. La flamme devient partenaire. Le regard devient passage. Ce qui demande à être remis au feu devient visible. L'énergie à porter pour la suite émerge.\nC'est un exercice qui agit sur la façon dont le corps voit, perçoit et trie l'information. L'attention se rassemble. Les yeux se déposent, les pensées ralentissent.\nDurée totale : environ 10 à 15 minutes.\nSUGGESTION DE MUSIQUE POUR ACCOMPAGNER : https://open.spotify.com/track/4z5gVmrZeHPb7YHGzukZRr?si=ff495d564fd94bb4\nPréparation\nPlacer une chandelle à hauteur des yeux, à environ un bras de distance (50 à 60 cm). S'asseoir confortablement. Tamiser les autres sources de lumière.\nNote : en cas d'épilepsie, de glaucome ou de troubles oculaires importants, consulter un professionnel avant de pratiquer.\nLa pratique\nPhase 1 — Regard ouvert (1 à 3 minutes)\nLaisser les yeux se poser sur la flamme. Regarder, sans effort. Si les yeux larmoient, laisser couler. Si les yeux fatiguent, cligner doucement quelques fois, puis revenir.\nPhase 2 — Regard intérieur (1 à 2 minutes)\nFermer les yeux. Observer l'empreinte lumineuse qui reste à l'intérieur. Elle peut bouger, changer de couleur, s'estomper. Rester avec elle jusqu'à ce qu'elle disparaisse.\nPhase 3 — Les deux questions\nRouvrir les yeux vers la flamme.\nQu'ai-je envie de déposer au cœur de cette flamme pour que ce soit transmuté? Laisser cette chose entrer dans le feu. Laisser brûler.\nQuelle énergie ai-je envie de porter en sortant de ce rituel? Un seul mot. Le recevoir. Le garder pour la journée.\nClôture\nPrendre une respiration complète. Souffler la chandelle. Le rituel est terminé.\nC'est un rituel à garder dans votre poche arrière et à revisiter au besoin. Ne jamais sous-estimer le 1% d'un moment de 3 à 5 minutes avec l'élément feu. \nAvec douceur \nKrystine xx",
  "wistia": "",
  "audio": false,
  "horsParcours": false,
  "fichiers": []
 },
 {
  "titre": "JOUR 13: LA FORCE D'UNE INTENTION",
  "module": "Jour 13",
  "texte": "JOUR 13 – Une intention sincère, choisie,  vaut mille résolutions! \n\nLes jours 10, 11 et 12 ont permis de revisiter les années traversées, de remercier le corps et de poser le regard vers ce qui appelle maintenant.\n\nAujourd'hui, il est question d'un seul mot pour la journée : une intention du matin, discrète, qui accompagne les heures qui viennent et soutient le mouvement jusqu'au solstice.\n\nPourquoi choisir une intention le matin?\n\nLe matin est une opportunité précieuse pour poser une intention et se connecter à ce qui compte réellement. Une intention, contrairement à un objectif, n'a pas besoin d'être un grand plan ou une tâche à accomplir. Elle est un fil conducteur, une manière douce de s'ancrer et de donner une direction à son énergie pour la journée.\n\nChoisir une intention le matin, c'est décider consciemment de nourrir une qualité qui résonne avec nous, un état d'esprit qui peut transformer nos actions les plus simples en gestes significatifs.\n\n20 qualités pour guider le choix d'une intention\n\nChoisir une intention peut sembler un peu abstrait. Voici une liste pour guider. Vous pouvez même en mélanger 2 ou 3 et faire de ces mots votre mantra de la journée!\n\nExemple : Paix, douceur, résilience ou Confiance, clarté et légèreté.\n\nCalme – Inviter une sérénité qui apaise le mental.\nClarté – Voir ce qui est important sans confusion.\nConfiance – Nourrir la foi en ses capacités et en son chemin.\nGratitude – Apprécier ce qui est déjà là, grand ou petit.\nJoie – Cultiver une légèreté et des moments simples de bonheur.\nPatience – Honorer le rythme naturel des événements.\nRésilience – Trouver la force pour continuer malgré les défis.\nSimplicité – Revenir à l'essentiel et alléger ses pensées.\nÉnergie – Renouveler sa vitalité pour bien commencer la journée.\nOuverture – Accueillir les opportunités et les imprévus.\nCompassion – Être bienveillant envers soi et envers les autres.\nCréativité – Voir avec imagination et résoudre autrement.\nAlignement – Agir en accord avec ses valeurs et ses priorités.\nForce – Sentir une capacité intérieure à tenir bon.\nPaix – Cultiver une tranquillité intérieure durable.\nCourage – Oser avancer vers ce qui semble incertain.\nÉquilibre – Harmoniser ses priorités et ses besoins.\nCuriosité – S'ouvrir à l'inconnu avec enthousiasme.\nPrésence – Être pleinement ici et maintenant.\nEspoir – Nourrir une lumière pour ce qui est à venir.\n\n📄 Téléchargez le PDF pour vous accompagner (dans la section téléchargements)\n\nMini-rituel matinal : poser une intention avec une bougie\n\nPourquoi ne pas faire le rituel Trataka (voir jour 12) et inclure, à la fin, le choix de l'énergie dans laquelle vous avez envie de passer votre journée?\n\nMatériel :\n\nUne chandelle\nUn espace calme pour se recentrer\n\nÉtapes :\n\n1. Allumez la bougie Prenez un instant pour observer la flamme. Imaginez qu'elle reflète votre lumière intérieure, une source d'énergie qui éclaire votre journée.\n\n2. Respirez profondément Prenez trois grandes respirations :\n\nInspirez pour inviter calme et clarté.\nExpirez pour relâcher les tensions ou distractions.\n\n3. Posez-vous une question clé « De quoi ai-je le plus besoin en ce moment? » Laissez émerger un mot ou une qualité spontanément, sans analyser. Cela peut être une des qualités listées ou une réponse intuitive.\n\n4. Accueillez l'intention Prenez un moment pour ressentir cette qualité. Elle est le reflet de ce dont vous avez besoin aujourd'hui.\n\n5. Ancrez l'intention Gardez cette intention en tête comme un guide doux pour traverser votre journée. Si besoin, notez-la pour vous en souvenir plus tard.\n\nCe rituel est une invitation à commencer la journée avec conscience et présence, en nourrissant ce qui est vraiment essentiel.\n\nChaque matin est une nouvelle opportunité de se connecter à soi et de créer une journée intentionnelle.\n\nRejoindre la conversation\n\n💬 Quelle intention portez-vous aujourd'hui?\n\nPartagez vos mots ou vos réflexions dans notre groupe!\n\n(Nous les lisons tous!)\n\n👉 C'est toujours inspirant de lire les intentions des autres et de voir comment elles résonnent dans notre communauté. 🌿",
  "wistia": "",
  "audio": false,
  "horsParcours": false,
  "fichiers": [
   {
    "local": "16-1-choisir_son_intention_matinale_.pdf",
    "nom": "choisir_son_intention_matinale_.pdf"
   }
  ]
 },
 {
  "titre": "JOUR 14: GARDER L'ESSENTIEL : 7 jours avant le solstice!",
  "module": "Jour 14",
  "texte": "Quatorze jours ont déjà tracé un mouvement. Des prises de conscience, des ajustements, des gestes simples se sont installés.\n\nÀ ce stade, il ne s'agit plus d'ajouter. Il s'agit de garder l'essentiel.\n\nCe jour marque un temps de sélection : reconnaître ce qui soutient réellement, ce qui recentre, ce qui mérite d'être nourri pour la suite. Le reste peut s'éloigner et revenir plus tard si besoin.\n\nUn moment de réflexion : retour sur les 14 derniers jours\n\nPrendre le temps de revenir, regarder, observer et re-choisir. C'est souvent ce qui manque dans nos horaires chargés : le temps de réflexion.\n\nLes réponses peuvent rester intérieures ou être déposées dans un journal.\n\n Qu’est-ce qui m'a le plus marqué ou apporté de la lumière ces derniers jours ?\n\nQuelle pratique ou quel rituel m'a réellement soutenu ?\n\nQuels moments m'ont apporté le plus de calme ou de stabilité intérieure ?\n\nQu’est-ce qui pourrait accompagner les prochains jours, de façon soutenante ?\n\nSi un mot devait guider la suite, lequel serait-ce ?\n\nChoisir et nourrir ce qui soutient\n\nAprès cette réflexion, choisir un geste déjà connu, vécu dans les jours précédents, et lui laisser plus de place dans le quotidien.\n\nLa respiration de l'abeille pour apaiser et recentrer. Observer l'énergie du moment comme dans le rituel des Gunas. Revenir à Trataka pour déposer ce qui pèse et retrouver une direction intérieure plus claire. Une courte pause consciente, plusieurs fois dans la journée.\n\nL'intention : garder ce qui soutient vraiment.\n\nRituel : s'ancrer dans l'instant présent et choisir \n\nS'installer dans un espace calme. Respirer profondément. Se poser la question : « Qu'est-ce que je veux garder avec moi pour nourrir mon axe intérieur? » Accueillir la réponse : un mot, une sensation, une qualité.\n\nPrendre un moment pour écrire ce mot dans le journal.\n\nBonus — Méditation guidée : sécurité, enracinement et abondance\n\nUne méditation audio est proposée en complément du rituel du jour. Elle accompagne le retour dans le corps, la sécurité intérieure et l'ouverture à l'abondance.\n\nCombiner Trataka et la méditation\n\nRevenir quelques instants à la flamme : regard doux, puis empreinte lumineuse derrière les paupières. Lancer ensuite la méditation, les yeux encore clos. Laisser l'image de la flamme et les affirmations se rencontrer, comme si le feu soutenait l'intégration des mots.\n\nInvitation au partage\n\nVos témoignages sont précieux. Invitation à partager ressenti, expérience, pensées pour enrichir la réflexion. Plus nous sommes nombreux, plus la résonance est grande.\n\nMerci d'être là! xx",
  "wistia": "wcb0j0ydxy",
  "audio": true,
  "horsParcours": false,
  "fichiers": []
 },
 {
  "titre": "JOUR 15: Observer nos freins à la CONSTANCE",
  "module": "Jour 15",
  "texte": "Bienvenue dans la troisième étape de votre voyage de 21 jours !\nNous entrons dans la troisième partie de ce cycle de 21 jours, une transition douce et significative qui nous conduit vers le solstice d’hiver, ce 21 décembre.\n\nCe moment unique, marqué par la nuit la plus longue de l’année, est un point de transition dans le cycle de la nature. Le solstice d’hiver nous invite à ralentir, à observer l’obscurité, et à préparer doucement l’accueil de la lumière qui renaîtra après cette nuit si particulière.\n\nPourquoi cette étape est essentielle?\n\nChaque rituel proposé au cours des prochains jours est conçu pour :\n\nRenforcer  nos intentions en cultivant des pratiques alignées avec vos besoins profonds.\nAligner nos actions avec nos valeurs pour créer des changements qui ancrent nos volontés, visions et actions.\nCultiver une lumière intérieure qui nous accompagnera bien au-delà de ces 21 jours.\nJour 15 : L’Harmonie intérieure – Observer les freins à la constance\nDans ce jour 15 du parcours, nous plongeons dans un aspect souvent négligé mais essentiel : comprendre ce qui freine la constance dans nos pratiques.\n\nMême les rituels les plus simples, comme 5 minutes de respiration consciente, peuvent sembler difficiles à maintenir.\n\nAvant de continuer, prenez un moment pour vous poser, respirer et observer avec bienveillance vos propres résistances.\n\n \nMini-rituel : Une pause pour respirer et observer\n\nÉtapes simples :\n\nInstallez-vous dans un espace calme, le dos droit, les pieds bien ancrés ou les jambes croisées.\nInspirez doucement par le nez pendant 5 secondes, en laissant l’air descendre jusque dans votre ventre.\nRetenez votre souffle pendant 5 secondes, sans forcer.\nExpirez lentement par la bouche pendant 5 secondes, en imaginant relâcher vos tensions.\nSuspendez votre souffle pendant 5 secondes, en laissant votre esprit se calmer.\nRépétez ce cycle 3 fois. \n\npuis.... \n\nRessentez ce qui est présent :\n\nObservez sans jugement : vos sensations corporelles, vos pensées, vos émotions.\nDéposez une intention claire  :\n\"Je demande de la clarté pour comprendre ce qui pourrait freiner mon évolution vers le renouveau.\"\nRéflexion guidée : Quels sont vos freins à la constance ?\n\nPrenez quelques instants pour répondre à cette question :\n\"Qu’est-ce qui, dans mon quotidien, pourrait m’empêcher de m’offrir 5 minutes pour moi chaque jour ?\"\n\nExemples de freins courants :\n\nManque de temps :\n\"Je suis trop occupé(e) par ma vie, mon roulement et toutes mes responsabilités.\"\nPerfectionnisme :\n\"Si je ne peux pas faire le rituel parfaitement, je préfère ne rien faire. Tout doit être parfait : le moment, le timing, le rituel…\"\nManque d’énergie :\n\"Je suis trop fatigué(e) pour m’y mettre. Je le ferai demain.\"\n\n💡 Qu'ajouteriez vous à cette liste ? \n\nDistractions extérieures, culpabilité, résistance au changement, surcharge mentale, peur de l’échec ?\n \nAction proposée : Explorer votre propre résistance\n\nIdentifiez votre frein principal (et ses alliés) :\nLequel résonne le plus avec votre réalité ? Peut-être en identifiez-vous un, deux, ou même trois qui s’entrelacent.\n\nPosez une intention :\nQue pourriez-vous ajuster ou simplifier pour créer cet espace de 5 minutes dans votre journée ?\nQuels petits gestes, même infimes, pourraient vous soutenir et contourner ces freins ?\n\n \n\nPartage avec la communauté\n\n💬 Sur une échelle de 1 à 10 (10 étant une constance parfaite), comment évaluez-vous votre capacité à maintenir une pratique quotidienne de 5 minutes ?\n💬 Quelle est votre principale résistance  ? ( juste pour le plaisir de partager)\n👉 Partagez vos réponses ou réflexions dans notre communauté. \n\nPourquoi cette réflexion est importante ?\n\nIdentifier nos freins à la constance est une étape clé pour l'intégration du changement.\n\n👉 Accédez à votre rituel ici : krystinestlaurent.com\n\nAvec gratitude et lumière,\nKrystine xx",
  "wistia": "",
  "audio": false,
  "horsParcours": false,
  "fichiers": []
 },
 {
  "titre": "Jour 16 : Un ajustement de 1% pour la suite....",
  "module": "Jour 16",
  "texte": "Jour 16 — Un ajustement de 1% pour la suite....\nLe Jour 15 a permis d’observer les freins à la constance.\nObserver ces freins demande du courage. Cela met en évidence des automatismes, des schémas qui se répètent, des histoires que le mental excelle à ramener.\nNous le vivons tous : le mental nous ramène au statu quo, au connu. Tant que nous restons dans cet espace familier, il se sent en terrain sûr. Dès qu’un changement se présente, le mental (qui n’est pas là pour nous rendre heureux, faut-il le rappeler) nous ramène à coup d’illusions vers la chaleur de la couette, le cocooning, le familier.\nCe jour 16 vient rappeler quelque chose d’essentiel : nous ne sommes pas le mental. Ses scénarios font aussi partie d’un héritage très ancien, celui d’un cerveau humain construit pour la survie, pas pour l’élan.\nAujourd’hui, l’invitation est de prendre appui sur ce qui a été vu au Jour 15 et de le traduire, simplement, dans le concret. Parce que quand l’intérieur est déjà chargé, ce n’est pas une nouvelle couche qui aide. C’est un geste juste, posé au bon endroit\nIci, l’équilibre vient de ce qu’on épure, de ce qu’on relâche, de ce qu’on cesse de porter.\nMini-rituel d’ouverture : respiration de l’abeille\nInstallez-vous confortablement.\nFaites trois cycles de respiration de l’abeille. Inspirez doucement par le nez, puis expirez en laissant sortir un bourdonnement léger, bouche fermée, comme un “mmm” discret. Répétez trois fois, sans forcer, en laissant le son rassembler l’attention.\nObserver, puis choisir\nAprès ces trois respirations, prenez une minute pour observer trois zones, sans chercher à tout comprendre.\nLe corps : y a-t-il une sensation dominante? Tension, lourdeur, fatigue, trop-plein, agitation.\nLes émotions : une couleur qui revient? Irritabilité, sensibilité, impatience, besoin de retrait, élan.\nLes pensées : un fil qui tourne? Pression, jugement intérieur, scénarios, agitation.\nUne seule chose se présente plus clairement que les autres. Laquelle?\nJournal\nDans votre journal, notez :\nLe signal le plus présent aujourd’hui.\nUn geste concret qui peut rééquilibrer légèrement les prochaines 24 heures.\nUn mot-intention pour accompagner ce choix.\nChoisissez un geste simple,  qui s’insère facilement  dans la journée.\nPar exemple : une courte pause entre deux tâches, une marche de dix minutes sans téléphone, déléguer ou reporter un engagement, dire non à une demande, fermer les écrans une heure plus tôt, reprendre la respiration de l’abeille en milieu de journée, revenir à Trataka quelques minutes avant le coucher.\nTerminez par une respiration complète, puis laissez la journée se dérouler avec ce repère.\nPartage dans la communauté\nMerci de nourrir l'espace avec votre riche expérience! Très précieux!",
  "wistia": "",
  "audio": false,
  "horsParcours": false,
  "fichiers": []
 },
 {
  "titre": "JOUR 17 Amplifier ce qui nourrit.",
  "module": "Jour 17",
  "texte": "Audio du jour — Lecture (Nature et Ayurveda)\n\nAujourd’hui, je vous accompagne avec un audio différent : une courte lecture tirée de mon livre Nature et Ayurveda (page 314 et suivantes).\nInstallez-vous simplement, avec votre café, votre tisane… ou même en voiture.\n\nPendant l’écoute, gardez cette idée en toile de fond : se régénérer est un choix qui se renouvelle à chaque matin. Et, sans nier le réel, nous pouvons choisir de façon consciente ce qui vient nous animer.\n\nEn terminant, prenez quelques secondes pour répondre à cette question :\nDepuis votre réveil, jusqu’à maintenant, combien de cadeaux avez-vous déjà reçus (eau chaude, un lit, un thé, un sourire, un moment de calme, une respiration plus ample…) ?\n\nMini-rituel — Amplifier ce qui nourrit\n\n1) Repérer ce qui nourrit (sans “devoir”)\nDans votre journal, notez 3 choses qui vous ont fait du bien récemment.\nPas ce qui “devrait” vous nourrir — ce qui nourrit réellement.\n\n2) Reconnaître les cadeaux déjà reçus\nNotez 5 cadeaux de votre journée, même minuscules.\n\n3) Poser une intention\nComplétez cette phrase :\n« Je choisis d’inviter plus de __________ dans ma vie. »\n(paix, douceur, opportunités, repos, amour… ce qui résonne pour vous)\n\nAjoutez ensuite un repère concret :\n« Je vais le reconnaître quand… » (un signe simple et observable)\n\n4) Amplifier un soutien, réduire une fuite\nChoisissez :\n\nUn soutien à amplifier aujourd’hui (un geste simple qui vous fait du bien)\n\nUne fuite à réduire aujourd’hui (une seule)\n\nÉcrivez :\nSoutien : __________\nFuite : __________\n\n5) Donner pour prolonger\nChoisissez une action simple : un message d’appréciation, une écoute, un geste d’attention, un service rendu, une présence plus vraie.\n\n6) Clôturer\nUne respiration profonde. Puis un merci intérieur, pour ce qui est déjà là.\n\nQuestions de réflexion\n\nQu’est-ce qui me nourrit réellement en ce moment ?\n\nQu’est-ce qui me coûte de l’énergie sans me nourrir ?\n\nQuel micro-choix aurait le plus d’impact aujourd’hui ?\n\nQuel geste de générosité est juste, simple, à ma portée ?\n\nPartage dans la communauté\n\nQuelle action allez-vous poser aujourd’hui pour amplifier ce qui vous nourrit ?\nEt quelle petite fuite choisissez-vous de réduire ?\n\n \n\n* en référence: Louis Swartzberg \n\nFrère David Steindl Rast  \n\nNature et Ayurveda, Krystine St Laurent , éditions de l'Homme , 2018\n\nAvec gratitude et lumière,\nKrystine xx\n\nReconnecter. Nourrir. Transformer.",
  "wistia": "i3bqhga38l",
  "audio": true,
  "horsParcours": false,
  "fichiers": []
 },
 {
  "titre": "JOUR 18: Cultiver l’abondance par le mouvement",
  "module": "Jour 18",
  "texte": "Thème : Cultiver l’abondance par le mouvement\nFocus : Observer où le mouvement circule facilement (donner) et où il demande plus d’ouverture (recevoir).\n\nAvez-vous plus de facilité à donner ou à recevoir ?\n\nCes derniers jours, nous avons travaillé la gratitude, puis le fait d’amplifier ce qui nourrit. Aujourd’hui, nous passons au partage.\n\nDonner à partir de ce qui est vraiment disponible permet à quelque chose de circuler. Le geste revient autrement, souvent là où on ne l’attendait pas. Et laisser entrer — un merci, une aide, une pause — fait de la place pour ce qui vient.\n\nL’abondance vit de ce mouvement : donner et recevoir. Les deux font partie du même souffle.\n\nDonner et recevoir : deux mouvements, une seule circulation\n\nPour plusieurs d’entre nous, donner vient naturellement. C’est familier, valorisé, confortable même. Recevoir, c’est autre chose. Cela peut créer un malaise, une impression de devoir quelque chose, un réflexe de minimiser ou de rendre tout de suite.\n\nPourtant, recevoir demande autant d’ouverture que donner. Accueillir un compliment, accepter de l’aide, se laisser soutenir : ces gestes demandent une forme de courage. Celui de se montrer dans le besoin, dans la vulnérabilité, dans l’humanité.\n\nAujourd’hui, observez où vous vous situez. Et explorez, si c’est possible, le geste qui vous est moins familier.\n\nLe rituel du jour\n1) Commencez par une question simple\n\nAujourd’hui, qu’est-ce qui est disponible en moi ?\n\nSi la réponse est « pas grand-chose », c’est une information précieuse. Le mouvement du jour peut être de recevoir.\n\n2) Si vous donnez\n\nChoisissez une personne — proche, collègue, inconnu. Offrez-lui deux minutes de présence entière : téléphone loin, regard disponible, écoute réelle.\n\nUne phrase simple peut accompagner ce moment :\n« Je pensais à vous. »\n« Merci pour… »\n« Comment allez-vous, aujourd’hui ? »\nPuis écoutez la réponse.\n\n3) Si vous recevez\n\nChoisissez un seul geste :\n\naccueillir un compliment avec un simple merci\n\ndemander un coup de main\n\naccepter une aide offerte\n\nvous offrir une vraie pause\n\nLaisser entrer. C’est tout.\n\n4) Observer\n\nAprès ce geste, qu’est-ce qui a bougé ? Plus d’ouverture, plus de calme, plus de présence ?\nNotez un mot, une sensation, une phrase dans votre journal.\n\nPartage dans la communauté\n\nAujourd’hui, votre mouvement était-il un geste offert ou un geste reçu ?\nQu’avez-vous remarqué après ?",
  "wistia": "",
  "audio": false,
  "horsParcours": false,
  "fichiers": []
 },
 {
  "titre": "JOUR 19: RITUEL SUR 3 JOURS vers LE RENOUVEAU (RASAYANA)",
  "module": "Jour 19",
  "texte": "Créer l’espace pour le renouveau \n\nObjectif : Déposer ce qui alourdit\nIntroduction\nNous approchons de la fin de ce parcours de 21 jours. Les trois prochains jours forment un rituel final, simple, réparti dans le temps.\nEn Ayurveda, le concept de Rasayana (régénérescence) rappelle une idée essentielle : le renouveau se prépare par équilibre entre ce qui entre et ce qui sort. Comme une respiration.\nJour 19 ouvre ce rituel par une étape concrète : déposer ce qui alourdit.\nLe rituel — La petite boîte de renouveau\nMatériel\nUne petite boîte ou un récipient\nDes petits papiers et un crayon\n1) Préparer l’espace\nChoisissez un endroit calme. Placez la boîte à un endroit où elle restera visible pendant les trois prochains jours.\nPrenez quelques respirations, simplement pour vous poser.\nSi vous le souhaitez, allumez une bougie.\n2) Observer\nPosez-vous cette question :\n« Qu’est-ce qui, en ce moment, alourdit mon chemin ? »\n(pensées, émotions, habitudes, réflexes)\nLaissez venir, sans analyser.\n3) Écrire et déposer\nSur un papier, écrivez un mot ou une phrase.\nPuis déposez-le dans la boîte.\nVous pouvez dire intérieurement :\n« Je reconnais que c’est là. Je le dépose ici. »\nRépétez autant de fois que nécessaire.\n4) Continuer l'exercice  pendant trois jours\nEntre aujourd’hui et la fin du rituel, chaque fois qu’un nouvel élément remonte, revenez à la boîte et ajoutez un papier.\nRéflexion\nAprès quelques dépôts, notez une phrase :\n« Quand je dépose, qu’est-ce que je ressens dans mon corps ? »\nPartage dans la communauté\nSi vous le souhaitez, partagez une observation :\nun mot déposé, ou ce que cela a changé dans votre état intérieur.",
  "wistia": "",
  "audio": false,
  "horsParcours": false,
  "fichiers": []
 },
 {
  "titre": "JOUR 20 Rituel final (Jour 2 sur 3): RASAYANA: : Trier et choisir",
  "module": "Jour 20",
  "texte": "Hier, la boîte a commencé à se remplir : papiers, mots, éléments qui alourdissent. Vos partages dans les commentaires sont éloquents: c'est un exercice qui éveille, oriente, et aide à placer la prochaine pierre. \n\nAujourd'hui, il ne s'agit pas de passer à autre chose, mais de revenir vers ce que vous avez déjà déposé — avec un regard un peu différent. Observer reste au centre. Trier devient une façon de prolonger cette observation : voir ce qui revient, ce qui se répète, ce qui forme un fil.\n\nLe rituel — Trier et choisir\n\n1) Ouvrir la boîte (2 minutes) Relisez ce que vous avez déposé, sans analyser longtemps. Laissez simplement apparaître ce qui revient.\n\n2) Regrouper (3 minutes) Faites trois petites piles ou trois colonnes dans votre journal :\n\nPensées\nÉmotions\nHabitudes / réflexes\n\nL'idée n'est pas de tout classer parfaitement, mais de voir où ça se rassemble.\n\n3) Nommer le fil (1 minute) Écrivez une phrase :\n\n« Ce qui revient le plus, c'est __________. »\n\nLaissez venir le mot ou l'expression qui résume le mieux ce fil.\n\n4) Choisir une intention (2 minutes) Écrivez une deuxième phrase :\n\n« Aujourd'hui, je choisis de __________. »\n\nUne direction concrète et simple : une limite, une pause, une action, un retrait, une demande.\n\n5) Déposer un dernier papier (optionnel) Si quelque chose remonte pendant le tri, ajoutez un seul papier dans la boîte. Puis refermez.\n\nRéflexion\n\nDans votre journal, une question à garder avec vous :\n\n« Quand je nomme ce fil, qu'est-ce que ça me dit sur où j'en suis ? »\n\nVous pouvez y répondre maintenant ou laisser la question vous accompagner au fil de la journée. Ce mouvement peut continuer en arrière-plan : même après le rituel, la réflexion se poursuit d'elle-même, doucement.\n\nPartage dans la communauté\n\nSi l'élan est là : un mot sur le fil que vous avez reconnu, et l'intention que vous avez choisie.",
  "wistia": "",
  "audio": false,
  "horsParcours": false,
  "fichiers": []
 },
 {
  "titre": "JOUR 21: Clore un cycle pour en ouvrir un nouveau",
  "module": "Jour 21",
  "texte": "Objectif : Clore le cycle et repartir avec un repère simple\n\nIntroduction\n\nCes trois derniers jours formaient un seul rituel.\nJour 19 a ouvert l’espace.\nJour 20 a permis de trier et de nommer l’essentiel.\nAujourd’hui, nous fermons ce cycle.\n\nClore ne veut pas dire conclure par un sommet.\nCela veut dire reconnaître ce qui a été fait, puis repartir avec un repère simple, utilisable, sans effort.\n\n \nLe rituel — Fermer la boîte\n\n1) Ouvrir une dernière fois\nOuvrez la boîte. Relisez ce qui s’y trouve, sans analyser.\nPrenez simplement acte.\n\n2) Choisir ce qui reste\nDans votre journal, complétez cette phrase :\n« De ces 21 jours, ce que je choisis de garder avec moi, c’est __________. »\n(Un mot, une qualité, un geste, un rythme.)\n\n3) Fermer\nRefermez la boîte.\nDécidez consciemment de ce que vous en ferez après aujourd’hui :\n\nla vider\n\nla jeter\n\nla conserver comme rituel ponctuel\n\nLe choix importe moins que le fait de le poser.\n\nIntégration — Revenir au corps\n\nPrenez deux minutes pour revenir au corps :\n\npieds au sol\n\nrespiration calme\n\nune main posée sur le ventre ou la poitrine\n\nNotez ensuite une phrase :\n« Quand je reviens ici, je remarque __________. »\n\nRessource — Méditation de clôture (audio)\n\nUne capsule audio est disponible pour accompagner cette fin de cycle.\nÉcoutez-la si et quand c’est juste pour vous.\n\nRéflexion finale\nDans votre journal, une seule question :\n« Qu’est-ce que je fais différemment, maintenant, même de façon minuscule ? »\nPartage dans la communauté\n\nSi vous le souhaitez, partagez une phrase :\nce que vous gardez, ou ce que vous laissez derrière.\n\nMerci sincère pour vos commentaires! Quelle belle communauté!  Et ne pas oublier, vous pouvez revenir à ces rituels, à ce contenu à chaque fois que vous en avez l'élan.Tout ce que vous avez réfléchi, relâché, observé fait partie du chemin et du processus d’élévation de fréquence!",
  "wistia": "2j0u2a57vj",
  "audio": true,
  "horsParcours": false,
  "fichiers": []
 },
 {
  "titre": "JOUR 11: Stimuler notre feu intérieur",
  "module": "Hors parcours : jour 11 à déplacer",
  "texte": "L'Agni : Le moteur de notre vitalité\n\nAu cœur de notre énergie vitale réside l'Agni, notre feu digestif. Ce feu subtil, selon la sagesse ayurvédique, ne se limite pas à la digestion des aliments ; il est aussi le pilier de notre clarté mentale, de notre immunité et de notre bien-être émotionnel. Nous pourrions l'imager comme notre foyer intérieur. \n\nLorsque notre Agni brûle avec force et équilibre, nous ressentons une vitalité vibrante, une digestion fluide et une clarté d’esprit. Comme un feu créé avec du bois sec.\n\nEn revanche, lorsqu’il s’affaiblit ou s’enflamme de manière excessive, cela peut se manifester par de la fatigue, une lourdeur ou une sensation de débalancement comme des brûlements d'estomac ou des  débalancements intestinaux plus profonds.\n\nDans un monde où tout va vite, il est facile de négliger ce feu intérieur. Pourtant, nourrir et harmoniser notre Agni est l’un des gestes les plus puissants pour cultiver notre équilibre et notre santé.\n\nCette semaine, explorons ensemble comment des rituels simples et intentionnels peuvent raviver notre feu digestif, en alignant notre énergie intérieure avec les cycles naturels qui nous entourent. Prenons le temps de revenir à l’essentiel, pour mieux nourrir notre corps, notre esprit et notre âme.\n\nRituel du jour : Infusion digestive stimulant notre feu digestif \n\nRecette :\n\n1 morceau de gingembre frais (environ 2 cm), râpé ou tranché.\n1 cuillère à café de graines de fenouil. ou une branche de fenouil frais coupé en tranches.\n5 gousses de cardamome (ou 1/4 cuillère à café de poudre).\n1 bâton de cannelle ( à utiliser avec parcimonie si irritation gastrique)\n500 ml d’eau chaude.\n\nInstructions :\nFaites bouillir l’eau et ajoutez tous les ingrédients, baissez le feu, laissez mijoter doucement 5 à 7 minutes, filtrez, et servez chaud. \n\nVous pouvez utiliser cette infusion dans vos soupes, bouillons ou potages! \n\n \n\n \n\nRéflexion journalière :\n\nPrenez un moment après ce rituel pour répondre à cette question :\n\n\"Que puis-je faire aujourd’hui pour nourrir mon feu intérieur, au sens physique ou émotionnel ?\"\n\nNotez vos réflexions dans votre journal et partagez des variations de recettes qui vous inspirent!",
  "wistia": "",
  "audio": false,
  "horsParcours": true,
  "fichiers": [
   {
    "local": "08-1-Fiche_e_clair_5_plantes_pour_le_feu_digestif_.pdf",
    "nom": "Fiche_e_clair_5_plantes_pour_le_feu_digestif_.pdf"
   }
  ]
 },
 {
  "titre": "jour à déterminer Relâcher la tension avec un rituel pour les yeux",
  "module": "Hors parcours : jour à déterminer",
  "texte": "Jour 13 : Relâcher la tension avec un rituel pour apaiser les yeux\n\nLes yeux sont souvent sur-sollicités, que ce soit par les écrans, la lumière artificielle ou les tensions accumulées au fil de la journée. Ce rituel simple vous invite à offrir une pause bien méritée à vos yeux tout en cultivant un moment de paix intérieure.\n\nRituel du jour : 1 minute pour apaiser vos yeux\n\nPréparation :\n\nInstallez-vous dans un endroit calme avec une table devant vous, où vous pourrez déposer vos coudes.\n\nInstructions :\n\nActivation de l’énergie : Frottez vos mains ensemble pour activer leur chaleur et énergie.\nPosture des mains : Appuyez vos coudes sur la table, tournez les paumes de vos mains vers votre visage et penchez doucement votre tête pour que vos yeux reposent dans vos mains. L’objectif est de bloquer la lumière sans appuyer sur les yeux.\nRespiration consciente : Inspirez et expirez profondément, avec l’intention de relâcher ce qui ne vous sert plus. Vous pouvez réciter mentalement un mantra comme Om Shanti (\"paix\" en sanskrit), si cela résonne en vous.\n\nClôture :\n\nPrenez un instant pour remercier vos yeux pour tout ce qu’ils accomplissent chaque jour.\nOption : Exercice de yoga pour les yeux\n\nPour prolonger ce moment, effectuez des mouvements doux pour détendre les muscles oculaires et activer la microcirculation lymphatique :\n\nRegardez doucement de gauche à droite.\nRegardez de haut en bas.\nFaites des cercles lents avec vos yeux dans le sens des aiguilles d’une montre, puis dans le sens inverse.\n\nRépétez chaque mouvement 3 à 5 fois.\n\n🔸 Aujourd’hui, avez-vous pris un moment pour apaiser vos yeux ?\n💡 Partagez une sensation, un mot ou une réflexion qui résume votre expérience après ce rituel.\n\n✨ Astuce du jour :\nSi votre travail nécessite beaucoup d’exposition aux écrans, programmez une alarme chaque heure pour prendre 1 ou 2 minutes et répéter les exercices pour les yeux. Ces micro-pauses peuvent faire toute la différence pour préserver votre confort visuel. 👀\n\n💬 Vos partages sont précieux et peuvent inspirer d’autres dans leur pratique.",
  "wistia": "",
  "audio": false,
  "horsParcours": true,
  "fichiers": []
 },
 {
  "titre": "mis de côté JOUR 17: Purifier, un acte quotidien",
  "module": "Hors parcours : mis de côté",
  "texte": "Jour 17 : Se purifier et se recentrer\nThème : Le rituel de purification\n\nFocus : Utiliser l’élément de l’eau (symboliquement ou physiquement) pour se purifier et se recentrer.\n\nIntroduction :\nL’eau est un symbole universel de purification et de renouveau. Aujourd’hui, ce rituel vous invite à laisser partir ce qui ne vous sert plus et à vous reconnecter à votre clarté intérieure.\n\nMini-rituel : Purification intérieure et extérieure\n\nChoisissez votre approche :\n\nPhysiquement : Prenez un bain ou une douche en pleine conscience, en imaginant l’eau emporter vos tensions et pensées négatives.\nSymboliquement : Remplissez un bol d’eau, placez-le devant vous, et visualisez l’eau absorbant ce que vous souhaitez laisser partir.\n\nPosez une intention :\n\n\"Qu’est-ce que je suis prête à libérer pour avancer avec légèreté et clarté ?\"\n\nClôturez en gratitude :\n\nRemerciez l’eau pour son rôle purificateur et offrez-vous un moment de calme pour savourer cette sensation de renouveau.\n\n👉 Accédez au rituel ici : krystinestlaurent.com\n\n💬 Dans la communauté : Qu’avez-vous choisi de libérer aujourd’hui ? Partagez vos réflexions pour inspirer et encourager les autres.",
  "wistia": "",
  "audio": false,
  "horsParcours": true,
  "fichiers": []
 }
];

async function jeton() {
  // Même accès que scripts/newsletter/fusionner-doublons.mjs : la connexion « firebase login ».
  const candidats = [join(homedir(), '.iris/tools/node_modules/firebase-tools/lib/auth.js')];
  try { candidats.unshift(execFileSync('npm', ['root', '-g'], { encoding: 'utf8' }).trim() + '/firebase-tools/lib/auth.js'); } catch { /* rien */ }
  const chemin = candidats.find(existsSync);
  const conf = join(homedir(), '.config/configstore/firebase-tools.json');
  if (!chemin || !existsSync(conf)) throw new Error('Pas de connexion « firebase login » sur cet ordinateur.');
  const auth = createRequire(import.meta.url)(chemin);
  const t = await auth.getAccessToken(JSON.parse(readFileSync(conf, 'utf8')).tokens.refresh_token, []);
  return t.access_token || t;
}

const v = (x) => typeof x === 'number' ? (Number.isInteger(x) ? { integerValue: String(x) } : { doubleValue: x })
  : typeof x === 'boolean' ? { booleanValue: x }
  : Array.isArray(x) ? { arrayValue: { values: x.map(v) } }
  : x === null ? { nullValue: 'NULL_VALUE' }
  : x instanceof Date ? { timestampValue: x.toISOString() }
  : { stringValue: String(x) };
const champs = (o) => Object.fromEntries(Object.entries(o).map(([k, x]) => [k, v(x)]));

async function ecrire(tk, chemin, o) {
  const r = await fetch(`${FS}/${chemin}`, { method: 'PATCH', headers: { Authorization: `Bearer ${tk}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ fields: champs(o) }) });
  if (!r.ok) throw new Error(`Firestore ${chemin} : ${r.status} ${await r.text()}`);
}

async function deposer(tk, nom, corps, type) {
  const r = await fetch(`https://storage.googleapis.com/upload/storage/v1/b/${BUCKET}/o?uploadType=media&name=${encodeURIComponent(nom)}`, {
    method: 'POST', headers: { Authorization: `Bearer ${tk}`, 'Content-Type': type }, body: corps,
  });
  if (!r.ok) throw new Error(`Storage ${nom} : ${r.status} ${await r.text()}`);
}

const telecharger = async (url) => {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`Téléchargement ${url} : ${r.status}`);
  return Buffer.from(await r.arrayBuffer());
};

const tk = A_BLANC ? '' : await jeton();
const manques = [];
let ordre = 0, totalSec = 0;
const modules = [...new Set(LECONS.map((l) => l.module))];
for (const l of LECONS) {
  ordre++;
  const id = String(ordre).padStart(3, '0');
  const base = `formations-contenu/${ID}/${id}`;
  let type = 'texte', chemin = '', vignette = '', duree = 0, media = null, infos = [];
  const fichiers = [];
  if (l.wistia) {
    const rep = await fetch(`https://fast.wistia.net/embed/medias/${l.wistia}.json`);
    if (!rep.ok) { manques.push(`${l.titre} : média Wistia ${l.wistia} introuvable (${rep.status})`); }
    else {
      const j = await rep.json();
      const assets = j.media.assets;
      duree = Math.round(j.media.duration || 0);
      if (l.audio) {
        const a = assets.find((x) => x.type === 'mp3_audio') || assets.find((x) => x.type === 'original');
        if (a) { type = 'audio'; media = { url: a.url, nom: 'audio.mp3', mime: 'audio/mpeg', gros: a.size }; infos.push(`audio ${Math.round(a.size / 1e6)} Mo`); }
        else manques.push(`${l.titre} : pas de fichier audio dans Wistia ${l.wistia}`);
      } else {
        const a = assets.find((x) => x.type === 'hd_mp4_video') || assets.find((x) => x.type === 'iphone_video') || assets.find((x) => x.type === 'mp4_video');
        if (a) {
          type = 'video'; let url = a.url; if (!/\.(mp4|bin)(\?|$)/.test(url)) url += '.mp4';
          media = { url, nom: 'video.mp4', mime: 'video/mp4', gros: a.size, image: assets.find((x) => x.type === 'still_image') };
          infos.push(`${a.type} ${Math.round(a.size / 1e6)} Mo`);
        } else manques.push(`${l.titre} : pas de vidéo MP4 dans Wistia ${l.wistia}`);
      }
    }
  }
  // Fichiers à télécharger (PDF, image) lus dans le dossier de travail.
  const locaux = [];
  for (const f of l.fichiers) {
    const p = join(DOSSIER_FICHIERS, f.local);
    if (!existsSync(p)) { manques.push(`${l.titre} : fichier ${f.nom} absent du dossier de travail`); continue; }
    locaux.push({ p, nom: f.nom.replace(/[^A-Za-z0-9._-]+/g, '_') });
  }
  if (type === 'texte' && locaux.length) type = locaux[0].nom.endsWith('.pdf') ? 'pdf' : 'texte';
  totalSec += duree;
  const mod = l.horsParcours ? ' [HORS PARCOURS]' : '';
  console.log(`${id} · ${l.titre}${mod} · ${type} · ${infos.join(', ') || 'texte'}${locaux.length ? ' · ' + locaux.length + ' fichier(s)' : ''} · ${Math.round(duree / 60)} min`);
  if (A_BLANC) continue;
  if (media) {
    const corps = await telecharger(media.url);
    chemin = `${base}/${media.nom}`;
    await deposer(tk, chemin, corps, media.mime);
    fichiers.push(chemin);
    if (media.image) {
      try { await deposer(tk, `${base}/vignette.jpg`, await telecharger(media.image.url.replace(/\.bin$/, '.jpg')), 'image/jpeg'); vignette = `${base}/vignette.jpg`; }
      catch (e) { manques.push(`${l.titre} : vignette non déposée (${e.message})`); }
    }
  }
  for (const f of locaux) {
    const dest = `${base}/${f.nom}`;
    await deposer(tk, dest, readFileSync(f.p), TYPES[f.nom.split('.').pop().toLowerCase()] || 'application/octet-stream');
    fichiers.push(dest);
    if (!chemin) chemin = dest;
  }
  await ecrire(tk, `formations/${ID}/lecons/${id}`, {
    titre: l.titre, ordre, moduleNom: l.module, module: modules.indexOf(l.module) + 1, texte: l.texte || '',
    type, chemin, fichiers, vignette, dureeSecondes: duree, wistiaHash: l.wistia || '', mediaPret: true,
    ...(l.horsParcours ? { horsParcours: true } : {}), creeLe: new Date(),
  });
}
if (!A_BLANC) {
  await ecrire(tk, `formations/${ID}`, {
    titre: '21 jours de rituels : calendrier de l’Avent réinventé',
    description: 'Un parcours de 21 jours pour clore un cycle avec douceur, revenir à ce qui compte et apprendre à choisir ses journées plutôt que de seulement réagir. Chaque jour, un geste court et un rendez-vous avec soi, sans performance.',
    statut: 'masque', paywall: true, prix: null, categorie: 'cours', kajabiId: '2149250284',
    imageUrl: '', creeLe: new Date(), maj: new Date(),
  });
}
if (manques.length) console.log('MANQUES :\n - ' + manques.join('\n - '));
console.log(`Durée totale (vidéos et audios) : ${Math.round(totalSec / 60)} min (${(totalSec / 3600).toFixed(1)} h)`);
console.log(A_BLANC ? '[à blanc] rien n’a été écrit.' : `Fait : ${LECONS.length} leçons et la formation « ${ID} » (masquée).`);
