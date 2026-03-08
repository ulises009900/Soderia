const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('soderia.db', (err) => {
    if (err) {
        console.error('Error conectando a la base de datos:', err.message);
        process.exit(1);
    }
    console.log('📊 ESTRUCTURA DE LA BASE DE DATOS - SODERÍA\n');
    console.log('=========================================\n');
});

db.serialize(() => {
    // Tablas
    db.all(`SELECT name FROM sqlite_master WHERE type='table' ORDER BY name`, (err, tables) => {
        if (err) {
            console.error('Error:', err.message);
            return;
        }
        
        console.log(`✓ Total de tablas: ${tables.length}\n`);
        
        let processed = 0;
        tables.forEach(table => {
            db.all(`PRAGMA table_info(${table.name})`, (err, columns) => {
                console.log(`📋 Tabla: ${table.name.toUpperCase()}`);
                console.log('-'.repeat(50));
                columns.forEach(col => {
                    const nullable = col.notnull ? 'NOT NULL' : 'NULL';
                    const pk = col.pk ? ' [PK]' : '';
                    console.log(`  • ${col.name} (${col.type}) ${nullable}${pk}`);
                });
                
                // Contar registros
                db.get(`SELECT COUNT(*) as count FROM ${table.name}`, (err, row) => {
                    if (err) {
                        console.log(`  Registros: Error`);
                    } else {
                        console.log(`  📌 Registros: ${row.count}`);
                    }
                    console.log();
                    
                    processed++;
                    if (processed === tables.length) {
                        console.log('=========================================');
                        console.log('✅ Base de datos lista para usar');
                        db.close();
                    }
                });
            });
        });
    });
});
