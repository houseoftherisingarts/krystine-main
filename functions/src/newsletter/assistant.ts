import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import Anthropic from '@anthropic-ai/sdk';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { assertAdmin, type NewsletterAudience } from './send';
import type { NewsletterBlock } from './renderer';

// ─── Iris, l'assistante d'infolettre ────────────────────────────────────────
// La « version terminale » de l'admin : Krystine parle à Iris comme Alex parle
// à Claude Code. Iris rédige dans sa voix, propose des blocs, une audience et
// une date d'envoi; l'admin applique la proposition au brouillon et montre
// l'aperçu exact (previewNewsletter). Rien ne part sans le geste de Krystine.
//   firebase functions:secrets:set ANTHROPIC_API_KEY

export const ANTHROPIC_API_KEY = defineSecret('ANTHROPIC_API_KEY');

const SYSTEM = `Tu es Iris, l'assistante d'infolettre de Krystine St-Laurent (krystinestlaurent.ca). Tu écris ses infolettres dans sa voix et tu l'aides à les programmer. Tu réponds en français, avec chaleur et sans cérémonie, comme une collègue de confiance.

QUI EST KRYSTINE
Près de 40 ans à relier ce que nous avons appris à séparer : nourrir et soigner, corps et conscience, science et sagesses. Des soins infirmiers et de la recherche clinique à l'Ayurveda, aux plantes médicinales, à l'écriture et à la transmission. Autrice d'une trilogie (près de 1 200 pages, douze années de recherche), conférencière internationale, fondatrice d'INSPIRATA Ayurveda. Elle anime le podcast « Au-delà des tendances » (saison 2 : « Quand suivre les modes ne suffit plus »). Ses territoires : le Foyer d'Origine (saisons, feu réel, douze portes), les livres, le podcast, l'Expérience Origine. Sa devise : « Relier ce que nous avons appris à séparer. »

SA VOIX, RÈGLES DURES
1. Vouvoiement, toujours. Chaleur d'une hôte, jamais de familiarité forcée.
2. Aucun tiret cadratin (—), nulle part. Recompose avec une virgule, un deux-points, un point ou des parenthèses.
3. Presque jamais « ce n'est pas X, c'est Y ». Des phrases positives.
4. « Nous » et jamais le « on » qui désigne Krystine et son équipe. Le « on » impersonnel (la société, les gens en général) reste permis.
5. Jamais « pis ». Jamais d'italique pour accentuer.
6. Des phrases entières qui se déploient, avec un sujet et un verbe. Jamais la phrase hachée en fragments empilés avec des virgules (« Trois cartes, le fil du temps, ce qui vient »). Jamais de petites phrases déclaratives sèches en série.
7. Des suggestions plutôt que des ordres : « vous pourrez », « si vous aimez », « il nous fera plaisir ».
8. Rythme humain et inégal : une phrase longue, puis une courte. Aucune symétrie mécanique entre paragraphes, pas de règle de trois systématique, pas d'anaphore, pas de question rhétorique suivie de sa réponse, pas de conclusion inspirante par réflexe, pas de positivité constante, pas de « il est important de noter », « dans le monde d'aujourd'hui », « plongeons », « façonner », « propulser », « sublimer », « crucial », « robuste », « incontournable », « écosystème », « non seulement... mais aussi ».
9. Le concret avant l'abstrait : une plante, une saison, un geste, une date. Le vide qui se donne des airs se coupe.
10. Jamais exposer la mécanique d'affaires. Le lecteur reçoit une invitation et une possibilité.
11. Le sujet du courriel tient en moins de 60 caractères. Un titre dans le corps ne dépasse jamais deux lignes.

TON TRAVAIL
Krystine te dit ce qu'elle veut dire, à qui, et quand. Tu proposes une infolettre complète avec l'outil set_newsletter : sujet, pré-en-tête, blocs (heading, paragraph, image, button, quote, cta, divider, spacer, list : une liste à puces dont le text contient une ligne par puce), audience et, si elle l'a dit, la date d'envoi. Le gabarit ajoute déjà le bandeau avec le sujet, la signature de Krystine et le pied de page (l'en-tête, couverture du podcast, image ou rien, se choisit dans les réglages du composeur, pas dans les blocs) : n'écris ni salutation finale ni signature dans les blocs, et ouvre par un paragraphe qui salue avec {{firstName}} (« Bonjour {{firstName}}, » devient le prénom du lecteur; sans prénom, la ligne reste « Bonjour , » donc préfère « Bonjour, » quand tu doutes).
Quand elle demande une retouche, renvoie l'infolettre entière retouchée avec le même outil. Quand elle pose une question ou discute, réponds en texte seulement. Les images : tu ne peux pas en créer; laisse un bloc image vide avec une légende qui dit quoi y mettre, elle téléversera la photo.
Audiences disponibles : « all » (tous les abonnés actifs), « tags » (une ou plusieurs listes par étiquette, les étiquettes te sont fournies avec le compte d'abonnés), « emails » (des personnes précises). Date : ISO 8601 avec fuseau America/Toronto.
Avant de livrer, relis chaque phrase : si ChatGPT l'aurait produite par défaut, reformule plus simplement.`;

