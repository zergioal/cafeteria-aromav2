-- ============================================================
-- CAFETERÍA AROMA - Schema completo de Supabase/PostgreSQL
-- Ejecutar en el SQL Editor de Supabase (proyecto cloud)
-- ============================================================

-- Extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- TABLA: profiles (extendida sobre auth.users)
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
  id        UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  phone     TEXT,
  role      TEXT NOT NULL DEFAULT 'client'
              CHECK (role IN ('admin', 'cashier', 'client')),
  active    BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLA: categories
-- ============================================================
CREATE TABLE IF NOT EXISTS categories (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name       TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLA: products
-- ============================================================
CREATE TABLE IF NOT EXISTS products (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  name        TEXT NOT NULL,
  description TEXT,
  price       NUMERIC(10,2) NOT NULL CHECK (price >= 0),
  cost        NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (cost >= 0),
  active      BOOLEAN NOT NULL DEFAULT true,
  image_url   TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLA: orders
-- ============================================================
CREATE TABLE IF NOT EXISTS orders (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code             TEXT NOT NULL UNIQUE,           -- Se asigna vía trigger
  customer_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  customer_name    TEXT NOT NULL,
  customer_phone   TEXT NOT NULL DEFAULT '',
  delivery_address TEXT,
  notes            TEXT,
  status           TEXT NOT NULL DEFAULT 'pending_payment'
                     CHECK (status IN (
                       'pending_payment','paid','preparing',
                       'delivering','delivered','canceled'
                     )),
  channel          TEXT NOT NULL DEFAULT 'online'
                     CHECK (channel IN ('online','store')),
  payment_method   TEXT NOT NULL DEFAULT 'qr'
                     CHECK (payment_method IN ('qr','cash')),
  total            NUMERIC(10,2) NOT NULL CHECK (total >= 0),
  delivery_cost    NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLA: order_items
-- ============================================================
CREATE TABLE IF NOT EXISTS order_items (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id              UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id            UUID REFERENCES products(id) ON DELETE SET NULL,
  product_name_snapshot TEXT NOT NULL,
  unit_price_snapshot   NUMERIC(10,2) NOT NULL,
  unit_cost_snapshot    NUMERIC(10,2) NOT NULL DEFAULT 0,
  quantity              INTEGER NOT NULL CHECK (quantity > 0),
  subtotal              NUMERIC(10,2) NOT NULL,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLA: payments (SIN imagen de comprobante - solo referencia texto)
-- ============================================================
CREATE TABLE IF NOT EXISTS payments (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id       UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  method         TEXT NOT NULL CHECK (method IN ('qr','cash')),
  verified_by    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  verified_at    TIMESTAMPTZ,
  reference_text TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLA: settings (configuración del negocio)
-- ============================================================
CREATE TABLE IF NOT EXISTS settings (
  key        TEXT PRIMARY KEY,
  value      TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLA: cash_register (OPCIONAL - caja diaria)
-- ============================================================
CREATE TABLE IF NOT EXISTS cash_register (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cashier_id   UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  opened_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closed_at    TIMESTAMPTZ,
  opening_cash NUMERIC(10,2) NOT NULL DEFAULT 0,
  closing_cash NUMERIC(10,2),
  notes        TEXT
);

-- ============================================================
-- ÍNDICES para rendimiento
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_products_category_id  ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_active        ON products(active);
CREATE INDEX IF NOT EXISTS idx_orders_status          ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_channel         ON orders(channel);
CREATE INDEX IF NOT EXISTS idx_orders_customer        ON orders(customer_user_id);
CREATE INDEX IF NOT EXISTS idx_orders_created_at      ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id   ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_order_id      ON payments(order_id);

-- ============================================================
-- FUNCIÓN + TRIGGER: generar código de pedido automáticamente
-- ============================================================
CREATE OR REPLACE FUNCTION set_order_code()
RETURNS TRIGGER AS $$
DECLARE
  new_code    TEXT;
  exists_count INTEGER;
BEGIN
  IF NEW.code IS NULL OR NEW.code = '' THEN
    LOOP
      new_code := 'ARO-'
        || TO_CHAR(NOW() AT TIME ZONE 'America/La_Paz', 'YYYYMMDD')
        || '-'
        || LPAD(FLOOR(RANDOM() * 9000 + 1000)::TEXT, 4, '0');

      SELECT COUNT(*) INTO exists_count
        FROM orders WHERE code = new_code;

      EXIT WHEN exists_count = 0;
    END LOOP;
    NEW.code := new_code;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER trg_set_order_code
  BEFORE INSERT ON orders
  FOR EACH ROW EXECUTE FUNCTION set_order_code();

-- ============================================================
-- FUNCIÓN + TRIGGER: crear perfil automáticamente al registrarse
-- ============================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, full_name, phone, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Usuario'),
    NEW.raw_user_meta_data->>'phone',
    COALESCE(NEW.raw_user_meta_data->>'role', 'client')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER trg_on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- RLS: habilitar en todas las tablas
-- ============================================================
ALTER TABLE profiles      ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories    ENABLE ROW LEVEL SECURITY;
ALTER TABLE products      ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders        ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items   ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments      ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings      ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_register ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- POLÍTICAS RLS: profiles
-- ============================================================
-- El usuario ve/edita su propio perfil
CREATE POLICY "profile_select_own" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "profile_update_own" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Admin ve y actualiza todos los perfiles
CREATE POLICY "profile_admin_select_all" ON profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

CREATE POLICY "profile_admin_update_all" ON profiles
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- ============================================================
-- POLÍTICAS RLS: categories (lectura pública, escritura admin)
-- ============================================================
CREATE POLICY "categories_public_read" ON categories
  FOR SELECT USING (true);

CREATE POLICY "categories_admin_all" ON categories
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- ============================================================
-- POLÍTICAS RLS: products
-- ============================================================
-- Cualquiera ve productos activos
CREATE POLICY "products_public_read_active" ON products
  FOR SELECT USING (active = true);

-- Admin ve todos (activos e inactivos)
CREATE POLICY "products_admin_read_all" ON products
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- Solo admin puede crear/editar/eliminar productos
CREATE POLICY "products_admin_write" ON products
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- ============================================================
-- POLÍTICAS RLS: orders
-- ============================================================
-- Cliente ve solo sus propias órdenes
CREATE POLICY "orders_client_read_own" ON orders
  FOR SELECT USING (auth.uid() = customer_user_id);

-- Cualquier usuario autenticado puede crear una orden
CREATE POLICY "orders_insert_authenticated" ON orders
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Cajero y admin ven todas las órdenes
CREATE POLICY "orders_cashier_admin_read" ON orders
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role IN ('cashier','admin')
    )
  );

-- Cajero y admin actualizan órdenes
CREATE POLICY "orders_cashier_admin_update" ON orders
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role IN ('cashier','admin')
    )
  );

-- ============================================================
-- POLÍTICAS RLS: order_items
-- ============================================================
-- Cliente ve items de sus propias órdenes
CREATE POLICY "order_items_client_read" ON order_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM orders o
      WHERE o.id = order_id AND o.customer_user_id = auth.uid()
    )
  );

