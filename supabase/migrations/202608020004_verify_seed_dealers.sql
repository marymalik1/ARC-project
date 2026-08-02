-- Customer Care now only shows chats whose dealer is verified and active.
--
-- The seeded dealers predate the verification column and defaulted to false, so
-- without this every demo conversation would vanish. They are established
-- accounts rather than self-registrations, so they are marked verified here.
-- Their Active/Inactive status is left alone: D00125 and D00127 stay Inactive
-- and therefore stay hidden, which is the rule working as intended.
update public.dealers
set verified = true,
    verified_by = coalesce(verified_by, 'System'),
    verified_at = coalesce(verified_at, created_at)
where code in ('D00123', 'D00124', 'D00125', 'D00126', 'D00127')
  and not verified;
