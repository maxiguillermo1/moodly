/**
 * @fileoverview Last-write-wins mood merge for cloud pull.
 * @module cloud/sync/moodMerge
 */
/** Merge cloud moods into local by `updatedAt` (cloud wins ties; local-only dates kept). */
export function mergeMoodEntries(local, cloud) {
    const out = { ...local };
    for (const [date, cloudEntry] of Object.entries(cloud)) {
        const localEntry = local[date];
        if (!localEntry || cloudEntry.updatedAt >= localEntry.updatedAt) {
            out[date] = cloudEntry;
        }
    }
    for (const date of Object.keys(local)) {
        if (!cloud[date] && local[date]) {
            /* keep local — will push via outbox */
        }
    }
    return out;
}
