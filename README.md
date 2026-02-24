# ☕ Cafetería Aroma — Sistema Web Fullstack

Sistema de ventas y gestión operativa para la Cafetería Aroma, Cochabamba, Bolivia.
Proyecto técnico de nivel Técnico Medio con stack moderno y seguro.

---

## 📐 Stack Tecnológico

| Capa        | Tecnología                        |
|-------------|-----------------------------------|
| Frontend    | HTML + CSS + JavaScript (vanilla) |
| Backend     | Node.js + Express                 |
| Base de datos | Supabase (PostgreSQL + Auth + RLS) |
| Despliegue frontend | Netlify                  |
| Despliegue backend  | Render / Railway / Fly.io |
| Control de versiones | Git + GitHub             |

---

## 👥 Roles del Sistema

| Rol     | Descripción                                                    |
|---------|----------------------------------------------------------------|
| Admin   | CRUD productos, categorías, usuarios; dashboard de ventas      |
| Cajero  | Ver pedidos online, verificar pagos, registrar ventas en tienda|
| Cliente | Navegar menú, armar carrito, hacer pedido con delivery         |

---

## 📁 Estructura del Proyecto

```
trabajoBaseTecnicoMedio/
├── .gitignore
├── README.md
├── database/
│   ├── schema.sql             ← SQL completo para Supabase
│   ├── fix_rls_recursion.sql  ← Función get_my_role() SECURITY DEFINER
│   └── add_proof_url.sql      ← Columna proof_url + bucket Storage
├── docs/
│   └── guias/                 ← 15 guías didácticas del curso
│       ├── guia-01-introduccion-y-entorno.txt
│       ├── guia-02-base-de-datos.txt
│       ├── guia-03-html-spa.txt
│       ├── guia-04-css-diseno.txt
│       ├── guia-05-javascript-modulos.txt
│       ├── guia-06-carrito-localstorage.txt
│       ├── guia-07-backend-express.txt
│       ├── guia-08-autenticacion-jwt.txt
│       ├── guia-09-rls-seguridad.txt
│       ├── guia-10-crud-productos.txt
│       ├── guia-11-catalogo-carrito-checkout.txt
│       ├── guia-12-panel-cajero.txt
│       ├── guia-13-supabase-storage.txt
│       ├── guia-14-dashboard-admin.txt
│       └── guia-15-despliegue-produccion.txt
├── backend/
│   ├── package.json
│   ├── .env.example
│   └── src/
│       ├── index.js          ← Servidor Express principal
│       ├── services/
│       │   └── supabase.js   ← Cliente admin (service role key)
│       ├── middleware/
│       │   └── auth.js       ← requireAuth + requireRole
│       ├── routes/
│       │   ├── public.js
│       │   ├── client.js
│       │   ├── cashier.js
│       │   └── admin.js
│       └── controllers/
│           ├── productsController.js
│           ├── categoriesController.js
│           ├── ordersController.js
│           ├── cashierController.js
│           └── adminController.js
└── frontend/
    ├── index.html
    ├── css/
    │   └── styles.css
    └── js/
        ├── config.js         ← ← EDITAR: URL Supabase + Anon Key + URL Backend
        ├── auth.js
        ├── api.js
        ├── cart.js
        ├── app.js
        └── pages/
            ├── home.js
            ├── menu.js
            ├── login.js
            ├── cart-page.js
            ├── contact.js
            ├── cashier.js
            └── admin.js
```

---

## ⚙️ Requisitos Previos

- **Node.js** v18 o superior
- **Cuenta Supabase** (gratuita en supabase.com)
- **Cuenta GitHub** (para control de versiones)
- **Cuenta Netlify** (deploy frontend, gratis)
- **Cuenta Render** (deploy backend, gratis con limitaciones)

---

## 🚀 Instalación Local

### 1. Clonar el repositorio

```bash
git clone https://github.com/TU_USUARIO/aroma-cafeteria.git
cd aroma-cafeteria
```

### 2. Configurar Supabase

