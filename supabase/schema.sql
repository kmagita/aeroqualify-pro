-- ============================================================
-- AeroQualify Pro v3 – Full Schema
-- Run in Supabase SQL Editor → New Query → Run
-- ============================================================

-- ── Profiles ────────────────────────────────────────────────
create table if not exists public.profiles (
  id          uuid references auth.users(id) on delete cascade primary key,
  full_name   text,
  email       text,
  role        text default 'viewer' check (role in ('admin','quality_manager','quality_auditor','manager','viewer')),
  department  text,
  created_at  timestamptz default now()
);
alter table public.profiles enable row level security;
create policy "All auth users can read profiles"   on public.profiles for select using (auth.role()='authenticated');
create policy "Users can update own profile"        on public.profiles for update using (auth.uid()=id);
create policy "Admins can update any profile"       on public.profiles for update using (
  exists (select 1 from public.profiles where id=auth.uid() and role='admin')
);

create or replace function public.handle_new_user() returns trigger as $$
begin
  insert into public.profiles (id, full_name, email)
  values (new.id, new.raw_user_meta_data->>'full_name', new.email);
  return new;
end;
$$ language plpgsql security definer;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── Responsible Managers ────────────────────────────────────
create table if not exists public.responsible_managers (
  id           bigserial primary key,
  role_title   text not null,
  person_name  text,
  email        text,
  department   text,
  updated_at   timestamptz default now()
);
alter table public.responsible_managers enable row level security;
create policy "Auth users can read managers"   on public.responsible_managers for select using (auth.role()='authenticated');
create policy "Admins can manage managers"     on public.responsible_managers for all using (
  exists (select 1 from public.profiles where id=auth.uid() and role='admin')
);

insert into public.responsible_managers (role_title, department) values
  ('Quality Manager',            'Quality'),
  ('Accountable Manager',        'Administration'),
  ('Head of Training',           'Training'),
  ('Head of Safety',             'Safety'),
  ('Administrator',              'Administration'),
  ('Maintenance Liaison Officer','Maintenance'),
  ('Audit Scheduler',            'Quality')
on conflict do nothing;

-- ── CARs (Corrective Action Requests) ───────────────────────
create table if not exists public.cars (
  id                  text primary key,
  title               text not null,
  finding_description text,
  qms_clause          text,
  severity            text default 'Minor',
  status              text default 'Open',
  raised_by           uuid references auth.users(id),
  raised_by_name      text,
  responsible_manager text,
  responsible_manager_email text,
  department          text,
  due_date            date,
  date_raised         date default current_date,
  additional_notify   text[],
  viewed_by_manager   boolean default false,
  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
);
alter table public.cars enable row level security;
create policy "Auth users can read cars"          on public.cars for select using (auth.role()='authenticated');
create policy "QM/Auditor can insert cars"        on public.cars for insert with check (
  exists (select 1 from public.profiles where id=auth.uid() and role in ('admin','quality_manager','quality_auditor'))
);
create policy "Authorized users can update cars"  on public.cars for update using (auth.role()='authenticated');
create policy "Admins can delete cars"            on public.cars for delete using (
  exists (select 1 from public.profiles where id=auth.uid() and role='admin')
);

-- ── CAP Forms (Corrective Action Plans) ─────────────────────
create table if not exists public.caps (
  id                        text primary key,
  car_id                    text references public.cars(id) on delete cascade,
  immediate_action          text,
  root_cause_analysis       text,
  corrective_action         text,
  preventive_action         text,
  evidence_url              text,
  evidence_filename         text,
  submitted_by              uuid references auth.users(id),
  submitted_by_name         text,
  submitted_at              timestamptz,
  status                    text default 'Pending',
  created_at                timestamptz default now(),
  updated_at                timestamptz default now()
);
alter table public.caps enable row level security;
create policy "Auth users can read caps"         on public.caps for select using (auth.role()='authenticated');
create policy "Auth users can insert caps"       on public.caps for insert with check (auth.role()='authenticated');
create policy "Auth users can update caps"       on public.caps for update using (auth.role()='authenticated');

