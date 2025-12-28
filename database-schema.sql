-- ========================================
-- Time Table Generator Database Schema
-- Safe version with IF NOT EXISTS
-- ========================================

-- Function to automatically create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_profiles (user_id, full_name, email, is_onboarded)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        NEW.email,
        FALSE
    )
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger on auth.users
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 1. USER PROFILES TABLE
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    is_onboarded BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. COLLEGE SETTINGS TABLE
CREATE TABLE IF NOT EXISTS college_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
    college_name TEXT NOT NULL,
    college_start_time TIME NOT NULL DEFAULT '08:30',
    college_end_time TIME NOT NULL DEFAULT '17:00',
    default_class_duration INTEGER NOT NULL DEFAULT 55,
    lunch_start_time TIME NOT NULL DEFAULT '12:30',
    lunch_end_time TIME NOT NULL DEFAULT '13:30',
    breaks JSONB DEFAULT '[]'::jsonb,
    working_days JSONB DEFAULT '["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. LECTURERS TABLE
CREATE TABLE IF NOT EXISTS lecturers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    full_name TEXT NOT NULL,
    short_name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    department TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. CLASSROOMS TABLE
CREATE TABLE IF NOT EXISTS classrooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    capacity INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. SUBJECTS TABLE
CREATE TABLE IF NOT EXISTS subjects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    code TEXT,
    is_practical BOOLEAN DEFAULT FALSE,
    no_lecturer_required BOOLEAN DEFAULT FALSE,
    color TEXT DEFAULT '#3B82F6',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. TIMETABLES TABLE
CREATE TABLE IF NOT EXISTS timetables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    class_name TEXT NOT NULL,
    semester TEXT NOT NULL,
    year TEXT NOT NULL,
    section TEXT,
    title TEXT,
    status TEXT DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'done')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. TIMETABLE SLOTS TABLE
CREATE TABLE IF NOT EXISTS timetable_slots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timetable_id UUID REFERENCES timetables(id) ON DELETE CASCADE NOT NULL,
    day_of_week TEXT NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    slot_type TEXT NOT NULL CHECK (slot_type IN ('class', 'break', 'lunch', 'free', 'cultural')),
    subject_id UUID REFERENCES subjects(id) ON DELETE SET NULL,
    lecturer_id UUID REFERENCES lecturers(id) ON DELETE SET NULL,
    classroom_id UUID REFERENCES classrooms(id) ON DELETE SET NULL,
    is_practical BOOLEAN DEFAULT FALSE,
    slot_order INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. LAB BATCHES TABLE
