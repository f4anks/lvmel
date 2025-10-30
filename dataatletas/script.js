// 1. IMPORTACIONES DE FIREBASE
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, collection, query, addDoc, onSnapshot, setLogLevel } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

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
	console.log("Iniciando Firebase y autenticación...");
	try {
		let configToUse;
		let appIdToUse;
		let tokenToUse = '';

		// Lógica para determinar la configuración a usar (interna/externa)
		if (typeof __firebase_config !== 'undefined' && __firebase_config.length > 2) {
			configToUse = JSON.parse(__firebase_config);
			appIdToUse = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
			tokenToUse = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : '';
		} else {
			configToUse = EXTERNAL_FIREBASE_CONFIG;
			appIdToUse = configToUse.projectId;	
		}

		const app = initializeApp(configToUse);
		db = getFirestore(app);
		auth = getAuth(app);
		
		if (tokenToUse.length > 0) {
			await signInWithCustomToken(auth, tokenToUse);
		} else {
			await signInAnonymously(auth);
		}
		
		onAuthStateChanged(auth, (user) => {
			if (user) {
				userId = user.uid;
				console.log("Usuario autenticado. UID:", userId);
				setupRealtimeListener(appIdToUse);
			} else {
				console.error("No se pudo autenticar al usuario.");
				userId = crypto.randomUUID();	
				setupRealtimeListener(appIdToUse);
			}
		});

	} catch (e) {
		console.error("Error al inicializar Firebase:", e);
        displayStatusMessage(`❌ Error al inicializar: ${e.message}`, 'error');
	}
}

/**
 * 3. ESCUCHA EN TIEMPO REAL (onSnapshot)
 */
function setupRealtimeListener(appId) {
    // RUTA CRÍTICA: Asegúrate que esta ruta es correcta en tu Firebase
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
			// Ordena y renderiza los datos usando la clave de orden actual ('apellido' por defecto)
			sortTable(currentSortKey, false);	
		} else {
			renderTable();
		}
	}, (error) => {
        // MANEJO DE ERROR MEJORADO: Indica problema de permisos de lectura
		console.error("Error en la escucha en tiempo real:", error);
        if (error.code === 'permission-denied') {
             displayStatusMessage("❌ ERROR DE PERMISO DE LECTURA: ¡REVISA TUS REGLAS DE FIRESTORE!", 'error');
        } else {
             displayStatusMessage(`❌ Error al cargar datos: ${error.message}`, 'error');
        }
        // Forzar renderizado para mostrar el mensaje de "No hay datos" si falla la conexión
        athletesData = [];
        renderTable();
	});
}

function setupFormListener() {
    // CORRECCIÓN: Usa el ID 'athleteForm'
	const form = document.getElementById('athleteForm'); 
	if (form) {
		form.addEventListener('submit', handleFormSubmit);
		console.log("Listener de formulario de atleta adjunto: athleteForm.");
	} else {
		console.error("Error: No se encontró el formulario con ID 'athleteForm'. ¡Revisa el HTML!");
	}
}


/**
 * 4. FUNCIÓN DE GUARDADO (handleFormSubmit)
 */
