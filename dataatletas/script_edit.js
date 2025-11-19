// 1. IMPORTACIONES DE FIREBASE (COMPLETO: Lectura, Update y Delete)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, collection, query, onSnapshot, setLogLevel, updateDoc, doc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// VARIABLES DE ESTADO Y FIREBASE
let db;
let auth;
let userId = '';	
let athletesData = [];  // Almacena la data RAW de Firebase (sin filtrar ni ordenar)
let currentSortKey = 'apellido';	
let sortDirection = 'asc';	
let currentSearchTerm = ''; // <-- NUEVO: Termino de búsqueda actual

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
	
	// Si el elemento no existe en el DOM (en el HTML que enviaste), lo crea
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
		
		await signInAnonymously(auth);
		
		onAuthStateChanged(auth, (user) => {
			if (user) {
				userId = user.uid;
				console.log("Usuario autenticado para CRUD. UID:", userId);
				setupRealtimeListener(appIdToUse);
			} else {
				console.error("No se pudo autenticar al usuario.");
				setupRealtimeListener(appIdToUse); 
			}
		});

	} catch (e) {
		console.error("Error al inicializar Firebase:", e);
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
		
		athletesData = fetchedData; // Se actualiza la fuente de verdad (RAW data)
		
		// Llama a la función principal que filtra, ordena y renderiza
		filterDataAndSort(); 
		
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
 * 4. FUNCIÓN PRINCIPAL DE PROCESAMIENTO (FILTRO Y ORDENAMIENTO)
 * Esta función es el nuevo punto central para actualizar la tabla.
 */
function filterDataAndSort() {
    let dataToProcess = athletesData;
    const term = currentSearchTerm.toLowerCase().trim();

    // 1. FILTRADO
    if (term) {
        dataToProcess = dataToProcess.filter(athlete => {
            return (
                String(athlete.cedula).toLowerCase().includes(term) ||
                String(athlete.nombre).toLowerCase().includes(term) ||
                String(athlete.apellido).toLowerCase().includes(term) ||
                String(athlete.club).toLowerCase().includes(term) ||
                String(athlete.division).toLowerCase().includes(term)
            );
        });
    }

    // 2. ORDENAMIENTO (crea una copia para ordenar)
    const sortedData = [...dataToProcess].sort((a, b) => {
        let valA = a[currentSortKey];
        let valB = b[currentSortKey];

        if (currentSortKey === 'tallaRaw' || currentSortKey === 'pesoRaw') {
            // Conversión segura a número para tallas y pesos
            valA = parseFloat(valA) || 0;
            valB = parseFloat(valB) || 0;
        } else if (currentSortKey === 'fechaNac') {
            // Conversión a objeto Date para ordenar correctamente
            valA = new Date(valA);
            valB = new Date(valB);
        } else {
            // Conversión a minúsculas para ordenamiento de texto sin distinción de mayúsculas
            valA = String(valA).toLowerCase();
            valB = String(valB).toLowerCase();
        }

        let comparison = 0;
        if (valA > valB) { comparison = 1; }	
        else if (valA < valB) { comparison = -1; }
        
        return (sortDirection === 'desc') ? (comparison * -1) : comparison;
    });

    // 3. RENDERIZADO
    renderTable(sortedData);
}


/**
 * LÓGICA DE ORDENAMIENTO (Actualiza el estado y llama al proceso central)
 */
function handleSort(key) {
	if (currentSortKey === key) {
		sortDirection = (sortDirection === 'asc') ? 'desc' : 'asc';
	} else {
		currentSortKey = key;
		sortDirection = 'asc';
	}
    // Re-filtra, re-ordena y re-renderiza con el nuevo criterio
    filterDataAndSort(); 
}


/**
 * 5. RENDERIZADO DE LA TABLA (7 columnas visibles)
 * Acepta el array de datos ya filtrado y ordenado para renderizar
 */
function renderTable(dataToRender) { 
    const registeredDataContainer = document.getElementById('registeredData');
    
    // Manejo de mensajes de datos vacíos
    if (dataToRender.length === 0) {
        if (currentSearchTerm.trim()) {
            registeredDataContainer.innerHTML = '<p class="no-data-message">No se encontraron atletas que coincidan con la búsqueda.</p>';
        } else {
            registeredDataContainer.innerHTML = '<p class="no-data-message">No hay atletas registrados aún. ¡Registra el primero!</p>';
        }
        return;
    }

    let table = document.getElementById('athleteTable');
    let tableBody = document.getElementById('athleteTableBody');

    // 1. DIBUJAR LA ESTRUCTURA DE LA TABLA (solo si no existe)
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
        setupSorting(); // Configurar los listeners de ordenamiento
    } else {
        tableBody.innerHTML = '';
    }
    
    // 2. LLENAR EL CUERPO DE LA TABLA
    dataToRender.forEach(data => {
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

    // 3. Actualizar indicadores visuales de ordenamiento
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
			// Llama a la nueva función de manejo de ordenamiento
			header.addEventListener('click', () => handleSort(key));	
		}
	});
}

/**
 * 6. LÓGICA DE BÚSQUEDA
 */
function setupSearchListener() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', (event) => {
            currentSearchTerm = event.target.value;
            // Al escribir, se activa el flujo central de filtro/ordenamiento/renderizado
            filterDataAndSort(); 
        });
        console.log("Listener de búsqueda adjunto.");
    }
}


/**
 * 7. LÓGICA DE EDICIÓN, ACTUALIZACIÓN Y ELIMINACIÓN
 */
// ... (handleFormSubmit, editAthlete, deleteAthlete, setFormMode se mantienen igual) ...

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
    setupSearchListener(); // <-- NUEVO: Inicializar listener de búsqueda
});

// Exponer funciones globales para que los onclick de la tabla funcionen
window.editAthlete = editAthlete;
window.deleteAthlete = deleteAthlete;
window.handleSort = handleSort; // <-- NUEVO: Exponer el manejador de ordenamiento (ya no sortTable)
window.setFormMode = setFormMode;
