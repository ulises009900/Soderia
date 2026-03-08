const sqlite3 = require('sqlite3').verbose();

// Productos típicos de una sodería
const productos = [
    { nombre: 'Agua Mineral 1L', descripcion: 'Botella de agua mineral 1 litro', precio_unitario: 20, stock: 100 },
    { nombre: 'Agua Mineral 1.5L', descripcion: 'Botella de agua mineral 1.5 litros', precio_unitario: 25, stock: 80 },
    { nombre: 'Agua Mineral 2L', descripcion: 'Botella de agua mineral 2 litros', precio_unitario: 35, stock: 60 },
    { nombre: 'Coca Cola 1L', descripcion: 'Gaseosa Coca Cola 1 litro', precio_unitario: 45, stock: 50 },
    { nombre: 'Coca Cola 2L', descripcion: 'Gaseosa Coca Cola 2 litros', precio_unitario: 75, stock: 40 },
    { nombre: 'Sprite 1L', descripcion: 'Gaseosa Sprite 1 litro', precio_unitario: 40, stock: 45 },
    { nombre: 'Sprite 2L', descripcion: 'Gaseosa Sprite 2 litros', precio_unitario: 70, stock: 35 },
    { nombre: 'Fanta Naranja 1L', descripcion: 'Gaseosa Fanta Naranja 1 litro', precio_unitario: 35, stock: 50 },
    { nombre: 'Fanta Naranja 2L', descripcion: 'Gaseosa Fanta Naranja 2 litros', precio_unitario: 60, stock: 40 },
    { nombre: 'Jugo Natural 1L', descripcion: 'Jugo de naranja natural 1 litro', precio_unitario: 50, stock: 30 },
    { nombre: 'Soda de Limón 1L', descripcion: 'Agua de soda con limón 1 litro', precio_unitario: 18, stock: 90 },
    { nombre: 'Soda Común 1L', descripcion: 'Agua de soda común 1 litro', precio_unitario: 15, stock: 120 },
    { nombre: 'Té Frío 1L', descripcion: 'Té frío 1 litro', precio_unitario: 30, stock: 25 },
    { nombre: 'Gatorade 1L', descripcion: 'Bebida energética Gatorade 1 litro', precio_unitario: 55, stock: 20 },
    { nombre: 'Agua con Gas 1L', descripcion: 'Agua gasificada 1 litro', precio_unitario: 32, stock: 55 }
];

const db = new sqlite3.Database('soderia.db', (err) => {
    if (err) {
        console.error('Error conectando a la base de datos:', err.message);
        process.exit(1);
    }
    console.log('Conectado a la base de datos soderia.db');
});

let inserted = 0;
let duplicated = 0;

db.serialize(() => {
    productos.forEach(producto => {
        db.run(
            `INSERT INTO productos (nombre, descripcion, precio_unitario, stock) VALUES (?, ?, ?, ?)`,
            [producto.nombre, producto.descripcion, producto.precio_unitario, producto.stock],
            function(err) {
                if (err) {
                    if (err.message.includes('UNIQUE constraint failed')) {
                        console.log(`⚠️  ${producto.nombre} - Ya existe`);
                        duplicated++;
                    } else {
                        console.error(`❌ Error insertando ${producto.nombre}:`, err.message);
                    }
                } else {
                    console.log(`✓ ${producto.nombre} - Insertado (ID: ${this.lastID})`);
                    inserted++;
                }
            }
        );
    });

    // Mostrar resumen después de 1 segundo
    setTimeout(() => {
        db.get('SELECT COUNT(*) as total FROM productos', (err, row) => {
            if (err) {
                console.error('Error consultando total:', err);
            } else {
                console.log(`\n✅ Resumen: ${inserted} productos insertados, ${duplicated} duplicados`);
                console.log(`📊 Total de productos en la base de datos: ${row.total}`);
                db.close((err) => {
                    if (err) {
                        console.error('Error cerrando base de datos:', err);
                    }
                    process.exit(0);
                });
            }
        });
    }, 500);
});
