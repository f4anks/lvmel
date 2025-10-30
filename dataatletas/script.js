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
// CONFIGURACIÓN PARA AMBIENTE EXTERNO (Mantenemos la tuya)
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
 * ==========================================================
 * I. FUNCIONES DE UTILIDAD Y DISPLAY
 * ==========================================================
 */

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
    // Usando los colores Vinotinto/Rojo Brillante de tu tema
	statusEl.style.backgroundColor = type === 'success' ? '#5C001C' : '#CC0033'; 
	statusEl.style.opacity = '1';

	setTimeout(() => {
		statusEl.style.opacity = '0';
	}, 4000);
}


/**
 * ==========================================================
 * II. INICIALIZACIÓN Y LISTENERS DE FIREBASE
 * ==========================================================
 */

/**
 * Inicialización y Autenticación de Firebase.
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
				setupRealtimeListener(appIdToUse); // Mantiene tu listener con appId
			} else {
				console.error("No se pudo autenticar al usuario.");
				userId = crypto.randomUUID();	
				setupRealtimeListener(appIdToUse);
			}
		});

	} catch (e) {
		console.error("Error al inicializar Firebase:", e);
	}
}

/**
 * Escucha en Tiempo Real (onSnapshot) de tu colección.
 */
function setupRealtimeListener(appId) {
    // Mantenemos la ruta de tu script que sí funciona
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
			sortTable(currentSortKey, false);	
		} else {
			renderTable();
		}
	}, (error) => {
		console.error("Error en la escucha en tiempo real:", error);
        if (error.code === 'permission-denied') {
             displayStatusMessage("❌ ERROR DE PERMISO DE LECTURA: ¡REVISA TUS REGLAS DE FIRESTORE!", 'error');
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
 * ==========================================================
 * III. MANEJO DEL FORMULARIO Y GUARDADO
 * ==========================================================
 */

/**
 * Función de Guardado (handleFormSubmit)
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
	
	// Aplicamos las conversiones a MAYÚSCULAS/validaciones requeridas
	const newAthlete = {
        cedula: form.cedula.value, // Cedula se deja sin .toUpperCase()
		club: form.club.value.toUpperCase(), // CAMPO NUEVO: A mayúsculas
		nombre: form.nombre.value.toUpperCase(), // CAMPO NUEVO: A mayúsculas
		apellido: form.apellido.value.toUpperCase(), // CAMPO NUEVO: A mayúsculas
		fechaNac: form.fechaNac.value,
		division: form.division.value,	
		tallaRaw: tallaValue,	
		pesoRaw: pesoValue,	 	
		tallaFormatted: tallaValue ? `${tallaValue} m` : 'N/A',
		pesoFormatted: pesoValue ? `${pesoValue} kg` : 'N/A',
		correo: form.correo.value,
		telefono: form.telefono.value, // Telefono se deja sin .toUpperCase()
		timestamp: Date.now()	
	};
	
	try {
		let appIdToUse;
		if (typeof __app_id !== 'undefined') {
			appIdToUse = __app_id;
		} else {
			appIdToUse = EXTERNAL_FIREBASE_CONFIG.projectId;
		}

        // Mantenemos la ruta de tu script que sí funciona
		const athletesColRef = collection(db, `artifacts/${appIdToUse}/public/data/athletes`); 
		await addDoc(athletesColRef, newAthlete);	
		console.log("Atleta registrado y guardado en Firestore con éxito.");
		displayStatusMessage("¡Atleta registrado con éxito! (Sincronizando tabla...)", 'success');
		
	} catch(error) {
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
 * ==========================================================
 * IV. LÓGICA DE ORDENAMIENTO Y RENDERIZADO
 * ==========================================================
 */

/**
 * Ordena los datos de los atletas.
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
                            <th data-sort-key="cedula">Cédula</th>
                            <th data-sort-key="nombre">Nombre</th>
                            <th data-sort-key="apellido">Apellido</th>
                            <th data-sort-key="club">Club</th> 
                            <th data-sort-key="fechaNac">F. Nac.</th>
                            <th data-sort-key="division">División</th>
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
        
        // Celdas (TD)
        newRow.innerHTML = `
            <td data-label="Cédula" class="table-data">${data.cedula}</td>
            <td data-label="Nombre" class="table-data">${data.nombre}</td>
            <td data-label="Apellido" class="table-data">${data.apellido}</td>
            <td data-label="Club" class="table-data">${data.club}</td>
            <td data-label="F. Nac." class="table-data">${data.fechaNac}</td>
            <td data-label="División" class="table-data">${data.division}</td>
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

/**
 * ==========================================================
 * V. LÓGICA DE INICIALIZACIÓN DE CLUBES Y LISTENERS
 * ==========================================================
 */

/**
 * Llenado del campo de selección de Club/Equipo.
 */
function setupClubSelect() {
    const clubSelect = document.getElementById('club');
    if (clubSelect) { 
        // Lista de clubes ordenada alfabéticamente (la que definimos)
        const clubes = [
            "Antonio Espinoza", "Bertha Carrero", "Big Star", "Codigo Monarca", 
            "El Sisal", "Everest", "Famaguaros", "Los Olivos", "Luis Hurtado", 
            "MG", "Ohana", "Olimpikus", "Ruiz Pineda", "Santa Isabel", 
            "Sanz", "Sporta", "Villa Cantevista"
        ];
        
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
    // 1. Cargamos la lista de clubes (Solución al error anterior)
    setupClubSelect(); 
    
    // 2. Iniciamos Firebase y el listener de datos (Tu lógica)
	initFirebaseAndLoadData();
    
    // 3. Configuramos el listener del formulario
	setupFormListener();
});
