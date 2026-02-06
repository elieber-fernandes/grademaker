-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Table: subjects
create table public.subjects (
  id text primary key,
  name text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Table: professors
create table public.professors (
  id text primary key,
  name text not null,
  subjects jsonb not null default '[]'::jsonb,
  availability jsonb not null default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Table: class_groups
create table public.class_groups (
  id text primary key,
  name text not null,
  grade_config jsonb not null default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Table: schedule (Singleton approach for now to match current state)
create table public.schedule (
  id text primary key default 'default_schedule',
  grid jsonb not null default '{}'::jsonb,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security (RLS)
alter table public.subjects enable row level security;
alter table public.professors enable row level security;
alter table public.class_groups enable row level security;
alter table public.schedule enable row level security;

-- Create Policy: Allow Public Access (for simplicity in this phase)
-- WARNING: In a real production app with auth, you'd restrict this.
create policy "Allow public access to subjects" on public.subjects for all using (true) with check (true);
create policy "Allow public access to professors" on public.professors for all using (true) with check (true);
create policy "Allow public access to class_groups" on public.class_groups for all using (true) with check (true);
create policy "Allow public access to schedule" on public.schedule for all using (true) with check (true);

-- Insert default schedule row
insert into public.schedule (id, grid) values ('default', '{}') on conflict (id) do nothing;