const TOOL: Anthropic.Tool = {
  name: 'set_newsletter',
  description: "Propose l'infolettre complète (ou sa version retouchée) que l'admin appliquera au brouillon.",
  strict: true,
  input_schema: {
    type: 'object',
    additionalProperties: false,
    required: ['title', 'subject', 'preheader', 'blocks', 'audience', 'scheduledFor', 'note'],
    properties: {
      title: { type: 'string', description: 'Libellé interne, court' },
      subject: { type: 'string', description: 'Sujet du courriel, moins de 60 caractères' },
      preheader: { type: 'string', description: 'Texte d\'aperçu dans la boîte de réception' },
      blocks: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['type', 'content'],
          properties: {
            type: { type: 'string', enum: ['heading', 'paragraph', 'image', 'button', 'quote', 'cta', 'divider', 'spacer', 'list'] },
            content: {
              type: 'object',
              additionalProperties: false,
              required: ['text', 'level', 'align', 'url', 'caption', 'label', 'href', 'variant', 'attribution', 'eyebrow', 'title', 'body', 'buttonLabel', 'size', 'police', 'taille', 'style'],
              properties: {
                text: { type: ['string', 'null'], description: 'heading, paragraph, quote. Un paragraphe peut porter <b>, <i>, <u> et <a href="https://…"> : conserve ceux du brouillon.' },
                police: { type: ['string', 'null'], enum: ['serif', 'sans', 'script', null], description: 'heading, paragraph : conserve celle du brouillon, sinon null' },
                taille: { type: ['string', 'null'], enum: ['sm', 'md', 'lg', 'xl', null], description: 'paragraph : conserve celle du brouillon, sinon null' },
                level: { type: ['integer', 'null'], description: '1 à 3 pour heading' },
                align: { type: ['string', 'null'], enum: ['left', 'center', null] },
                url: { type: ['string', 'null'], description: 'image : laisser vide' },
                caption: { type: ['string', 'null'] },
                label: { type: ['string', 'null'], description: 'button' },
                href: { type: ['string', 'null'], description: 'button, cta, image (lien de la photo; sans lien, la photo mène au site)' },
                variant: { type: ['string', 'null'], enum: ['primary', 'secondary', null] },
                attribution: { type: ['string', 'null'], description: 'quote' },
                eyebrow: { type: ['string', 'null'], description: 'cta' },
                title: { type: ['string', 'null'], description: 'cta' },
                body: { type: ['string', 'null'], description: 'cta' },
                buttonLabel: { type: ['string', 'null'], description: 'cta' },
                size: { type: ['string', 'null'], enum: ['sm', 'md', 'lg', null], description: 'spacer' },
                style: { type: ['string', 'null'], enum: ['puce', 'numero', 'ligne', 'pleine', 'points', 'fleuron', 'etoiles', 'feuille', null], description: 'list : puce ou numero; divider : ligne, pleine, points, fleuron, etoiles, feuille' },
              },
            },
          },
        },
      },
      audience: {
        type: 'object',
        additionalProperties: false,
        required: ['mode', 'tags', 'emails'],
        properties: {
          mode: { type: 'string', enum: ['all', 'tags', 'emails'] },
          tags: { type: 'array', items: { type: 'string' } },
          emails: { type: 'array', items: { type: 'string' } },
        },
      },
      scheduledFor: { type: ['string', 'null'], description: 'ISO 8601 avec fuseau, ou null si pas de date' },
      note: { type: 'string', description: 'Un mot à Krystine sur ce que tu as fait (une ou deux phrases)' },
    },
  },
};

