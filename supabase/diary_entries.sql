CREATE TABLE IF NOT EXISTS diary_entries (
  id uuid default gen_random_uuid() primary key,
  profile_id uuid references profiles(id) on delete cascade,
  date date not null,
  summary text not null,
  highlights text[],
  challenges text[],
  mood text check (mood in ('positive', 'neutral', 'negative', 'mixed')),
  energy integer check (energy between 1 and 10),
  created_at timestamp with time zone default now(),
  unique(profile_id, date)
);

ALTER TABLE diary_entries enable row level security;
CREATE POLICY "allow all for now" on diary_entries for all using (true);
