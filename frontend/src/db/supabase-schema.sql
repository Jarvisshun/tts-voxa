-- TTS Voxa Supabase Schema
-- Run this in Supabase SQL Editor to create tables and RLS policies

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Voices table
CREATE TABLE IF NOT EXISTS voices (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  voice_id TEXT,
  description TEXT,
  audio_path TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Generations (history) table
CREATE TABLE IF NOT EXISTS generations (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  model TEXT NOT NULL,
  voice TEXT,
  text_content TEXT NOT NULL,
  audio_path TEXT NOT NULL,
  format TEXT DEFAULT 'wav',
  speed REAL DEFAULT 1.0,
  emotion TEXT,
  duration REAL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Batch jobs table
CREATE TABLE IF NOT EXISTS batch_jobs (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  total_items INTEGER,
  completed_items INTEGER DEFAULT 0,
  voice TEXT,
  model TEXT,
  format TEXT DEFAULT 'wav',
  speed REAL DEFAULT 1.0,
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Batch items table
CREATE TABLE IF NOT EXISTS batch_items (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  job_id TEXT NOT NULL,
  item_index INTEGER NOT NULL,
  text_content TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  audio_path TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Providers table (API keys encrypted client-side before upload)
CREATE TABLE IF NOT EXISTS providers (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  api_key TEXT NOT NULL,
  api_base TEXT NOT NULL,
  models TEXT NOT NULL DEFAULT '[]',
  is_default INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Row Level Security (RLS) — users can only access their own data
ALTER TABLE voices ENABLE ROW LEVEL SECURITY;
ALTER TABLE generations ENABLE ROW LEVEL SECURITY;
ALTER TABLE batch_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE batch_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE providers ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can manage own voices" ON voices
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Users can manage own generations" ON generations
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Users can manage own batch_jobs" ON batch_jobs
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Users can manage own batch_items" ON batch_items
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Users can manage own providers" ON providers
  FOR ALL USING (user_id = auth.uid());

-- Storage bucket for audio files
-- Create bucket named "audio" with public access disabled in Supabase dashboard

-- Storage RLS Policies (run after creating the "audio" bucket)
-- Allow authenticated users to upload to their own folder
CREATE POLICY "Users can upload own audio" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'audio' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Allow authenticated users to read their own audio
CREATE POLICY "Users can read own audio" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'audio' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Allow authenticated users to delete their own audio
CREATE POLICY "Users can delete own audio" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'audio' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Allow authenticated users to update their own audio
CREATE POLICY "Users can update own audio" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'audio' AND (storage.foldername(name))[1] = auth.uid()::text);
