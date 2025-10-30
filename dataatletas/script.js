// ==========================================================
// 1. IMPORTACIONES DE FIREBASE
// ==========================================================
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
// CONFIGURACIÓN DE FIREBASE (Mantenemos la tuya)
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
	
    // Si el elemento no existe, lo crea dinámicamente
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
	// Colores Vinotinto y Rojo Brillante (ajustado de tu CSS)
    statusEl.style.backgroundColor = type === 'success' ? '#5C001C' : '#CC0033';
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
				// Llamada al listener: YA NO NECESITA appIdToUse COMO ARGUMENTO
				setupRealtimeListener(); 
			} else {
				console.error("No se pudo autenticar al usuario. Intentando escucha anónima...");
				userId = crypto.randomUUID();	
				setupRealtimeListener();
			}
		});

	} catch (e) {
		console.error("Error al inicializar Firebase:", e);
	}
}

/**
 * 3. ESCUCHA EN TIEMPO REAL (onSnapshot)
 * RUTA CORREGIDA: Apunta a la colección raíz 'atletas'.
 */
function setupRealtimeListener() {
    // ----------------------------------------------------
    // !!! RUTA CORREGIDA: COLECCIÓN RAÍZ 'atletas' !!!
    // ----------------------------------------------------
	const athletesColRef = collection(db, `atletas`);
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
			// Al cargar, ordenar por el campo inicial (apellido)
			sortTable(currentSortKey, false);	
		} else {
			renderTable();
		}
	}, (error) => {
        // MANEJO DE ERROR MEJORADO: Indica problema de permisos de lectura
		console.error("Error en la escucha en tiempo real:", error);
        if (error.code === 'permission-denied') {
             displayStatusMessage("❌ ERROR DE PERMISO DE LECTURA: No se pueden mostrar los datos. ¡REVISA TUS REGLAS DE FIRESTORE!", 'error');
        } else {
             displayStatusMessage(`❌ Error al cargar datos: ${error.message}`, 'error');
        }
	});
}

function setupFormListener() {
	const form = document.getElementById('athleteForm');
	if (form) {
		form.addEventListener('submit', handleFormSubmit);
		console.log("Listener de formulario de atleta adjunto.");
	} else {
		console.error("Error: No se encontró el formulario con ID 'athleteForm'.");
	}
}


/**
 * 4. FUNCIÓN DE GUARDADO (handleFormSubmit)
 * RUTA CORREGIDA: Apunta a la colección raíz 'atletas'.
 */
