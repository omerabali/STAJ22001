-- Enable Row Level Security on cv_analyses
ALTER TABLE cv_analyses ENABLE ROW LEVEL SECURITY;

-- Drop policy if exists
DROP POLICY IF EXISTS "Users can only access their own analyses" ON cv_analyses;

-- Kullanıcılar yalnızca kendi CV'lerine ait analizleri görebilir/düzenleyebilir
CREATE POLICY "Users can only access their own analyses" ON cv_analyses
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM cvs
      WHERE cv_analyses."cvId" = cvs.id
        AND cvs."userId" = auth.uid()::text
    )
  );

-- Admin'ler tüm analizlere erişebilir (service_role zaten bypass eder)
-- Not: Backend API service_role ile bağlandığı için admin API çalışmaya devam eder.

-- cost_logs tablosu için de RLS ekle
ALTER TABLE cost_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Only service role can access cost_logs" ON cost_logs;

-- cost_logs yalnızca service_role tarafından erişilebilir (backend)
-- Normal kullanıcılar bu tabloya erişemez
CREATE POLICY "Only service role can access cost_logs" ON cost_logs
  FOR ALL
  USING (false);
