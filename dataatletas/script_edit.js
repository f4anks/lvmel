// 1. IMPORTACIONES DE FIREBASE (Mismo contenido)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, collection, query, onSnapshot, setLogLevel, updateDoc, doc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// VARIABLES DE ESTADO Y FIREBASE
let db;
let auth;
let userId = '';	
let athletesData = [];	
let currentSortKey = 'apellido';	
let sortDirection = 'asc';	
// === NUEVAS VARIABLES PARA BÚSQUEDA ===
let isFiltered = false;
let filteredData = [];
// ======================================

setLogLevel('Debug');

// ... (EXTERNAL_FIREBASE_CONFIG - Mismo contenido)

/**
 * Muestra un mensaje temporal de estado en la interfaz. (Mismo contenido)
 */
function displayStatusMessage(message, type) {
	// ... (Mismo contenido)
}


/**
 * 2. INICIALIZACIÓN Y AUTENTICACIÓN (Mismo contenido)
 */
async function initFirebaseAndLoadData() {
	// ... (Mismo contenido)
}

/**
 * 3. ESCUCHA EN TIEMPO REAL (onSnapshot) - MODIFICADA
 */
function setupRealtimeListener(appId) {
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
		
		// LÓGICA DE FILTRADO EN TIEMPO REAL:
		if (isFiltered) {
			const currentSearchTerm = document.getElementById('searchInput').value;
			if (currentSearchTerm) {
				// Si hay un filtro activo, volvemos a aplicarlo a los datos recién sincronizados
				applySearchFilter(currentSearchTerm);
			} else {
				// Si el input está vacío pero isFiltered es true (estado inconsistente), reseteamos.
				clearSearchFilter(); 
			}
		} else {
			// Si no estamos filtrando, ordenamos y renderizamos la lista completa.
			if (athletesData.length > 0) {
				sortTable(currentSortKey, false);	
			} else {
				renderTable();
			}
		}
	}, (error) => {
		console.error("Error en la escucha en tiempo real:", error);
        if (error.code === 'permission-denied') {
            displayStatusMessage("❌ ERROR DE PERMISO DE LECTURA: No se pueden mostrar los datos. ¡REVISA TUS REGLAS DE FIRESTORE!", 'error');
        } else {
            displayStatusMessage(`❌ Error al cargar datos: ${error.message}`, 'error');
        }
	});
}


/**
 * 4. FUNCIÓN DE EDICIÓN/ACTUALIZACIÓN (handleFormSubmit) (Mismo contenido)
 */
async function handleFormSubmit(event) {
	// ... (Mismo contenido)
}


/**
 * 5. FUNCIÓN DE EDICIÓN (Carga de datos) (Mismo contenido)
 */
function editAthlete(id) {
	// ... (Mismo contenido)
}

/**
 * 6. FUNCIÓN DE ELIMINACIÓN (Mismo contenido)
 */
async function deleteAthlete(id, name) {
	// ... (Mismo contenido)
}

/**
 * Lógica para mostrar/ocultar el formulario y resetearlo (Mismo contenido)
 */
function setFormMode(isEditing) {
	// ... (Mismo contenido)
}

// --------------------------------------------------------------------------
// LÓGICA DE BÚSQUEDA (NUEVAS FUNCIONES)
// --------------------------------------------------------------------------

/**
 * Función central que aplica el filtro de cédula y actualiza el estado.
 */
function applySearchFilter(cedula) {
    const cedulaToSearch = String(cedula).trim();
    const resultMessageEl = document.getElementById('searchResultMessage');
    const clearButton = document.getElementById('clearSearchButton');
    
    // Si el campo de búsqueda está vacío, volvemos al modo normal
    if (cedulaToSearch === "") {
        clearSearchFilter();
        return;
    }

    // Filtrar los datos: busca coincidencias exactas en la cédula
    filteredData = athletesData.filter(athlete => 
        String(athlete.cedula).trim() === cedulaToSearch
    );
    
    isFiltered = true;

    if (filteredData.length > 0) {
        resultMessageEl.textContent = `✅ ${filteredData.length} Atleta(s) encontrado(s).`;
        resultMessageEl.classList.remove('error');
        resultMessageEl.classList.add('success');
    } else {
        resultMessageEl.textContent = "⚠️ Este Atleta no está registrado.";
        resultMessageEl.classList.remove('success');
        resultMessageEl.classList.add('success'); // El estilo de error se aplica con el CSS
    }

    clearButton.style.display = 'inline-flex'; // Mostrar botón de Borrar
    sortTable(currentSortKey, false, filteredData); // Ordenar y renderizar los datos filtrados
}


/**
 * Manejador del botón de Búsqueda
 */
function handleSearch() {
    const searchInput = document.getElementById('searchInput');
    const cedula = searchInput.value;
    
    if (cedula.trim() === "") {
        displayStatusMessage("Por favor, ingresa una cédula para buscar.", 'error');
        clearSearchFilter();
        return;
    }

    document.getElementById('searchResultMessage').textContent = 'Buscando...';

    // Aplicar el filtro
    applySearchFilter(cedula);
}

/**
 * Función para borrar el filtro y recargar la tabla completa
 */
function clearSearchFilter() {
    isFiltered = false;
    filteredData = [];
    document.getElementById('searchInput').value = '';
    document.getElementById('searchResultMessage').textContent = '';
    document.getElementById('clearSearchButton').style.display = 'none';

    // Recargar la tabla completa (ordenada)
    if (athletesData.length > 0) {
        sortTable(currentSortKey, false);
    } else {
        renderTable();
    }
}

