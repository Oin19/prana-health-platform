-- PRANA database schema
-- D1: Patient Database
-- D2: Health Data Store
-- D3: Screening Records
-- Referral/consultation requests extend D3 workflow.

create extension if not exists pgcrypto;

do $
begin
  create type public.app_role as enum ('asha_anm', 'phc_staff', 'phc_doctor', 'admin');
exception when duplicate_object then null;
end $;

do $
begin
  create type public.referral_status as enum ('pending', 'reviewed', 'completed');
exception when duplicate_object then null;
end $;

create table if not exists public.user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role public.app_role not null,
  created_at timestamptz not null default now()
);

create table if not exists public.patients (
  id uuid primary key default gen_random_uuid(),
  patient_code text not null unique,
  name text not null,
  age integer check (age is null or age between 0 and 130),
  gender text,
  contact text,
  address text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.health_data (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  systolic_bp numeric,
  diastolic_bp numeric,
  blood_glucose numeric,
  haemoglobin numeric,
  bmi numeric,
  symptoms text,
  source text not null default 'manual' check (source in ('manual', 'ocr_verified')),
  source_report_id uuid,
  recorded_by uuid references auth.users(id),
  recorded_at timestamptz not null default now()
);

create table if not exists public.medical_reports (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  storage_path text not null,
  ocr_status text not null default 'pending' check (ocr_status in ('pending', 'processing', 'extracted', 'failed')),
  extracted_data jsonb,
  verified_data jsonb,
  verified_by uuid references auth.users(id),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

alter table public.health_data
  drop constraint if exists health_data_source_report_fk;

alter table public.health_data
  add constraint health_data_source_report_fk
  foreign key (source_report_id) references public.medical_reports(id) on delete set null;

create table if not exists public.screening_records (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  health_data_id uuid references public.health_data(id) on delete set null,
  diabetes jsonb,
  cardiovascular jsonb,
  hypertension jsonb,
  anaemia jsonb,
  referral_required boolean not null default false,
  referral_guidance text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table if not exists public.referrals (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  screening_record_id uuid references public.screening_records(id) on delete set null,
  reason text not null,
  doctor_id uuid references auth.users(id),
  appointment_requested boolean not null default false,
  status public.referral_status not null default 'pending',
  consultation_advice text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_profiles enable row level security;
alter table public.patients enable row level security;
alter table public.health_data enable row level security;
alter table public.medical_reports enable row level security;
alter table public.screening_records enable row level security;
alter table public.referrals enable row level security;

-- The policies below establish the security boundary. Production deployment
-- should review these with the project's final role-assignment policy before go-live.

create or replace function public.current_app_role()
returns public.app_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.user_profiles where id = auth.uid()
$$;

drop policy if exists "authenticated users can read their role" on public.user_profiles;

create policy "authenticated users can read their role"
on public.user_profiles for select
to authenticated
using (id = auth.uid());

drop policy if exists "admins can read all user profiles" on public.user_profiles;

create policy "admins can read all user profiles"
on public.user_profiles for select
to authenticated
using (public.current_app_role() = 'admin');

drop policy if exists "admins can update user profiles" on public.user_profiles;

create policy "admins can update user profiles"
on public.user_profiles for update
to authenticated
using (public.current_app_role() = 'admin')
with check (public.current_app_role() = 'admin');

-- Prevent an authenticated admin from removing their own admin role through a
-- direct Supabase write. The API enforces the same rule at application level.
create or replace function public.prevent_admin_self_demotion()
returns trigger
language plpgsql
security definer
set search_path = public
as $
begin
  if old.id = auth.uid()
     and old.role = 'admin'
     and new.role <> 'admin' then
    raise exception 'An admin cannot remove their own admin role';
  end if;
  return new;
end;
$;

drop trigger if exists prevent_admin_self_demotion_trigger on public.user_profiles;
create trigger prevent_admin_self_demotion_trigger
before update on public.user_profiles
for each row execute function public.prevent_admin_self_demotion();


drop policy if exists "authorized health users can access patients" on public.patients;

create policy "authorized health users can access patients"
on public.patients for all
to authenticated
using (public.current_app_role() in ('asha_anm','phc_staff','phc_doctor','admin'))
with check (public.current_app_role() in ('asha_anm','phc_staff','phc_doctor','admin'));

drop policy if exists "authorized health users can access health data" on public.health_data;

create policy "authorized health users can access health data"
on public.health_data for all
to authenticated
using (public.current_app_role() in ('asha_anm','phc_staff','phc_doctor','admin'))
with check (public.current_app_role() in ('asha_anm','phc_staff','phc_doctor','admin'));

drop policy if exists "authorized health users can access reports" on public.medical_reports;

create policy "authorized health users can access reports"
on public.medical_reports for all
to authenticated
using (public.current_app_role() in ('asha_anm','phc_staff','phc_doctor','admin'))
with check (public.current_app_role() in ('asha_anm','phc_staff','phc_doctor','admin'));

drop policy if exists "authorized health users can access screening records" on public.screening_records;

create policy "authorized health users can access screening records"
on public.screening_records for all
to authenticated
using (public.current_app_role() in ('asha_anm','phc_staff','phc_doctor','admin'))
with check (public.current_app_role() in ('asha_anm','phc_staff','phc_doctor','admin'));

drop policy if exists "health users can read referrals" on public.referrals;

create policy "health users can read referrals"
on public.referrals for select
to authenticated
using (public.current_app_role() in ('asha_anm','phc_staff','phc_doctor','admin'));

drop policy if exists "screening users can create referrals" on public.referrals;

create policy "screening users can create referrals"
on public.referrals for insert
to authenticated
with check (public.current_app_role() in ('asha_anm','phc_staff'));

drop policy if exists "doctors can update consultation advice" on public.referrals;

create policy "doctors can update consultation advice"
on public.referrals for update
to authenticated
using (public.current_app_role() = 'phc_doctor')
with check (public.current_app_role() = 'phc_doctor');


-- Keep modification timestamps current for records edited by the API.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $
begin
  new.updated_at = now();
  return new;
end;
$;

drop trigger if exists patients_updated_at_trigger on public.patients;
create trigger patients_updated_at_trigger
before update on public.patients
for each row execute function public.set_updated_at();

drop trigger if exists referrals_updated_at_trigger on public.referrals;
create trigger referrals_updated_at_trigger
before update on public.referrals
for each row execute function public.set_updated_at();

create or replace function public.validate_referral_doctor()
returns trigger
language plpgsql
security definer
set search_path = public
as $
begin
  if new.doctor_id is not null and not exists (
    select 1
    from public.user_profiles
    where id = new.doctor_id
      and role = 'phc_doctor'
  ) then
    raise exception 'The referral doctor must have the PHC doctor role';
  end if;
  return new;
end;
$;

drop trigger if exists referral_doctor_role_trigger on public.referrals;
create trigger referral_doctor_role_trigger
before insert or update on public.referrals
for each row execute function public.validate_referral_doctor();

create index if not exists patients_patient_code_idx on public.patients(patient_code);
-- Prevent the same verified medical report from being applied more than once.
-- This keeps OCR-derived health records traceable to a single source report.
create unique index if not exists health_data_source_report_unique_idx
  on public.health_data(source_report_id)
  where source_report_id is not null;

create index if not exists health_data_patient_id_idx on public.health_data(patient_id);
create index if not exists screening_records_patient_id_idx on public.screening_records(patient_id);
create index if not exists referrals_patient_id_idx on public.referrals(patient_id);

-- Database-level integrity for cross-table provenance. These checks complement
-- API validation so direct Supabase writes cannot attach data to another patient.
create or replace function public.validate_health_data_provenance()
returns trigger
language plpgsql
security definer
set search_path = public
as $
begin
  if new.source = 'ocr_verified' then
    if new.source_report_id is null then
      raise exception 'OCR-verified health data must reference a medical report';
    end if;
    if not exists (
      select 1
      from public.medical_reports
      where id = new.source_report_id
        and patient_id = new.patient_id
    ) then
      raise exception 'The OCR source report must belong to the same patient';
    end if;
  elsif new.source_report_id is not null then
    raise exception 'Manual health data cannot reference an OCR report';
  end if;
  return new;
end;
$;

drop trigger if exists health_data_provenance_trigger on public.health_data;
create trigger health_data_provenance_trigger
before insert or update on public.health_data
for each row execute function public.validate_health_data_provenance();

create or replace function public.validate_screening_health_data_link()
returns trigger
language plpgsql
security definer
set search_path = public
as $
begin
  if new.health_data_id is not null and not exists (
    select 1
    from public.health_data
    where id = new.health_data_id
      and patient_id = new.patient_id
  ) then
    raise exception 'The screening record health-data reference must belong to the same patient';
  end if;
  return new;
end;
$;

drop trigger if exists screening_health_data_link_trigger on public.screening_records;
create trigger screening_health_data_link_trigger
before insert or update on public.screening_records
for each row execute function public.validate_screening_health_data_link();

create or replace function public.validate_referral_screening_link()
returns trigger
language plpgsql
security definer
set search_path = public
as $
begin
  if new.screening_record_id is not null and not exists (
    select 1
    from public.screening_records
    where id = new.screening_record_id
      and patient_id = new.patient_id
  ) then
    raise exception 'The referral screening reference must belong to the same patient';
  end if;
  return new;
end;
$;

drop trigger if exists referral_screening_link_trigger on public.referrals;
create trigger referral_screening_link_trigger
before insert or update on public.referrals
for each row execute function public.validate_referral_screening_link();



-- Storage bucket for uploaded medical reports.
-- Create the bucket in Supabase Storage with private access before production use.
insert into storage.buckets (id, name, public)
values ('medical-reports', 'medical-reports', false)
on conflict (id) do nothing;

drop policy if exists "authorized health users can upload medical reports" on storage.objects;

create policy "authorized health users can upload medical reports"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'medical-reports'
  and public.current_app_role() in ('asha_anm','phc_staff','phc_doctor','admin')
  and (storage.foldername(name))[1] in (
    select id::text from public.patients
  )
);

drop policy if exists "authorized health users can read medical reports" on storage.objects;

create policy "authorized health users can read medical reports"
on storage.objects for select
to authenticated
using (
  bucket_id = 'medical-reports'
  and public.current_app_role() in ('asha_anm','phc_staff','phc_doctor','admin')
  and (storage.foldername(name))[1] in (
    select id::text from public.patients
  )
);
