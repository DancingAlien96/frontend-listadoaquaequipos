
"use client";
import { useEffect, useState, FormEvent } from "react";

const API_URL = "http://localhost:4000";

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
}

interface EditModal {
  open: boolean;
  product: WooProduct | null;
}

export default function Home() {
  const [products, setProducts] = useState<WooProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState<FormState>({ name: "", regular_price: "", status: "publish" });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editModal, setEditModal] = useState<EditModal>({ open: false, product: null });

  // Fetch products
  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/products`);
      const data = await res.json();
      setProducts(data);
      setError("");
    } catch {
      setError("Error al cargar productos");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  // Handle create
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_URL}/products`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Error guardando producto");
      setForm({ name: "", regular_price: "", status: "publish" });
      fetchProducts();
    } catch {
      setError("Error guardando producto");
    }
  };

  // Handle edit submit (popup)
  const handleEditSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editModal.product) return;
    try {
      const res = await fetch(`${API_URL}/products/${editModal.product.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
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
    if (!window.confirm("¿Eliminar producto?")) return;
    try {
      await fetch(`${API_URL}/products/${id}`, { method: "DELETE" });
      fetchProducts();
    } catch {
      setError("Error eliminando producto");
    }
  };

  // Handle hide
  const handleHide = async (id: number) => {
    try {
      await fetch(`${API_URL}/products/${id}/hide`, { method: "PATCH" });
      fetchProducts();
    } catch {
      setError("Error ocultando producto");
    }
  };

  // Handle show (publicar)
  const handleShow = async (id: number) => {
    try {
      await fetch(`${API_URL}/products/${id}/show`, { method: "PATCH" });
      fetchProducts();
    } catch {
      setError("Error publicando producto");
    }
  };

  // Handle edit
  const handleEdit = (product: WooProduct) => {
    setEditModal({ open: true, product: { ...product } });
  };

  return (
    <main style={{ maxWidth: 900, margin: "auto", padding: 20, fontFamily: 'sans-serif' }}>
      <h1 style={{ fontSize: 28, marginBottom: 16 }}>Productos WooCommerce</h1>
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
        <button type="submit" style={{ padding: 8, borderRadius: 4, background: '#0070f3', color: '#fff', border: 'none' }}>{editingId ? "Actualizar" : "Crear"}</button>
      </form>
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
                onChange={e => setEditModal(m => ({ ...m, product: { ...m.product, name: e.target.value } }))}
                required
                style={{ padding: 8, borderRadius: 4, border: '1px solid #ccc' }}
              />
              <input
                placeholder="Precio"
                type="number"
                value={editModal.product.regular_price}
                onChange={e => setEditModal(m => ({ ...m, product: { ...m.product, regular_price: e.target.value } }))}
                required
                style={{ padding: 8, borderRadius: 4, border: '1px solid #ccc' }}
              />
              <select
                value={editModal.product.status}
                onChange={e => setEditModal(m => ({ ...m, product: { ...m.product, status: e.target.value } }))}
                style={{ padding: 8, borderRadius: 4, border: '1px solid #ccc' }}
              >
                <option value="publish">Publicado</option>
                <option value="draft">Oculto</option>
              </select>
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
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
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
        </div>
      )}
    </main>
  );
}
