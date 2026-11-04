export const title = (value) =>
  value
    .replaceAll("_", " ")
    .replace(/^./, (character) => character.toUpperCase());

export const money = (value) =>
  new Intl.NumberFormat("es-CR", { style: "currency", currency: "CRC" }).format(
    Number(value || 0),
  );

export function localDay(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
