export interface LayoutCharacter {
  id: string;
  slug: string;
  name: string;
  avatar_url: string;
  clip: string;
  age: string;
  is_new?: boolean;
  category: string;
  tags: string[];
  style: string;
  gender: string;
  description: string;
  body?: string;
  ethnicity?: string;
  language?: string;
  relationship?: string;
  occupation?: string;
  hobbies?: string;
  personality_traits?: string[];
}

const PEOPLE: Array<[string, string, string, string, string]> = [
  ['lila', 'Lila', '24', 'brunette', 'latina'],
  ['cleo', 'Cleo', '26', 'blonde', 'caucasian'],
  ['maren', 'Maren', '23', 'redhead', 'caucasian'],
  ['siena', 'Siena', '28', 'brunette', ''],
  ['noor', 'Noor', '22', 'brunette', ''],
  ['adele', 'Adele', '25', 'brunette', 'caucasian'],
  ['freya', 'Freya', '21', 'blonde', 'caucasian'],
  ['vesper', 'Vesper', '27', 'brunette', ''],
  ['callie', 'Callie', '23', 'redhead', 'caucasian'],
  ['amara', 'Amara', '29', 'brunette', ''],
  ['tess', 'Tess', '22', 'brunette', 'caucasian'],
  ['nia', 'Nia', '25', 'brunette', ''],
  ['paloma', 'Paloma', '24', 'brunette', ''],
  ['greer', 'Greer', '26', 'blonde', 'caucasian'],
  ['iris', 'Iris', '21', 'brunette', ''],
  ['willa', 'Willa', '24', 'blonde', 'caucasian'],
  ['sabine', 'Sabine', '27', 'brunette', ''],
  ['luz', 'Luz', '23', 'brunette', 'latina'],
  ['estelle', 'Estelle', '29', 'brunette', 'caucasian'],
  ['pippa', 'Pippa', '22', 'blonde', 'caucasian'],
];

export const LAYOUT_CAST: LayoutCharacter[] = PEOPLE.map(([slug, name, age, hair, look], index) => {
  const file = String(index + 1).padStart(2, '0');
  return {
    id: slug,
    slug,
    name,
    age,
    avatar_url: `/models/model-${file}.jpg`,
    clip: `/models/model-${file}.gif`,
    is_new: index < 4,
    category: 'Girls',
    tags: [hair, look].filter(Boolean),
    ethnicity: look || undefined,
    style: 'realistic',
    gender: 'female',
    description: `${name} is ${age}. She is a fictional adult. The card still is a fashion portrait, and the hover motion is a short loop of that still.`,
    body: 'Model',
    language: 'English',
    relationship: 'Girlfriend',
    occupation: 'Model',
    hobbies: 'Fittings, travel',
    personality_traits: ['Poised', 'Direct'],
  };
});

export const CAST_ROWS = [
  'Featured',
  'New faces',
  'Evening',
  'Studio',
  'City light',
  'Private edit',
] as const;

export function findLayoutCharacter(slug: string) {
  return LAYOUT_CAST.find((character) => character.slug === slug);
}
