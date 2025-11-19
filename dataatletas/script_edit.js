// 1. IMPORTACIONES DE FIREBASE (Solo Lectura, Update y Delete)
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

setLogLevel('Debug');

// =========================================================================
// !!! ATENCIÓN: CONFIGURACIÓN PARA AMBIENTE EXTERNO (GitHub Pages) !!!
// REEMPLAZA ESTO CON TUS CLAVES REALES DE FIREBASE
// =========================================================================
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
        displayStatusMessage(`❌ Error CRÍTICO al iniciar Firebase: ${e.message}`, 'error');
	}
}

/**
 * 3. ESCUCHA EN TIEMPO REAL (onSnapshot)
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
		
		if (athletesData.length > 0) {
			// Nota: sortTable llama a renderTable(athletesData)
			sortTable(currentSortKey, false);	
		} else {
			renderTable(); // Si está vacía, renderiza la tabla con el mensaje "No hay datos"
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
 * 4. FUNCIÓN DE ACTUALIZACIÓN (handleFormSubmit) - Solo Edición
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
	
    // SOLO INCLUIMOS LOS CAMPOS QUE SE PUEDEN EDITAR.
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
    if (!confirm(`¿Estás seguro de que quieres ELIMINAR al atleta ${name}? Esta acción es irreversible.`)) {
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
 * Lógica para mostrar/ocultar y resetear el formulario de edición
 */
function setFormMode(isEditing) {
    const formSection = document.getElementById('editFormSection');
    const form = document.getElementById('athleteForm');
    const cedulaInput = form.cedula;
    const submitBtn = document.getElementById('submitButton');
    const cancelBtn = document.getElementById('cancelEditButton');

    if (isEditing) {
        formSection.style.display = 'block'; // Mostrar el formulario
        submitBtn.textContent = 'Guardar Cambios';
        cancelBtn.style.display = 'inline-block';
        cedulaInput.disabled = true; // No permitir cambiar la cédula durante la edición
    } else {
        formSection.style.display = 'none'; // Ocultar el formulario
        cedulaInput.disabled = false;
        form.athleteId.value = ''; // Limpiar el ID
        form.reset();
    }
}

/**
 * FUNCIÓN DE BÚSQUEDA POR CÉDULA/ID (NUEVO)
 */
function searchAthlete() {
    const searchInput = document.getElementById('searchInput');
    const searchValue = searchInput.value.trim();

    if (searchValue === '') {
        // Si el campo de búsqueda está vacío, restablece la vista (mostrar todos).
        sortTable(currentSortKey, false);
        return;
    }

    // 1. Filtrar los datos: Usamos includes para buscar la cédula en la lista
    const filteredData = athletesData.filter(athlete => 
        athlete.cedula && String(athlete.cedula).includes(searchValue)
    );

    // 2. Renderizar la tabla con los resultados filtrados
    renderTable(filteredData);
}

/**
 * LÓGICA DE ORDENAMIENTO
 */
function sortTable(key, toggleDirection = true) {
	if (currentSortKey === key && toggleDirection) {
		sortDirection = (sortDirection === 'asc') ? 'desc' : 'asc';
	} else if (currentSortKey !== key) {
		currentSortKey = key;
		sortDirection = 'asc';
	}

	athletesData.sort((a, b) => {
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

	renderTable(athletesData);
}

/**
 * RENDERIZADO DE LA TABLA (Maneja el filtro de búsqueda y el mensaje de no encontrado)
 */
function renderTable(dataToDisplay = athletesData) {
    const registeredDataContainer = document.getElementById('registeredData');
    let table = document.getElementById('athleteTable');
    let tableBody = document.getElementById('athleteTableBody');
    
    // 1. Manejo de mensajes (No hay data general o No hay resultados de búsqueda)
    if (dataToDisplay.length === 0) {
        // Comprobamos si fue una búsqueda la que falló
        if (document.getElementById('searchInput') && document.getElementById('searchInput').value.trim() !== '') {
            registeredDataContainer.innerHTML = `
                <p class="no-results-message">
                    ❌ **Atleta No Registrado:** No se encontró ningún atleta con la Cédula/ID introducida.
                </p>
            `;
        } else {
            // Mensaje estándar cuando no hay registros en la DB
            registeredDataContainer.innerHTML = '<p class="no-data-message">No hay atletas registrados aún. ¡Registra el primero!</p>';
        }
        
        // Si no hay datos, ocultar la tabla si existe y el botón de reset
        if (table) table.remove();
        if (document.getElementById('resetButton')) document.getElementById('resetButton').style.display = 'none';
        return;
    }

	// 2. DIBUJAR LA ESTRUCTURA DE LA TABLA (7 columnas)
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
        table = document.getElementById('athleteTable');
	} else {
		tableBody.innerHTML = '';
	}
	
	// 3. LLENAR EL CUERPO DE LA TABLA (7 celdas de datos por fila)
	dataToDisplay.forEach(data => {
        const newRow = tableBody.insertRow(-1);	
        newRow.classList.add('athlete-table-row');
        
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

    // 4. Actualizar el indicador de ordenamiento
    document.querySelectorAll('#athleteTable th').forEach(th => {
        th.classList.remove('sorted-asc', 'sorted-desc');
        // Solo aplica el indicador si estamos mostrando la data completa y ordenada
        if (dataToDisplay === athletesData && th.getAttribute('data-sort-key') === currentSortKey) {
            th.classList.add(sortDirection === 'asc' ? 'sorted-asc' : 'sorted-desc');
        }
    });
    
    // Si la data mostrada es filtrada, mostrar el botón de reset.
    if (document.getElementById('resetButton')) {
        document.getElementById('resetButton').style.display = (dataToDisplay.length > 0 && dataToDisplay !== athletesData) ? 'inline-block' : 'none';
    }
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

/**
 * CONFIGURACIÓN DE LISTENERS para BÚSQUEDA (NUEVO)
 */
function setupSearchListeners() {
    const searchButton = document.getElementById('searchButton');
    const resetButton = document.getElementById('resetButton');
    const searchInput = document.getElementById('searchInput');
    
    if (searchButton) {
        searchButton.addEventListener('click', searchAthlete);
    }
    
    if (resetButton) {
        resetButton.addEventListener('click', () => {
            searchInput.value = ''; // Limpiar el input
            sortTable(currentSortKey, false); // Vuelve a cargar y ordenar toda la data
        });
    }
    
    if (searchInput) {
        // Permitir búsqueda al presionar ENTER
        searchInput.addEventListener('keyup', (event) => {
            if (event.key === 'Enter') {
                searchAthlete();
            }
        });
    }
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


// Inicializar Firebase y los Listeners al cargar el contenido
document.addEventListener('DOMContentLoaded', () => {
	initFirebaseAndLoadData();
	setupEditListeners();
    setupSearchListeners(); // <--- ¡Importante: Inicializa la nueva lógica de búsqueda!
});

// Exponer funciones globales para que los onclick de la tabla funcionen
window.editAthlete = editAthlete;
window.deleteAthlete = deleteAthlete;
window.setFormMode = setFormMode;
window.searchAthlete = searchAthlete; // Por si se necesita llamar desde otro lado
