/**
 * @fileoverview **Transition detection** — momentum shifts between adjacent chapters.
 * @module lib/narrative/transitionDetection
 */
export function detectChapterTransitions(chapters) {
    const out = [];
    for (let i = 1; i < chapters.length; i++) {
        const prev = chapters[i - 1];
        const cur = chapters[i];
        if (prev.phaseKind !== cur.phaseKind) {
            out.push({ at: cur.start, from: prev.phaseKind, to: cur.phaseKind });
        }
    }
    return out;
}
