const API = import.meta.env.VITE_API_URL?.replace(/\/$/, "");

export async function api(path, { method="GET", body, token } = {}) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export const register   = (data)         => api("/api/auth/register", { method:"POST", body:data });
export const login      = (data)         => api("/api/auth/login",    { method:"POST", body:data });
export const products   = ()             => api("/api/products"); // solo activos
export const createOrder= (items, token) => api("/api/orders",        { method:"POST", body:{ items }, token });
export const myOrders   = (token)        => api("/api/orders/mine",   { token });