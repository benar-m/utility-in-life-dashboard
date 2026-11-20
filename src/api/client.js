const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim();
export const API_BASE_URL = (configuredBaseUrl || "/api/v1").replace(/\/$/, "");

let accessToken = null;
let csrfToken = null;
let refreshPromise = null;

export class ApiError extends Error {
  constructor(message, status, details) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

function apiUrl(path) {
  return `${API_BASE_URL}/${path.replace(/^\//, "")}`;
}

async function readResponse(response) {
  if (response.status === 204) return null;
  const contentType = response.headers.get("content-type") || "";
  return contentType.includes("application/json") ? response.json() : response.text();
}

function errorMessage(payload, fallback) {
  if (typeof payload === "string" && payload) return payload;
  if (payload?.detail) return payload.detail;
  if (payload?.non_field_errors?.[0]) return payload.non_field_errors[0];

  if (payload && typeof payload === "object") {
    const firstEntry = Object.entries(payload)[0];
    if (firstEntry) {
      const [field, value] = firstEntry;
      const message = firstMessage(value);
      if (!message) return fallback;
      // Most API messages read on their own; generic ones need the field name.
      const needsField = /^(this field|ensure this|this value|a valid|enter a valid)/i.test(message);
      return needsField ? `${field.replaceAll("_", " ")}: ${message}` : message;
    }
  }
  return fallback;
}

// DRF errors can be strings, lists or nested objects; return the first readable one.
function firstMessage(value) {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map(firstMessage).find(Boolean) || "";
  if (value && typeof value === "object") return Object.values(value).map(firstMessage).find(Boolean) || "";
  return "";
}

async function ensureCsrfToken() {
  if (csrfToken) return csrfToken;
  const response = await fetch(apiUrl("auth/csrf/"), { credentials: "include" });
  const payload = await readResponse(response);
  if (!response.ok) {
    throw new ApiError(
      errorMessage(payload, "Could not initialize a secure session."),
      response.status,
      payload
    );
  }
  csrfToken = payload.csrf_token;
  return csrfToken;
}

async function authRequest(path, options = {}) {
  const token = await ensureCsrfToken();
  const response = await fetch(apiUrl(path), {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "X-CSRFToken": token,
      ...options.headers,
    },
  });
  const payload = await readResponse(response);
  if (!response.ok) {
    throw new ApiError(
      errorMessage(payload, "The request could not be completed."),
      response.status,
      payload
    );
  }
  return payload;
}

export async function login(email, password) {
  const payload = await authRequest("auth/login/", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  accessToken = payload.access;
  return payload.user;
}

export async function registerStudent(details) {
  const payload = await authRequest("auth/register/", {
    method: "POST",
    body: JSON.stringify(details),
  });
  accessToken = payload.access;
  return payload.user;
}

export async function refreshSession() {
  if (!refreshPromise) {
    refreshPromise = authRequest("auth/refresh/", { method: "POST", body: "{}" })
      .then((payload) => {
        accessToken = payload.access;
        return payload.user;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

export async function logout() {
  try {
    await authRequest("auth/logout/", { method: "POST", body: "{}" });
  } finally {
    accessToken = null;
  }
}

export async function acceptInvitation(token, password, passwordConfirmation) {
  return authRequest(`auth/invitations/${encodeURIComponent(token)}/accept/`, {
    method: "POST",
    body: JSON.stringify({
      password,
      password_confirmation: passwordConfirmation,
    }),
  });
}

export async function apiRequest(path, options = {}, canRetry = true) {
  const { body, headers, ...fetchOptions } = options;
  const response = await fetch(apiUrl(path), {
    ...fetchOptions,
    credentials: "include",
    body: body === undefined || typeof body === "string" ? body : JSON.stringify(body),
    headers: {
      Accept: "application/json",
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...headers,
    },
  });

  if (response.status === 401 && canRetry) {
    await refreshSession();
    return apiRequest(path, options, false);
  }

  const payload = await readResponse(response);
  if (!response.ok) {
    throw new ApiError(
      errorMessage(payload, "The request could not be completed."),
      response.status,
      payload
    );
  }
  return payload;
}

export function resultList(payload) {
  return Array.isArray(payload) ? payload : payload?.results || [];
}

// Signed-in users only; the public catalog never includes resource links.
export function resourceAccess(resourceId) {
  return apiRequest(`resources/${resourceId}/access/`);
}

// Download a file from an authenticated endpoint (e.g. CSV reports) and save it.
export async function apiDownload(path, fallbackName) {
  let response = await fetch(apiUrl(path), {
    credentials: "include",
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
  });
  if (response.status === 401) {
    await refreshSession();
    response = await fetch(apiUrl(path), { credentials: "include", headers: { Authorization: `Bearer ${accessToken}` } });
  }
  if (!response.ok) throw new ApiError("The download could not be prepared.", response.status, null);
  const name = /filename="([^"]+)"/.exec(response.headers.get("content-disposition") || "")?.[1] || fallbackName;
  const url = URL.createObjectURL(await response.blob());
  const link = Object.assign(document.createElement("a"), { href: url, download: name });
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
