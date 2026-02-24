// ============================================================
// API — Wrapper de fetch hacia el backend
// Incluye token JWT automáticamente si hay sesión activa
// ============================================================
const API = {
  async request(path, options = {}) {
    const token = await Auth.getToken();

    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    let response;
    try {
      response = await fetch(`${CONFIG.API_BASE_URL}${path}`, {
        ...options,
        headers,
      });
    } catch (networkError) {
      throw new Error('No se pudo conectar con el servidor. Verifica tu conexión.');
    }

    // Intentar parsear JSON siempre
    let data;
    try {
      data = await response.json();
    } catch {
      throw new Error(`Error del servidor (${response.status})`);
    }

    if (!response.ok) {
      throw new Error(data.error || `Error ${response.status}`);
    }

    return data;
  },

  get(path)        { return this.request(path, { method: 'GET' }); },
  post(path, body) { return this.request(path, { method: 'POST',   body: JSON.stringify(body) }); },
  put(path, body)  { return this.request(path, { method: 'PUT',    body: JSON.stringify(body) }); },
  patch(path, body){ return this.request(path, { method: 'PATCH',  body: JSON.stringify(body) }); },
  del(path)        { return this.request(path, { method: 'DELETE' }); },
};
