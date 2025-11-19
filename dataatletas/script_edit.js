// =========================================================================
// script_edit.js: Lógica CRUD (Read, Update, Delete) y Ordenamiento/Búsqueda
// =========================================================================

// 1. IMPORTACIONES DE FIREBASE (COMPLETO: Lectura, Update y Delete)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, collection, query, onSnapshot, setLogLevel, updateDoc, doc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// VARIABLES DE ESTADO Y FIREBASE
let db;
let auth;
let userId = '';	
let athletesData = [];	// Datos brutos sin filtrar, obtenidos de Firestore
let currentSortKey = 'apellido';	
let sortDirection = 'asc';	
// === NUEVAS VARIABLES PARA BÚSQUEDA ===
let isFiltered = false; // Indica si la tabla está mostrando datos filtrados
let filteredData = []; // Los datos filtrados (si isFiltered es true)
// ======================================

setLogLevel('Debug');

// !!! ATENCIÓN: CONFIGURACIÓN PARA AMBIENTE EXTERNO (GitHub Pages) !!!
// REEMPLAZA ESTO CON TUS CLAVES REALES DE FIREBASE
const EXTERNAL_FIREBASE_CONFIG = {
	apiKey: "AIzaSyA5u1whBdu_fVb2Kw7SDRZbuyiM77RXVDE",
	authDomain: "datalvmel.firebaseapp.com",
	projectId: "datalvmel",
	storageBucket: "datalvmel.firebasestorage.app",
	messagingSenderId: "733536533303",
	appId: "1:733536533303:web:3d2073504aefb2100378b2"
};

/**
 * Muestra un mensaje temporal de estado en la interfaz.
 */
function displayStatusMessage(message, type) {
	let statusEl = document.getElementById('statusMessage');
	
	if (!statusEl) {
		statusEl = document.createElement('div');
		statusEl.id = 'statusMessage';
		statusEl.style.position = 'fixed';
		statusEl.style.top = '10px';
		statusEl.style.right = '10px';
		statusEl.style.padding = '10px 20px';
		statusEl.style.borderRadius = '8px';
		statusEl.style.zIndex = '1000';
		statusEl.style.color = '#fff';
		statusEl.style.transition = 'opacity 0.5s ease-in-out';
		statusEl.style.opacity = '0';
		
        if (document.body) {
            document.body.appendChild(statusEl);
        } else {
            console.error("No se pudo mostrar el mensaje de estado: El cuerpo del documento aún no está disponible.");
            return; 
        }
	}
	
	statusEl.textContent = message; 
	statusEl.style.backgroundColor = type === 'success' ? '#10b981' : '#ef4444';
	statusEl.style.opacity = '1';

	setTimeout(() => {
		statusEl.style.opacity = '0';
	}, 4000);
}


/**
 * 2. INICIALIZACIÓN Y AUTENTICACIÓN
 */
async function initFirebaseAndLoadData() {
	console.log("Iniciando Firebase y autenticación para Data...");
	try {
		let configToUse;
		let appIdToUse;
		
		if (typeof __firebase_config !== 'undefined' && __firebase_config.length > 2) {
			configToUse = JSON.parse(__firebase_config);
			appIdToUse = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
		} else {
			configToUse = EXTERNAL_FIREBASE_CONFIG;
			appIdToUse = configToUse.projectId;	
		}

		const app = initializeApp(configToUse);
		db = getFirestore(app);
		auth = getAuth(app);
		
		// Autenticación anónima: NECESARIA para Edición/Eliminación
        await signInAnonymously(auth);
		
		onAuthStateChanged(auth, (user) => {
			if (user) {
				userId = user.uid;
				console.log("Usuario autenticado para CRUD. UID:", userId);
				setupRealtimeListener(appIdToUse);
			} else {
				console.error("No se pudo autenticar al usuario.");
				// Si falla la autenticación, la lectura aún podría funcionar si las reglas lo permiten.
				setupRealtimeListener(appIdToUse); 
			}
		});

	} catch (e) {
		console.error("Error al inicializar Firebase:", e);
	}
}

