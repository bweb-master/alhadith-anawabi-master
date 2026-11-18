CREATE TABLE IF NOT EXISTS muhalla_hadiths (
  id TEXT PRIMARY KEY,
  volume INTEGER NOT NULL DEFAULT 1,
  page TEXT DEFAULT '',
  issue_number INTEGER NOT NULL DEFAULT 1,
  kitab TEXT NOT NULL,
  issue_title TEXT NOT NULL,
  matn_with_tashkeel TEXT NOT NULL,
  ibn_hazm_isnad_text TEXT DEFAULT '',
  ibn_hazm_hukm TEXT DEFAULT '',
  paths_json TEXT NOT NULL DEFAULT '[]',
  takhrij_links_json TEXT NOT NULL DEFAULT '[]',
  gharib_json TEXT NOT NULL DEFAULT '[]',
  fiqh_analysis TEXT DEFAULT '',
  other_madhahib_notes TEXT DEFAULT '',
  four_madhahib_json TEXT DEFAULT '[]',
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS narrators (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  kunya TEXT DEFAULT '',
  birth_year_h INTEGER,
  death_year_h INTEGER,
  region TEXT NOT NULL,
  origin TEXT NOT NULL,
  tabaqah TEXT NOT NULL,
  grade TEXT NOT NULL,
  ibn_hazm_verdict TEXT DEFAULT '',
  teachers_json TEXT NOT NULL DEFAULT '[]',
  students_json TEXT NOT NULL DEFAULT '[]',
  jarh_taadil_json TEXT NOT NULL DEFAULT '[]',
  notes TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS nine_books (
  uid TEXT PRIMARY KEY,
  book_key TEXT NOT NULL,
  hadith_id TEXT NOT NULL,
  id_in_book INTEGER,
  chapter_name TEXT DEFAULT '',
  arabic_text TEXT NOT NULL,
  normalized_text TEXT NOT NULL
);

CREATE VIRTUAL TABLE IF NOT EXISTS nine_books_fts USING fts5(
  uid UNINDEXED,
  book_key UNINDEXED,
  normalized_text,
  arabic_text UNINDEXED
);

CREATE TABLE IF NOT EXISTS researchers (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'assistant',
  permissions_json TEXT NOT NULL DEFAULT '[]',
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL
);

