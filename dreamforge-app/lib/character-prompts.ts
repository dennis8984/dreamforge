// The photo look shared by character creation and shoots: camera, skin and proportions.
// Character creation is only about the person, so its images use a plain backdrop. Locations
// come from the backgrounds uploaded for a shoot. Identity comes from reference images.

const PROPORTIONS =
  'Natural adult proportions with a torso of natural length. The camera is level with the subject and looks straight at them, not down at them, with no foreshortening.';
const REFERENCE_MARKS = 'Keep only the tattoos and marks visible in the references, and add no new ones.';
const CAMERA =
  'Unretouched photograph from a Canon EOS 5D Mark II, 85mm lens at f/2.0, ISO 400, no flash, no HDR, no beauty filter.';
const REFERENCE_SKIN =
  'Matte natural skin with visible pores, fine body hair, uneven tone and small natural marks. Flyaway hairs, slight sensor noise, true-to-life color.';
// With no reference to hold the face, heavier skin wording makes the person look older.
const DESCRIBED_SKIN = 'Natural skin with visible pores, true to the age described, slight sensor noise, true-to-life color.';
const PLAIN_BACKDROP = 'Plain seamless neutral gray studio backdrop in soft even light, with nothing else in the frame.';
const LOCATION_LIGHT = 'Lit only by the light of the location, with her shadow and skin tones matching it.';

function sentence(text: string): string {
  return `${text.trim().replace(/[.\s]+$/, '')}.`;
}

function ageLine(age?: number | null): string {
  return age ? `The subject is an adult, ${age} years old.` : '';
}

export function buildCharacterPhotoPrompt(
  subject: string,
  { age, hasReferences = false }: { age?: number | null; hasReferences?: boolean } = {}
): string {
  return [
    ageLine(age),
    sentence(subject),
    PLAIN_BACKDROP,
    PROPORTIONS,
    hasReferences ? REFERENCE_MARKS : '',
    CAMERA,
    hasReferences ? REFERENCE_SKIN : DESCRIBED_SKIN,
  ].filter(Boolean).join(' ');
}

// A shoot always has references, and its location comes from the uploaded background.
export function buildShootPhotoPrompt(direction: string, { age }: { age?: number | null } = {}): string {
  return [ageLine(age), sentence(direction), LOCATION_LIGHT, PROPORTIONS, REFERENCE_MARKS, CAMERA, REFERENCE_SKIN]
    .filter(Boolean)
    .join(' ');
}