/**
 * 3. ESCUCHA EN TIEMPO REAL (onSnapshot) - CORREGIDA
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
				// Vuelve a aplicar el filtro al nuevo conjunto de datos
				applySearchFilter(currentSearchTerm);
			} else {
				// Resetea si el filtro está activo pero el campo de búsqueda está vacío
				clearSearchFilter(); 
			}
		} else {
			// CORRECCIÓN: Llamamos a sortTable siempre. Esto asegura que la tabla 
            // se renderice con datos o con el mensaje de "No hay atletas..."
			sortTable(currentSortKey, false);	
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
 * 4. FUNCIÓN DE EDICIÓN/ACTUALIZACIÓN (handleFormSubmit)
 */
async function handleFormSubmit(event) {
	event.preventDefault();	

	if (!db) {
		displayStatusMessage("Error: La base de datos no está inicializada.", 'error');
		return false;
	}

	const form = document.getElementById('athleteForm');
    const athleteId = form.athleteId.value; 

	if (!athleteId) {
        displayStatusMessage("Error: ID de atleta no encontrado para la edición.", 'error');
        return false;
    }
    
	// 1. Recolectar datos y preparar el objeto (documento)
	const tallaValue = form.talla.value; 
	const pesoValue = form.peso.value; 
	
	const athleteData = {
		club: form.club.value,
		nombre: form.nombre.value,
		apellido: form.apellido.value,
		fechaNac: form.fechaNac.value,
		division: form.division.value,	
		tallaRaw: tallaValue,	
		pesoRaw: pesoValue,	 	
		tallaFormatted: tallaValue ? `${tallaValue} m` : 'N/A',
		pesoFormatted: pesoValue ? `${pesoValue} kg` : 'N/A',
		correo: form.correo.value,
		telefono: form.telefono.value,
		timestamp: Date.now()	
	};
	
	let appIdToUse;
	if (typeof __app_id !== 'undefined') {
		appIdToUse = __app_id;
	} else {
		appIdToUse = EXTERNAL_FIREBASE_CONFIG.projectId;
	}
    const athletesColPath = `artifacts/${appIdToUse}/public/data/athletes`;

	try {
        const athleteDocRef = doc(db, athletesColPath, athleteId);
        await updateDoc(athleteDocRef, athleteData);
        console.log("Atleta actualizado en Firestore con éxito. ID:", athleteId);
        displayStatusMessage("¡Atleta actualizado con éxito! (Sincronizando tabla...)", 'success');

	} catch(error) {
		console.error("!!! ERROR CRÍTICO AL INTENTAR ACTUALIZAR !!!", error.message);
		if (error.code === 'permission-denied') {
			displayStatusMessage("❌ ERROR DE PERMISO: ¡REVISA TUS REGLAS DE FIRESTORE!", 'error');
		} else {
			displayStatusMessage(`❌ ERROR al actualizar: ${error.message}`, 'error');
		}

	} finally {
		setFormMode(false); // Resetear el formulario al modo registro/oculto
	}
	
	return false;	
}


/**
 * 5. FUNCIÓN DE EDICIÓN (Carga de datos)
 */
function editAthlete(id) {
    const athlete = athletesData.find(a => a.id === id);
    if (!athlete) {
        displayStatusMessage("Error: No se encontró el atleta para editar.", 'error');
        return;
    }

    const form = document.getElementById('athleteForm');

    // Cargar los datos al formulario
    form.athleteId.value = id; // Clave: Guardar el ID
    form.cedula.value = athlete.cedula || '';
    form.club.value = athlete.club || '';
    form.nombre.value = athlete.nombre || '';
    form.apellido.value = athlete.apellido || '';
    form.fechaNac.value = athlete.fechaNac || '';
    form.division.value = athlete.division || '';
    form.talla.value = athlete.tallaRaw || '';
    form.peso.value = athlete.pesoRaw || '';
    form.correo.value = athlete.correo || '';
    form.telefono.value = athlete.telefono || '';

    setFormMode(true); // Mostrar el formulario en modo edición
    window.scrollTo({ top: 0, behavior: 'smooth' }); // Mover la vista al formulario
}