interface ChatMessage { role: 'user' | 'assistant'; content: string }

export interface AssistantProposal {
  title: string;
  subject: string;
  preheader: string;
  blocks: NewsletterBlock[];
  audience: NewsletterAudience;
  scheduledFor: string | null;
  note: string;
}

// Les blocs sortent du modèle avec toutes les clés (schéma strict) : on ne
// garde que les champs remplis pour que le composeur reste propre.
function cleanBlocks(blocks: any[]): NewsletterBlock[] {
  return (blocks || []).map(b => {
    const content: Record<string, any> = {};
    for (const [k, v] of Object.entries(b.content || {})) {
      if (v !== null && v !== undefined && v !== '') content[k] = v;
    }
    return { type: b.type, content };
  });
}

export const newsletterAssistant = onCall(
  { secrets: [ANTHROPIC_API_KEY], timeoutSeconds: 300, memory: '512MiB' },
  async (request) => {
    assertAdmin(request);
    const { messages, draft, tags, now } = (request.data || {}) as {
      messages?: ChatMessage[];
      draft?: Partial<AssistantProposal> & { blocks?: NewsletterBlock[] };
      tags?: Array<{ tag: string; count: number }>;
      now?: string;
    };
    if (!messages?.length) throw new HttpsError('invalid-argument', 'messages is required');
    if (!ANTHROPIC_API_KEY.value() || ANTHROPIC_API_KEY.value() === 'PLACEHOLDER') throw new HttpsError('failed-precondition', 'Iris attend sa clé : firebase functions:secrets:set ANTHROPIC_API_KEY');

    const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY.value() });

    // Contexte volatil après le système stable : l'état du brouillon, les
    // listes et l'heure, pour que la programmation « jeudi prochain » tombe juste.
    const context = [
      `Date et heure actuelles (America/Toronto) : ${now || new Date().toISOString()}.`,
      `Listes (étiquettes) disponibles : ${(tags || []).map(t => `${t.tag} (${t.count})`).join(', ') || 'aucune'}.`,
      draft?.blocks?.length
        ? `Brouillon actuel :\n${JSON.stringify({ title: draft.title, subject: draft.subject, preheader: draft.preheader, audience: draft.audience, scheduledFor: draft.scheduledFor, blocks: draft.blocks }, null, 0)}`
        : 'Brouillon actuel : vide.',
    ].join('\n');

    const history: Anthropic.MessageParam[] = messages
      .slice(-30)
      .map(m => ({ role: m.role, content: String(m.content || '').slice(0, 8000) }));
    // Le contexte se glisse devant le dernier message de Krystine.
    const last = history.pop()!;
    history.push({ role: 'user', content: `[Contexte]\n${context}\n\n[Message de Krystine]\n${typeof last.content === 'string' ? last.content : ''}` });

    let response: Anthropic.Message;
    try {
      response = await client.messages.create({
        model: 'claude-opus-5',
        max_tokens: 16000,
        system: [{ type: 'text', text: SYSTEM, cache_control: { type: 'ephemeral' } }],
        tools: [TOOL],
        messages: history,
      });
    } catch (e: any) {
      // Une erreur d'API se dit en clair à Krystine plutôt qu'en INTERNAL.
      const msg = String(e?.error?.error?.message || e?.message || '');
      console.error('newsletterAssistant: Anthropic', e?.status, msg);
      if (/credit balance|billing/i.test(msg)) throw new HttpsError('failed-precondition', 'Iris est en pause : le crédit du compte Anthropic est épuisé. Alex le recharge et tout repart.');
      if (e?.status === 401 || /invalid x-api-key|authentication/i.test(msg)) throw new HttpsError('failed-precondition', 'Iris est en pause : la clé Anthropic est refusée. Alex la remplace et tout repart.');
      if (e?.status === 429 || /overloaded/i.test(msg)) throw new HttpsError('resource-exhausted', 'Iris est très sollicitée en ce moment. Réessayez dans une minute.');
      throw new HttpsError('unavailable', `Iris n'a pas pu répondre (${msg.slice(0, 160) || 'erreur inconnue'}).`);
    }

    if (response.stop_reason === 'refusal') {
      throw new HttpsError('aborted', response.stop_details?.explanation || 'Réponse refusée.');
    }

    let reply = '';
    let proposal: AssistantProposal | null = null;
    for (const block of response.content) {
      if (block.type === 'text') reply += block.text;
      if (block.type === 'tool_use' && block.name === 'set_newsletter') {
        const p = block.input as any;
        proposal = {
          title: p.title, subject: p.subject, preheader: p.preheader,
          blocks: cleanBlocks(p.blocks),
          audience: { mode: p.audience.mode, tags: p.audience.tags || [], emails: p.audience.emails || [] },
          scheduledFor: p.scheduledFor || null,
          note: p.note,
        };
      }
    }
    if (!reply && proposal) reply = proposal.note;
    return { reply, proposal };
  },
);

