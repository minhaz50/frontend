import { API_BASE_URL } from "@/lib/constants";
import type { ApiEnvelope, ApiErrorShape } from "@/types";

export class ApiRequestError extends Error {
  statusCode: number;
  errorDetails?: ApiErrorShape["errorDetails"];

  constructor(statusCode: number, message: string, errorDetails?: ApiErrorShape["errorDetails"]) {
    super(message);
    this.statusCode = statusCode;
    this.errorDetails = errorDetails;
  }
}

interface RequestOptions extends RequestInit {
  token?: string | null;
  query?: Record<string, string | number | boolean | undefined | null>;
}

function buildUrl(path: string, query?: RequestOptions["query"]): string {
  const url = new URL(`${API_BASE_URL}${path}`);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null && value !== "") {
        url.searchParams.set(key, String(value));
      }
    }
  }
  return url.toString();
}

/**
 * Every API call in the app funnels through here. Centralizing this
 * means auth headers, JSON parsing, and error shape normalization only
 * need to be correct in one place — individual api/*.ts files just
 * describe *which* endpoint and *what shape* comes back.
 */
export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { token, query, headers, ...rest } = options;

  const res = await fetch(buildUrl(path, query), {
    ...rest,
    headers: {
      ...(rest.body && !(rest.body instanceof FormData) ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    cache: "no-store",
  });

  let json: ApiEnvelope<T> | ApiErrorShape | null = null;
  try {
    json = await res.json();
  } catch {
    // No JSON body (e.g. a 204 or a network-level failure page) — fall through.
  }

  if (!res.ok || !json || json.success === false) {
    const errJson = json as ApiErrorShape | null;
    throw new ApiRequestError(
      res.status,
      errJson?.message ?? `Request failed with status ${res.status}`,
      errJson?.errorDetails,
    );
  }

  return (json as ApiEnvelope<T>).data;
}

/** Same as apiFetch but also returns the pagination meta block. */
export async function apiFetchPaginated<T>(
  path: string,
  options: RequestOptions = {},
): Promise<{ data: T; meta: ApiEnvelope<T>["meta"] }> {
  const { token, query, headers, ...rest } = options;

  const res = await fetch(buildUrl(path, query), {
    ...rest,
    headers: {
      ...(rest.body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    cache: "no-store",
  });

  const json = (await res.json()) as ApiEnvelope<T> | ApiErrorShape;

  if (!res.ok || !json.success) {
    const errJson = json as ApiErrorShape;
    throw new ApiRequestError(res.status, errJson.message, errJson.errorDetails);
  }

  const okJson = json as ApiEnvelope<T>;
  return { data: okJson.data, meta: okJson.meta };
}
