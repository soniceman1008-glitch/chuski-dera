create table if not exists call_sessions (
  id            text primary key,
  from_number   text not null default '',
  to_number     text not null default '',
  lang          text not null default 'ur',
  step          text not null default 'intent',
  status        text not null default 'in_progress',
  customer_name text not null default '',
  customer_phone text not null default '',
  address       text not null default '',
  notes         text not null default '',
  cart_json     text not null default '[]',
  order_id      int,
  started_at    timestamptz not null default now(),
  ended_at      timestamptz,
  duration_sec  int not null default 0,
  last_speech   text not null default ''
);
create index if not exists call_sessions_started_idx on call_sessions (started_at desc);

create table if not exists call_turns (
  id         serial primary key,
  call_id    text not null references call_sessions(id) on delete cascade,
  role       text not null,
  text       text not null,
  created_at timestamptz not null default now()
);
create index if not exists call_turns_call_idx on call_turns (call_id, id);
