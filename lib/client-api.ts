"use client";

/** Thin typed fetch wrapper for client components. Throws on non-2xx. */
export async function apiFetch<T = unknown>(
  url: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json", ...(options?.headers ?? {}) },
    ...options,
  });
  const isJson = res.headers.get("content-type")?.includes("application/json");
  const body = isJson ? await res.json() : await res.text();
  if (!res.ok) {
    const message =
      (isJson && (body as { error?: string })?.error) || `Request failed (${res.status})`;
    throw new Error(message);
  }
  return body as T;
}

export const api = {
  get: <T>(url: string) => apiFetch<T>(url),
  post: <T>(url: string, data: unknown) =>
    apiFetch<T>(url, { method: "POST", body: JSON.stringify(data) }),
  put: <T>(url: string, data: unknown) =>
    apiFetch<T>(url, { method: "PUT", body: JSON.stringify(data) }),
  del: <T>(url: string) => apiFetch<T>(url, { method: "DELETE" }),
};
