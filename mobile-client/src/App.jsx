import React, { useEffect, useMemo, useState } from "react";
import { register, login, products, createOrder, myOrders } from "./api";

/* ============ helpers ============ */
const money = (n) => `$${Number(n || 0).toLocaleString("es-CO")}`;

/* ========================
   🔐 HOOK DE AUTENTICACIÓN
=========================== */
function useAuth() {
  const [token, setToken] = useState(() => localStorage.getItem("token") || "");
  const [user, setUser] = useState(() =>
    JSON.parse(localStorage.getItem("user") || "null")
  );

  const save = (t, u) => {
    localStorage.setItem("token", t);
    localStorage.setItem("user", JSON.stringify(u));
    setToken(t);
    setUser(u);
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setToken("");
    setUser(null);
  };

  return { token, user, save, logout };
}

/* ========================
   🌍 APP PRINCIPAL
=========================== */
export default function App() {
  const { token, save, logout } = useAuth();
  const [tab, setTab] = useState("auth"); // auth | shop | orders

  useEffect(() => {
    if (token) setTab("shop");
    else setTab("auth");
  }, [token]);

  return (
    <div className="container">
      {/* Tarjeta 1 — información del backend */}
      <div className="card">
        <small>
          API: <span className="badge">{import.meta.env.VITE_API_URL}</span>
        </small>
      </div>

      {/* --- VISTA PRE-LOGIN: SOLO AUTH --- */}
      {!token && (
        <div className="card">
          <Auth onAuth={save} />
        </div>
      )}

      {/* --- VISTA POST-LOGIN: PANEL DE USUARIO --- */}
      {token && (
        <div className="card">
          <h2 style={{ textAlign: "center", marginBottom: 20 }}>Panel</h2>

          <div className="row" style={{ marginBottom: 10 }}>
            <button
              className={tab === "shop" ? "primary-btn" : "secondary"}
              onClick={() => setTab("shop")}
            >
              Tienda
            </button>
            <button
              className={tab === "orders" ? "primary-btn" : "secondary"}
              onClick={() => setTab("orders")}
            >
              Mis pedidos
            </button>
            <button className="secondary" onClick={logout}>
              Salir
            </button>
          </div>

          {tab === "shop" && <Shop token={token} />}
          {tab === "orders" && <Orders token={token} />}
        </div>
      )}
    </div>
  );
}

/* ========================
   👤 AUTH (auto “Registrarse”)
=========================== */
function Auth({ onAuth }) {
  const [mode, setMode] = useState("register"); // muestra registro al iniciar
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    try {
      if (mode === "register") {
        await register({ name, email, password });
      }
      const { token, user } = await login({ email, password });
      onAuth(token, user);
      setMsg("¡Listo! Sesión iniciada.");
    } catch (e) {
      setMsg("Error: " + e.message);
    }
  };

  if (!mode) {
    return (
      <div className="center-wrap">
        <div className="center-card">
          <h2 style={{ textAlign: "center", marginBottom: 20 }}>Bienvenido</h2>

          <div className="row">
            <button className="primary-btn" onClick={() => setMode("register")}>
              Registrarse
            </button>
            <button className="secondary" onClick={() => setMode("login")}>
              Entrar
            </button>
          </div>

          <div className="row" style={{ marginTop: 10 }}>
            <button className="secondary" onClick={() => setMode("login")}>
              Ya tengo cuenta
            </button>
          </div>

          <div style={{ marginTop: 10 }}>
            <button
              className="secondary full-btn"
              onClick={() => window.location.reload()}
            >
              Salir
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <h2>{mode === "login" ? "Iniciar sesión" : "Registrarse"}</h2>
      <form onSubmit={submit}>
        {mode === "register" && (
          <input
            placeholder="Nombre"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        )}
        <input
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          placeholder="Contraseña"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <div className="row">
          <button type="submit" className="primary-btn">
            {mode === "login" ? "Entrar" : "Registrarse"}
          </button>

          <button
            type="button"
            className="secondary"
            onClick={() => setMode(mode === "login" ? "register" : "login")}
          >
            {mode === "login" ? "Registrarse" : "Ya tengo cuenta"}
          </button>
        </div>
      </form>

      <button
        onClick={() => setMode("")}
        className="secondary"
        style={{ marginTop: 10 }}
      >
        Salir
      </button>

      {msg && (
        <p>
          <small>{msg}</small>
        </p>
      )}
    </>
  );
}

