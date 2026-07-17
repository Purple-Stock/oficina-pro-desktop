PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS teams (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  notes TEXT,
  label_company_info TEXT,
  label_logo_url TEXT,
  item_custom_field_schema TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS locations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  team_id INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  UNIQUE(team_id, name)
);

CREATE TABLE IF NOT EXISTS items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT,
  sku TEXT,
  barcode TEXT,
  cost REAL,
  price REAL,
  item_type TEXT,
  brand TEXT,
  photo_data TEXT,
  initial_quantity INTEGER DEFAULT 0,
  current_stock REAL DEFAULT 0,
  minimum_stock REAL DEFAULT 0,
  custom_fields TEXT,
  team_id INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  location_id INTEGER REFERENCES locations(id) ON DELETE SET NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS stock_transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  item_id INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  team_id INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  transaction_type TEXT NOT NULL,
  quantity REAL NOT NULL,
  notes TEXT,
  source_location_id INTEGER REFERENCES locations(id) ON DELETE SET NULL,
  destination_location_id INTEGER REFERENCES locations(id) ON DELETE SET NULL,
  destination_kind TEXT,
  destination_label TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS index_locations_on_team_id ON locations(team_id);
CREATE INDEX IF NOT EXISTS index_items_on_team_id ON items(team_id);
CREATE INDEX IF NOT EXISTS index_items_on_location_id ON items(location_id);
CREATE INDEX IF NOT EXISTS index_stock_transactions_on_team_id ON stock_transactions(team_id);
CREATE INDEX IF NOT EXISTS index_stock_transactions_on_item_id ON stock_transactions(item_id);
CREATE TABLE IF NOT EXISTS clients (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  team_id INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  document TEXT,
  notes TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS vehicles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  team_id INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  plate TEXT NOT NULL,
  brand TEXT,
  model TEXT,
  year INTEGER,
  color TEXT,
  odometer REAL,
  notes TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  UNIQUE(team_id, plate)
);

CREATE TABLE IF NOT EXISTS services (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  team_id INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price REAL DEFAULT 0,
  estimated_minutes INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS service_orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  team_id INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  client_id INTEGER REFERENCES clients(id) ON DELETE SET NULL,
  vehicle_id INTEGER REFERENCES vehicles(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'open',
  payment_status TEXT NOT NULL DEFAULT 'pending',
  odometer REAL,
  complaint TEXT,
  diagnosis TEXT,
  notes TEXT,
  discount REAL DEFAULT 0,
  labor_total REAL DEFAULT 0,
  parts_total REAL DEFAULT 0,
  total REAL DEFAULT 0,
  stock_debited INTEGER NOT NULL DEFAULT 0,
  opened_at INTEGER NOT NULL DEFAULT (unixepoch()),
  closed_at INTEGER,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS service_order_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  service_order_id INTEGER NOT NULL REFERENCES service_orders(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  ref_id INTEGER,
  description TEXT NOT NULL,
  quantity REAL NOT NULL DEFAULT 1,
  unit_price REAL NOT NULL DEFAULT 0,
  line_total REAL NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS index_clients_on_team_id ON clients(team_id);
CREATE INDEX IF NOT EXISTS index_vehicles_on_team_id ON vehicles(team_id);
CREATE INDEX IF NOT EXISTS index_vehicles_on_client_id ON vehicles(client_id);
CREATE INDEX IF NOT EXISTS index_services_on_team_id ON services(team_id);
CREATE INDEX IF NOT EXISTS index_service_orders_on_team_id ON service_orders(team_id);
CREATE INDEX IF NOT EXISTS index_service_orders_on_status ON service_orders(status);
CREATE INDEX IF NOT EXISTS index_service_order_items_on_service_order_id ON service_order_items(service_order_id);
