-- POPO Arcade Admin Database Enhancements (Idempotent Additive Migration)
-- Builds on supabase/migrations/20261116_popo_arcade.sql without duplicating tables
-- and integrates with existing public.staff_profiles / public.is_super_admin() where present.

-- Additional query performance indexes for Admin Overview, All Scores filtering, and Winner queues
create index if not exists idx_arcade_scores_validation_played_at
  on public.arcade_scores (validation_status, played_at desc);

create index if not exists idx_arcade_scores_player_played_at
  on public.arcade_scores (player_id, played_at desc);

create index if not exists idx_arcade_scores_game_played_at
  on public.arcade_scores (game_id, played_at desc);

create index if not exists idx_arcade_winners_status_created
  on public.arcade_winners (approval_status, prize_status, created_at desc);

create index if not exists idx_arcade_players_nickname_lower
  on public.arcade_players (lower(nickname));

-- Optional Supabase-native super_admin RLS support integrating with existing public.is_super_admin()
-- Server routes using SUPABASE_SERVICE_ROLE_KEY already bypass RLS; anon and regular users remain blocked.
do $$
begin
  if exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'is_super_admin'
  ) then
    drop policy if exists "Super admins can manage arcade_players" on public.arcade_players;
    create policy "Super admins can manage arcade_players"
      on public.arcade_players
      for all
      to authenticated
      using (public.is_super_admin())
      with check (public.is_super_admin());

    drop policy if exists "Super admins can manage arcade_scores" on public.arcade_scores;
    create policy "Super admins can manage arcade_scores"
      on public.arcade_scores
      for all
      to authenticated
      using (public.is_super_admin())
      with check (public.is_super_admin());

    drop policy if exists "Super admins can manage arcade_competitions" on public.arcade_competitions;
    create policy "Super admins can manage arcade_competitions"
      on public.arcade_competitions
      for all
      to authenticated
      using (public.is_super_admin())
      with check (public.is_super_admin());

    drop policy if exists "Super admins can manage arcade_winners" on public.arcade_winners;
    create policy "Super admins can manage arcade_winners"
      on public.arcade_winners
      for all
      to authenticated
      using (public.is_super_admin())
      with check (public.is_super_admin());

    drop policy if exists "Super admins can view arcade_winner_audit_logs" on public.arcade_winner_audit_logs;
    create policy "Super admins can view arcade_winner_audit_logs"
      on public.arcade_winner_audit_logs
      for select
      to authenticated
      using (public.is_super_admin());
  end if;
end $$;
