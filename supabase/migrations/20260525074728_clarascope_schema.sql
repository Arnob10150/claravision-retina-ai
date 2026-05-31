/*
  # ClaraScope Clinical Decision Support Schema

  ## Overview
  Complete schema for ClaraScope retinal disease diagnosis platform.

  ## New Tables
  - `profiles` - Extended user profiles with role, institution
  - `patients` - Patient records with coded identifiers
  - `scans` - Retinal scan records with diagnosis results
  - `scan_concepts` - Activated clinical concepts per scan
  - `reports` - Generated diagnostic reports
  - `reviews` - Clinician sign-off reviews on scans

  ## Security
  - RLS enabled on all tables
  - Authenticated users can read/write their own data
  - Role-based access patterns via profiles.role
*/

-- ============================================================
-- PROFILES (extends auth.users)
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT '',
  role text NOT NULL DEFAULT 'resident' CHECK (role IN ('ophthalmologist','optometrist','resident','researcher','admin')),
  institution text DEFAULT '',
  avatar_url text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- ============================================================
-- PATIENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS patients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_code text UNIQUE NOT NULL,
  age integer CHECK (age >= 0 AND age <= 130),
  gender text CHECK (gender IN ('male','female','other','unknown')),
  created_by uuid REFERENCES auth.users(id),
  institution text DEFAULT '',
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE patients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read patients"
  ON patients FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert patients"
  ON patients FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Authenticated users can update patients"
  ON patients FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

-- ============================================================
-- SCANS
-- ============================================================
CREATE TABLE IF NOT EXISTS scans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid REFERENCES patients(id) ON DELETE SET NULL,
  uploaded_by uuid REFERENCES auth.users(id),
  image_url text DEFAULT '',
  eye_side text CHECK (eye_side IN ('left','right','unknown')) DEFAULT 'unknown',
  predicted_class text NOT NULL DEFAULT '',
  confidence numeric(5,4) CHECK (confidence >= 0 AND confidence <= 1) DEFAULT 0,
  uncertainty_score numeric(5,4) CHECK (uncertainty_score >= 0 AND uncertainty_score <= 1) DEFAULT 0,
  uncertainty_level text CHECK (uncertainty_level IN ('low','medium','high')) DEFAULT 'low',
  all_probabilities jsonb DEFAULT '{}',
  referral_flag boolean DEFAULT false,
  status text CHECK (status IN ('pending','reviewed','signed_off')) DEFAULT 'pending',
  analysis_metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE scans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read scans"
  ON scans FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert scans"
  ON scans FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = uploaded_by);

CREATE POLICY "Authenticated users can update scans"
  ON scans FOR UPDATE
  TO authenticated
  USING (auth.uid() = uploaded_by)
  WITH CHECK (auth.uid() = uploaded_by);

-- ============================================================
-- SCAN CONCEPTS (activated clinical concepts per scan)
-- ============================================================
CREATE TABLE IF NOT EXISTS scan_concepts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_id uuid NOT NULL REFERENCES scans(id) ON DELETE CASCADE,
  concept_name text NOT NULL,
  confidence numeric(5,4) DEFAULT 0,
  description text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE scan_concepts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read scan concepts"
  ON scan_concepts FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert scan concepts"
  ON scan_concepts FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- ============================================================
-- REPORTS
-- ============================================================
CREATE TABLE IF NOT EXISTS reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_id uuid NOT NULL REFERENCES scans(id) ON DELETE CASCADE,
  generated_by uuid REFERENCES auth.users(id),
  report_data jsonb DEFAULT '{}',
  status text CHECK (status IN ('draft','final')) DEFAULT 'draft',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read reports"
  ON reports FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert reports"
  ON reports FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = generated_by);

CREATE POLICY "Authenticated users can update reports"
  ON reports FOR UPDATE
  TO authenticated
  USING (auth.uid() = generated_by)
  WITH CHECK (auth.uid() = generated_by);

-- ============================================================
-- REVIEWS (sign-off by ophthalmologist)
-- ============================================================
CREATE TABLE IF NOT EXISTS reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_id uuid NOT NULL REFERENCES scans(id) ON DELETE CASCADE,
  reviewer_id uuid NOT NULL REFERENCES auth.users(id),
  agreement text CHECK (agreement IN ('agree','disagree')) NOT NULL,
  final_diagnosis text DEFAULT '',
  notes text DEFAULT '',
  signed_off_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read reviews"
  ON reviews FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert reviews"
  ON reviews FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = reviewer_id);

-- ============================================================
-- TRIGGER: auto-create profile on signup
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role, institution)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', ''),
    COALESCE(new.raw_user_meta_data->>'role', 'resident'),
    COALESCE(new.raw_user_meta_data->>'institution', '')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_scans_patient_id ON scans(patient_id);
CREATE INDEX IF NOT EXISTS idx_scans_uploaded_by ON scans(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_scans_status ON scans(status);
CREATE INDEX IF NOT EXISTS idx_scans_uncertainty_level ON scans(uncertainty_level);
CREATE INDEX IF NOT EXISTS idx_scans_created_at ON scans(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_scan_concepts_scan_id ON scan_concepts(scan_id);
CREATE INDEX IF NOT EXISTS idx_reviews_scan_id ON reviews(scan_id);
CREATE INDEX IF NOT EXISTS idx_reports_scan_id ON reports(scan_id);
