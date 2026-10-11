export async function api<T = Record<string, unknown>>(
  path: string,
  body?: unknown,
): Promise<T> {
  const response = await fetch(`/api/backend/${path}`, {
    method: body === undefined ? "GET" : "POST",
    credentials: "same-origin",
    headers:
      body instanceof FormData
        ? undefined
        : { "Content-Type": "application/json" },
    body:
      body === undefined
        ? undefined
        : body instanceof FormData
          ? body
          : JSON.stringify(body),
    cache: "no-store",
  });
  const result = await response.json();
  if (!response.ok)
    throw new Error(
      result.message || "Something went wrong. Please try again.",
    );
  return result as T;
}
