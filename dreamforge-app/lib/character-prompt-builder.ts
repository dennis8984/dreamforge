interface CharacterAppearance {
  hairColor?: string;
  hairStyle?: string;
  eyeColor?: string;
  bodyType?: string;
  skinTone?: string;
  ageRange?: string;
}

export function buildAvatarPrompt(params: {
  name: string;
  gender: string;
  style: string;
  appearance: CharacterAppearance;
  personalityTraits: string[];
}): string {
  const parts: string[] = [];

  // Style prefix
  const styleMap: Record<string, string> = {
    realistic: 'photorealistic portrait, studio photography',
    anime: 'anime style character portrait, high quality anime art',
    fantasy: 'fantasy character portrait, magical lighting, ethereal',
    sci_fi: 'sci-fi character portrait, futuristic, cyberpunk lighting',
  };
  parts.push(styleMap[params.style] || styleMap.realistic);

  // Gender
  parts.push(
    params.gender === 'male'
      ? 'handsome man'
      : params.gender === 'female'
        ? 'beautiful woman'
        : 'attractive androgynous person'
  );

  // Appearance details
  const a = params.appearance;
  if (a.hairColor) parts.push(`${a.hairColor} hair`);
  if (a.hairStyle) parts.push(`${a.hairStyle} hairstyle`);
  if (a.eyeColor) parts.push(`${a.eyeColor} eyes`);
  if (a.skinTone) parts.push(`${a.skinTone} skin`);
  if (a.ageRange) parts.push(`${a.ageRange} years old`);

  // Personality-influenced expression
  const traits = params.personalityTraits;
  if (traits.includes('Mysterious')) parts.push('enigmatic expression');
  if (traits.includes('Playful')) parts.push('playful smile');
  if (traits.includes('Confident')) parts.push('confident gaze');
  if (traits.includes('Gentle')) parts.push('warm gentle expression');
  if (traits.includes('Bold')) parts.push('striking bold look');

  parts.push('detailed face, high quality, 4k, masterpiece');

  return parts.join(', ');
}
