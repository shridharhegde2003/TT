-- Time Table Generator Database Schema
-- Run this in your Supabase SQL Editor

-- Enable Row Level Security
-- This ensures users can only access their own data

-- Settings table to store configuration
CREATE TABLE IF NOT EXISTS settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    class_timings JSONB NOT NULL DEFAULT '[
        {"start": "08:55", "end": "09:50"},
        {"start": "09:50", "end": "10:45"},
        {"start": "11:00", "end": "11:55"},
        {"start": "11:55", "end": "12:50"},
        {"start": "14:00", "end": "14:55"},
        {"start": "14:55", "end": "15:50"},
        {"start": "16:00", "end": "16:55"}
    ]'::jsonb,
    breaks JSONB NOT NULL DEFAULT '[
        {"name": "Coffee Break", "start": "10:45", "end": "11:00"},
        {"name": "Lunch Break", "start": "12:50", "end": "14:00"}
    ]'::jsonb,
    working_days JSONB NOT NULL DEFAULT '["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]'::jsonb,
    default_heading TEXT NOT NULL DEFAULT 'MCA SEM-III TIME TABLE 2025 (SECTION B)',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Subjects table to store subject information
CREATE TABLE IF NOT EXISTS subjects (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    subject_name TEXT NOT NULL,
    subject_code TEXT,
    faculty_name TEXT NOT NULL,
    classroom TEXT NOT NULL,
    periods_per_week INTEGER NOT NULL DEFAULT 1,
    semester TEXT NOT NULL DEFAULT 'Sem I',
    color TEXT DEFAULT '#3B82F6', -- Default blue color for timetable display
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Timetables table to store generated timetable data
CREATE TABLE IF NOT EXISTS timetables (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL DEFAULT 'Generated Timetable',
    semester TEXT NOT NULL,
    timetable_data JSONB NOT NULL, -- Store the complete timetable grid
    settings_used JSONB, -- Store the settings used for generation
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_settings_user_id ON settings(user_id);
CREATE INDEX IF NOT EXISTS idx_subjects_user_id ON subjects(user_id);
CREATE INDEX IF NOT EXISTS idx_timetables_user_id ON timetables(user_id);

-- Enable Row Level Security
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE timetables ENABLE ROW LEVEL SECURITY;

-- Create policies for Row Level Security
-- Users can only access their own data

CREATE POLICY "Users can view their own settings"
    ON settings FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own settings"
    ON settings FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own settings"
    ON settings FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own settings"
    ON settings FOR DELETE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own subjects"
    ON subjects FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own subjects"
    ON subjects FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own subjects"
    ON subjects FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own subjects"
    ON subjects FOR DELETE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own timetables"
    ON timetables FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own timetables"
    ON timetables FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own timetables"
    ON timetables FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own timetables"
    ON timetables FOR DELETE
    USING (auth.uid() = user_id);

-- Create trigger functions for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_settings_updated_at BEFORE UPDATE ON settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subjects_updated_at BEFORE UPDATE ON subjects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_timetables_updated_at BEFORE UPDATE ON timetables
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default settings for new users
CREATE OR REPLACE FUNCTION create_default_settings()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO settings (user_id)
    VALUES (NEW.id);
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically create settings for new users
CREATE TRIGGER create_user_settings
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION create_default_settings();