// --------------------------------------------------------------------------
// LÓGICA DE ORDENAMIENTO (MODIFICADA)
// --------------------------------------------------------------------------

/**
 * LÓGICA DE ORDENAMIENTO - Acepta un array opcional para ordenar datos filtrados
 */
function sortTable(key, toggleDirection = true, dataToSort = null) {
    
	if (currentSortKey === key && toggleDirection) {
		sortDirection = (sortDirection === 'asc') ? 'desc' : 'asc';
	} else if (currentSortKey !== key) {
		currentSortKey = key;
		sortDirection = 'asc';
	}
    
    // Determinar qué datos ordenar: usa dataToSort, sino los filtrados, sino todos.
    const data = dataToSort || (isFiltered ? filteredData : athletesData);

	data.sort((a, b) => {
		let valA = a[key];
		let valB = b[key];

		if (key === 'tallaRaw' || key === 'pesoRaw') {
			valA = parseFloat(valA) || 0;
			valB = parseFloat(valB) || 0;
		} else if (key === 'fechaNac') {
			valA = new Date(valA);
			valB = new Date(valB);
		} else {
			valA = String(valA).toLowerCase();
			valB = String(valB).toLowerCase();
		}

		let comparison = 0;
		if (valA > valB) { comparison = 1; }	
		else if (valA < valB) { comparison = -1; }
		
		return (sortDirection === 'desc') ? (comparison * -1) : comparison;
	});

	renderTable(data); // Renderizar los datos ya ordenados
}

/**
 * RENDERIZADO DE LA TABLA (MODIFICADA) - Acepta un array opcional para renderizar
 */
function renderTable(dataToRender = null) {
    // Determinar los datos a usar: dataToRender tiene prioridad, luego los filtrados, luego todos.
    const data = dataToRender || (isFiltered ? filteredData : athletesData); 
    const registeredDataContainer = document.getElementById('registeredData');
    
    if (data.length === 0) {
        // Mensaje diferente si no hay datos debido a un filtro
        if (isFiltered) {
            registeredDataContainer.innerHTML = '<p class="no-data-message">No se encontraron resultados para la búsqueda.</p>';
        } else {
            registeredDataContainer.innerHTML = '<p class="no-data-message">No hay atletas registrados aún. ¡Registra el primero!</p>';
        }
        
        // Limpiar indicadores y eliminar tabla si existe
        document.querySelectorAll('#athleteTable th').forEach(th => th.classList.remove('sorted-asc', 'sorted-desc'));
        let table = document.getElementById('athleteTable');
        if (table) table.remove();
        
        return;
    }

    let table = document.getElementById('athleteTable');
    let tableBody = document.getElementById('athleteTableBody');

    // 1. DIBUJAR LA ESTRUCTURA DE LA TABLA (Mismo contenido)
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
    
    // 2. LLENAR EL CUERPO DE LA TABLA (Ahora itera sobre el array 'data')
    data.forEach(athlete => { 
        const newRow = tableBody.insertRow(-1);     
        newRow.classList.add('athlete-table-row');
        
        newRow.innerHTML = `
            <td data-label="Cédula" class="table-data">${athlete.cedula}</td>
            <td data-label="Nombre" class="table-data">${athlete.nombre}</td>
            <td data-label="Apellido" class="table-data">${athlete.apellido}</td>
            <td data-label="Club" class="table-data">${athlete.club}</td>
            <td data-label="F. Nac." class="table-data">${athlete.fechaNac}</td>
            <td data-label="División" class="table-data">${athlete.division}</td>
            <td data-label="Acciones" class="table-data">
                <button class="action-button edit-button" onclick="editAthlete('${athlete.id}')">Editar</button>
                <button class="action-button delete-button" onclick="deleteAthlete('${athlete.id}', '${athlete.nombre} ${athlete.apellido}')">Eliminar</button>
            </td>
        `;
    });

    document.querySelectorAll('#athleteTable th').forEach(th => {
        th.classList.remove('sorted-asc', 'sorted-desc');
        if (th.getAttribute('data-sort-key') === currentSortKey) {
            th.classList.add(sortDirection === 'asc' ? 'sorted-asc' : 'sorted-desc');
        }
    });
}

function setupSorting() {
    // ... (Mismo contenido)
}

function setupEditListeners() {
    // ... (Mismo contenido)
}

// --------------------------------------------------------------------------
// NUEVO SETUP DE LISTENERS PARA LA BÚSQUEDA
// --------------------------------------------------------------------------
function setupSearchListeners() {
    const searchButton = document.getElementById('searchButton');
    const clearButton = document.getElementById('clearSearchButton');
    const searchInput = document.getElementById('searchInput');

    if (searchButton) {
        searchButton.addEventListener('click', handleSearch);
    }
    if (clearButton) {
        clearButton.addEventListener('click', clearSearchFilter);
    }
    if (searchInput) {
        // Permite buscar presionando Enter
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                handleSearch();
            }
        });
    }
}


// Inicializar Firebase y los Listeners al cargar el contenido (MODIFICADA)
document.addEventListener('DOMContentLoaded', () => {
	initFirebaseAndLoadData();
	setupEditListeners();
	setupSearchListeners(); // <--- NUEVA LLAMADA
});

// Exponer funciones globales para que los onclick de la tabla funcionen (Mismo contenido)
window.editAthlete = editAthlete;
window.deleteAthlete = deleteAthlete;
window.setFormMode = setFormMode;
