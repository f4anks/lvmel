// =========================================================================
// script.js: Lógica de Registro (addDoc) y Edición (updateDoc)
// =========================================================================

// 1. IMPORTACIONES DE FIREBASE (AÑADIMOS getDoc, doc, updateDoc)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, collection, addDoc, setLogLevel, getDoc, doc, updateDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// VARIABLES DE ESTADO Y FIREBASE
let db;
let auth;
let userId = '';	
let athleteIdToEdit = null; // Variable para almacenar el ID si estamos editando

setLogLevel('Debug');

// ... (EXTERNAL_FIREBASE_CONFIG se mantiene igual) ...
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
async function initFirebase() {
	console.log("Iniciando Firebase y autenticación...");
	try {
		let configToUse;
		
		if (typeof __firebase_config !== 'undefined' && __firebase_config.length > 2) {
			configToUse = JSON.parse(__firebase_config);
		} else {
			configToUse = EXTERNAL_FIREBASE_CONFIG;
		}

		const app = initializeApp(configToUse);
		db = getFirestore(app);
		auth = getAuth(app);
		
		// Autenticación anónima para permitir la escritura si las reglas lo permiten
		onAuthStateChanged(auth, (user) => {
			if (user) {
				userId = user.uid;
				console.log("Usuario autenticado para registro/edición. UID:", userId);
                checkEditMode(); 
			} else {
				signInAnonymously(auth).then(userCredential => {
                    userId = userCredential.user.uid;
                    console.log("Autenticación anónima exitosa. UID:", userId);
                    checkEditMode(); // Revisar modo edición después de autenticar
                }).catch(error => {
                    console.error("Error al iniciar sesión anónimamente:", error);
                    displayStatusMessage("Error de autenticación. No se podrá registrar/editar.", 'error');
                });
			}
		});

	} catch (e) {
		console.error("Error al inicializar Firebase:", e);
	}
}

// --------------------------------------------------------------------------
// NUEVAS FUNCIONES PARA MODO EDICIÓN
// --------------------------------------------------------------------------

/**
 * 4. Revisa la URL para ver si se pasa un ID de atleta para editar.
 */
function checkEditMode() {
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('id');

    if (id) {
        athleteIdToEdit = id;
        loadAthleteData(id);
        setEditModeUI(true);
    } else {
        setEditModeUI(false);
    }
}

/**
 * 5. Carga los datos del atleta desde Firestore y llena el formulario.
 */
async function loadAthleteData(id) {
    if (!db) {
        displayStatusMessage("Error: La base de datos no está lista para cargar datos.", 'error');
        return;
    }

    let appIdToUse;
    if (typeof __app_id !== 'undefined') {
		appIdToUse = __app_id;
	} else {
		appIdToUse = EXTERNAL_FIREBASE_CONFIG.projectId;
	}
    const athleteDocPath = `artifacts/${appIdToUse}/public/data/athletes`;

    try {
        const docRef = doc(db, athleteDocPath, id);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const athlete = docSnap.data();
            const form = document.getElementById('athleteForm');

            // Llenar el formulario con los datos
            form.cedula.value = athlete.cedula || '';
            form.club.value = athlete.club || '';
            form.nombre.value = athlete.nombre || '';
            form.apellido.value = athlete.apellido || '';
            form.fechaNac.value = athlete.fechaNac || '';
            form.division.value = athlete.division || '';
            form.talla.value = athlete.tallaRaw || ''; // Usar valor Raw
            form.peso.value = athlete.pesoRaw || '';   // Usar valor Raw
            form.correo.value = athlete.correo || '';
            form.telefono.value = athlete.telefono || '';
            
            // Deshabilitar la cédula al editar
            form.cedula.disabled = true;

            displayStatusMessage(`Datos de ${athlete.nombre} cargados para edición.`, 'success');
        } else {
            displayStatusMessage("Error: Documento de atleta no encontrado.", 'error');
            athleteIdToEdit = null;
            setEditModeUI(false);
        }
    } catch (error) {
        console.error("Error al cargar datos del atleta:", error);
        displayStatusMessage("Error al cargar datos del atleta: " + error.message, 'error');
    }
}