// ─── traduireInfolettre : « Dupliquer et traduire » ─────────────────────────
// Copie une infolettre en un nouveau brouillon anglais : même structure,
// mêmes images, mêmes liens, mêmes polices; seuls les mots changent. Rien ne
// part : Krystine relit le brouillon dans le composeur comme n'importe quel autre.
const TRADUCTION_TOOL: Anthropic.Tool = {
  name: 'set_translation',
  description: "La traduction anglaise complète de l'infolettre, champ par champ.",
  strict: true,
  input_schema: {
    type: 'object',
    additionalProperties: false,
    required: ['title', 'subject', 'preheader', 'etiquette', 'blocks'],
    properties: {
      title: { type: 'string' },
      subject: { type: 'string' },
      preheader: { type: 'string' },
      etiquette: { type: 'string', description: "Étiquette du bandeau traduite, ou chaîne vide si elle était vide" },
      blocks: {
        type: 'array',
        description: 'Un élément par bloc source, dans le même ordre. Seuls les champs de texte listés, traduits.',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['text', 'caption', 'alt', 'label', 'attribution', 'eyebrow', 'title', 'body', 'buttonLabel'],
          properties: {
            text: { type: ['string', 'null'] }, caption: { type: ['string', 'null'] }, alt: { type: ['string', 'null'] },
            label: { type: ['string', 'null'] }, attribution: { type: ['string', 'null'] }, eyebrow: { type: ['string', 'null'] },
            title: { type: ['string', 'null'] }, body: { type: ['string', 'null'] }, buttonLabel: { type: ['string', 'null'] },
          },
        },
      },
    },
  },
};
const CHAMPS_TEXTE = ['text', 'caption', 'alt', 'label', 'attribution', 'eyebrow', 'title', 'body', 'buttonLabel'] as const;