async function handleFormSubmit(event) {
	event.preventDefault();	

	if (!db) {
		console.error("Base de datos no inicializada. No se pudo guardar.");
		displayStatusMessage("Error: La base de datos no está inicializada.", 'error');
		return false;
	}

	// Usa el ID 'athleteForm'
	const form = document.getElementById('athleteForm'); 

	// 1. Recolectar datos de TODOS los campos del formulario (incluyendo los nuevos)
	const cedulaValue = form.cedula.value.trim();
	const nombreValue = form.nombre.value.trim();
	const apellidoValue = form.apellido.value.trim();
	const clubValue = form.club.value.trim();
	const fechaNacValue = form.fechaNac.value;
	const divisionValue = form.division.value;

    // Campos nuevos:
	const tallaValue = form.talla ? form.talla.value.trim() : '';
	const pesoValue = form.peso ? form.peso.value.trim() : '';
	const correoValue = form.correo ? form.correo.value.trim() : '';
	const telefonoValue = form.telefono ? form.telefono.value.trim() : '';
	
	const newAthlete = {
        // Datos principales (mostrados en la tabla)
        cedula: cedulaValue, 
		nombre: nombreValue,
		apellido: apellidoValue,
		club: clubValue,
		fechaNac: fechaNacValue,
		division: divisionValue,	
		
        // Datos auxiliares/secundarios
		tallaRaw: tallaValue,	 	
		pesoRaw: pesoValue,	 	
		tallaFormatted: tallaValue ? `${tallaValue} m` : 'N/A', 
		pesoFormatted: pesoValue ? `${pesoValue} kg` : 'N/A', 
		correo: correoValue || 'N/A',
		telefono: telefonoValue || 'N/A',
		timestamp: Date.now()	
	};
	
	try {
		let appIdToUse;
		if (typeof __app_id !== 'undefined') {
			appIdToUse = __app_id;
		} else {
			appIdToUse = EXTERNAL_FIREBASE_CONFIG.projectId;
		}

		const athletesColRef = collection(db, `artifacts/${appIdToUse}/public/data/athletes`);
		await addDoc(athletesColRef, newAthlete);	
		console.log("Atleta registrado y guardado en Firestore con éxito.");
		displayStatusMessage("¡Atleta registrado con éxito! (Sincronizando tabla...)", 'success');
		
	} catch(error) {
        // MANEJO DE ERROR MEJORADO: Indica problema de permisos de escritura
		console.error("!!! ERROR CRÍTICO AL INTENTAR GUARDAR !!!", error.message);
		if (error.code === 'permission-denied') {
			displayStatusMessage("❌ ERROR DE PERMISO DE ESCRITURA: ¡REVISA TUS REGLAS DE FIRESTORE!", 'error');
		} else {
			displayStatusMessage(`❌ ERROR al guardar: ${error.message}`, 'error');
		}

	} finally {
		console.log("handleFormSubmit ha finalizado. Reseteando formulario.");
		form.reset();
	}
	
	return false;	
}

/**
 * LÓGICA DE ORDENAMIENTO Y RENDERIZADO
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

		// Ordenar correctamente los campos numéricos (si se usa alguno) o de fecha
		if (key === 'tallaRaw' || key === 'pesoRaw') {
			valA = parseFloat(valA) || 0;
			valB = parseFloat(valB) || 0;
		} else if (key === 'fechaNac') {
			valA = new Date(valA);
			valB = new Date(valB);
		} else {
			// Comparación de strings (texto)
			valA = String(valA || '').toLowerCase();
			valB = String(valB || '').toLowerCase();
		}

		let comparison = 0;
		if (valA > valB) { comparison = 1; }	
		else if (valA < valB) { comparison = -1; }
		
		return (sortDirection === 'desc') ? (comparison * -1) : comparison;
	});

	renderTable();
}

/**
 * RENDERIZADO DE LA TABLA (Asegura que el orden de los TD coincida con el orden de los TH)
 */
function renderTable() {
    const registeredDataContainer = document.getElementById('registeredData');
    
    if (athletesData.length === 0) {
        // Asegura que solo se muestre el mensaje si no hay un error más grave visible
        if (!registeredDataContainer.querySelector('.error')) {
            registeredDataContainer.innerHTML = '<p class="no-data-message">No hay atletas registrados aún. ¡Registra el primero!</p>';
        }
        return;
    }

    let table = document.getElementById('athleteTable');
    let tableBody = document.getElementById('athleteTableBody');

    if (!table) {
        // 1. Definición y Construcción de Encabezados (<thead>)
        const headerKeys = [
            { key: "cedula", label: "Cédula" },
            { key: "nombre", label: "Nombre" },
            { key: "apellido", label: "Apellido" },
            { key: "club", label: "Club" },
            { key: "fechaNac", label: "F. Nac." },
            { key: "division", label: "División" }
        ];

        let headerRowHTML = headerKeys.map(header => {
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
    
    // 2. Construir Filas de Datos (<tbody>) con el ORDEN CORREGIDO
    // El orden de las celdas (data.propiedad) debe coincidir con el orden de los TH
    athletesData.forEach(data => {
        const newRow = tableBody.insertRow(-1);	
        newRow.classList.add('athlete-table-row');
        
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

function setupSorting() {
	document.querySelectorAll('#athleteTable th').forEach(header => {
		const key = header.getAttribute('data-sort-key');
		if (key) {
			header.style.cursor = 'pointer';	
			header.addEventListener('click', () => sortTable(key, true));	
		}
	});
}

// Inicializar Firebase y los Listeners al cargar el contenido
document.addEventListener('DOMContentLoaded', () => {
	initFirebaseAndLoadData();
	setupFormListener();
});
