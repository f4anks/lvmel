// ======================================================
// CÓDIGO CLAVE PARA LA CARGA Y EL RENDERIZADO DE LA TABLA
// ======================================================

// Variables globales necesarias (ASUME que ya están definidas en tu script)
let athletesData = [];
let currentSortKey = 'apellido';
let sortDirection = 'asc';
// const db = getFirestore(app); // ASUME que 'db' está inicializado
// function setupSorting() {} // ASUME que la función para añadir listeners existe
// function sortTable(key, toggle) {} // ASUME que la función de ordenamiento existe
// function displayStatusMessage(message, type) {} // ASUME que la función de mensajes existe

/**
 * Función CLAVE: Escucha en Tiempo Real (onSnapshot)
 * Soluciona el problema de "cargando datos" al manejar los errores y forzar el renderizado.
 */
function setupRealtimeListener(appId) {
    // Muestra el mensaje de carga mientras espera la respuesta de Firebase
    displayStatusMessage("🔄 Cargando datos de atletas...", 'info');
    
    // RUTA CRÍTICA: Ajusta si tu estructura de Firebase es diferente
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
			// Si hay datos, ordena y renderiza
			sortTable(currentSortKey, false);	
		} else {
            // Si no hay datos, renderiza la tabla vacía
			renderTable(); 
		}
	}, (error) => {
        // MANEJO DE ERROR CRÍTICO para no dejar la página en "cargando..."
		console.error("Error en la escucha en tiempo real:", error);
        if (error.code === 'permission-denied') {
             displayStatusMessage("❌ ERROR DE PERMISO: ¡REVISA TUS REGLAS DE FIRESTORE!", 'error');
        } else {
             displayStatusMessage(`❌ Error al cargar datos: ${error.message}. Verifica tu conexión.`, 'error');
        }
        // Forzar el renderizado para mostrar el mensaje de error o "No hay datos"
        athletesData = [];
        renderTable(); 
	});
}

/**
 * Función CLAVE: Renderizado de la Tabla (Asegura la estructura TH/TD)
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
        // Solo muestra el mensaje de no datos si no hay un mensaje de error activo
        if (!registeredDataContainer.querySelector('.error')) {
            registeredDataContainer.innerHTML = '<p class="no-data-message">No hay atletas registrados aún. ¡Registra el primero!</p>';
        }
        return;
    }

    let table = document.getElementById('athleteTable');
    let tableBody = document.getElementById('athleteTableBody');

    if (!table) {
        // 1. Construir Encabezados (<thead>)
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
    
    // 2. Construir Filas de Datos (<tbody>)
    athletesData.forEach(data => {
        const newRow = tableBody.insertRow(-1);	
        newRow.classList.add('athlete-table-row');
        
        // Las celdas se insertan en el ORDEN EXACTO de los encabezados
        newRow.innerHTML = `
            <td data-label="Cédula" class="table-data">${data.cedula || '-'}</td>
            <td data-label="Nombre" class="table-data">${data.nombre || '-'}</td>
            <td data-label="Apellido" class="table-data">${data.apellido || '-'}</td>
            <td data-label="Club" class="table-data">${data.club || '-'}</td>
            <td data-label="F. Nac." class="table-data">${data.fechaNac || '-'}</td>
            <td data-label="División" class="table-data">${data.division || '-'}</td>
        `;
    });
    
    // 3. Aplicar clases de ordenamiento
    document.querySelectorAll('#athleteTable th').forEach(th => {
        th.classList.remove('sorted-asc', 'sorted-desc');
        if (th.getAttribute('data-sort-key') === currentSortKey) {
            th.classList.add(sortDirection === 'asc' ? 'sorted-asc' : 'sorted-desc');
        }
    });
}