/**
 * 6. Ajusta los elementos de la interfaz para el modo Edición/Registro.
 */
function setEditModeUI(isEditing) {
    const title = document.getElementById('pageTitle');
    const subtitle = document.getElementById('pageSubtitle');
    const formHeader = document.getElementById('formHeader');
    const submitButton = document.getElementById('submitButton'); // Usamos el ID agregado al HTML

    if (isEditing) {
        if (title) title.textContent = "Edición de Atleta";
        if (subtitle) subtitle.textContent = "Modifica y guarda los cambios del atleta seleccionado";
        if (formHeader) formHeader.textContent = "Formulario para la Edición de Atletas";
        if (submitButton) submitButton.textContent = "Guardar Cambios";
    } else {
        if (title) title.textContent = "Registro de Atletas";
        if (subtitle) subtitle.textContent = "Ingresa la información del nuevo atleta";
        if (formHeader) formHeader.textContent = "Formulario para el Registro de Atletas";
        if (submitButton) submitButton.textContent = "Registrar Atleta";
    }
}


// --------------------------------------------------------------------------
// LÓGICA DE ENVÍO DE FORMULARIO (MODIFICADA para soportar ADD y UPDATE)
// --------------------------------------------------------------------------

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
 * 3. FUNCIÓN DE REGISTRO/EDICIÓN (handleFormSubmit)
 */
async function handleFormSubmit(event) {
	event.preventDefault();	

	if (!db) {
		displayStatusMessage("Error: La base de datos no está inicializada.", 'error');
		return false;
	}

	const form = document.getElementById('athleteForm');

	// 1. Recolectar datos y preparar el objeto (documento)
	const tallaValue = form.talla.value; 
	const pesoValue = form.peso.value; 
	
	const athleteData = {
        cedula: form.cedula.value, 
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
        if (athleteIdToEdit) {
            // MODO EDICIÓN (updateDoc)
            const athleteDocRef = doc(db, athletesColPath, athleteIdToEdit);
            // Quitamos la cédula del objeto de actualización si ya estaba deshabilitada
            const { cedula, ...dataToUpdate } = athleteData; 
            await updateDoc(athleteDocRef, dataToUpdate);
            console.log("Atleta actualizado en Firestore con éxito. ID:", athleteIdToEdit);
            displayStatusMessage("¡Atleta actualizado con éxito!", 'success');
        } else {
            // MODO REGISTRO (addDoc)
            const athletesColRef = collection(db, athletesColPath);
            await addDoc(athletesColRef, athleteData);	
            console.log("Atleta registrado y guardado en Firestore con éxito.");
            displayStatusMessage("¡Atleta registrado con éxito!", 'success');
        }

	} catch(error) {
		console.error("!!! ERROR CRÍTICO AL INTENTAR GUARDAR !!!", error.message);
		if (error.code === 'permission-denied') {
			displayStatusMessage("❌ ERROR DE PERMISO: ¡REVISA TUS REGLAS DE FIRESTORE!", 'error');
		} else {
			displayStatusMessage(`❌ ERROR al guardar: ${error.message}`, 'error');
		}

	} finally {
        if (athleteIdToEdit) {
            // Si editamos, redirigimos de vuelta a la tabla
            setTimeout(() => {
                 window.location.href = 'atletas_edit.html';
            }, 1000);
        } else {
		    form.reset(); // Solo reseteamos en modo registro
        }
	}
	
	return false;	
}

// Inicializar Firebase y los Listeners al cargar el contenido
document.addEventListener('DOMContentLoaded', () => {
	initFirebase();
	setupFormListener();
});
