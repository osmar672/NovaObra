export async function api(path, { method = "GET", body, signal } = {}) {
  let response;
  try {
    response = await fetch(`/api${path}`, {
      method,
      credentials: "same-origin",
      signal,
      headers: body
        ? { "Content-Type": "application/json", "X-NovaObra-Request": "1" }
        : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (error) {
    if (error.name === "AbortError") throw error;
    throw new Error(
      "No hay conexión con el servidor de la tienda. Comprueba que esté iniciado.",
    );
  }
  const content = await response.json().catch(() => ({
    error:
      "El servidor no respondió correctamente. Comprueba la API de la tienda.",
  }));
  if (!response.ok)
    throw Object.assign(
      new Error(content.error || "No se pudo completar la solicitud."),
      { status: response.status },
    );
  return content;
}
export const money = (value) =>
  new Intl.NumberFormat("es-CR", {
    style: "currency",
    currency: "CRC",
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);
export const slug = (value) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
export const productPath = (p) => `/producto/${p.id}/${slug(p.nombre)}`;
