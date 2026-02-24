-- ============================================================
-- Migración: Comprobante de pago en órdenes
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- PASO 1: Agregar columna proof_url a la tabla orders
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS proof_url TEXT;

-- ============================================================
-- PASO 2: Crear el bucket de Storage
-- ============================================================
-- OPCIÓN A (recomendada): Crear manualmente en el Dashboard
--   → Supabase Dashboard → Storage → New bucket
--   → Name: order-proofs
--   → Marcar "Public bucket" ✓
--   → File size limit: 5 MB
--   → Save
--
-- OPCIÓN B: Via SQL (ejecutar SOLO si la opción A no funciona)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'order-proofs',
  'order-proofs',
  true,
  5242880,
  ARRAY['image/jpeg','image/jpg','image/png','image/webp','image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- PASO 3: Política de Storage — subida para usuarios autenticados
-- (EJECUTAR SIEMPRE, independientemente de cómo creaste el bucket)
-- ============================================================

-- IF NOT EXISTS no existe en CREATE POLICY (PostgreSQL ≤ 16)
-- Por eso primero hacemos DROP y luego CREATE
DROP POLICY IF EXISTS "authenticated_can_upload" ON storage.objects;

CREATE POLICY "authenticated_can_upload"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'order-proofs'
    AND auth.role() = 'authenticated'
  );
