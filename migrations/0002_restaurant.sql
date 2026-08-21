create table if not exists staff (
  user_id    text primary key,
  role       text not null default 'admin',
  created_at timestamptz not null default now()
);

create table if not exists settings (
  id           text primary key default 'main',
  name         text not null,
  logo_url     text not null default '',
  tagline      text not null default '',
  address      text not null,
  city         text not null,
  hours        text not null default '',
  call_display text not null,
  call_tel     text not null,
  wa_display   text not null,
  wa_tel       text not null,
  maps_query   text not null,
  updated_at   timestamptz not null default now()
);

create table if not exists categories (
  id         text primary key,
  label      text not null,
  sort_order int not null default 0,
  is_food    boolean not null default false
);

create table if not exists menu_items (
  id          text primary key,
  name        text not null,
  blurb       text not null default '',
  price       int not null,
  category_id text not null references categories(id),
  image       text not null default '',
  featured    boolean not null default false,
  promo       boolean not null default false,
  available   boolean not null default true,
  sort_order  int not null default 0
);

create table if not exists customers (
  id         serial primary key,
  name       text not null,
  phone      text not null,
  address    text not null default '',
  created_at timestamptz not null default now()
);
create unique index if not exists customers_phone_idx on customers (phone);

create table if not exists orders (
  id          serial primary key,
  customer_id int not null references customers(id),
  status      text not null default 'new',
  subtotal    int not null,
  delivery    int not null default 0,
  total       int not null,
  notes       text not null default '',
  created_at  timestamptz not null default now()
);
create index if not exists orders_status_idx on orders (status);
create index if not exists orders_created_idx on orders (created_at desc);

create table if not exists order_items (
  id       serial primary key,
  order_id int not null references orders(id) on delete cascade,
  item_id  text not null,
  name     text not null,
  price    int not null,
  qty      int not null
);
