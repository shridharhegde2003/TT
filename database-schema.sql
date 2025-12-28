-- ========================================
-- Time Table Generator Database Schema
-- Complete Rebuild for Enhanced Features
-- ========================================

-- Drop existing tables if they exist (in reverse dependency order)
DROP TABLE IF EXISTS timetable_slots CASCADE;
DROP TABLE IF EXISTS lab_batches CASCADE;
DROP TABLE IF EXISTS timetables CASCADE;
DROP TABLE IF EXISTS subjects CASCADE;
DROP TABLE IF EXISTS classrooms CASCADE;
DROP TABLE IF EXISTS lecturers CASCADE;
DROP TABLE IF EXISTS college_settings CASCADE;
DROP TABLE IF EXISTS user_profiles CASCADE;

-- Drop existing triggers
DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;
DROP TRIGGER IF EXISTS update_college_settings_updated_at ON college_settings;
DROP TRIGGER IF EXISTS update_lecturers_updated_at ON lecturers;
DROP TRIGGER IF EXISTS update_classrooms_updated_at ON classrooms;
DROP TRIGGER IF EXISTS update_subjects_updated_at ON subjects;
DROP TRIGGER IF EXISTS update_timetables_updated_at ON timetables;
DROP TRIGGER IF EXISTS update_timetable_slots_updated_at ON timetable_slots;

-- Drop existing functions
DROP FUNCTION IF EXISTS update_updated_at_column();

-- ========================================
-- 1. USER PROFILES TABLE
-- Stores user information beyond auth
-- ========================================
CREATE TABLE user_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    is_onboarded BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- 2. COLLEGE SETTINGS TABLE
-- One-time college configuration
-- ========================================
CREATE TABLE college_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
    college_name TEXT NOT NULL,
    college_start_time TIME NOT NULL DEFAULT '08:30',
    college_end_time TIME NOT NULL DEFAULT '17:00',
    default_class_duration INTEGER NOT NULL DEFAULT 55, -- in minutes
    lunch_start_time TIME NOT NULL DEFAULT '12:30',
    lunch_end_time TIME NOT NULL DEFAULT '13:30',
    breaks JSONB DEFAULT '[]'::jsonb, -- Array of {name, start_time, end_time, duration}
    working_days JSONB DEFAULT '["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- 3. LECTURERS TABLE
-- Faculty/Teacher management
-- ========================================
CREATE TABLE lecturers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    full_name TEXT NOT NULL,
    short_name TEXT NOT NULL, -- e.g., RG for Ramesh Gupta
    email TEXT,
    phone TEXT,
    department TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- 4. CLASSROOMS TABLE
-- Rooms and Labs management (no separate categories)
-- ========================================
CREATE TABLE classrooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL, -- e.g., "Room 101", "Lab A", "Seminar Hall"
    capacity INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- 5. SUBJECTS TABLE
-- Subject/Course master data
-- ========================================
CREATE TABLE subjects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    code TEXT,
    is_practical BOOLEAN DEFAULT FALSE,
    color TEXT DEFAULT '#3B82F6',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- 6. TIMETABLES TABLE
-- Individual timetable configurations
-- ========================================
CREATE TABLE timetables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    class_name TEXT NOT NULL, -- e.g., "MCA", "B.Tech CSE"
    semester TEXT NOT NULL, -- e.g., "III", "IV"
    year TEXT NOT NULL, -- e.g., "2025"
    section TEXT, -- e.g., "A", "B" (optional)
    title TEXT, -- Auto-generated or custom title
    status TEXT DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'done')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- 7. TIMETABLE SLOTS TABLE