-- ── CAPA Verification Forms ──────────────────────────────────
create table if not exists public.capa_verifications (
  id                    text primary key,
  car_id                text references public.cars(id) on delete cascade,
  immediate_action_ok   boolean default false,
  root_cause_ok         boolean default false,
  corrective_action_ok  boolean default false,
  preventive_action_ok  boolean default false,
  evidence_ok           boolean default false,
  recurrence_prevented  boolean default false,
  effectiveness_rating  text default 'Pending',
  verifier_comments     text,
  verified_by           uuid references auth.users(id),
  verified_by_name      text,
  verified_at           timestamptz,
  status                text default 'Pending',
  created_at            timestamptz default now(),
  updated_at            timestamptz default now()
);
alter table public.capa_verifications enable row level security;
create policy "Auth users can read verifications"    on public.capa_verifications for select using (auth.role()='authenticated');
create policy "QM can manage verifications"          on public.capa_verifications for all using (
  exists (select 1 from public.profiles where id=auth.uid() and role in ('admin','quality_manager'))
);

-- ── Documents ───────────────────────────────────────────────
create table if not exists public.documents (
  id           text primary key,
  title        text not null,
  rev          text,
  status       text default 'Draft',
  owner        text,
  category     text,
  doc_section  text,
  date         date,
  approved_by  text,
  expiry_date  date,
  file_url     text,
  created_by   uuid references auth.users(id),
  updated_by   uuid references auth.users(id),
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);
alter table public.documents enable row level security;
create policy "Auth users can read documents"     on public.documents for select using (auth.role()='authenticated');
create policy "Editors can manage documents"      on public.documents for all using (
  exists (select 1 from public.profiles where id=auth.uid() and role in ('admin','quality_manager','quality_auditor'))
);

-- ── Flight School Documents ──────────────────────────────────
create table if not exists public.flight_school_docs (
  id            text primary key,
  title         text not null,
  doc_type      text,
  issuing_body  text,
  issue_date    date,
  expiry_date   date,
  status        text default 'Valid',
  file_url      text,
  notes         text,
  created_by    uuid references auth.users(id),
  updated_by    uuid references auth.users(id),
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);
alter table public.flight_school_docs enable row level security;
create policy "Auth users can read flight docs"   on public.flight_school_docs for select using (auth.role()='authenticated');
create policy "Admins/QM can manage flight docs"  on public.flight_school_docs for all using (
  exists (select 1 from public.profiles where id=auth.uid() and role in ('admin','quality_manager'))
);

-- ── Audits ──────────────────────────────────────────────────
create table if not exists public.audits (
  id               text primary key,
  title            text not null,
  type             text,
  status           text default 'Scheduled',
  lead             text,
  scope            text,
  date             date,
  findings         int default 0,
  obs              int default 0,
  notify_scheduler boolean default true,
  created_by       uuid references auth.users(id),
  updated_by       uuid references auth.users(id),
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);
alter table public.audits enable row level security;
create policy "Auth users can read audits"    on public.audits for select using (auth.role()='authenticated');
create policy "QM can manage audits"          on public.audits for all using (
  exists (select 1 from public.profiles where id=auth.uid() and role in ('admin','quality_manager','quality_auditor'))
);

-- ── Contractors ──────────────────────────────────────────────
create table if not exists public.contractors (
  id           text primary key,
  name         text not null,
  category     text,
  status       text default 'Approved',
  rating       text default 'A',
  contact      text,
  country      text,
  last_audit   date,
  next_audit   date,
  created_by   uuid references auth.users(id),
  updated_by   uuid references auth.users(id),
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);
alter table public.contractors enable row level security;
create policy "Auth users can read contractors"   on public.contractors for select using (auth.role()='authenticated');
create policy "Admins can manage contractors"     on public.contractors for all using (
  exists (select 1 from public.profiles where id=auth.uid() and role='admin')
);

-- ── Change Log ───────────────────────────────────────────────
create table if not exists public.change_log (
  id            bigserial primary key,
  user_id       uuid references auth.users(id),
  user_name     text,
  action        text,
  table_name    text,
  record_id     text,
  record_title  text,
  old_data      jsonb,
  new_data      jsonb,
  created_at    timestamptz default now()
);
alter table public.change_log enable row level security;
create policy "Auth users can read change log"    on public.change_log for select using (auth.role()='authenticated');
create policy "Auth users can insert change log"  on public.change_log for insert with check (auth.role()='authenticated');

-- ── Realtime ─────────────────────────────────────────────────
alter publication supabase_realtime add table public.cars;
alter publication supabase_realtime add table public.caps;
alter publication supabase_realtime add table public.capa_verifications;
alter publication supabase_realtime add table public.documents;
alter publication supabase_realtime add table public.flight_school_docs;
alter publication supabase_realtime add table public.audits;
alter publication supabase_realtime add table public.contractors;
alter publication supabase_realtime add table public.change_log;
alter publication supabase_realtime add table public.responsible_managers;

-- ============================================================
-- Done!
-- ============================================================
