
"use client";
import { useEffect, useState, FormEvent, Fragment } from "react";
import { useRouter } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

interface WooProduct {
  id: number;
  name: string;
  regular_price: string;
  status: string;
  images: { src: string }[];
}

interface FormState {
  name: string;
  regular_price: string;
  status: string;
  image: string;
}

interface EditModal {
  open: boolean;
  product: WooProduct | null;
}

interface User { id: number; username: string; role?: string; }

export default function Home() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [currentRole, setCurrentRole] = useState<string | null>(null);
  const [products, setProducts] = useState<WooProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState<FormState>({ name: "", regular_price: "", status: "publish", image: "" });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editModal, setEditModal] = useState<EditModal>({ open: false, product: null });
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const PER_PAGE = 20;

  // Users modal
  const [usersModal, setUsersModal] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [newUser, setNewUser] = useState({ username: "", password: "", role: "secretaria" });
  const [usersError, setUsersError] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);

  // Check auth on mount
  useEffect(() => {
    const t = localStorage.getItem("token");
    const u = localStorage.getItem("username");
    const r = localStorage.getItem("role");
    if (!t) { router.push("/login"); return; }
    setToken(t);
    setCurrentUser(u);
    setCurrentRole(r);
  }, []);

  const authHeaders = (t: string) => ({
    "Content-Type": "application/json",
    "Authorization": `Bearer ${t}`,
  });

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    localStorage.removeItem("role");
    router.push("/login");
  };

  const uploadImage = async (file: File, onDone: (url: string) => void) => {
    if (!token) return;
    setUploadingImage(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch(`${API_URL}/media`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Error subiendo imagen'); return; }
      onDone(data.url);
    } catch {
      setError('Error subiendo imagen');
    } finally {
      setUploadingImage(false);
    }
  };

  // Fetch products
  const fetchProducts = async (p = page, s = search, t = token) => {
    if (!t) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(p), per_page: String(PER_PAGE) });
      if (s) params.append('search', s);
      const res = await fetch(`${API_URL}/products?${params}`, { headers: authHeaders(t) });
      if (res.status === 401) { handleLogout(); return; }
      const data = await res.json();
      setProducts(data.products);
      setTotal(Number(data.total) || 0);
      setTotalPages(Number(data.totalPages) || 1);
      setError("");
    } catch {
      setError("Error al cargar productos");
    }
    setLoading(false);
  };

  useEffect(() => {
    if (token) fetchProducts(page, search, token);
  }, [page, search, token]);

  // Handle create
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!token) return;
    try {
      const { image, ...rest } = form;
      const payload = { ...rest, ...(image ? { images: [{ src: image }] } : {}) };
      const res = await fetch(`${API_URL}/products`, {
        method: "POST",
        headers: authHeaders(token),
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Error guardando producto");
      setForm({ name: "", regular_price: "", status: "publish", image: "" });
      fetchProducts();
    } catch {
      setError("Error guardando producto");
    }
  };

  // Handle edit submit (popup)
  const handleEditSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editModal.product || !token) return;
    try {
      const res = await fetch(`${API_URL}/products/${editModal.product.id}`, {
        method: "PUT",
        headers: authHeaders(token),
        body: JSON.stringify(editModal.product),
      });
      if (!res.ok) throw new Error("Error actualizando producto");
      setEditModal({ open: false, product: null });
      fetchProducts();
    } catch {
      setError("Error actualizando producto");
    }
  };

  // Handle delete
  const handleDelete = async (id: number) => {
    if (!window.confirm("¿Eliminar producto?") || !token) return;
    try {
      await fetch(`${API_URL}/products/${id}`, { method: "DELETE", headers: authHeaders(token) });
      fetchProducts();
    } catch {
      setError("Error eliminando producto");
    }
  };

  // Handle hide
  const handleHide = async (id: number) => {
    if (!token) return;
    try {
      await fetch(`${API_URL}/products/${id}/hide`, { method: "PATCH", headers: authHeaders(token) });
      fetchProducts();
    } catch {
      setError("Error ocultando producto");
    }
  };

  // Handle show (publicar)
  const handleShow = async (id: number) => {
    if (!token) return;
    try {
      await fetch(`${API_URL}/products/${id}/show`, { method: "PATCH", headers: authHeaders(token) });
      fetchProducts();
    } catch {
      setError("Error publicando producto");
    }
  };

  // Handle edit
  const handleEdit = (product: WooProduct) => {
    setEditModal({ open: true, product: { ...product } });
  };

  // Users management
  const fetchUsers = async () => {
    if (!token) return;
    const res = await fetch(`${API_URL}/auth/users`, { headers: authHeaders(token) });
    const data = await res.json();
    setUsers(data);
  };

  const handleOpenUsers = () => {
    setUsersModal(true);
    setUsersError("");
    fetchUsers();
  };

  const handleCreateUser = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!token) return;
    setUsersError("");
    try {
      const res = await fetch(`${API_URL}/auth/users`, {
        method: "POST",
        headers: authHeaders(token),
        body: JSON.stringify(newUser),
      });
      const data = await res.json();
      if (!res.ok) { setUsersError(data.error); return; }
      setNewUser({ username: "", password: "", role: "secretaria" });
      fetchUsers();
    } catch {
      setUsersError("Error creando usuario");
    }
  };

  const handleDeleteUser = async (id: number) => {
    if (!window.confirm("¿Eliminar usuario?") || !token) return;
    try {
      const res = await fetch(`${API_URL}/auth/users/${id}`, { method: "DELETE", headers: authHeaders(token) });
      const data = await res.json();
      if (!res.ok) { setUsersError(data.error); return; }
      fetchUsers();
    } catch {
      setUsersError("Error eliminando usuario");
    }
  };

  if (!token) return null;

  return (
    <main style={{ maxWidth: 900, margin: "auto", padding: 20, fontFamily: 'sans-serif' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 8 }}>
        <h1 style={{ fontSize: 28, margin: 0 }}>Productos WooCommerce</h1>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ color: '#aaa', fontSize: 14 }}>Hola, <b style={{ color: '#fff' }}>{currentUser}</b></span>
          {currentRole === 'admin' && (
            <button onClick={handleOpenUsers} style={{ padding: '6px 14px', borderRadius: 6, border: 'none', background: '#333', color: '#fff', cursor: 'pointer', fontWeight: 600 }}>Usuarios</button>
          )}
          <button onClick={handleLogout} style={{ padding: '6px 14px', borderRadius: 6, border: 'none', background: '#e00', color: '#fff', cursor: 'pointer', fontWeight: 600 }}>Cerrar sesión</button>
        </div>
      </div>

      {/* Modal Gestión de Usuarios */}
      {usersModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}>
          <div style={{ background: '#222', padding: 32, borderRadius: 12, minWidth: 320, maxWidth: '90vw', color: '#fff', position: 'relative' }}>
            <button onClick={() => setUsersModal(false)} style={{ position: 'absolute', top: 12, right: 12, background: 'transparent', border: 'none', color: '#fff', fontSize: 22, cursor: 'pointer' }}>&times;</button>
            <h2 style={{ marginBottom: 20 }}>Gestión de usuarios</h2>
            <ul style={{ listStyle: 'none', padding: 0, marginBottom: 20 }}>
              {users.map(u => (
                <li key={u.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #333' }}>
                  <span>{u.username} <span style={{ fontSize: 11, color: '#aaa', background: '#333', borderRadius: 4, padding: '2px 6px', marginLeft: 6 }}>{u.role || 'secretaria'}</span></span>
                  {u.username !== currentUser && (
                    <button onClick={() => handleDeleteUser(u.id)} style={{ padding: '4px 10px', borderRadius: 6, border: 'none', background: '#e00', color: '#fff', cursor: 'pointer' }}>Eliminar</button>
                  )}
                </li>
              ))}
            </ul>
            <form onSubmit={handleCreateUser} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <h3 style={{ margin: 0, fontSize: 15 }}>Crear nuevo usuario</h3>
              <input placeholder="Usuario" value={newUser.username} onChange={e => setNewUser(n => ({ ...n, username: e.target.value }))} required style={{ padding: 8, borderRadius: 4, border: '1px solid #555', background: '#333', color: '#fff' }} />
              <input type="password" placeholder="Contraseña" value={newUser.password} onChange={e => setNewUser(n => ({ ...n, password: e.target.value }))} required style={{ padding: 8, borderRadius: 4, border: '1px solid #555', background: '#333', color: '#fff' }} />
              <select value={newUser.role} onChange={e => setNewUser(n => ({ ...n, role: e.target.value }))} style={{ padding: 8, borderRadius: 4, border: '1px solid #555', background: '#333', color: '#fff' }}>
                <option value="secretaria">Secretaria</option>
                <option value="admin">Admin</option>
              </select>
              {usersError && <p style={{ color: '#f55', fontSize: 13, margin: 0 }}>{usersError}</p>}
              <button type="submit" style={{ padding: '8px', borderRadius: 6, border: 'none', background: '#0070f3', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>Crear</button>
            </form>
          </div>
        </div>
      )}
      {/* Formulario de creación */}
      <form onSubmit={handleSubmit} style={{ marginBottom: 32, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          placeholder="Nombre"
          value={form.name}
          onChange={e => setForm({ ...form, name: e.target.value })}
          required
          style={{ padding: 8, borderRadius: 4, border: '1px solid #ccc', minWidth: 180 }}
        />
        <input
          placeholder="Precio"
          type="number"
          value={form.regular_price}
          onChange={e => setForm({ ...form, regular_price: e.target.value })}
          required
          style={{ padding: 8, borderRadius: 4, border: '1px solid #ccc', minWidth: 100 }}
        />
        <select
          value={form.status}
          onChange={e => setForm({ ...form, status: e.target.value })}
          style={{ padding: 8, borderRadius: 4, border: '1px solid #ccc' }}
        >
          <option value="publish">Publicado</option>
          <option value="draft">Oculto</option>
        </select>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input
            placeholder="URL de imagen (opcional)"
            value={form.image}
            onChange={e => setForm({ ...form, image: e.target.value })}
            style={{ padding: 8, borderRadius: 4, border: '1px solid #ccc', minWidth: 200 }}
          />
          <label style={{ padding: '8px 12px', borderRadius: 4, background: '#444', color: '#fff', cursor: uploadingImage ? 'wait' : 'pointer', fontSize: 13, whiteSpace: 'nowrap' }}>
            {uploadingImage ? 'Subiendo...' : '+ Subir archivo'}
            <input type="file" accept="image/*" style={{ display: 'none' }} disabled={uploadingImage}
              onChange={e => { const f = e.target.files?.[0]; if (f) uploadImage(f, url => setForm(prev => ({ ...prev, image: url }))); e.target.value = ''; }}
            />
          </label>
          {form.image && (
            <img src={form.image} alt="preview" style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 6, border: '1px solid #ccc', background: '#fff' }} onError={e => (e.currentTarget.style.display = 'none')} />
          )}
        </div>
        <button type="submit" style={{ padding: 8, borderRadius: 4, background: '#0070f3', color: '#fff', border: 'none' }}>{editingId ? "Actualizar" : "Crear"}</button>
      </form>
      {/* Barra de búsqueda */}
      <form onSubmit={e => { e.preventDefault(); setPage(1); setSearch(searchInput); }} style={{ marginBottom: 16, display: 'flex', gap: 8 }}>
        <input
          placeholder="Buscar producto..."
          value={searchInput}
          onChange={e => setSearchInput(e.target.value)}
          style={{ padding: 8, borderRadius: 4, border: '1px solid #ccc', flex: 1 }}
        />
        <button type="submit" style={{ padding: '8px 16px', borderRadius: 4, background: '#0070f3', color: '#fff', border: 'none', fontWeight: 600 }}>Buscar</button>
        {search && (
          <button type="button" onClick={() => { setSearchInput(""); setSearch(""); setPage(1); }} style={{ padding: '8px 12px', borderRadius: 4, background: '#888', color: '#fff', border: 'none', fontWeight: 600 }}>&#x2715; Limpiar</button>
        )}
      </form>
      {total > 0 && <p style={{ marginBottom: 12, color: '#aaa' }}>{total} productos encontrados</p>}
      {/* Modal de edición fuera del formulario principal */}
      {editModal.open && editModal.product && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div style={{ background: '#222', padding: 32, borderRadius: 12, minWidth: 320, maxWidth: '90vw', boxShadow: '0 4px 24px #0008', color: '#fff', position: 'relative' }}>
            <button onClick={() => setEditModal({ open: false, product: null })} style={{ position: 'absolute', top: 12, right: 12, background: 'transparent', border: 'none', color: '#fff', fontSize: 22, cursor: 'pointer' }}>&times;</button>
            <h2 style={{ marginBottom: 18, fontSize: 22 }}>Editar producto</h2>
            <form onSubmit={handleEditSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <input
                placeholder="Nombre"
                value={editModal.product.name}
                onChange={e => setEditModal(m => ({ ...m, product: { ...m.product!, name: e.target.value } }))}
                required
                style={{ padding: 8, borderRadius: 4, border: '1px solid #ccc' }}
              />
              <input
                placeholder="Precio"
                type="number"
                value={editModal.product.regular_price}
                onChange={e => setEditModal(m => ({ ...m, product: { ...m.product!, regular_price: e.target.value } }))}
                required
                style={{ padding: 8, borderRadius: 4, border: '1px solid #ccc' }}
              />
              <select
                value={editModal.product.status}
                onChange={e => setEditModal(m => ({ ...m, product: { ...m.product!, status: e.target.value } }))}
                style={{ padding: 8, borderRadius: 4, border: '1px solid #ccc' }}
              >
                <option value="publish">Publicado</option>
                <option value="draft">Oculto</option>
              </select>
              <div>
                <input
                  placeholder="URL de imagen (opcional)"
                  value={editModal.product.images?.[0]?.src || ""}
                  onChange={e => setEditModal(m => ({ ...m, product: { ...m.product!, images: e.target.value ? [{ src: e.target.value }] : [] } }))}
                  style={{ padding: 8, borderRadius: 4, border: '1px solid #ccc', width: '100%', boxSizing: 'border-box' as const }}
                />
                <label style={{ display: 'inline-block', marginTop: 8, padding: '7px 14px', borderRadius: 4, background: '#444', color: '#fff', cursor: uploadingImage ? 'wait' : 'pointer', fontSize: 13 }}>
                  {uploadingImage ? 'Subiendo...' : '+ Subir archivo'}
                  <input type="file" accept="image/*" style={{ display: 'none' }} disabled={uploadingImage}
                    onChange={e => { const f = e.target.files?.[0]; if (f) uploadImage(f, url => setEditModal(m => ({ ...m, product: { ...m.product!, images: [{ src: url }] } }))); e.target.value = ''; }}
                  />
                </label>
                {editModal.product.images?.[0]?.src && (
                  <img src={editModal.product.images[0].src} alt="preview" style={{ marginTop: 8, width: 80, height: 80, objectFit: 'cover', borderRadius: 8, border: '1px solid #555', background: '#fff', display: 'block' }} onError={e => (e.currentTarget.style.display = 'none')} />
                )}
              </div>
              <button type="submit" style={{ padding: 10, borderRadius: 4, background: '#0070f3', color: '#fff', border: 'none', fontWeight: 600 }}>Guardar cambios</button>
            </form>
          </div>
        </div>
      )}
      {loading ? (
        <p>Cargando...</p>
      ) : error ? (
        <p style={{ color: "red" }}>{error}</p>
      ) : (
        <div>
          {/* Desktop Table */}
          <div className="product-table" style={{ display: 'none', marginBottom: 24 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', background: '#181818', color: '#fff' }}>
              <thead>
                <tr style={{ background: '#222' }}>
                  <th style={{ padding: 10, borderBottom: '2px solid #333' }}>Imagen</th>
                  <th style={{ padding: 10, borderBottom: '2px solid #333' }}>ID</th>
                  <th style={{ padding: 10, borderBottom: '2px solid #333' }}>Nombre</th>
                  <th style={{ padding: 10, borderBottom: '2px solid #333' }}>Precio</th>
                  <th style={{ padding: 10, borderBottom: '2px solid #333' }}>Estado</th>
                  <th style={{ padding: 10, borderBottom: '2px solid #333' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.id} style={{ borderBottom: '1px solid #333' }}>
                    <td style={{ textAlign: 'center', padding: 8 }}>
                      {p.images && p.images.length > 0 ? (
                        <img src={p.images[0].src} alt={p.name} style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 8, background: '#fff' }} />
                      ) : (
                        <div style={{ width: 60, height: 60, background: '#444', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#bbb', fontSize: 12 }}>Sin imagen</div>
                      )}
                    </td>
                    <td style={{ padding: 8 }}>{p.id}</td>
                    <td style={{ padding: 8 }}>{p.name}</td>
                    <td style={{ padding: 8 }}>Q{p.regular_price}</td>
                    <td style={{ padding: 8 }}>{p.status}</td>
                    <td style={{ padding: 8 }}>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'nowrap', justifyContent: 'center', alignItems: 'center' }}>
                        <button
                          style={{ padding: '5px 10px', borderRadius: 6, border: 'none', background: '#0070f3', color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: 13, whiteSpace: 'nowrap' }}
                          onClick={() => handleEdit(p)}
                        >
                          Editar
                        </button>
                        <button
                          style={{ padding: '5px 10px', borderRadius: 6, border: 'none', background: '#e00', color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: 13, whiteSpace: 'nowrap' }}
                          onClick={() => handleDelete(p.id)}
                        >
                          Eliminar
                        </button>
                          {p.status !== "draft" ? (
                            <button
                              style={{ padding: '5px 10px', borderRadius: 6, border: 'none', background: '#888', color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: 13, whiteSpace: 'nowrap' }}
                              onClick={() => handleHide(p.id)}
                            >
                              Ocultar
                            </button>
                          ) : (
                            <button
                              style={{ padding: '5px 10px', borderRadius: 6, border: 'none', background: '#0a0', color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: 13, whiteSpace: 'nowrap' }}
                              onClick={() => handleShow(p.id)}
                            >
                              Mostrar
                            </button>
                          )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Mobile Cards */}
          <div className="product-cards" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {products.map((p) => (
              <div key={p.id} style={{ background: '#181818', borderRadius: 12, boxShadow: '0 2px 8px #0002', padding: 16, display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ minWidth: 60, minHeight: 60, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {p.images && p.images.length > 0 ? (
                    <img src={p.images[0].src} alt={p.name} style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 8, background: '#fff' }} />
                  ) : (
                    <div style={{ width: 60, height: 60, background: '#444', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#bbb', fontSize: 12 }}>Sin imagen</div>
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 120 }}>
                  <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 2 }}>{p.name}</div>
                  <div style={{ color: '#bbb', fontSize: 13, marginBottom: 2 }}>ID: {p.id}</div>
                  <div style={{ color: '#fff', fontSize: 15, marginBottom: 2 }}>Precio: <b>Q{p.regular_price}</b></div>
                  <div style={{ color: '#aaa', fontSize: 13, marginBottom: 8 }}>Estado: {p.status}</div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button
                      style={{ padding: '6px 14px', borderRadius: 6, border: 'none', background: '#0070f3', color: '#fff', fontWeight: 600, cursor: 'pointer', boxShadow: '0 1px 4px #0002' }}
                      onClick={() => handleEdit(p)}
                    >
                      Editar
                    </button>
                    <button
                      style={{ padding: '6px 14px', borderRadius: 6, border: 'none', background: '#e00', color: '#fff', fontWeight: 600, cursor: 'pointer', boxShadow: '0 1px 4px #0002' }}
                      onClick={() => handleDelete(p.id)}
                    >
                      Eliminar
                    </button>
                    {p.status !== "draft" ? (
                        <button
                          style={{ padding: '6px 14px', borderRadius: 6, border: 'none', background: '#888', color: '#fff', fontWeight: 600, cursor: 'pointer', boxShadow: '0 1px 4px #0002' }}
                          onClick={() => handleHide(p.id)}
                        >
                          Ocultar
                        </button>
                      ) : (
                        <button
                          style={{ padding: '6px 14px', borderRadius: 6, border: 'none', background: '#0a0', color: '#fff', fontWeight: 600, cursor: 'pointer', boxShadow: '0 1px 4px #0002' }}
                          onClick={() => handleShow(p.id)}
                        >
                          Mostrar
                        </button>
                      )}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <style>{`
            @media (min-width: 700px) {
              .product-table { display: block !important; }
              .product-cards { display: none !important; }
            }
            @media (max-width: 699px) {
              .product-table { display: none !important; }
              .product-cards { display: flex !important; }
            }
          `}</style>
          {/* Paginación */}
          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 24, flexWrap: 'wrap' }}>
              <button
                onClick={() => setPage(1)}
                disabled={page === 1}
                style={{ padding: '6px 12px', borderRadius: 4, border: 'none', background: page === 1 ? '#444' : '#0070f3', color: '#fff', cursor: page === 1 ? 'default' : 'pointer' }}
              >&#171;</button>
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                style={{ padding: '6px 12px', borderRadius: 4, border: 'none', background: page === 1 ? '#444' : '#0070f3', color: '#fff', cursor: page === 1 ? 'default' : 'pointer' }}
              >&#8249;</button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
                .map((p, i, arr) => (
                  <Fragment key={p}>
                    {i > 0 && arr[i - 1] !== p - 1 && <span style={{ color: '#888' }}>...</span>}
                    <button
                      onClick={() => setPage(p)}
                      style={{ padding: '6px 12px', borderRadius: 4, border: 'none', background: page === p ? '#0070f3' : '#333', color: '#fff', cursor: 'pointer', fontWeight: page === p ? 700 : 400 }}
                    >{p}</button>
                  </Fragment>
                ))}
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                style={{ padding: '6px 12px', borderRadius: 4, border: 'none', background: page === totalPages ? '#444' : '#0070f3', color: '#fff', cursor: page === totalPages ? 'default' : 'pointer' }}
              >&#8250;</button>
              <button
                onClick={() => setPage(totalPages)}
                disabled={page === totalPages}
                style={{ padding: '6px 12px', borderRadius: 4, border: 'none', background: page === totalPages ? '#444' : '#0070f3', color: '#fff', cursor: page === totalPages ? 'default' : 'pointer' }}
              >&#187;</button>
              <span style={{ color: '#aaa', fontSize: 13 }}>Página {page} de {totalPages}</span>
            </div>
          )}
        </div>
      )}
    </main>
  );
}
