-- ============================================================
-- سياسات التخزين لـ bucket المحتوى (content) في Supabase
-- شغّل هذا الملف في Supabase SQL Editor لتمكين الأدمن من رفع صور الخدمات والمعرض
-- ============================================================

-- تأكيد وجود الـ bucket وجعله عامًا للقراءة
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'content',
  'content',
  true,
  10485760, -- 10MB
  ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];

-- 1. السماح للجميع (زوار ومسجلين) بقراءة وتصفح الصور العامة
DROP POLICY IF EXISTS "Public Read Content Images" ON storage.objects;
CREATE POLICY "Public Read Content Images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'content');

-- 2. السماح للأدمن فقط برفع صور المحتوى
DROP POLICY IF EXISTS "Admin Upload Content Images" ON storage.objects;
CREATE POLICY "Admin Upload Content Images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'content' AND (SELECT is_admin()));

-- 3. السماح للأدمن بتحديث صور المحتوى
DROP POLICY IF EXISTS "Admin Update Content Images" ON storage.objects;
CREATE POLICY "Admin Update Content Images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'content' AND (SELECT is_admin()))
WITH CHECK (bucket_id = 'content' AND (SELECT is_admin()));

-- 4. السماح للأدمن بحذف صور المحتوى
DROP POLICY IF EXISTS "Admin Delete Content Images" ON storage.objects;
CREATE POLICY "Admin Delete Content Images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'content' AND (SELECT is_admin()));