const TRADUCTION_SYSTEM_EN = `You translate Krystine St-Laurent's French newsletters into English for her English-speaking readers. Krystine has spent close to forty years connecting what we learned to separate: nourishing and healing, body and consciousness, science and wisdom (nursing, clinical research, Ayurveda, medicinal plants, writing). Her podcast is "Au-delà des tendances" (keep the French title, you may add "Beyond the Trends" once).

Rules: warm, natural English, written by a person and not by a machine. Keep every structure and every non-text value untouched: block order, URLs, image URLs, fonts, sizes, placeholders such as {{firstName}}, and the light markup <b>, <i>, <u>, <a href="…"> exactly where it stands. No em dashes. Never the "it's not X, it's Y" pattern. No rule-of-three lists by reflex, no rhetorical question answered right away, no inspirational closing line. Translate meaning, not word for word. Subject line under 60 characters. Return null for a field that was empty in the source. Answer only with the set_translation tool.`;

const TRADUCTION_SYSTEM_FR = `Tu traduis en français les infolettres de Krystine St-Laurent (krystinestlaurent.ca) écrites en anglais, pour ses lectrices et lecteurs francophones du Québec. Krystine relie ce que nous avons appris à séparer : nourrir et soigner, corps et conscience, science et sagesses (soins infirmiers, recherche clinique, Ayurveda, plantes médicinales, écriture). Son podcast s'appelle « Au-delà des tendances ».

Règles : un français naturel et chaleureux, vouvoiement toujours, « nous » et jamais « on » pour Krystine et son équipe, aucun tiret cadratin, presque jamais « ce n'est pas X, c'est Y », des phrases entières avec un sujet et un verbe, jamais de fragments empilés avec des virgules, pas de règle de trois par réflexe ni de conclusion inspirante. Garde intacts la structure et tout ce qui n'est pas du texte : ordre des blocs, adresses, images, polices, tailles, les gabarits comme {{firstName}}, et le balisage léger <b>, <i>, <u>, <a href="…"> exactement à sa place. Traduis le sens, pas mot à mot. Sujet de moins de 60 caractères. Renvoie null pour un champ vide à la source. Réponds seulement avec l'outil set_translation.`;

