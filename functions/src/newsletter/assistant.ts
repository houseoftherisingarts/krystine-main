import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import Anthropic from '@anthropic-ai/sdk';
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
Krystine te dit ce qu'elle veut dire, à qui, et quand. Tu proposes une infolettre complète avec l'outil set_newsletter : sujet, pré-en-tête, blocs (heading, paragraph, image, button, quote, cta, divider, spacer), audience et, si elle l'a dit, la date d'envoi. Le gabarit ajoute déjà le bandeau avec le sujet, la signature de Krystine et le pied de page (l'en-tête, couverture du podcast, image ou rien, se choisit dans les réglages du composeur, pas dans les blocs) : n'écris ni salutation finale ni signature dans les blocs, et ouvre par un paragraphe qui salue avec {{firstName}} (« Bonjour {{firstName}}, » devient le prénom du lecteur; sans prénom, la ligne reste « Bonjour , » donc préfère « Bonjour, » quand tu doutes).
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
            type: { type: 'string', enum: ['heading', 'paragraph', 'image', 'button', 'quote', 'cta', 'divider', 'spacer'] },
            content: {
              type: 'object',
              additionalProperties: false,
              required: ['text', 'level', 'align', 'url', 'caption', 'label', 'href', 'variant', 'attribution', 'eyebrow', 'title', 'body', 'buttonLabel', 'size'],
              properties: {
                text: { type: ['string', 'null'] },
                level: { type: ['integer', 'null'], description: '1 à 3 pour heading' },
                align: { type: ['string', 'null'], enum: ['left', 'center', null] },
                url: { type: ['string', 'null'], description: 'image : laisser vide' },
                caption: { type: ['string', 'null'] },
                label: { type: ['string', 'null'], description: 'button' },
                href: { type: ['string', 'null'], description: 'button, cta' },
                variant: { type: ['string', 'null'], enum: ['primary', 'secondary', null] },
                attribution: { type: ['string', 'null'], description: 'quote' },
                eyebrow: { type: ['string', 'null'], description: 'cta' },
                title: { type: ['string', 'null'], description: 'cta' },
                body: { type: ['string', 'null'], description: 'cta' },
                buttonLabel: { type: ['string', 'null'], description: 'cta' },
                size: { type: ['string', 'null'], enum: ['sm', 'md', 'lg', null], description: 'spacer' },
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

    const response = await client.messages.create({
      model: 'claude-opus-5',
      max_tokens: 16000,
      system: [{ type: 'text', text: SYSTEM, cache_control: { type: 'ephemeral' } }],
      tools: [TOOL],
      messages: history,
    });

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
