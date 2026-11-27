import { Prisma, UserRole } from "@prisma/client";

/**
 * Who may touch which music library file or recording.
 *
 * The routes only checked that the caller was signed in, so any user could
 * delete any song file, delete or list anyone's recordings, and presign any
 * key in the bucket (#229 was the same bug in the file API). The rules live
 * here so the services and their tests share one definition.
 */

/** The caller, as `authenticate` puts it on `req.user`. */
export interface Viewer {
  id: string;
  role?: string | null;
}

// The roles `requireRoles` lets through on admin routes (DEVELOPER passes all).
const STAFF_ROLES: ReadonlySet<string> = new Set<string>([
  UserRole.ADMIN,
  UserRole.SUPER_ADMIN,
  UserRole.DEVELOPER,
]);

export function isStaff(viewer: Viewer): boolean {
  return Boolean(viewer.role && STAFF_ROLES.has(viewer.role));
}

/**
 * Whether an S3 key is one this user uploaded.
 *
 * `planUpload` signs keys shaped `<category>/<userId>/…` from the
 * authenticated id, so the key is the only uploader record a MusicLibrary row
 * has. Being attached to a song or recording proves nothing: `POST /music` and
 * `POST /music-records` accept any existing file id.
 *
 * Dot and empty segments are refused outright, so `uploads/<me>/../<victim>/x`
 * cannot pass the prefix check and then resolve somewhere else.
 */
export function isUploaderKey(
  key: string | null | undefined,
  userId: string,
): boolean {
  if (!key || !userId) return false;
  const parts = key.split("/");
  if (parts.length < 3) return false;
  if (parts.some((p) => p === "" || p === "." || p === "..")) return false;
  return parts[1] === userId;
}

/** Delete a library file, or presign a download for its key. */
export function canManageFileKey(
  key: string | null | undefined,
  viewer: Viewer,
): boolean {
  return isStaff(viewer) || isUploaderKey(key, viewer.id);
}

interface RecordParties {
  singers?: { id: string }[] | null;
  studio?: { ownerId: string } | null;
}

const isSinger = (record: RecordParties, userId: string) =>
  Boolean(record.singers?.some((s) => s.id === userId));

/**
 * Read a recording: someone who sang on it, the owner of the room it was made
 * in, or staff. Nothing is public: recordings have no "published" flag yet.
 */
export function canViewRecord(record: RecordParties, viewer: Viewer): boolean {
  return (
    isStaff(viewer) ||
    record.studio?.ownerId === viewer.id ||
    isSinger(record, viewer.id)
  );
}

/** Delete a recording: someone who sang on it, or staff. */
export function canDeleteRecord(
  record: RecordParties,
  viewer: Viewer,
): boolean {
  return isStaff(viewer) || isSinger(record, viewer.id);
}

/**
 * `canViewRecord` as a query filter, for the list endpoints. `undefined`
 * means no restriction (staff).
 */
export function recordVisibility(
  viewer: Viewer,
): Prisma.MusicRecordWhereInput | undefined {
  if (isStaff(viewer)) return undefined;
  return {
    OR: [
      { singers: { some: { id: viewer.id } } },
      { studio: { ownerId: viewer.id } },
    ],
  };
}
