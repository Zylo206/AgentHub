export type IdValue = string | { value: string } | null | undefined;

export function getIdValue(id: IdValue): string {
  if (!id) {
    return "";
  }

  return typeof id === "string" ? id : id.value;
}

export function formatId(id: IdValue, fallback = "-"): string {
  const value = getIdValue(id);
  return value || fallback;
}