export const traduireInfolettre = onCall(
  { secrets: [ANTHROPIC_API_KEY], timeoutSeconds: 300, memory: '512MiB' },
  async (request) => {
    assertAdmin(request);
    const { newsletterId, cible: cibleDemandee, mode } = (request.data || {}) as { newsletterId?: string; cible?: 'en' | 'fr'; mode?: 'copie' | 'surplace' };
    if (!newsletterId) throw new HttpsError('invalid-argument', 'newsletterId is required');
    if (!ANTHROPIC_API_KEY.value() || ANTHROPIC_API_KEY.value() === 'PLACEHOLDER') throw new HttpsError('failed-precondition', 'La traduction attend sa clé : firebase functions:secrets:set ANTHROPIC_API_KEY');

    const db = getFirestore();
    const snap = await db.doc(`newsletters/${newsletterId}`).get();
    if (!snap.exists) throw new HttpsError('not-found', 'Infolettre introuvable');
    const src = snap.data() as Record<string, any>;
    const blocks: NewsletterBlock[] = src.blocks || [];
    // Vers l'autre langue par défaut : une lettre française devient anglaise, et l'inverse.
    const cible: 'en' | 'fr' = cibleDemandee === 'fr' || cibleDemandee === 'en' ? cibleDemandee : (src.lang === 'en' ? 'fr' : 'en');
    const surplace = mode === 'surplace';
    if (surplace && (src.status === 'sent' || src.status === 'sending')) throw new HttpsError('failed-precondition', 'Une lettre déjà envoyée ne se traduit pas sur place : dupliquez-la.');

    const source = {
      title: src.title || '', subject: src.subject || '', preheader: src.preheader || '',
      etiquette: src.bandeau?.etiquette || '',
      blocks: blocks.map(b => {
        const out: Record<string, any> = { type: b.type };
        for (const k of CHAMPS_TEXTE) if (b.content?.[k]) out[k] = b.content[k];
        return out;
      }),
    };

    const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY.value() });
    let response: Anthropic.Message;
    try {
      response = await client.messages.create({
        model: 'claude-sonnet-5',
        max_tokens: 16000,
        system: cible === 'en' ? TRADUCTION_SYSTEM_EN : TRADUCTION_SYSTEM_FR,
        tools: [TRADUCTION_TOOL],
        tool_choice: { type: 'tool', name: 'set_translation' },
        messages: [{ role: 'user', content: `${cible === 'en' ? 'Translate this newsletter to English.' : 'Traduis cette infolettre en français.'}\n${JSON.stringify(source)}` }],
      });
    } catch (e: any) {
      const msg = String(e?.error?.error?.message || e?.message || '');
      console.error('traduireInfolettre: Anthropic', e?.status, msg);
      throw new HttpsError('unavailable', `La traduction n'a pas abouti (${msg.slice(0, 160) || 'erreur inconnue'}).`);
    }
    const call = response.content.find(b => b.type === 'tool_use' && b.name === 'set_translation') as Anthropic.ToolUseBlock | undefined;
    if (!call) throw new HttpsError('unavailable', "La traduction n'a rien renvoyé.");
    const t = call.input as any;
    if (!Array.isArray(t.blocks) || t.blocks.length !== blocks.length) throw new HttpsError('unavailable', 'La traduction ne compte pas le même nombre de blocs que la lettre.');

    // Le nouveau brouillon garde tout de l'original sauf les mots, l'état,
    // la date et les statistiques.
    const traduits: NewsletterBlock[] = blocks.map((b, i) => {
      const content = { ...(b.content || {}) };
      for (const k of CHAMPS_TEXTE) if (content[k] && typeof t.blocks[i]?.[k] === 'string' && t.blocks[i][k]) content[k] = t.blocks[i][k];
      return { type: b.type, content };
    });
    const mots = {
      title: t.title || `${src.title || src.subject} (${cible.toUpperCase()})`,
      subject: t.subject || src.subject,
      preheader: t.preheader || src.preheader || '',
      blocks: traduits,
      bandeau: src.bandeau ? { ...src.bandeau, etiquette: src.bandeau.etiquette ? (t.etiquette || src.bandeau.etiquette) : src.bandeau.etiquette } : src.bandeau ?? null,
      lang: cible,
    };

    if (surplace) {
      // Sur place : la version d'avant se garde dans l'historique, puis les
      // mots changent dans le même brouillon.
      await db.collection(`newsletters/${newsletterId}/versions`).add({
        title: src.title || '', subject: src.subject || '', preheader: src.preheader || '', blocks, lang: src.lang || 'fr',
        bandeau: src.bandeau ?? null, fond: src.fond ?? null, couverture: src.couverture ?? null, couvertureUrl: src.couvertureUrl ?? null, signature: src.signature !== false,
        raison: 'traduction', savedAt: FieldValue.serverTimestamp(),
      });
      await snap.ref.update({ ...mots, title: src.title || mots.title, versionAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() });
      console.log('[traduireInfolettre] sur place', newsletterId, cible);
      return { id: newsletterId, cible };
    }

    const { sentAt: _s, stats: _st, progress: _p, lastError: _e, createdAt: _c, updatedAt: _u, versionAt: _v, ...reste } = src;
    const doc = {
      ...reste,
      ...mots,
      traductionDe: newsletterId,
      status: 'draft',
      scheduledFor: null,
      createdBy: request.auth?.uid || null,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };
    const ref = await db.collection('newsletters').add(doc);
    console.log('[traduireInfolettre]', newsletterId, '→', ref.id, cible);
    return { id: ref.id, cible };
  },
);