-- Individual class slots in a timetable
-- ========================================
CREATE TABLE timetable_slots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timetable_id UUID REFERENCES timetables(id) ON DELETE CASCADE NOT NULL,
    day_of_week TEXT NOT NULL, -- Monday, Tuesday, etc.
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    slot_type TEXT NOT NULL CHECK (slot_type IN ('class', 'break', 'lunch')),
    
    -- For class/lecture slots
    subject_id UUID REFERENCES subjects(id) ON DELETE SET NULL,
    lecturer_id UUID REFERENCES lecturers(id) ON DELETE SET NULL,
    classroom_id UUID REFERENCES classrooms(id) ON DELETE SET NULL,
    
    -- For practical/lab slots
    is_practical BOOLEAN DEFAULT FALSE,
    
    -- Metadata
    slot_order INTEGER NOT NULL, -- Order in the day
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- 8. LAB BATCHES TABLE
-- For practical slots with multiple batches
-- ========================================
CREATE TABLE lab_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timetable_slot_id UUID REFERENCES timetable_slots(id) ON DELETE CASCADE NOT NULL,
    batch_name TEXT NOT NULL, -- e.g., "Batch 1", "Batch A"
    subject_id UUID REFERENCES subjects(id) ON DELETE SET NULL,
    lecturer_id UUID REFERENCES lecturers(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- INDEXES FOR PERFORMANCE
-- ========================================
CREATE INDEX idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX idx_college_settings_user_id ON college_settings(user_id);
CREATE INDEX idx_lecturers_user_id ON lecturers(user_id);
CREATE INDEX idx_classrooms_user_id ON classrooms(user_id);
CREATE INDEX idx_subjects_user_id ON subjects(user_id);
CREATE INDEX idx_timetables_user_id ON timetables(user_id);
CREATE INDEX idx_timetables_status ON timetables(status);
CREATE INDEX idx_timetable_slots_timetable_id ON timetable_slots(timetable_id);
CREATE INDEX idx_timetable_slots_day ON timetable_slots(day_of_week);
CREATE INDEX idx_timetable_slots_lecturer ON timetable_slots(lecturer_id);
CREATE INDEX idx_lab_batches_slot_id ON lab_batches(timetable_slot_id);
CREATE INDEX idx_lab_batches_lecturer ON lab_batches(lecturer_id);

-- ========================================
-- ROW LEVEL SECURITY
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
-- RLS POLICIES
-- ========================================

-- User Profiles Policies
CREATE POLICY "Users can view own profile" ON user_profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON user_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON user_profiles FOR UPDATE USING (auth.uid() = user_id);

-- College Settings Policies
CREATE POLICY "Users can view own settings" ON college_settings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own settings" ON college_settings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own settings" ON college_settings FOR UPDATE USING (auth.uid() = user_id);

-- Lecturers Policies
CREATE POLICY "Users can view own lecturers" ON lecturers FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own lecturers" ON lecturers FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own lecturers" ON lecturers FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own lecturers" ON lecturers FOR DELETE USING (auth.uid() = user_id);

-- Classrooms Policies
CREATE POLICY "Users can view own classrooms" ON classrooms FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own classrooms" ON classrooms FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own classrooms" ON classrooms FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own classrooms" ON classrooms FOR DELETE USING (auth.uid() = user_id);

-- Subjects Policies
CREATE POLICY "Users can view own subjects" ON subjects FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own subjects" ON subjects FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own subjects" ON subjects FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own subjects" ON subjects FOR DELETE USING (auth.uid() = user_id);

-- Timetables Policies
CREATE POLICY "Users can view own timetables" ON timetables FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own timetables" ON timetables FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own timetables" ON timetables FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own timetables" ON timetables FOR DELETE USING (auth.uid() = user_id);

-- Timetable Slots Policies (based on parent timetable ownership)
CREATE POLICY "Users can view own timetable slots" ON timetable_slots FOR SELECT
    USING (EXISTS (SELECT 1 FROM timetables WHERE timetables.id = timetable_slots.timetable_id AND timetables.user_id = auth.uid()));
CREATE POLICY "Users can insert own timetable slots" ON timetable_slots FOR INSERT
    WITH CHECK (EXISTS (SELECT 1 FROM timetables WHERE timetables.id = timetable_slots.timetable_id AND timetables.user_id = auth.uid()));
CREATE POLICY "Users can update own timetable slots" ON timetable_slots FOR UPDATE
    USING (EXISTS (SELECT 1 FROM timetables WHERE timetables.id = timetable_slots.timetable_id AND timetables.user_id = auth.uid()));
CREATE POLICY "Users can delete own timetable slots" ON timetable_slots FOR DELETE
    USING (EXISTS (SELECT 1 FROM timetables WHERE timetables.id = timetable_slots.timetable_id AND timetables.user_id = auth.uid()));

-- Lab Batches Policies (based on parent slot ownership)
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
-- TRIGGER FUNCTION FOR UPDATED_AT
-- ========================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- TRIGGERS FOR UPDATED_AT
-- ========================================
CREATE TRIGGER update_user_profiles_updated_at
    BEFORE UPDATE ON user_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_college_settings_updated_at
    BEFORE UPDATE ON college_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lecturers_updated_at
    BEFORE UPDATE ON lecturers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_classrooms_updated_at
    BEFORE UPDATE ON classrooms
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subjects_updated_at
    BEFORE UPDATE ON subjects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_timetables_updated_at
    BEFORE UPDATE ON timetables
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_timetable_slots_updated_at
    BEFORE UPDATE ON timetable_slots
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- HELPER FUNCTION: Check Lecturer Conflict
-- Returns TRUE if lecturer has conflict
-- ========================================
CREATE OR REPLACE FUNCTION check_lecturer_conflict(
    p_lecturer_id UUID,
    p_day_of_week TEXT,
    p_start_time TIME,
    p_end_time TIME,
    p_exclude_slot_id UUID DEFAULT NULL
)
RETURNS TABLE(
    has_conflict BOOLEAN,
    conflict_timetable TEXT,
    conflict_section TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        TRUE as has_conflict,
        t.class_name || ' ' || t.semester || ' Sem' as conflict_timetable,
        COALESCE(t.section, '') as conflict_section
    FROM timetable_slots ts
    JOIN timetables t ON t.id = ts.timetable_id
    WHERE ts.lecturer_id = p_lecturer_id
      AND ts.day_of_week = p_day_of_week
      AND ts.slot_type = 'class'
      AND (p_exclude_slot_id IS NULL OR ts.id != p_exclude_slot_id)
      AND (
          (p_start_time >= ts.start_time AND p_start_time < ts.end_time)
          OR (p_end_time > ts.start_time AND p_end_time <= ts.end_time)
          OR (p_start_time <= ts.start_time AND p_end_time >= ts.end_time)
      )
    LIMIT 1;
    
    -- If no rows returned, return false
    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, NULL::TEXT, NULL::TEXT;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- HELPER FUNCTION: Check Lab Batch Lecturer Conflict
-- ========================================
CREATE OR REPLACE FUNCTION check_lab_lecturer_conflict(
    p_lecturer_id UUID,
    p_day_of_week TEXT,
    p_start_time TIME,
    p_end_time TIME,
    p_exclude_batch_id UUID DEFAULT NULL
)
RETURNS TABLE(
    has_conflict BOOLEAN,
    conflict_timetable TEXT,
    conflict_section TEXT
) AS $$
BEGIN
    -- Check in regular slots
    RETURN QUERY
    SELECT * FROM check_lecturer_conflict(p_lecturer_id, p_day_of_week, p_start_time, p_end_time, NULL);
    
    IF NOT FOUND OR (SELECT (check_lecturer_conflict).has_conflict FROM check_lecturer_conflict(p_lecturer_id, p_day_of_week, p_start_time, p_end_time, NULL) LIMIT 1) = FALSE THEN
        -- Check in lab batches
        RETURN QUERY
        SELECT 
            TRUE as has_conflict,
            t.class_name || ' ' || t.semester || ' Sem' as conflict_timetable,
            COALESCE(t.section, '') as conflict_section
        FROM lab_batches lb
        JOIN timetable_slots ts ON ts.id = lb.timetable_slot_id
        JOIN timetables t ON t.id = ts.timetable_id
        WHERE lb.lecturer_id = p_lecturer_id
          AND ts.day_of_week = p_day_of_week
          AND (p_exclude_batch_id IS NULL OR lb.id != p_exclude_batch_id)
          AND (
              (p_start_time >= ts.start_time AND p_start_time < ts.end_time)
              OR (p_end_time > ts.start_time AND p_end_time <= ts.end_time)
              OR (p_start_time <= ts.start_time AND p_end_time >= ts.end_time)
          )
        LIMIT 1;
    END IF;
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, NULL::TEXT, NULL::TEXT;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- SUCCESS MESSAGE
-- ========================================
SELECT 'Database schema created successfully!' as message;
