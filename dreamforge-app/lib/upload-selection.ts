// Rules for choosing reference images in the browser. The server applies the same type and
// size limits again in referenceUploadError.

export const MIN_UPLOADS = 4;
export const MAX_UPLOADS = 20;
export const UPLOAD_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

export function uploadFileProblem(file: { name: string; type: string; size: number }): string | null {
  if (!UPLOAD_TYPES.includes(file.type)) return `${file.name} isn't a JPEG, PNG or WebP`;
  if (file.size > MAX_UPLOAD_BYTES) return `${file.name} is over 10 MB`;
  return null;
}

// Adds to what's already chosen, keeping the order, so photos can be picked a few at a time.
export function mergeUploads(existing: string[], incoming: string[]) {
  const images = [...existing];
  let duplicates = 0;
  let overLimit = 0;
  for (const image of incoming) {
    if (images.includes(image)) duplicates++;
    else if (images.length >= MAX_UPLOADS) overLimit++;
    else images.push(image);
  }
  return { images, duplicates, overLimit };
}

export function uploadStatus(count: number): string {
  if (count >= MIN_UPLOADS) return `${count} images selected.`;
  const missing = MIN_UPLOADS - count;
  return `${count} of ${MIN_UPLOADS} images selected. Add ${missing} more to continue.`;
}
