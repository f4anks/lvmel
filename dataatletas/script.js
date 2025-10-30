// --- (INICIO DE ARCHIVO script.js) ---

// Definiciones necesarias (asume que estas ya existen):
let athletesData = [];
let currentSortKey = 'apellido';
let sortDirection = 'asc';
// const db = getFirestore(app); // Asume que 'db' está inicializado

// ... (Otras funciones y definiciones de Firebase) ...


/**
 * 3. ESCUCHA EN TIEMPO REAL (onSnapshot)
 * Muestra el estado de "Cargando datos..." y luego renderiza la tabla.
 */
function setupRealtimeListener(appId) {
    // Muestra el mensaje de carga mientras espera la respuesta de Firebase
    displayStatusMessage("🔄 Cargando datos de atletas...", 'info');
    
	// Ruta crítica: Asegúrate de que esta ruta sea correcta para tu estructura
	const athletesColRef = collection(db, `artifacts/${appId}/public/data/athletes`); 
	const q = query(athletesColRef);

	onSnapshot(q, (snapshot) => {
		console.log("Datos de Firestore actualizados. Sincronizando tabla...");
		const fetchedData = [];
		snapshot.forEach((doc) => {
			fetchedData.push({	
				id: doc.id, 
				...doc.data()	
			});
		});
		
		athletesData = fetchedData;
		
		if (athletesData.length > 0) {
			// Al cargar, ordenar por el campo inicial (apellido) y renderizar
			sortTable(currentSortKey, false);	
		} else {
            // Renderiza la tabla con el mensaje de "No hay atletas"
			renderTable(); 
		}
	}, (error) => {
        // MANEJO DE ERROR CRÍTICO
		console.error("Error en la escucha en tiempo real:", error);
        if (error.code === 'permission-denied') {
             displayStatusMessage("❌ ERROR DE PERMISO: ¡REVISA TUS REGLAS DE FIRESTORE!", 'error');
        } else {
             displayStatusMessage(`❌ Error al cargar datos: ${error.message}. Verifica tu conexión.`, 'error');
        }
        // Forzar el renderizado para mostrar el mensaje de error
        athletesData = [];
        renderTable(); 
	});
}

/**
 * RENDERIZADO DE LA TABLA (Asegura que TH y TD coincidan y se apliquen clases)
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
    ];
    
    if (athletesData.length === 0) {
        // Muestra el mensaje "No hay atletas" si no se ha mostrado un error más grave
        if (!registeredDataContainer.querySelector('.error')) {
            registeredDataContainer.innerHTML = '<p class="no-data-message">No hay atletas registrados aún. ¡Registra el primero!</p>';
        }
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
        // Asegura que esta función exista y que añada los event listeners a los <th>
        setupSorting();	
    } else {
        tableBody.innerHTML = '';
    }
    
    // --- 2. CONSTRUIR FILAS DE DATOS (<tbody>) ---
    athletesData.forEach(data => {
        const newRow = tableBody.insertRow(-1);	
        newRow.classList.add('athlete-table-row');
        
        // Las celdas se insertan en el ORDEN EXACTO de los encabezados (tableHeaders)
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

// ... (Resto de tu script.js, incluyendo sortTable, setupSorting, initFirebaseAndLoadData, etc.) ...

// --- (FIN DE ARCHIVO script.js) ---
