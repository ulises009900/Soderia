const pool = require('./db-config');

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

async function seedClientes() {
    const client = await pool.connect();
    let inserted = 0;
    let duplicated = 0;

    try {
        console.log('Conectado a PostgreSQL. Insertando clientes...');

        for (const cliente of clientes) {
            const result = await client.query(
                `INSERT INTO clientes (nombre, direccion, telefono, email)
                 VALUES ($1, $2, $3, $4)
                 ON CONFLICT (nombre) DO NOTHING
                 RETURNING id`,
                [cliente.nombre, cliente.direccion, cliente.telefono, cliente.email]
            );

            if (result.rowCount > 0) {
                console.log(`✓ ${cliente.nombre} - Insertado (ID: ${result.rows[0].id})`);
                inserted++;
            } else {
                console.log(`! ${cliente.nombre} - Ya existe`);
                duplicated++;
            }
        }

        const totalResult = await client.query('SELECT COUNT(*)::int AS total FROM clientes');
        console.log(`\nResumen: ${inserted} clientes insertados, ${duplicated} duplicados`);
        console.log(`Total de clientes en la base de datos: ${totalResult.rows[0].total}`);
        process.exit(0);
    } catch (error) {
        console.error('Error insertando clientes:', error.message);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

seedClientes();
