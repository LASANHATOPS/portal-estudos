-- Portal de Estudos — execute este script no SQL Editor do Supabase.
create extension if not exists pgcrypto;

create table if not exists public.portal_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create or replace function public.is_portal_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.portal_admins where user_id = auth.uid());
$$;

revoke all on function public.is_portal_admin() from public;
grant execute on function public.is_portal_admin() to anon, authenticated;

create table if not exists public.portal_content (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('lesson','activity')),
  title text not null,
  summary text not null default '',
  body text not null default '',
  video_url text,
  links jsonb not null default '[]'::jsonb,
  files jsonb not null default '[]'::jsonb,
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.portal_admins enable row level security;
alter table public.portal_content enable row level security;

drop policy if exists "Admins can read own admin record" on public.portal_admins;
create policy "Admins can read own admin record" on public.portal_admins
for select to authenticated using (user_id = auth.uid());

drop policy if exists "Public can read published content" on public.portal_content;
create policy "Public can read published content" on public.portal_content
for select to anon, authenticated using (published or public.is_portal_admin());

drop policy if exists "Admins can insert content" on public.portal_content;
create policy "Admins can insert content" on public.portal_content
for insert to authenticated with check (public.is_portal_admin());

drop policy if exists "Admins can update content" on public.portal_content;
create policy "Admins can update content" on public.portal_content
for update to authenticated using (public.is_portal_admin()) with check (public.is_portal_admin());

drop policy if exists "Admins can delete content" on public.portal_content;
create policy "Admins can delete content" on public.portal_content
for delete to authenticated using (public.is_portal_admin());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('portal-files', 'portal-files', true, 52428800, null)
on conflict (id) do update set public = true, file_size_limit = 52428800;

drop policy if exists "Public can read portal files" on storage.objects;
create policy "Public can read portal files" on storage.objects
for select to anon, authenticated using (bucket_id = 'portal-files');

drop policy if exists "Admins can upload portal files" on storage.objects;
create policy "Admins can upload portal files" on storage.objects
for insert to authenticated with check (bucket_id = 'portal-files' and public.is_portal_admin());

drop policy if exists "Admins can update portal files" on storage.objects;
create policy "Admins can update portal files" on storage.objects
for update to authenticated using (bucket_id = 'portal-files' and public.is_portal_admin()) with check (bucket_id = 'portal-files' and public.is_portal_admin());

drop policy if exists "Admins can delete portal files" on storage.objects;
create policy "Admins can delete portal files" on storage.objects
for delete to authenticated using (bucket_id = 'portal-files' and public.is_portal_admin());

-- Depois de criar sua conta em Authentication > Users, copie o UUID dela
-- e execute esta linha, substituindo pelo seu UUID:
-- insert into public.portal_admins (user_id) values ('SEU-UUID-AQUI');