/* ========================
   🛍️ TIENDA
=========================== */
function Shop({ token }) {
  const [list, setList] = useState([]);
  const [cart, setCart] = useState({});
  const [msg, setMsg] = useState("");

  useEffect(() => {
    products().then(setList).catch((e) => setMsg(String(e)));
  }, []);

  const add = (p) => setCart((c) => ({ ...c, [p._id]: (c[p._id] || 0) + 1 }));
  const remove = (p) =>
    setCart((c) => {
      const qty = (c[p._id] || 0) - 1;
      const n = { ...c };
      if (qty <= 0) delete n[p._id];
      else n[p._id] = qty;
      return n;
    });

  const items = useMemo(
    () => Object.entries(cart).map(([product, qty]) => ({ product, qty })),
    [cart]
  );

  // ✅ total dinero calculado del carrito
  const total = useMemo(
    () =>
      list.reduce((acc, p) => acc + (cart[p._id] || 0) * (p.price || 0), 0),
    [list, cart]
  );

  const totalItems = items.reduce((a, b) => a + b.qty, 0);

  const pay = async () => {
    if (!token) return setMsg("Inicia sesión para pagar.");
    if (items.length === 0) return setMsg("El carrito está vacío.");
    try {
      await createOrder(items, token); // si tu API acepta total, puedes pasar {items, total}
      setCart({});
      // ✅ Mostrar total como antes
      setMsg(`Pedido creado ✓ — Total: ${money(total)}`);
    } catch (e) {
      setMsg("Error: " + e.message);
    }
  };

  return (
    <>
      <h3>Tienda</h3>
      {list.map((p) => (
        <div key={p._id} className="card">
          <div className="row">
            <div style={{ flex: 2 }}>
              <strong>{p.title}</strong>
              <br />
              <small>{money(p.price)}</small>
            </div>
            <div className="right" style={{ flex: 1 }}>
              <div>
                En carrito: <span className="badge">{cart[p._id] || 0}</span>
              </div>
              <div className="row" style={{ marginTop: 8 }}>
                <button className="secondary" onClick={() => remove(p)}>
                  -
                </button>
                <button onClick={() => add(p)}>+</button>
              </div>
            </div>
          </div>
        </div>
      ))}

      <div className="card">
        <div className="row">
          <div>
            <strong>Total ítems:</strong> {totalItems}
          </div>
          <button onClick={pay}>Pagar (simulado)</button>
        </div>

        {msg && (
          <p>
            <small>{msg}</small>
          </p>
        )}
      </div>
    </>
  );
}

/* ========================
   📦 PEDIDOS
=========================== */
function Orders({ token }) {
  const [rows, setRows] = useState([]);
  const [msg, setMsg] = useState("");

  const load = async () => {
    try {
      setRows(await myOrders(token));
    } catch (e) {
      setMsg("Error: " + e.message);
    }
  };

  useEffect(() => {
    if (token) load();
  }, [token]);

  return (
    <>
      <h3>Mis pedidos</h3>
      <button onClick={load} className="secondary">
        Actualizar
      </button>
      <div className="card">
        <table className="table">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Ítems</th>
              <th className="right">Total</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((o) => (
              <tr key={o._id}>
                <td>{new Date(o.createdAt).toLocaleString()}</td>
                <td>{o.items.reduce((a, b) => a + b.qty, 0)}</td>
                <td className="right">{money(o.total)}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan="3">Aún no tienes pedidos.</td>
              </tr>
            )}
          </tbody>
        </table>
        {msg && (
          <p>
            <small>{msg}</small>
          </p>
        )}
      </div>
    </>
  );
}