-- Cajero/admin ven todos
CREATE POLICY "order_items_cashier_admin_read" ON order_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role IN ('cashier','admin')
    )
  );

-- Insertar items junto a la orden (backend usa service role, fronted no necesita)
CREATE POLICY "order_items_insert" ON order_items
  FOR INSERT WITH CHECK (true);

-- ============================================================
-- POLÍTICAS RLS: payments (solo cajero/admin)
-- ============================================================
CREATE POLICY "payments_cashier_admin_all" ON payments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role IN ('cashier','admin')
    )
  );

-- ============================================================
-- POLÍTICAS RLS: settings
-- ============================================================
CREATE POLICY "settings_public_read" ON settings
  FOR SELECT USING (true);

CREATE POLICY "settings_admin_write" ON settings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- ============================================================
-- POLÍTICAS RLS: cash_register
-- ============================================================
CREATE POLICY "cash_register_cashier_admin" ON cash_register
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role IN ('cashier','admin')
    )
  );

-- ============================================================
-- DATOS INICIALES: settings
-- ============================================================
INSERT INTO settings (key, value) VALUES
  ('whatsapp_number',  '+59170000000'),
  ('business_hours',   'L-V: 7:00-21:00 | Sáb: 8:00-22:00 | Dom: 9:00-18:00'),
  ('business_address', 'Av. Ballivián, entre Heroínas y Jordán, Cochabamba'),
  ('qr_info',          'Tigo Money: 70000000 | QR BNB disponible en tienda'),
  ('delivery_note',    'Delivery gratis en pedidos mayores a Bs 100')
