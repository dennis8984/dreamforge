import type { DocSection } from '@/components/DocFrame';

export interface HelpArticle {
  slug: string;
  title: string;
  category: string;
  lede: string;
  sections: DocSection[];
}

export const HELP_ARTICLES: HelpArticle[] = [
  {
    slug: 'create-an-account',
    title: 'Create an account',
    category: 'Getting started',
    lede: 'An account is how DreamForge remembers your plan, your Moments, and your chats. You need to be 21 or older.',
    sections: [
      {
        heading: 'Sign up',
        paragraphs: [
          'Choose Create Free Account in the header. Enter an email you can open and a password. After the session starts, the header shows your plan instead of the two buttons.',
          'The free plan can send a limited number of messages each day. Stills, clips, and voice spend Moments, and a new free account starts without a monthly Moments grant.',
        ],
      },
      {
        heading: 'If the button does nothing',
        paragraphs: [
          'Confirm the browser is allowing storage for this site. The session token lives in local storage. A private window that clears storage on close will sign you out.',
        ],
      },
    ],
  },
  {
    slug: 'plans-and-moments',
    title: 'Plans and Moments',
    category: 'Billing',
    lede: 'Moments are the credits spent on stills, clips, voice, and extra characters. The plan sets your monthly grant and your daily message cap.',
    sections: [
      {
        heading: 'What a plan includes',
        paragraphs: [
          'Free is $0, with 20 messages a day and no monthly Moments. Lite is the $5.99 tier, with 100 messages a day and 500 Moments a month. Premium is $14.99, with unlimited messages and 2,000 Moments. Ultimate is $29.99, with unlimited messages and 5,000 Moments.',
          'The public pricing page also shows one-month, three-month, and twelve-month labels. Those buttons check out on the existing Premium Stripe price. People already on Lite or Ultimate stay on that subscription.',
        ],
      },
      {
        heading: 'What Moments buy',
        paragraphs: [
          'A still costs 50 Moments. A five-second clip costs 600. Voice costs 100 Moments a minute. Creating a character costs 500 after the first one. The signup bonus figure in the product notes is 200 Moments when that grant is turned on.',
          'Open the billing portal from the pricing page if you need a receipt or you want to stop renewal. Card data stays with Stripe.',
        ],
      },
    ],
  },
  {
    slug: 'start-a-chat',
    title: 'Start a chat',
    category: 'Chat',
    lede: 'Open a profile and type in the composer. The first reply needs a signed-in account.',
    sections: [
      {
        heading: 'From a profile',
        paragraphs: [
          'Each portrait links to a profile at /character and the character’s slug. The page opens on the conversation, with an About panel for age, body, and the other traits that profile has.',
          'Sending a message creates a conversation, then posts the text. The reply comes back as the assistant message. If you are signed out, the page asks you to join before it continues.',
        ],
      },
      {
        heading: 'Images and clips from the chat',
        paragraphs: [
          'The composer can request a still of the scene or a clip. A clip needs a still first. The clip length is five seconds. Both requests are checked before any Moments are spent.',
        ],
      },
    ],
  },
  {
    slug: 'stills-and-clips',
    title: 'Stills and five-second clips',
    category: 'Images and video',
    lede: 'A portrait is a still. A clip is a short animation of that still. DreamForge does not start a clip from text alone.',
    sections: [
      {
        heading: 'Make the still',
        paragraphs: [
          'Image generation uses the Stable Diffusion XL checkpoint on Runpod. The default frame is 1024 by 1024. Words like “8k” in a prompt are style words. They do not change the pixel size.',
          'The checker reads the prompt, and it reads an image when you pass an image URL, before the Moments debit. If the checker key is missing, the job stops.',
        ],
      },
      {
        heading: 'Make the clip',
        paragraphs: [
          'Send the still URL with the prompt. Duration is five seconds. Any other duration is rejected. The clip costs 600 Moments. The video worker model is not named in the product.',
          'The greeter on the home page is a separate pod. It is not the clip you request from a character.',
        ],
      },
    ],
  },
  {
    slug: 'voice-calls',
    title: 'Voice calls',
    category: 'Voice',
    lede: 'Voice is separate from chat. A paid plan can open the call. Free accounts see a link to pricing.',
    sections: [
      {
        heading: 'How a call works',
        paragraphs: [
          'On a profile, AI Phone Call opens the voice modal for a paid plan. Speech in the browser uses the recognition API, and spoken replies use the voice route. The rate is 100 Moments a minute.',
          'The home greeter uses a different voice path. A character call does not start that pod.',
        ],
      },
    ],
  },
  {
    slug: 'create-a-character',
    title: 'Create a character',
    category: 'Characters',
    lede: 'The builder collects a look and a personality for an adult character. Age ranges start at 21.',
    sections: [
      {
        heading: 'What you can set',
        paragraphs: [
          'You choose an age band from 21–24 upward, then appearance and personality through the steps. The first character is free. Another character costs 500 Moments.',
          'The builder does not include family-role relationship options or a school-age path. If you wanted a label that is not there, it is left out on purpose.',
        ],
      },
      {
        heading: 'Where the character goes',
        paragraphs: [
          'Finished characters show under My AI and can appear in the gallery when they have a portrait. A profile with no portrait yet can generate one from the character page. That still can become the avatar.',
        ],
      },
    ],
  },
  {
    slug: 'privacy-and-deletion',
    title: 'Privacy and account deletion',
    category: 'Account',
    lede: 'You can export the account or delete it. Deletion is permanent.',
    sections: [
      {
        heading: 'Export',
        paragraphs: [
          'The export route packages the data tied to your user id. Use it before you delete if you want a copy. The file is for you. It is not a public profile.',
        ],
      },
      {
        heading: 'Delete',
        paragraphs: [
          'Account deletion removes the user record and the chats and media the deletion route can reach. Sign in first. A deleted account cannot be reopened from the same request.',
          'The privacy notice describes what remains in backups until those backups expire.',
        ],
      },
    ],
  },
  {
    slug: 'report-content',
    title: 'Report content',
    category: 'Safety',
    lede: 'Use a report when a still, a clip, or a chat breaks the age rule or the blocked-content policy.',
    sections: [
      {
        heading: 'What to send',
        paragraphs: [
          'Open the report path with the page address and a short reason. Reports about anyone under 21 are read first. Do not include extra illegal files in the report itself.',
          'You can also email support@dreamforge.app. Use the account email so we can tie the note to a user when we need to.',
        ],
      },
    ],
  },
];

export function getHelpArticle(slug: string) {
  return HELP_ARTICLES.find((article) => article.slug === slug);
}

export function helpCategories() {
  const names = [...new Set(HELP_ARTICLES.map((article) => article.category))];
  return names.map((name) => ({
    name,
    articles: HELP_ARTICLES.filter((article) => article.category === name),
  }));
}
