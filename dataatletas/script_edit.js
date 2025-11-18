/**
 * RENDERIZADO DE LA TABLA (Con botones de acción)
 */
function renderTable() {
    const registeredDataContainer = document.getElementById('registeredData');
    
    if (athletesData.length === 0) {
        registeredDataContainer.innerHTML = '<p class="no-data-message">No hay atletas registrados aún. ¡Registra el primero!</p>';
        return;
    }

    let table = document.getElementById('athleteTable');
    let tableBody = document.getElementById('athleteTableBody');

    // 1. DIBUJAR LA ESTRUCTURA DE LA TABLA (7 columnas)
    if (!table) {
        registeredDataContainer.innerHTML = `
            <div class="table-responsive-wrapper">
                <table id="athleteTable" class="athlete-data-table">
                    <thead>
                        <tr class="table-header-row">
                            <th data-sort-key="cedula">Cédula</th>
                            <th data-sort-key="nombre">Nombre</th>
                            <th data-sort-key="apellido">Apellido</th>
                            <th data-sort-key="club">Club</th>    
                            <th data-sort-key="fechaNac">F. Nac.</th>
                            <th data-sort-key="division">División</th>
                            <th class="no-sort">Acciones</th>
                        </tr>
                    </thead>
                    <tbody id="athleteTableBody">
                    </tbody>
                </table>
            </div>
            <p class="table-note-message">Haz clic en cualquier encabezado de la tabla para ordenar los resultados.</p>
        `;
        tableBody = document.getElementById('athleteTableBody');
        setupSorting();    
    } else {
        tableBody.innerHTML = '';
    }
    
    // 2. LLENAR EL CUERPO DE LA TABLA (7 celdas de datos por fila)
    athletesData.forEach(data => {
        const newRow = tableBody.insertRow(-1);    
        newRow.classList.add('athlete-table-row');
        
        // AHORA SOLO RENDERIZAMOS LAS 6 COLUMNAS DE DATOS VISIBLES + LA COLUMNA DE ACCIONES
        newRow.innerHTML = `
            <td data-label="Cédula" class="table-data">${data.cedula}</td>
            <td data-label="Nombre" class="table-data">${data.nombre}</td>
            <td data-label="Apellido" class="table-data">${data.apellido}</td>
            <td data-label="Club" class="table-data">${data.club}</td>
            <td data-label="F. Nac." class="table-data">${data.fechaNac}</td>
            <td data-label="División" class="table-data">${data.division}</td>
            <td data-label="Acciones" class="table-data">
                <button class="action-button edit-button" onclick="editAthlete('${data.id}')">Editar</button>
                <button class="action-button delete-button" onclick="deleteAthlete('${data.id}', '${data.nombre} ${data.apellido}')">Eliminar</button>
            </td>
        `;
    });

    // ... [El resto de la función para el indicador de ordenamiento se mantiene igual] ...
    document.querySelectorAll('#athleteTable th').forEach(th => {
        th.classList.remove('sorted-asc', 'sorted-desc');
        if (th.getAttribute('data-sort-key') === currentSortKey) {
            th.classList.add(sortDirection === 'asc' ? 'sorted-asc' : 'sorted-desc');
        }
    });
}
