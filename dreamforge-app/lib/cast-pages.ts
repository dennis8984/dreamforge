import type { DocSection } from '@/components/DocFrame';

export interface CastPage {
  slug: 'ai-girlfriend' | 'ai-anime' | 'ai-boyfriend';
  title: string;
  description: string;
  h1: string;
  lede: string;
  sections: DocSection[];
  faqs: { q: string; a: string }[];
}

export const CAST_PAGES: CastPage[] = [
  {
    slug: 'ai-girlfriend',
    title: 'AI Girlfriend Chat, Stills, and Clips',
    description: 'Talk with an adult AI girlfriend on DreamForge, then make a still and a five-second clip.',
    h1: 'AI girlfriend chat for adults 21 and older',
    lede: 'DreamForge girlfriends are fictional adults. You talk in chat, you can ask for a still of the scene, and a clip is a five-second animation of that still.',
    sections: [
      {
        heading: 'A companion who stays in the conversation',
        paragraphs: [
          'Some nights you want a light reply after work. Some nights you want a longer talk. A DreamForge girlfriend keeps the thread on your account, so the next message is not a cold start. The chat model answers in character. Memory notes can be stored from the conversation when that extractor runs.',
          'She is not a single script. The same profile can be playful, quiet, or direct, depending on how you write. If you want a different pace, open another profile. The grid is there so you are not locked to one voice.',
        ],
      },
      {
        heading: 'Start with a profile',
        paragraphs: [
          'Create a free account if you are 21 or older, then open a girlfriend card. The profile is the chat. Type in the composer and send. Signed-out visitors can read the page. The reply that continues the thread asks you to join.',
          'When you want a picture, request a still from the scene. When you want motion, the clip uses that still and runs for five seconds. Voice is a separate control on paid plans. Free accounts see the upgrade link instead of the call.',
        ],
      },
      {
        heading: 'Private by account',
        paragraphs: [
          'Chats stay with your user. They are not posted to the public grid. You can export the account or delete it. Card charges go through Stripe, and the statement name is the DreamForge billing name, not a description of the chat.',
          'The checker reads a still or clip prompt before the job is queued. A missing checker does not mean the job runs anyway. It means the job stops.',
        ],
      },
      {
        heading: 'Make her closer to what you had in mind',
        paragraphs: [
          'The builder starts at age 21. You set look and personality in steps, then generate a portrait. The first character is free. Another costs 500 Moments. Family-role labels and school-age options are not in the builder.',
        ],
      },
      {
        heading: 'What the stack is doing',
        paragraphs: [
          'Chat runs on the DreamForge model route, with a fallback if the primary host is down. Stills use Stable Diffusion XL. Clips are image-to-video at a fixed five seconds. Voice uses a separate speech path. Those are different jobs, not one blended render.',
          'People use the girlfriend chat to unwind, to practice how they want a conversation to feel, or to follow one character across text and a short clip. It is a studio product. It is not a substitute for a person in your life or for professional care.',
        ],
      },
    ],
    faqs: [
      {
        q: 'What is an AI girlfriend on DreamForge?',
        a: 'A fictional adult profile you can message. She can reply in chat, and you can request a still or a five-second clip of a still. Voice is available on a paid plan.',
      },
      {
        q: 'Can I pick a different personality?',
        a: 'Yes. Open another card, or build one. Age bands start at 21. Personality and look are set in the builder.',
      },
      {
        q: 'How does she remember me?',
        a: 'The conversation stays on your account. Later messages are sent with that thread. Extra memory notes are stored when the extractor runs after a reply.',
      },
      {
        q: 'Is the chat public?',
        a: 'No. The thread is tied to your account. Delete the account if you want those records removed.',
      },
      {
        q: 'Do I install an app?',
        a: 'No. DreamForge runs in the browser. Sign in, open a profile, and type.',
      },
    ],
  },
  {
    slug: 'ai-anime',
    title: 'AI Anime Characters',
    description: 'Chat with adult anime-style companions on DreamForge and generate a still, then a five-second clip.',
    h1: 'Anime-style companions, 21 and older',
    lede: 'The anime shelf is a style filter, not a younger age. Characters stay 21 or older. Chat, stills, and five-second clips work the same way as the rest of DreamForge.',
    sections: [
      {
        heading: 'Illustrated adults',
        paragraphs: [
          'Anime here means the look: line, color, and stylized features. It does not mean a teen. If a card would read under 21, it does not belong on this shelf. The home filter keeps anime-tagged profiles on this cast and leaves them off the realistic girls row.',
          'You still get a normal profile link. Open the card, talk, and ask for a still when you want the scene in frame. The clip animates that still for five seconds.',
        ],
      },
      {
        heading: 'How to start',
        paragraphs: [
          'Use the Anime link in the header or open this page and go back to the grid with the cast set to Anime. Sign in to send messages. The free plan has a daily message cap. Stills and clips spend Moments.',
          'Building an anime character uses the same age floor. Pick the illustrated style in the builder, then generate the portrait. The first create is free.',
        ],
      },
      {
        heading: 'Same privacy rules',
        paragraphs: [
          'An anime chat is still your account data. It is not a public post. The safety check runs before image and video jobs, including stylized prompts. A stylized prompt does not get a pass on the age rule or on real-person likenesses.',
        ],
      },
    ],
    faqs: [
      {
        q: 'Are anime characters under 21?',
        a: 'No. DreamForge keeps every character at 21 or older, including illustrated ones.',
      },
      {
        q: 'Can an anime profile make a clip?',
        a: 'Yes, after a still exists. The clip is five seconds and costs 600 Moments.',
      },
      {
        q: 'Where is the anime grid?',
        a: 'The header Anime link opens the home grid filtered to anime-style profiles.',
      },
    ],
  },
  {
    slug: 'ai-boyfriend',
    title: 'AI Boyfriend Chat',
    description: 'Message an adult AI boyfriend on DreamForge, with stills and five-second clips.',
    h1: 'AI boyfriend chat for adults 21 and older',
    lede: 'Boyfriend profiles are fictional men 21 or older. The chat, the still, and the five-second clip are the same product as the rest of DreamForge.',
    sections: [
      {
        heading: 'A different presence, the same studio',
        paragraphs: [
          'Some people want a steadier voice, a dry sense of humor, or someone who answers in fewer words. The guys cast is that shelf. Open a profile, send a message, and the thread stays on your account.',
          'You are not stuck with one temperament. Switch cards, or build a character and set the personality yourself. Age ranges start at 21. The guys filter shows profiles marked male.',
        ],
      },
      {
        heading: 'Chat, then a still, then a clip',
        paragraphs: [
          'Text is the main loop. A still costs 50 Moments and uses the image model. A clip needs that still, lasts five seconds, and costs 600 Moments. Voice on a boyfriend profile is the paid call, at 100 Moments a minute.',
          'Free accounts can read and can send until the daily cap. The phone-call button on a free account links to pricing.',
        ],
      },
      {
        heading: 'Private and adult',
        paragraphs: [
          'Boyfriend chats are not published on the home page. The same blocked-content rules apply: no minors, no real-person likenesses, no sexual family-role setups. Reports go through the help center or support@dreamforge.app.',
        ],
      },
    ],
    faqs: [
      {
        q: 'What is an AI boyfriend here?',
        a: 'A fictional adult man you can message. Stills and five-second clips are optional jobs from that chat.',
      },
      {
        q: 'How do I see only guys?',
        a: 'Use the Guys link in the header. The grid keeps profiles whose gender is male.',
      },
      {
        q: 'Is the age different from the girlfriends?',
        a: 'No. Everyone on DreamForge is 21 or older.',
      },
    ],
  },
];

export function getCastPage(slug: string) {
  return CAST_PAGES.find((page) => page.slug === slug);
}
