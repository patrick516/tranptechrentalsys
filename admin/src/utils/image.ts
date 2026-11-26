export function isImageMime(mimeType: string = ""): boolean {
  return mimeType.toLowerCase().startsWith("image/");
}
