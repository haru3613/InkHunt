create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  inquiry_id uuid not null references public.inquiries(id) on delete cascade,
  proposed_by_line_id text not null,
  starts_at timestamptz not null,
  location text not null check (char_length(location) between 1 and 300),
  status text not null check (status in ('proposed', 'confirmed', 'cancelled')) default 'proposed',
  confirmed_at timestamptz,
  cancelled_at timestamptz,
  cancelled_by_line_id text,
  created_at timestamptz not null default now(),
  check (starts_at > created_at),
  check (status <> 'confirmed' or confirmed_at is not null),
  check ((status = 'cancelled') = (cancelled_at is not null and cancelled_by_line_id is not null))
);
create unique index appointments_one_active_per_inquiry on public.appointments(inquiry_id) where status in ('proposed', 'confirmed');
alter table public.appointments enable row level security;
revoke all on public.appointments from public, anon, authenticated;
grant all on public.appointments to service_role;

create or replace function public.cancel_active_appointment_on_inquiry_close()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'closed' and old.status is distinct from 'closed' then
    update public.appointments set status = 'cancelled', cancelled_at = now(), cancelled_by_line_id = 'system:inquiry_closed'
      where inquiry_id = new.id and status in ('proposed', 'confirmed');
  end if;
  return new;
end;
$$;
revoke all on function public.cancel_active_appointment_on_inquiry_close() from public, anon, authenticated;
create trigger inquiries_cancel_active_appointment before update of status on public.inquiries
  for each row execute function public.cancel_active_appointment_on_inquiry_close();

create or replace function public.propose_appointment_for_accepted_inquiry(p_inquiry_id uuid, p_proposed_by text, p_starts_at timestamptz, p_location text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare locked_inquiry public.inquiries; created public.appointments; notification public.messages;
begin
  select * into locked_inquiry from public.inquiries where id = p_inquiry_id for update;
  if not found then raise exception 'INQUIRY_NOT_FOUND'; end if;
  if locked_inquiry.status <> 'accepted' then raise exception 'INQUIRY_NOT_ACCEPTED'; end if;
  if not exists (select 1 from public.artists where id=locked_inquiry.artist_id and line_user_id=p_proposed_by and status='active') then raise exception 'FORBIDDEN'; end if;
  if p_starts_at <= now() or char_length(btrim(p_location)) not between 1 and 300 then raise exception 'INVALID_APPOINTMENT'; end if;
  insert into public.appointments(inquiry_id, proposed_by_line_id, starts_at, location)
    values (p_inquiry_id, p_proposed_by, p_starts_at, p_location) returning * into created;
  insert into public.messages(inquiry_id,sender_type,message_type,content)
    values(p_inquiry_id,'system','system','刺青師提出了預約時間，請在「預約安排」中查看並確認。') returning * into notification;
  return to_jsonb(created) || jsonb_build_object('notification_message',to_jsonb(notification));
end;
$$;
revoke all on function public.propose_appointment_for_accepted_inquiry(uuid, text, timestamptz, text) from public, anon, authenticated;

create or replace function public.transition_appointment(p_id uuid, p_action text, p_actor text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare current_row public.appointments; related public.inquiries; changed public.appointments; parent_id uuid; notification public.messages;
begin
  select inquiry_id into parent_id from public.appointments where id=p_id;
  if not found then return null; end if;
  -- All lifecycle mutations lock inquiry before child rows.
  select * into related from public.inquiries where id=parent_id for update;
  select * into current_row from public.appointments where id=p_id for update;
  if not found or current_row.status='cancelled' then return null; end if;
  if p_actor <> related.consumer_line_id and not exists (select 1 from public.artists where id=related.artist_id and line_user_id=p_actor) then raise exception 'FORBIDDEN'; end if;
  if p_action = 'confirm' then
    if related.status <> 'accepted' or current_row.status <> 'proposed' or current_row.starts_at <= now() then return null; end if;
    if p_actor <> related.consumer_line_id then raise exception 'FORBIDDEN'; end if;
    update public.appointments set status='confirmed', confirmed_at=now() where id=p_id returning * into changed;
  elsif p_action = 'cancel' then
    update public.appointments set status='cancelled', cancelled_at=now(), cancelled_by_line_id=p_actor where id=p_id returning * into changed;
  else raise exception 'INVALID_ACTION'; end if;
  insert into public.messages(inquiry_id,sender_type,message_type,content)
    values(parent_id,'system','system',case when p_action='confirm' then '預約已確認。請依約定時間與地點前往，事前準備與付款方式請和刺青師確認。' else '預約安排已取消，雙方可以繼續討論新的時間。' end) returning * into notification;
  return to_jsonb(changed) || jsonb_build_object('notification_message',to_jsonb(notification));
end;
$$;
revoke all on function public.transition_appointment(uuid, text, text) from public, anon, authenticated;

grant execute on function public.propose_appointment_for_accepted_inquiry(uuid, text, timestamptz, text) to service_role;
grant execute on function public.transition_appointment(uuid, text, text) to service_role;