CREATE TABLE IF NOT EXISTS lab_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timetable_slot_id UUID REFERENCES timetable_slots(id) ON DELETE CASCADE NOT NULL,
    batch_name TEXT NOT NULL,
    subject_id UUID REFERENCES subjects(id) ON DELETE SET NULL,
    lecturer_id UUID REFERENCES lecturers(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- INDEXES
-- ========================================
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_college_settings_user_id ON college_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_lecturers_user_id ON lecturers(user_id);
CREATE INDEX IF NOT EXISTS idx_classrooms_user_id ON classrooms(user_id);
CREATE INDEX IF NOT EXISTS idx_subjects_user_id ON subjects(user_id);
CREATE INDEX IF NOT EXISTS idx_timetables_user_id ON timetables(user_id);
CREATE INDEX IF NOT EXISTS idx_timetable_slots_timetable_id ON timetable_slots(timetable_id);
CREATE INDEX IF NOT EXISTS idx_timetable_slots_day ON timetable_slots(day_of_week);
CREATE INDEX IF NOT EXISTS idx_timetable_slots_lecturer ON timetable_slots(lecturer_id);
CREATE INDEX IF NOT EXISTS idx_lab_batches_slot_id ON lab_batches(timetable_slot_id);
CREATE INDEX IF NOT EXISTS idx_lab_batches_lecturer ON lab_batches(lecturer_id);

-- ========================================
-- ENABLE ROW LEVEL SECURITY
-- ========================================
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE college_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE lecturers ENABLE ROW LEVEL SECURITY;
ALTER TABLE classrooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE timetables ENABLE ROW LEVEL SECURITY;
ALTER TABLE timetable_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE lab_batches ENABLE ROW LEVEL SECURITY;

-- ========================================
-- DROP EXISTING POLICIES (safe)
-- ========================================
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;

DROP POLICY IF EXISTS "Users can view own settings" ON college_settings;
DROP POLICY IF EXISTS "Users can insert own settings" ON college_settings;
DROP POLICY IF EXISTS "Users can update own settings" ON college_settings;

DROP POLICY IF EXISTS "Users can view own lecturers" ON lecturers;
DROP POLICY IF EXISTS "Users can insert own lecturers" ON lecturers;
DROP POLICY IF EXISTS "Users can update own lecturers" ON lecturers;
DROP POLICY IF EXISTS "Users can delete own lecturers" ON lecturers;

DROP POLICY IF EXISTS "Users can view own classrooms" ON classrooms;
DROP POLICY IF EXISTS "Users can insert own classrooms" ON classrooms;
DROP POLICY IF EXISTS "Users can update own classrooms" ON classrooms;
DROP POLICY IF EXISTS "Users can delete own classrooms" ON classrooms;

DROP POLICY IF EXISTS "Users can view own subjects" ON subjects;
DROP POLICY IF EXISTS "Users can insert own subjects" ON subjects;
DROP POLICY IF EXISTS "Users can update own subjects" ON subjects;
DROP POLICY IF EXISTS "Users can delete own subjects" ON subjects;

DROP POLICY IF EXISTS "Users can view own timetables" ON timetables;
DROP POLICY IF EXISTS "Users can insert own timetables" ON timetables;
DROP POLICY IF EXISTS "Users can update own timetables" ON timetables;
DROP POLICY IF EXISTS "Users can delete own timetables" ON timetables;

DROP POLICY IF EXISTS "Users can view own timetable slots" ON timetable_slots;
DROP POLICY IF EXISTS "Users can insert own timetable slots" ON timetable_slots;
DROP POLICY IF EXISTS "Users can update own timetable slots" ON timetable_slots;
DROP POLICY IF EXISTS "Users can delete own timetable slots" ON timetable_slots;

DROP POLICY IF EXISTS "Users can view own lab batches" ON lab_batches;
DROP POLICY IF EXISTS "Users can insert own lab batches" ON lab_batches;
DROP POLICY IF EXISTS "Users can update own lab batches" ON lab_batches;
DROP POLICY IF EXISTS "Users can delete own lab batches" ON lab_batches;

-- ========================================
-- CREATE RLS POLICIES
-- ========================================

-- User Profiles
CREATE POLICY "Users can view own profile" ON user_profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON user_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON user_profiles FOR UPDATE USING (auth.uid() = user_id);

-- College Settings
CREATE POLICY "Users can view own settings" ON college_settings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own settings" ON college_settings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own settings" ON college_settings FOR UPDATE USING (auth.uid() = user_id);

-- Lecturers
CREATE POLICY "Users can view own lecturers" ON lecturers FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own lecturers" ON lecturers FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own lecturers" ON lecturers FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own lecturers" ON lecturers FOR DELETE USING (auth.uid() = user_id);

-- Classrooms
CREATE POLICY "Users can view own classrooms" ON classrooms FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own classrooms" ON classrooms FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own classrooms" ON classrooms FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own classrooms" ON classrooms FOR DELETE USING (auth.uid() = user_id);

-- Subjects
CREATE POLICY "Users can view own subjects" ON subjects FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own subjects" ON subjects FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own subjects" ON subjects FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own subjects" ON subjects FOR DELETE USING (auth.uid() = user_id);

-- Timetables
CREATE POLICY "Users can view own timetables" ON timetables FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own timetables" ON timetables FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own timetables" ON timetables FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own timetables" ON timetables FOR DELETE USING (auth.uid() = user_id);

-- Timetable Slots
CREATE POLICY "Users can view own timetable slots" ON timetable_slots FOR SELECT
    USING (EXISTS (SELECT 1 FROM timetables WHERE timetables.id = timetable_slots.timetable_id AND timetables.user_id = auth.uid()));
CREATE POLICY "Users can insert own timetable slots" ON timetable_slots FOR INSERT
    WITH CHECK (EXISTS (SELECT 1 FROM timetables WHERE timetables.id = timetable_slots.timetable_id AND timetables.user_id = auth.uid()));
CREATE POLICY "Users can update own timetable slots" ON timetable_slots FOR UPDATE
    USING (EXISTS (SELECT 1 FROM timetables WHERE timetables.id = timetable_slots.timetable_id AND timetables.user_id = auth.uid()));
CREATE POLICY "Users can delete own timetable slots" ON timetable_slots FOR DELETE
    USING (EXISTS (SELECT 1 FROM timetables WHERE timetables.id = timetable_slots.timetable_id AND timetables.user_id = auth.uid()));

-- Lab Batches
CREATE POLICY "Users can view own lab batches" ON lab_batches FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM timetable_slots ts
        JOIN timetables t ON t.id = ts.timetable_id
        WHERE ts.id = lab_batches.timetable_slot_id AND t.user_id = auth.uid()
    ));
CREATE POLICY "Users can insert own lab batches" ON lab_batches FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM timetable_slots ts
        JOIN timetables t ON t.id = ts.timetable_id
        WHERE ts.id = lab_batches.timetable_slot_id AND t.user_id = auth.uid()
    ));
CREATE POLICY "Users can update own lab batches" ON lab_batches FOR UPDATE
    USING (EXISTS (
        SELECT 1 FROM timetable_slots ts
        JOIN timetables t ON t.id = ts.timetable_id
        WHERE ts.id = lab_batches.timetable_slot_id AND t.user_id = auth.uid()
    ));
CREATE POLICY "Users can delete own lab batches" ON lab_batches FOR DELETE
    USING (EXISTS (
        SELECT 1 FROM timetable_slots ts
        JOIN timetables t ON t.id = ts.timetable_id
        WHERE ts.id = lab_batches.timetable_slot_id AND t.user_id = auth.uid()
    ));

-- ========================================
-- TRIGGER FUNCTION
-- ========================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- TRIGGERS
-- ========================================
DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_college_settings_updated_at ON college_settings;
CREATE TRIGGER update_college_settings_updated_at BEFORE UPDATE ON college_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_lecturers_updated_at ON lecturers;
CREATE TRIGGER update_lecturers_updated_at BEFORE UPDATE ON lecturers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_classrooms_updated_at ON classrooms;
CREATE TRIGGER update_classrooms_updated_at BEFORE UPDATE ON classrooms FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_subjects_updated_at ON subjects;
CREATE TRIGGER update_subjects_updated_at BEFORE UPDATE ON subjects FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_timetables_updated_at ON timetables;
CREATE TRIGGER update_timetables_updated_at BEFORE UPDATE ON timetables FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_timetable_slots_updated_at ON timetable_slots;
CREATE TRIGGER update_timetable_slots_updated_at BEFORE UPDATE ON timetable_slots FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- SUCCESS
-- ========================================
SELECT 'Database schema created successfully!' as message;
