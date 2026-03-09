#!/usr/bin/env node

/**
 * Script de validación para verificar que la migración a PostgreSQL está correcta
 * Uso: node verify-postgres-setup.js
 */

const fs = require('fs');
const path = require('path');

const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function checkFile(filePath, fileName) {
    const fullPath = path.join(__dirname, filePath);
    if (fs.existsSync(fullPath)) {
        log(`✓ ${fileName} existe`, 'green');
        return true;
    } else {
        log(`✗ ${fileName} NO ENCONTRADO`, 'red');
        return false;
    }
}

function checkPackageJson() {
    try {
        const pkg = require('./package.json');
        
        // Verificar scripts
        if (pkg.scripts.start && pkg.scripts.start.includes('server-postgres')) {
            log(`✓ Scripts actualizados en package.json`, 'green');
            return true;
        } else {
            log(`✗ Scripts no están actualizados (debe usar server-postgres.js)`, 'yellow');
            return false;
        }
    } catch (e) {
        log(`✗ Error leyendo package.json: ${e.message}`, 'red');
        return false;
    }
}

function checkDependencies() {
    try {
        const pkg = require('./package.json');
        const deps = pkg.dependencies || {};
        
        let ok = true;
        
        if (!deps.pg) {
            log(`✗ Dependencia 'pg' no encontrada en package.json`, 'red');
            ok = false;
        } else {
            log(`✓ Dependencia 'pg' presente (${deps.pg})`, 'green');
        }
        
        if (deps.sqlite3) {
            log(`✗ Dependencia 'sqlite3' detectada: remuévela para usar solo PostgreSQL`, 'red');
            ok = false;
        }
        
        return ok;
    } catch (e) {
        log(`✗ Error verificando dependencias: ${e.message}`, 'red');
        return false;
    }
}

function checkEnv() {
    const envPath = path.join(__dirname, '.env');
    if (fs.existsSync(envPath)) {
        log(`✓ Archivo .env existe`, 'green');
        return true;
    } else {
        log(`⚠ Archivo .env no encontrado (copia de .env.example y configura)`, 'yellow');
        return false;
    }
}

async function main() {
    log('\n' + '='.repeat(50), 'blue');
    log('  VALIDACIÓN: PostgreSQL Setup para Soderia', 'blue');
    log('='.repeat(50) + '\n', 'blue');
    
    let allOk = true;
    
    // Verificar archivos esenciales
    log('\n📁 Verificando archivos:', 'blue');
    allOk &= checkFile('db-config.js', 'db-config.js');
    allOk &= checkFile('init-postgres.js', 'init-postgres.js');
    allOk &= checkFile('server-postgres.js', 'server-postgres.js');
    
    // Verificar documentación
    log('\n📚 Verificando documentación:', 'blue');
    checkFile('POSTGRES_SETUP.md', 'POSTGRES_SETUP.md');
    checkFile('MIGRATION_GUIDE.md', 'MIGRATION_GUIDE.md');
    checkFile('RENDER_SERVICE_INFO.md', 'RENDER_SERVICE_INFO.md');
    
    // Verificar configuración
    log('\n⚙️  Verificando configuración:', 'blue');
    allOk &= checkPackageJson();
    allOk &= checkDependencies();
    allOk &= checkEnv();
    
    // Resumen
    log('\n' + '='.repeat(50), 'blue');
    if (allOk) {
        log('✓ VALIDACIÓN COMPLETADA - Todo parece estar en orden', 'green');
        log('\nPróximos pasos:', 'blue');
        log('1. npm install  (instalar dependencias)', 'yellow');
        log('2. npm run init-db  (crear tablas en BD)', 'yellow');
        log('3. npm start  (probar localmente)', 'yellow');
        log('4. git push  (deploy a Render)', 'yellow');
    } else {
        log('⚠ VALIDACIÓN FALLIDA - Revisa los errores arriba', 'red');
        log('\nAsegúrate de que:', 'yellow');
        log('- Todos los archivos PostgreSQL existen', 'yellow');
        log('- package.json está actualizado', 'yellow');
        log('- .env está configurado correctamente', 'yellow');
    }
    log('='.repeat(50) + '\n', 'blue');
    
    process.exit(allOk ? 0 : 1);
}

main();
