/**
 * RENDERIZADO DE LA TABLA (Asegura que TH y TD coincidan)
 */
function renderTable() {
    const registeredDataContainer = document.getElementById('registeredData');
    const tableHeaders = [
        { key: "cedula", label: "Cédula" },
        { key: "nombre", label: "Nombre" },
        { key: "apellido", label: "Apellido" },
        { key: "club", label: "Club" },
        { key: "fechaNac", label: "F. Nac." },
        { key: "division", label: "División" }
        // Si quieres añadir Talla, Peso, Teléfono, etc., agrégales aquí
    ];
    
    if (athletesData.length === 0) {
        registeredDataContainer.innerHTML = '<p class="no-data-message">No hay atletas registrados aún. ¡Registra el primero!</p>';
        return;
    }

    let table = document.getElementById('athleteTable');
    let tableBody = document.getElementById('athleteTableBody');

    if (!table) {
        // --- 1. CONSTRUIR ENCABEZADOS (<thead>) ---
        let headerRowHTML = tableHeaders.map(header => {
            const isSorted = header.key === currentSortKey;
            const sortClass = isSorted ? (sortDirection === 'asc' ? 'sorted-asc' : 'sorted-desc') : '';
            return `<th data-sort-key="${header.key}" class="${sortClass}">${header.label}</th>`;
        }).join('');

        registeredDataContainer.innerHTML = `
            <div class="table-responsive-wrapper">
                <table id="athleteTable" class="athlete-data-table">
                    <thead>
                        <tr class="table-header-row">${headerRowHTML}</tr>
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
    
    // --- 2. CONSTRUIR FILAS DE DATOS (<tbody>) ---
    athletesData.forEach(data => {
        const newRow = tableBody.insertRow(-1);	
        newRow.classList.add('athlete-table-row');
        
        // Asegura que las celdas se inserten en el mismo orden que los encabezados
        newRow.innerHTML = `
            <td data-label="Cédula" class="table-data">${data.cedula || '-'}</td>
            <td data-label="Nombre" class="table-data">${data.nombre || '-'}</td>
            <td data-label="Apellido" class="table-data">${data.apellido || '-'}</td>
            <td data-label="Club" class="table-data">${data.club || '-'}</td>
            <td data-label="F. Nac." class="table-data">${data.fechaNac || '-'}</td>
            <td data-label="División" class="table-data">${data.division || '-'}</td>
        `;
    });
    
    // 3. Aplicar clases de ordenamiento al renderizado (sin cambios)
    document.querySelectorAll('#athleteTable th').forEach(th => {
        th.classList.remove('sorted-asc', 'sorted-desc');
        if (th.getAttribute('data-sort-key') === currentSortKey) {
            th.classList.add(sortDirection === 'asc' ? 'sorted-asc' : 'sorted-desc');
        }
    });
}
