const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('database.db');

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL
  )`, (err) => {
    if (err) {
      console.error('Error creating users table:', err.message);
    } else {
      console.log('Users table created or already exists.');
      // Insert admin user if it doesn't exist
      db.get(`SELECT * FROM users WHERE username = ?`, ['admin'], (err, row) => {
        if (err) {
          return console.error(err.message);
        }
        if (!row) {
          db.run(`INSERT INTO users (username, password) VALUES (?, ?)`, ['admin', 'admin'], (err) => {
            if (err) {
              console.error('Error inserting admin user:', err.message);
            } else {
              console.log('Admin user created.');
            }
          });
        } else {
          console.log('Admin user already exists.');
        }
      });
    }
  });

  db.run(`CREATE TABLE IF NOT EXISTS clientes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    direccion TEXT,
    telefono TEXT,
    deuda REAL DEFAULT 0
  )`, (err) => {
    if (err) {
      console.error('Error creating clientes table:', err.message);
    } else {
      console.log('Clientes table created or already exists.');
    }
  });

  db.run(`CREATE TABLE IF NOT EXISTS reparto (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cliente_id INTEGER,
    fecha DATE,
    entregado INTEGER DEFAULT 0,
    FOREIGN KEY (cliente_id) REFERENCES clientes (id)
  )`, (err) => {
    if (err) {
      console.error('Error creating reparto table:', err.message);
    } else {
      console.log('Reparto table created or already exists.');
    }
  });

  db.run(`CREATE TABLE IF NOT EXISTS precios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    producto TEXT NOT NULL,
    precio REAL NOT NULL
  )`, (err) => {
    if (err) {
      console.error('Error creating precios table:', err.message);
    } else {
      console.log('Precios table created or already exists.');
    }
  });

  db.run(`CREATE TABLE IF NOT EXISTS ventas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cliente_id INTEGER,
    producto_id INTEGER,
    cantidad INTEGER NOT NULL,
    precio_total REAL NOT NULL,
    fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (cliente_id) REFERENCES clientes (id),
    FOREIGN KEY (producto_id) REFERENCES precios (id)
  )`, (err) => {
    if (err) {
      console.error('Error creating ventas table:', err.message);
    } else {
      console.log('Ventas table created or already exists.');
    }
  });

});

db.close((err) => {
  if (err) {
    console.error(err.message);
  }
  console.log('Closed the database connection.');
});
