import { getWeblateConfig } from "./load-env.mjs";

export function createWeblateClient(config = getWeblateConfig()) {
  const headers = {
    Authorization: `Token ${config.token}`,
    Accept: "application/json",
  };

  async function request(path, options = {}) {
    const url = path.startsWith("http")
      ? path
      : `${config.apiUrl}${path.startsWith("/") ? path : `/${path}`}`;
    const res = await fetch(url, {
      ...options,
      headers: {
        ...headers,
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...options.headers,
      },
    });

    const text = await res.text();
    let data;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = text;
    }

    if (!res.ok) {
      const detail =
        typeof data === "object" && data?.detail
          ? data.detail
          : text || res.statusText;
      throw new Error(`Weblate API ${res.status}: ${detail}`);
    }

    return data;
  }

  return {
    config,
    get: (path) => request(path),
    post: (path, body) =>
      request(path, { method: "POST", body: JSON.stringify(body) }),
  };
}