ON CONFLICT (key) DO NOTHING;

-- ============================================================
-- DATOS INICIALES: categories
-- ============================================================
INSERT INTO categories (name) VALUES
  ('Cafés'),
  ('Tés e Infusiones'),
  ('Jugos y Fríos'),
  ('Postres'),
  ('Desayunos')
ON CONFLICT (name) DO NOTHING;

-- ============================================================
-- DATOS INICIALES: products
-- ============================================================
DO $$
DECLARE
  cat_cafes       UUID;
  cat_tes         UUID;
  cat_jugos       UUID;
  cat_postres     UUID;
  cat_desayunos   UUID;
BEGIN
  SELECT id INTO cat_cafes     FROM categories WHERE name = 'Cafés';
  SELECT id INTO cat_tes       FROM categories WHERE name = 'Tés e Infusiones';
  SELECT id INTO cat_jugos     FROM categories WHERE name = 'Jugos y Fríos';
  SELECT id INTO cat_postres   FROM categories WHERE name = 'Postres';
  SELECT id INTO cat_desayunos FROM categories WHERE name = 'Desayunos';

  INSERT INTO products (category_id, name, description, price, cost, active) VALUES
    (cat_cafes,     'Café Americano',      'Espresso suave con agua caliente',               15.00,  5.00, true),
    (cat_cafes,     'Café con Leche',      'Espresso con leche vaporizada',                  18.00,  6.00, true),
    (cat_cafes,     'Cappuccino',          'Espresso con leche y espuma cremosa',            20.00,  7.00, true),
    (cat_cafes,     'Café Frappé',         'Café helado batido con leche y crema',           25.00,  9.00, true),
    (cat_cafes,     'Café Mocha',          'Espresso con chocolate y leche vaporizada',      22.00,  8.00, true),
    (cat_tes,       'Té de Manzanilla',    'Infusión relajante de manzanilla',               12.00,  3.00, true),
    (cat_tes,       'Té Verde',            'Té verde antioxidante con limón',                12.00,  3.00, true),
    (cat_tes,       'Mate de Coca',        'Infusión tradicional boliviana',                 10.00,  2.50, true),
    (cat_jugos,     'Jugo de Naranja',     'Jugo natural de naranja exprimida',              16.00,  6.00, true),
    (cat_jugos,     'Jugo de Maracuyá',    'Jugo natural de maracuyá con azúcar',            16.00,  6.00, true),
    (cat_jugos,     'Batido de Fresa',     'Batido con fresas frescas y leche',              20.00,  8.00, true),
    (cat_postres,   'Brownie de Chocolate','Brownie casero con nueces y salsa de chocolate', 22.00,  8.00, true),
    (cat_postres,   'Cheesecake',          'Cheesecake de fresa con base de galleta',        28.00, 10.00, true),
    (cat_postres,   'Empanada de Queso',   'Empanada horneada rellena de queso',             12.00,  4.00, true),
    (cat_desayunos, 'Desayuno Completo',   'Café o té + tostadas + mermelada + fruta',       45.00, 18.00, true),
    (cat_desayunos, 'Tostadas con Queso',  'Pan tostado con mantequilla y queso',            20.00,  7.00, true),
    (cat_desayunos, 'Granola con Yogur',   'Granola artesanal con yogur natural y frutas',   30.00, 11.00, true);
END $$;