1. Crear proyecto en [supabase.com](https://supabase.com)
2. Ir a **SQL Editor** y ejecutar el archivo `database/schema.sql` completo
3. Verificar que las tablas, RLS y datos de ejemplo se crearon correctamente
4. Ir a **Settings > API** y copiar:
   - `Project URL` → `SUPABASE_URL`
   - `anon public` key → `SUPABASE_ANON_KEY` (para frontend)
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (solo para backend)

### 3. Configurar el Backend

```bash
cd backend
npm install

# Crear archivo de entorno
cp .env.example .env
```

Editar `backend/.env`:
```env
PORT=3000
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key-aqui
FRONTEND_URL=http://localhost:5500
```

Iniciar el backend:
```bash
npm run dev     # desarrollo (con nodemon)
npm start       # producción
```

El backend correrá en `http://localhost:3000`.
Verificar en: `http://localhost:3000/health`

### 4. Configurar el Frontend

Editar `frontend/js/config.js`:
```js
const CONFIG = {
  SUPABASE_URL:     'https://tu-proyecto.supabase.co',
  SUPABASE_ANON_KEY:'tu-anon-key-aqui',
  API_BASE_URL:     'http://localhost:3000',
};
```

Abrir el frontend con un servidor estático:
```bash
# Opción A: extensión Live Server de VS Code (recomendado)
# Clic derecho en index.html → "Open with Live Server"

# Opción B: npx serve
cd frontend
npx serve -p 5500

# Opción C: Python
cd frontend
python -m http.server 5500
```

Abrir en el navegador: `http://localhost:5500`

---

## 👤 Crear el Usuario Admin Inicial

Supabase no tiene usuarios por defecto. Para crear el primer admin:

1. Ir a **Supabase > Authentication > Users > Invite user**
   O usar el SQL Editor:

```sql
-- Crear usuario admin manualmente desde Supabase Dashboard
-- (Authentication > Users > Add user)
-- Email: admin@aroma.com
-- Password: Admin1234!

-- Luego actualizar su rol en profiles:
UPDATE profiles
SET role = 'admin', active = true
WHERE id = (
  SELECT id FROM auth.users WHERE email = 'admin@aroma.com'
);
```

2. Iniciar sesión en el frontend con ese correo.

---

## 🌐 Despliegue en Producción

### Backend → Render

1. Crear cuenta en [render.com](https://render.com)
2. **New > Web Service** → conectar repositorio GitHub
3. Configuración:
   - **Root Directory**: `backend`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Environment**: Node
4. Agregar variables de entorno:
   ```
   SUPABASE_URL=...
   SUPABASE_SERVICE_ROLE_KEY=...
   FRONTEND_URL=https://tu-cafeteria.netlify.app
   ```
5. Deploy → copiar la URL del servicio (ej: `https://aroma-api.onrender.com`)

### Frontend → Netlify

1. Crear cuenta en [netlify.com](https://netlify.com)
2. **New site > Import from Git** → conectar repositorio
3. Configuración:
   - **Base directory**: `frontend`
   - **Publish directory**: `frontend`
   - No se necesita build command (HTML estático)
4. Antes de hacer deploy, actualizar `frontend/js/config.js`:
   ```js
   API_BASE_URL: 'https://aroma-api.onrender.com',
   ```
5. Deploy → Netlify dará una URL pública

---

## 🔐 Seguridad

| Principio | Implementación |
|-----------|----------------|
| Claves secretas | `SUPABASE_SERVICE_ROLE_KEY` solo en backend, nunca en frontend |
| Auth | JWT de Supabase validado en cada endpoint protegido |
| RLS | Políticas en todas las tablas de Supabase |
| CORS | Solo orígenes permitidos configurados en Express |
| Validación | En frontend Y en backend (doble validación) |
| Sanitización | `escHtml()` en todo el HTML generado dinámicamente |
| Cantidades | El total se calcula en el servidor, no se confía en el cliente |

---

## 🧪 Credenciales Demo

> ⚠️ Solo para pruebas locales. Cambiar en producción.

| Rol    | Email                  | Contraseña   |
|--------|------------------------|--------------|
| Admin  | admin@aroma.com        | Admin1234!   |
| Cajero | cajero@aroma.com       | Cajero1234!  |
| Cliente| cliente@aroma.com      | Cliente1234! |

Para crear estos usuarios, ejecutar en Supabase o usar el panel admin.

---

## 📡 Endpoints de la API

### Públicos (sin auth)
| Método | Ruta                   | Descripción              |
|--------|------------------------|--------------------------|
| GET    | /api/products          | Listar productos activos |
| GET    | /api/products/:id      | Detalle de producto      |
| GET    | /api/categories        | Listar categorías        |
| GET    | /api/settings/public   | Settings del negocio     |
| GET    | /health                | Estado del servidor      |

### Cliente (auth requerida)
| Método | Ruta            | Descripción              |
|--------|-----------------|--------------------------|
| POST   | /api/orders     | Crear pedido online      |
| GET    | /api/my-orders  | Mis pedidos              |

### Cajero (rol cashier o admin)
| Método | Ruta                                   | Descripción                   |
|--------|----------------------------------------|-------------------------------|
| GET    | /api/cashier/orders                    | Listar pedidos (filtros)      |
| GET    | /api/cashier/orders/:id                | Detalle pedido                |
| PATCH  | /api/cashier/orders/:id/status         | Cambiar estado                |
| POST   | /api/cashier/orders/:id/verify-payment | Verificar pago QR             |
| POST   | /api/cashier/store-sale                | Registrar venta tienda        |
| GET    | /api/cashier/summary/today             | Resumen del día               |

### Admin (rol admin)
| Método | Ruta                     | Descripción              |
|--------|--------------------------|--------------------------|
| GET/POST/PUT/DELETE | /api/admin/products | CRUD productos      |
| GET/POST/PUT/DELETE | /api/admin/categories | CRUD categorías   |
| GET    | /api/admin/users         | Listar usuarios          |
| POST   | /api/admin/users         | Crear cajero/admin       |
| PATCH  | /api/admin/users/:id     | Editar usuario/rol       |
| GET    | /api/admin/dashboard     | Dashboard ventas         |
| GET/PUT| /api/admin/settings      | Configuración negocio    |

---

## 📚 Curso: Desarrollo Web Full-Stack con Node.js y Supabase

Este proyecto se usa como base para un curso didáctico secuencial de **15 guías** organizadas en 5 módulos. Cada guía incluye explicación teórica, código real del proyecto, actividades prácticas y ejercicios de refuerzo.

Las guías se encuentran en [`docs/guias/`](docs/guias/).

### Módulo 1 – Fundamentos y Entorno (Guías 01–05)

| # | Guía | Contenido clave |
|---|------|-----------------|
| 01 | [Introducción y entorno](docs/guias/guia-01-introduccion-y-entorno.txt) | Stack, herramientas, estructura del proyecto, Git básico |
| 02 | [Base de datos](docs/guias/guia-02-base-de-datos.txt) | Diseño relacional, Supabase, tipos PostgreSQL, RLS |
| 03 | [HTML y SPA](docs/guias/guia-03-html-spa.txt) | SPA sin framework, sistema de tabs, DOM |
| 04 | [CSS y diseño](docs/guias/guia-04-css-diseno.txt) | Variables CSS, Flexbox, Grid, responsive, componentes |
| 05 | [JavaScript y módulos](docs/guias/guia-05-javascript-modulos.txt) | Módulo pattern, escHtml, eventos, Toast |

### Módulo 2 – Frontend Base (Guías 06–07)

| # | Guía | Contenido clave |
|---|------|-----------------|
| 06 | [Carrito y LocalStorage](docs/guias/guia-06-carrito-localstorage.txt) | localStorage API, módulo Cart, persistencia |
| 07 | [Backend Express](docs/guias/guia-07-backend-express.txt) | REST API, Express, middleware, variables de entorno |

### Módulo 3 – Autenticación y Seguridad (Guías 08–09)

| # | Guía | Contenido clave |
|---|------|-----------------|
| 08 | [Autenticación JWT](docs/guias/guia-08-autenticacion-jwt.txt) | Supabase Auth, JWT, requireAuth, requireRole |
| 09 | [RLS y seguridad](docs/guias/guia-09-rls-seguridad.txt) | Row Level Security, recursión infinita, SECURITY DEFINER |

### Módulo 4 – Funcionalidades Principales (Guías 10–13)

| # | Guía | Contenido clave |
|---|------|-----------------|
| 10 | [CRUD de productos](docs/guias/guia-10-crud-productos.txt) | CRUD completo, modal pattern, validación doble |
| 11 | [Catálogo, carrito y checkout](docs/guias/guia-11-catalogo-carrito-checkout.txt) | Menú con filtros, checkout multi-step, total en servidor |
| 12 | [Panel del cajero](docs/guias/guia-12-panel-cajero.txt) | Estados de pedido, zona horaria Bolivia UTC-4, ventas tienda |
| 13 | [Supabase Storage](docs/guias/guia-13-supabase-storage.txt) | Buckets, subida de archivos, blob URL vs Storage URL |

### Módulo 5 – Panel Admin y Despliegue (Guías 14–15)

| # | Guía | Contenido clave |
|---|------|-----------------|
| 14 | [Dashboard y configuración](docs/guias/guia-14-dashboard-admin.txt) | Consultas agregadas, key-value settings, try/catch/finally |
| 15 | [Despliegue y producción](docs/guias/guia-15-despliegue-produccion.txt) | Railway, Netlify, CORS, checklist de producción |

---

## 🐛 Sugerencia de Commits por Fases

```bash
# Fase 1: Base del proyecto
git add database/schema.sql
git commit -m "feat: schema inicial PostgreSQL con tablas y RLS"

# Fase 2: Backend base
git add backend/
git commit -m "feat: backend Express con auth middleware y rutas públicas"

# Fase 3: Flujo de productos y órdenes
git commit -m "feat: CRUD productos, categorías y creación de órdenes"

# Fase 4: Panel cajero
git commit -m "feat: panel cajero - gestión pedidos y venta tienda"

# Fase 5: Panel admin
git commit -m "feat: panel admin - dashboard, usuarios y configuración"

# Fase 6: Frontend completo
git commit -m "feat: frontend vanilla - landing, menú, carrito y checkout"

# Fase 7: Integración y pruebas
git commit -m "fix: validaciones, manejo de errores y mejoras UX"

# Fase 8: Deploy
git commit -m "chore: configuración Netlify y Render para producción"
```

---

## 🧪 Plan de Pruebas

### Tabla de Casos de Prueba

| # | Módulo       | Caso de Prueba                                       | Resultado Esperado                               | Estado |
|---|--------------|------------------------------------------------------|--------------------------------------------------|--------|
| 1 | Menú público | Cargar página sin login                              | Se muestran productos activos y categorías       | ⬜     |
| 2 | Menú público | Filtrar por categoría "Cafés"                        | Solo se ven productos de cafés                   | ⬜     |
| 3 | Menú público | Buscar "cappuccino"                                  | Solo aparece el Cappuccino                       | ⬜     |
| 4 | Carrito      | Agregar producto sin login                           | Redirige a Login con aviso                       | ⬜     |
| 5 | Auth         | Registro cliente con email válido                    | Cuenta creada, sesión iniciada                   | ⬜     |
| 6 | Auth         | Login con credenciales incorrectas                   | Mensaje de error amigable                        | ⬜     |
| 7 | Auth         | Login como cajero con rol "client"                   | Error: "este correo no tiene el rol de cajero"  | ⬜     |
| 8 | Carrito      | Agregar varios productos, modificar cantidades       | Total calculado correctamente                    | ⬜     |
| 9 | Checkout     | Checkout sin dirección                               | Validación: "La dirección es obligatoria"        | ⬜     |
| 10| Checkout     | Checkout con teléfono inválido (letras)              | Validación: "formato de teléfono inválido"       | ⬜     |
| 11| Checkout     | Checkout exitoso                                     | Pedido creado, código ARO-XXXXXXXX, botón WA     | ⬜     |
| 12| Cajero       | Ver pedidos pendientes de pago                       | Lista filtrada por status=pending_payment        | ⬜     |
| 13| Cajero       | Verificar pago de orden online                       | Estado cambia a "paid", registro en payments     | ⬜     |
| 14| Cajero       | Cambiar estado a "delivering"                        | Estado actualizado en tabla                      | ⬜     |
| 15| Cajero       | Venta tienda: efectivo insuficiente                  | Error: "Monto insuficiente"                      | ⬜     |
| 16| Cajero       | Venta tienda: efectivo correcto                      | Cambio calculado correctamente, venta registrada | ⬜     |
| 17| Cajero       | Resumen del día con ventas                           | Total, top productos, desglose canal/pago        | ⬜     |
| 18| Admin        | Crear producto con precio negativo                   | Validación: "precio no puede ser negativo"       | ⬜     |
| 19| Admin        | Desactivar producto                                  | No aparece en menú público                       | ⬜     |
| 20| Admin        | Crear usuario cajero                                 | Usuario en BD con rol correcto                   | ⬜     |
| 21| Admin        | Desactivar cuenta de usuario                         | Error "cuenta desactivada" al intentar login     | ⬜     |
| 22| Admin        | Dashboard: rango de fechas                           | Estadísticas filtradas por fecha                 | ⬜     |
| 23| Admin        | Guardar configuración WhatsApp                       | Número actualizado en settings                   | ⬜     |
| 24| Seguridad    | Acceder a /api/cashier/orders sin token              | Error 401                                        | ⬜     |
| 25| Seguridad    | Acceder a /api/admin/users con rol client            | Error 403                                        | ⬜     |

---

## ✅ Checklist de Despliegue

### Supabase
- [ ] Proyecto creado en Supabase
- [ ] `schema.sql` ejecutado completamente
- [ ] Verificar tablas creadas en Table Editor
- [ ] Verificar políticas RLS en Authentication > Policies
- [ ] Trigger `trg_on_auth_user_created` funcional (probar creando usuario)
- [ ] Trigger `trg_set_order_code` funcional (código ARO- generado)
- [ ] Usuario admin inicial creado y verificado

### Backend (Render)
- [ ] Repositorio conectado en Render
- [ ] Variables de entorno configuradas (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, FRONTEND_URL)
- [ ] Deploy exitoso
- [ ] `/health` responde OK
- [ ] Test: `GET /api/products` retorna productos
- [ ] Test: `POST /api/orders` con token inválido → 401

### Frontend (Netlify)
- [ ] `frontend/js/config.js` con URLs de producción
- [ ] Deploy exitoso en Netlify
- [ ] El menú carga productos desde la API
- [ ] Login funciona (cliente, cajero, admin)
- [ ] Carrito persiste al recargar
- [ ] Checkout genera código de pedido
- [ ] Botón WhatsApp lleva al número correcto
- [ ] Panel cajero visible solo para cajero/admin
- [ ] Panel admin visible solo para admin

### GitHub
- [ ] Repositorio creado (puede ser público o privado)
- [ ] `.gitignore` incluido (no subir `.env`, `node_modules`)
- [ ] README.md completo y claro
- [ ] Commits organizados por fases

---

## 📝 Notas Técnicas

### ¿Por qué el backend calcula el total?
El total NO viene del frontend. El servidor verifica cada producto en la base de datos y calcula el precio real. Esto previene que un cliente malicioso modifique los precios.

### ¿Cómo se guarda el comprobante de pago?
El cliente sube una imagen al hacer checkout. El sistema intenta subirla a **Supabase Storage** (bucket `order-proofs`, público). Si la subida falla, el pedido se crea igualmente y el cajero puede solicitar el comprobante por WhatsApp. Si tiene éxito, la URL pública queda guardada en `orders.proof_url` y el cajero puede verla directamente en el panel.

### ¿Cómo funciona el código de pedido?
Un trigger `BEFORE INSERT` en la tabla `orders` genera automáticamente un código único con formato `ARO-YYYYMMDD-XXXX` (fecha + número aleatorio de 4 dígitos). No es secuencial para evitar que se adivinen pedidos de otros.

### ¿Cómo funciona el RLS con el backend?
El backend usa la `SERVICE_ROLE_KEY`, que bypasea el RLS. Esto es correcto porque el backend ya verifica los permisos mediante `requireAuth` y `requireRole`. El RLS protege en caso de acceso directo a Supabase.
