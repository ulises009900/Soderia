/**
 * Script para hacer las tablas responsivas
 * Agrega automáticamente atributos data-label a las celdas de tabla
 */

document.addEventListener('DOMContentLoaded', function() {
    // Procesar todas las tablas en la página
    const tablas = document.querySelectorAll('table');
    
    tablas.forEach(tabla => {
        // Obtener los headers
        const headers = Array.from(tabla.querySelectorAll('thead th')).map(th => 
            th.textContent.trim()
        );
        
        // Si no hay headers, intentar obtenerlos de la primera fila
        if (headers.length === 0) {
            return;
        }
        
        // Agregar data-label a cada celda
        tabla.querySelectorAll('tbody td').forEach((td, index) => {
            const columnIndex = index % headers.length;
            const label = headers[columnIndex];
            
            if (label && !td.getAttribute('data-label')) {
                td.setAttribute('data-label', label);
            }
        });
    });
    
    // Hacer visible los inputs y selects de búsqueda en móvil
    const searchInputs = document.querySelectorAll('input[placeholder*="uscar"], input[placeholder*="Uscar"]');
    searchInputs.forEach(input => {
        input.style.width = '100%';
    });
});
