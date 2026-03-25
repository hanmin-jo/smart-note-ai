const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

export function getToken() {
  return localStorage.getItem("token");
}

function authHeaders(extra = {}, skipJsonContentType = false) {
  const token = getToken();
  return {
    ...(!skipJsonContentType ? { "Content-Type": "application/json" } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extra,
  };
}

async function request(path, options = {}) {
  const isFormData =
    typeof FormData !== "undefined" && options.body instanceof FormData;
  let res;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      ...options,
      headers: authHeaders(options.headers, isFormData),
    });
  } catch (e) {
    // 네트워크 단에서 실패한 경우
    throw {
      networkError: true,
      message: "서버에 연결할 수 없습니다. 인터넷 상태를 확인해 주세요.",
      cause: e,
    };
  }

  // 401 → 토큰 만료, 로컬 클리어
  if (res.status === 401) {
    localStorage.removeItem("token");
    window.dispatchEvent(new Event("auth:logout"));
  }

  let data = null;
  const contentType = res.headers.get("Content-Type") || "";
  if (contentType.includes("application/json")) {
    data = await res.json().catch(() => null);
  }

  if (!res.ok) {
    const message =
      data?.detail ||
      data?.message ||
      `요청 처리 중 오류가 발생했습니다. (HTTP ${res.status})`;
    throw {
      status: res.status,
      ok: false,
      message,
      data,
    };
  }

  return {
    ok: true,
    status: res.status,
    data,
  };
}

export const api = {
  get: (path) => request(path),
  post: (path, body) =>
    request(path, {
      method: "POST",
      body: body instanceof FormData ? body : JSON.stringify(body),
    }),
  patch: (path, body) => request(path, { method: "PATCH", body: JSON.stringify(body) }),
  delete: (path) => request(path, { method: "DELETE" }),
};

export default api;
