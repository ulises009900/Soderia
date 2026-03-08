const sqlite3 = require('sqlite3').verbose();

// Clientes de ejemplo para una sodería
const clientes = [
    {
        nombre: 'Almacén Don Carlos',
        direccion: 'Calle Principal 123, Zona Centro',
        telefono: '541234567',
        email: 'doncarlos@almacen.com'
    },
    {
        nombre: 'Mini Market Los Andes',
        direccion: 'Avenida Libertad 456, Barrio Norte',
        telefono: '549876543',
        email: 'info@losandes.com'
    },
    {
        nombre: 'Kiosco de Don Roberto',
        direccion: 'Pasaje San Martín 789, Zona Sur',
        telefono: '541112222',
        email: 'kiosco.roberto@gmail.com'
    },
    {
        nombre: 'Supermercado La Economía',
        direccion: 'Ruta Nacional Km 5, Afuera',
        telefono: '543334444',
        email: 'laeconomia@super.com'
    },
    {
        nombre: 'Verdulería La Fresca',
        direccion: 'Calle 9 de Julio 234, Centro',
        telefono: '545556666',
        email: 'verduleria.fresca@gmail.com'
    },
    {
        nombre: 'Panadería El Trigo',
        direccion: 'Avenida San Juan 567, Barrio Este',
        telefono: '547778888',
        email: 'panaderiaeltrigo@yahoo.com'
    },
    {
        nombre: 'Distribuidora Regional',
        direccion: 'Avenida Industrial 890, Parque Industrial',
        telefono: '549999000',
        email: 'contacto@distribuidoraregional.com'
    },
    {
        nombre: 'Bodega Familiar',
        direccion: 'Calle Belgrano 345, Barrio Oeste',
        telefono: '541231234',
        email: 'bodegafamiliar@hotmail.com'
    },
    {
        nombre: 'Comercio Municipal',
        direccion: 'Plaza Principal 678, Centro',
        telefono: '543455555',
        email: 'comercio.municipal@gmail.com'
    },
    {
        nombre: 'Farmacia y Dietética',
        direccion: 'Calle Rivadavia 901, Zona Central',
        telefono: '545677788',
        email: 'farmacia.dietetica@gmail.com'
    }
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
    clientes.forEach(cliente => {
        db.run(
            `INSERT INTO clientes (nombre, direccion, telefono, email) VALUES (?, ?, ?, ?)`,
            [cliente.nombre, cliente.direccion, cliente.telefono, cliente.email],
            function(err) {
                if (err) {
                    if (err.message.includes('UNIQUE constraint failed')) {
                        console.log(`⚠️  ${cliente.nombre} - Ya existe`);
                        duplicated++;
                    } else {
                        console.error(`❌ Error insertando ${cliente.nombre}:`, err.message);
                    }
                } else {
                    console.log(`✓ ${cliente.nombre} - Insertado (ID: ${this.lastID})`);
                    inserted++;
                }
            }
        );
    });

    // Mostrar resumen después de 1 segundo
    setTimeout(() => {
        db.get('SELECT COUNT(*) as total FROM clientes', (err, row) => {
            if (err) {
                console.error('Error consultando total:', err);
            } else {
                console.log(`\n✅ Resumen: ${inserted} clientes insertados, ${duplicated} duplicados`);
                console.log(`📊 Total de clientes en la base de datos: ${row.total}`);
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
