export function nextRequestId(ref) {
    ref.current += 1;
    return ref.current;
}
export function isLatestRequest(ref, id) {
    return ref.current === id;
}
