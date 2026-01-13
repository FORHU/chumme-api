/**
 * Utility function to generate a key name from a regular name
 * Converts "Galaxy Destroyer" to "galaxy_destroyer"
 */
export function generateKeyName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "") // Remove special characters
    .replace(/\s+/g, "_") // Replace spaces with underscores
    .replace(/-+/g, "_") // Replace hyphens with underscores
    .replace(/_+/g, "_"); // Replace multiple underscores with single
}
