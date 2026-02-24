-- ============================================================
-- FIX: RLS Recursion en tabla profiles
-- Ejecutar en: Supabase → SQL Editor → New query
-- ============================================================
-- Problema: Las políticas que hacen EXISTS (SELECT 1 FROM profiles WHERE ...)
-- dentro de una política de la tabla profiles causan recursión infinita → 500.
-- Solución: crear una función SECURITY DEFINER que lee el rol SIN activar RLS.
-- ============================================================

-- PASO 1: Función helper que lee el rol del usuario actual (sin activar RLS)
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS TEXT AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- PASO 2: Reemplazar políticas recursivas en profiles
DROP POLICY IF EXISTS "profile_admin_select_all" ON profiles;
DROP POLICY IF EXISTS "profile_admin_update_all" ON profiles;

CREATE POLICY "profile_admin_select_all" ON profiles
  FOR SELECT USING (get_my_role() = 'admin');

CREATE POLICY "profile_admin_update_all" ON profiles
  FOR UPDATE USING (get_my_role() = 'admin');

-- PASO 3: Reemplazar políticas en categories
DROP POLICY IF EXISTS "categories_admin_all" ON categories;

CREATE POLICY "categories_admin_all" ON categories
  FOR ALL USING (get_my_role() = 'admin');

-- PASO 4: Reemplazar políticas en products
DROP POLICY IF EXISTS "products_admin_read_all" ON products;
DROP POLICY IF EXISTS "products_admin_write" ON products;

CREATE POLICY "products_admin_read_all" ON products
  FOR SELECT USING (get_my_role() = 'admin');

CREATE POLICY "products_admin_write" ON products
  FOR ALL USING (get_my_role() = 'admin');

-- PASO 5: Reemplazar políticas en orders
DROP POLICY IF EXISTS "orders_cashier_admin_read" ON orders;
DROP POLICY IF EXISTS "orders_cashier_admin_update" ON orders;

CREATE POLICY "orders_cashier_admin_read" ON orders
  FOR SELECT USING (get_my_role() IN ('cashier', 'admin'));

CREATE POLICY "orders_cashier_admin_update" ON orders
  FOR UPDATE USING (get_my_role() IN ('cashier', 'admin'));

-- PASO 6: Reemplazar políticas en order_items
DROP POLICY IF EXISTS "order_items_cashier_admin_read" ON order_items;

CREATE POLICY "order_items_cashier_admin_read" ON order_items
  FOR SELECT USING (get_my_role() IN ('cashier', 'admin'));

-- PASO 7: Reemplazar políticas en payments
DROP POLICY IF EXISTS "payments_cashier_admin_all" ON payments;

CREATE POLICY "payments_cashier_admin_all" ON payments
  FOR ALL USING (get_my_role() IN ('cashier', 'admin'));

-- PASO 8: Reemplazar políticas en settings
DROP POLICY IF EXISTS "settings_admin_write" ON settings;

CREATE POLICY "settings_admin_write" ON settings
  FOR ALL USING (get_my_role() = 'admin');

-- PASO 9: Reemplazar políticas en cash_register
DROP POLICY IF EXISTS "cash_register_cashier_admin" ON cash_register;

CREATE POLICY "cash_register_cashier_admin" ON cash_register
  FOR ALL USING (get_my_role() IN ('cashier', 'admin'));

-- ============================================================
-- VERIFICACIÓN: ejecutar estas consultas para confirmar que funciona
-- ============================================================
-- SELECT get_my_role();     -- debería retornar tu rol actual
-- SELECT * FROM profiles LIMIT 5;  -- no debería dar 500 ahora
