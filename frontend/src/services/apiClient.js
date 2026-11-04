// All entity services share the same JSON and cancellation contract.
export async function request(path, method = "GET", body, signal) {
  const response = await fetch("/api/" + path, {
    method,
    signal,
    headers: { "Content-Type": "application/json" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  if (response.status === 204) return null;
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Error de conexión.");
  return data;
}

export async function downloadCSV(path, filename, signal) {
  const response = await fetch(`/api/${path}`, { signal });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.error || "No se pudo descargar el CSV.");
  }
  const url = URL.createObjectURL(await response.blob());
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function createEntityService(resource) {
  return {
    list: (query = "", signal) =>
      request(resource + (query ? `?${query}` : ""), "GET", undefined, signal),
    get: (id, signal) => request(`${resource}/${id}`, "GET", undefined, signal),
    create: (body) => request(resource, "POST", body),
    update: (id, body) => request(`${resource}/${id}`, "PUT", body),
    remove: (id) => request(`${resource}/${id}`, "DELETE"),
  };
}
