// Keep the same id after an ambiguous transport error, including a page reload.
const memory = new Map<string, string>();
const storageKey = (userId: string, action: string, identity: string) =>
  `nutrizen:pending:${userId}:${action}:${identity}`;
export function menuRequestId(userId: string, action: string, identity: string): string {
  const key = storageKey(userId, action, identity);
  let previous = memory.get(key);
  try {
    previous = sessionStorage.getItem(key) || previous;
  } catch {
    /* memory fallback */
  }
  const id = previous || crypto.randomUUID();
  memory.set(key, id);
  try {
    sessionStorage.setItem(key, id);
  } catch {
    /* memory fallback */
  }
  return id;
}
export function completeMenuRequest(userId: string, action: string, identity: string): void {
  const key = storageKey(userId, action, identity);
  memory.delete(key);
  try {
    sessionStorage.removeItem(key);
  } catch {
    /* memory fallback */
  }
}