async function handleFormSubmit(event) {
	event.preventDefault();	

	if (!db) {
		console.error("Base de datos no inicializada. No se pudo guardar.");
		displayStatusMessage("Error: La base de datos no está inicializada.", 'error');
		return false;
	}

	const form = document.getElementById('athleteForm');

	// 1. Recolectar datos y preparar el objeto (documento)
	const tallaValue = form.talla.value; 
	const pesoValue = form.peso.value; 
	
	// Conversión a mayúsculas para consistencia en el almacenamiento
	const newAthlete = {
        cedula: form.cedula.value.toUpperCase(), 
		club: form.club.value.toUpperCase(),
		nombre: form.nombre.value.toUpperCase(),
		apellido: form.apellido.value.toUpperCase(),
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
	
	try {
        // ----------------------------------------------------
        // !!! RUTA CORREGIDA: COLECCIÓN RAÍZ 'atletas' !!!
        // ----------------------------------------------------
		const athletesColRef = collection(db, `atletas`);
		await addDoc(athletesColRef, newAthlete);	
		console.log("Atleta registrado y guardado en Firestore con éxito.");
		displayStatusMessage("¡Atleta registrado con éxito! (Sincronizando tabla...)", 'success');
		
	} catch(error) {
        // MANEJO DE ERROR MEJORADO: Indica problema de permisos de escritura
		console.error("!!! ERROR CRÍTICO AL INTENTAR GUARDAR !!!", error.message);
		if (error.code === 'permission-denied') {
			displayStatusMessage("❌ ERROR DE PERMISO DE ESCRITURA: No se pudo guardar. ¡REVISA TUS REGLAS DE FIRESTORE!", 'error');
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

		// Ordenar correctamente los campos numéricos
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

	renderTable();
}

/**
 * RENDERIZADO DE LA TABLA
 */
function renderTable() {
    const registeredDataContainer = document.getElementById('registeredData');
    
    if (athletesData.length === 0) {
        registeredDataContainer.innerHTML = '<p class="no-data-message">No hay atletas registrados aún. ¡Registra el primero!</p>';
        return;
    }

    let table = document.getElementById('athleteTable');
    let tableBody = document.getElementById('athleteTableBody');

    if (!table) {
        registeredDataContainer.innerHTML = `
            <div class="table-responsive-wrapper">
                <table id="athleteTable" class="athlete-data-table">
                    <thead>
                        <tr class="table-header-row">
                            <th data-sort-key="cedula" class="${currentSortKey === 'cedula' ? sortDirection === 'asc' ? 'sorted-asc' : 'sorted-desc' : ''}">Cédula</th>
                            <th data-sort-key="nombre" class="${currentSortKey === 'nombre' ? sortDirection === 'asc' ? 'sorted-asc' : 'sorted-desc' : ''}">Nombre</th>
                            <th data-sort-key="apellido" class="${currentSortKey === 'apellido' ? sortDirection === 'asc' ? 'sorted-asc' : 'sorted-desc' : ''}">Apellido</th>
                            <th data-sort-key="club" class="${currentSortKey === 'club' ? sortDirection === 'asc' ? 'sorted-asc' : 'sorted-desc' : ''}">Club</th> 
                            <th data-sort-key="fechaNac" class="${currentSortKey === 'fechaNac' ? sortDirection === 'asc' ? 'sorted-asc' : 'sorted-desc' : ''}">F. Nac.</th>
                            <th data-sort-key="division" class="${currentSortKey === 'division' ? sortDirection === 'asc' ? 'sorted-asc' : 'sorted-desc' : ''}">División</th>
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
    
    athletesData.forEach(data => {
        const newRow = tableBody.insertRow(-1);	
        newRow.classList.add('athlete-table-row');
        
        // Celdas (TD) que coinciden con el nuevo orden de encabezados
        newRow.innerHTML = `
            <td data-label="Cédula" class="table-data">${data.cedula}</td>
            <td data-label="Nombre" class="table-data">${data.nombre}</td>
            <td data-label="Apellido" class="table-data">${data.apellido}</td>
            <td data-label="Club" class="table-data">${data.club}</td>
            <td data-label="F. Nac." class="table-data">${data.fechaNac}</td>
            <td data-label="División" class="table-data">${data.division}</td>
        `;
    });

    // Actualizar las clases de ordenamiento para el nuevo renderizado
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


/**
 * ==========================================================
 * V. LÓGICA DE INICIALIZACIÓN DE CLUBES Y LISTENERS
 * ==========================================================
 */
function setupClubSelect() {
    const clubSelect = document.getElementById('club');
    if (clubSelect) { 
        // Lista de clubes ordenada alfabéticamente
        const clubes = [
            "Antonio Espinoza", "Bertha Carrero", "Big Star", "Codigo Monarca", 
            "El Sisal", "Everest", "Famaguaros", "Los Olivos", "Luis Hurtado", 
            "MG", "Ohana", "Olimpikus", "Ruiz Pineda", "Santa Isabel", 
            "Sanz", "Sporta", "Villa Cantevista"
        ];
        
        // Crear y añadir las opciones al campo select
        clubes.forEach(club => {
            const option = document.createElement('option');
            option.value = club;
            option.textContent = club;
            clubSelect.appendChild(option);
        });
        console.log("Clubes cargados en el selector.");
    }
}


// Inicializar Firebase, los Listeners y el selector al cargar el contenido
document.addEventListener('DOMContentLoaded', () => {
    setupClubSelect(); // Carga el selector antes de inicializar la app
	initFirebaseAndLoadData();
	setupFormListener();
});
