const pool = require('./db-config');

async function showDbInfo() {
    const client = await pool.connect();

    try {
        console.log('ESTRUCTURA DE LA BASE DE DATOS - SODERIA\n');
        console.log('=========================================\n');

        const tablesResult = await client.query(`
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
            ORDER BY table_name
        `);

        console.log(`Total de tablas: ${tablesResult.rowCount}\n`);

        for (const table of tablesResult.rows) {
            const tableName = table.table_name;
            console.log(`Tabla: ${tableName.toUpperCase()}`);
            console.log('-'.repeat(50));

            const columnsResult = await client.query(
                `SELECT column_name, data_type, is_nullable
                 FROM information_schema.columns
                 WHERE table_schema = 'public' AND table_name = $1
                 ORDER BY ordinal_position`,
                [tableName]
            );

            for (const col of columnsResult.rows) {
                const nullable = col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL';
                console.log(`  - ${col.column_name} (${col.data_type}) ${nullable}`);
            }

            const countResult = await client.query(`SELECT COUNT(*)::int AS count FROM ${tableName}`);
            console.log(`  Registros: ${countResult.rows[0].count}`);
            console.log();
        }

        console.log('=========================================');
        console.log('Base de datos lista para usar');
    } catch (error) {
        console.error('Error consultando estructura:', error.message);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

showDbInfo();