/**
 * 6. FUNCIÓN DE ELIMINACIÓN
 */
async function deleteAthlete(id, name) {
    if (!confirm(`¿Estás seguro de que quieres ELIMINAR al atleta ${name}?`)) {
        return;
    }
    
    let appIdToUse;
    if (typeof __app_id !== 'undefined') {
        appIdToUse = __app_id;
    } else {
        appIdToUse = EXTERNAL_FIREBASE_CONFIG.projectId;
    }
    const athletesColPath = `artifacts/${appIdToUse}/public/data/athletes`;

    try {
        const athleteDocRef = doc(db, athletesColPath, id);
        await deleteDoc(athleteDocRef);
        displayStatusMessage(`✅ Atleta ${name} eliminado con éxito. (Sincronizando tabla...)`, 'success');
    } catch (error) {
        console.error("!!! ERROR CRÍTICO AL INTENTAR ELIMINAR !!!", error);
        if (error.code === 'permission-denied') {
            displayStatusMessage("❌ ERROR DE PERMISO DE ELIMINACIÓN: ¡REVISA TUS REGLAS DE FIRESTORE!", 'error');
        } else {
            displayStatusMessage(`❌ ERROR al eliminar a ${name}: ${error.message}`, 'error');
        }
    }
}

/**
 * Lógica para mostrar/ocultar el formulario y resetearlo
 */
function setFormMode(isEditing) {
    const formSection = document.getElementById('editFormSection');
    const form = document.getElementById('athleteForm');
    const cedulaInput = form.cedula;

    if (isEditing) {
        formSection.style.display = 'block'; // Mostrar el formulario
        cedulaInput.disabled = true; // No permitir cambiar la cédula durante la edición
    } else {
        formSection.style.display = 'none'; // Ocultar el formulario
        cedulaInput.disabled = false;
        form.athleteId.value = ''; // Limpiar el ID
        form.reset();
    }
}


// --------------------------------------------------------------------------
// LÓGICA DE BÚSQUEDA
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
        resultMessageEl.classList.add('error');
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
    sortTable(currentSortKey, false);
}


// --------------------------------------------------------------------------
// LÓGICA DE ORDENAMIENTO
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
 * RENDERIZADO DE LA TABLA - Acepta un array opcional para renderizar
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

    // 1. DIBUJAR LA ESTRUCTURA DE LA TABLA 
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
    
    // 2. LLENAR EL CUERPO DE LA TABLA 
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
	document.querySelectorAll('#athleteTable th').forEach(header => {
		const key = header.getAttribute('data-sort-key');
		if (key) {
			header.style.cursor = 'pointer';	
			header.addEventListener('click', () => sortTable(key, true));	
		}
	});
}

function setupEditListeners() {
    const form = document.getElementById('athleteForm');
    const cancelBtn = document.getElementById('cancelEditButton');
    
    if (form) {
        form.addEventListener('submit', handleFormSubmit);
    }
    if (cancelBtn) {
        cancelBtn.addEventListener('click', () => setFormMode(false));
    }
}

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


// Inicializar Firebase y los Listeners al cargar el contenido
document.addEventListener('DOMContentLoaded', () => {
	initFirebaseAndLoadData();
	setupEditListeners();
	setupSearchListeners(); 
});

// Exponer funciones globales para que los onclick de la tabla funcionen
window.editAthlete = editAthlete;
window.deleteAthlete = deleteAthlete;
window.setFormMode = setFormMode;
