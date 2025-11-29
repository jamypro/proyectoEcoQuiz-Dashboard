// ---------- FIREBASE CONFIG ----------
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";
import {
    getFirestore,
    collection,
    onSnapshot,
    query,
    orderBy,
    where,
    doc,
    getDoc,
    serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyB-rhX6nz7CjgRT5o6LApehZHgX5TORKvA",
    authDomain: "ecoquiz-e32ac.firebaseapp.com",
    projectId: "ecoquiz-e32ac",
    storageBucket: "ecoquiz-e32ac.appspot.com",
    messagingSenderId: "1101966762734",
    appId: "1:1101966762734:web:9e3334d2ce54770e6d0d6f",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ---------- UI ----------
const viewLogin = document.getElementById("viewLogin");
const viewDashboard = document.getElementById("viewDashboard");
const btnLogin = document.getElementById("btnLogin");
const errLogin = document.getElementById("errLogin");
const btnLogout = document.getElementById("btnLogout");
const q = document.getElementById("q");

const tblUsuarios = document.getElementById("tblUsuarios");
const tblResultados = document.getElementById("tblResultados");

const tabs = document.querySelectorAll(".tab");
const panelUsuarios = document.getElementById("panelUsuarios");
const panelResultados = document.getElementById("panelResultados");

const modal = document.getElementById("modal");
const modalBody = document.getElementById("modalBody");
const closeModal = document.getElementById("closeModal");

// credenciales simuladas
const USER = "sostenibilidad2025";
const PASS = "123456789";

btnLogin.addEventListener("click", () => {
    const u = document.getElementById("inpUser").value.trim();
    const p = document.getElementById("inpPass").value.trim();
    if (u === USER && p === PASS) {
        viewLogin.style.display = "none";
        viewDashboard.style.display = "block";
        errLogin.style.display = "none";
        startRealtime();
    } else {
        errLogin.style.display = "block";
        setTimeout(() => (errLogin.style.display = "none"), 2500);
    }
});

btnLogout.addEventListener("click", () => {
    viewDashboard.style.display = "none";
    viewLogin.style.display = "block";
    // limpiar tablas
    tblUsuarios.innerHTML = "";
    tblResultados.innerHTML = "";
});

// tabs
tabs.forEach((t) =>
    t.addEventListener("click", () => {
        tabs.forEach((x) => x.classList.remove("active"));
        t.classList.add("active");
        const tab = t.dataset.tab;
        if (tab === "usuarios") {
            panelUsuarios.style.display = "block";
            panelResultados.style.display = "none";
        } else {
            panelUsuarios.style.display = "none";
            panelResultados.style.display = "block";
        }
    })
);

// modal
closeModal.addEventListener("click", () => {
    modal.style.display = "none";
    modal.setAttribute("aria-hidden", "true");
});

// ---------- Realtime listeners ----------

function startRealtime() {
    const colUsers = collection(db, "registros");
    const qUsers = query(colUsers, orderBy("fechaRegistro", "desc"));

    onSnapshot(
        qUsers,
        (snap) => {
            tblUsuarios.innerHTML = "";
            snap.forEach((docSnap) => {
                const d = docSnap.data();
                // convertir timestamp si existe
                let fecha = "-";
                if (d.fechaRegistro && d.fechaRegistro.seconds) {
                    const dt = new Date(
                        d.fechaRegistro.seconds * 1000 +
                            Math.floor(d.fechaRegistro.nanoseconds / 1000000)
                    );
                    fecha = dt.toLocaleString();
                }
                tblUsuarios.innerHTML += `<tr><td>${escapeHtml(
                    d.Nombre || "-"
                )}</td><td class='small'>${fecha}</td></tr>`;
            });
        },
        (err) => {
            console.error("Error usuarios realtime", err);
        }
    );

    // resultados
    const colRes = collection(db, "resultados");
    const qRes = query(colRes, orderBy("fechaFinalizacion", "desc"));
    onSnapshot(
        qRes,
        (snap) => {
            tblResultados.innerHTML = "";
            snap.forEach((docSnap) => {
                const d = docSnap.data();

                // timestamp conversion
                let fecha = "-";
                if (d.fechaFinalizacion && d.fechaFinalizacion.seconds) {
                    const dt = new Date(
                        d.fechaFinalizacion.seconds * 1000 +
                            Math.floor(
                                (d.fechaFinalizacion.nanoseconds || 0) / 1000000
                            )
                    );
                    fecha = dt.toLocaleString();
                }

                const tiempo =
                    d.tiempoTotal !== undefined
                        ? `${escapeHtml(String(d.tiempoTotal))}s`
                        : "-";
                const puntaje = d.puntaje ?? "-";
                const aciertos =
                    d.aciertos ??
                    (Array.isArray(d.preguntas)
                        ? d.preguntas.filter((p) => p.correcta).length
                        : "-");
                const fallos =
                    d.fallos ??
                    (Array.isArray(d.preguntas)
                        ? d.preguntas.filter((p) => !p.correcta).length
                        : "-");

                const detallesEsc = escapeHtml(
                    JSON.stringify(d.preguntas || [])
                );

                tblResultados.innerHTML += `
            <tr>
              <td>${escapeHtml(d.nombre || "-")}</td>
              <td>${escapeHtml(String(puntaje))}</td>
              <td>${escapeHtml(String(d.nota))}</td>
              <td class='small'>${escapeHtml(tiempo)}</td>
              <td>${escapeHtml(String(aciertos))}</td>
              <td>${escapeHtml(String(fallos))}</td>
              <td class='small'>${escapeHtml(fecha)}</td>
              <td><div class='actions'><button class='btn-ghost' data-det='${detallesEsc}' onclick='verDetalle(this)'>Ver</button></div></td>
            </tr>
          `;
            });
        },
        (err) => {
            console.error("Error resultados realtime", err);
        }
    );
}

// abrir modal y mostrar preguntas (botón Ver llama a esta función)
window.verDetalle = function (btn) {
    try {
        const raw = btn.getAttribute("data-det") || "[]";
        const arr = JSON.parse(raw);
        renderDetalle(arr);
        modal.style.display = "flex";
        modal.setAttribute("aria-hidden", "false");
    } catch (e) {
        console.error(e);
    }
};

function renderDetalle(arr) {
    if (!Array.isArray(arr)) arr = [];
    if (arr.length === 0) {
        modalBody.innerHTML =
            '<p class="small">No hay preguntas guardadas en este resultado.</p>';
        return;
    }
    let html = "<ol>";
    arr.forEach((p, idx) => {
        const correcta = p.correcta
            ? '<strong style="color:var(--accent1)">Correcta</strong>'
            : '<strong style="color:var(--danger)">Incorrecta</strong>';
        html += `
          <li style="margin-bottom:10px">
            <div style="font-weight:600">${escapeHtml(p.pregunta || "")}</div>
            <div class="small">Opciones: ${escapeHtml(
                Array.isArray(p.opciones) ? p.opciones.join(", ") : ""
            )}</div>
            <div class="small">Respuesta correcta: ${escapeHtml(
                p.respuestaCorrecta || "-"
            )}</div>
            <div class="small">Respuesta jugador: ${escapeHtml(
                p.respuestaJugador || "-"
            )}</div>
            <div class="small">Estado: ${correcta}</div>
          </li>
        `;
    });
    html += "</ol>";
    modalBody.innerHTML = html;
}

// escape simple para evitar XSS por contenido
function escapeHtml(str) {
    if (str === null || str === undefined) return "";
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// busqueda simple por nombre en la UI (filtrado local)
q.addEventListener("input", () => {
    const term = q.value.trim().toLowerCase();
    // filtrar usuarios
    Array.from(tblUsuarios.querySelectorAll("tr")).forEach((tr) => {
        const name = tr.children[0].textContent.toLowerCase();
        tr.style.display = name.includes(term) ? "" : "none";
    });
    // filtrar resultados
    Array.from(tblResultados.querySelectorAll("tr")).forEach((tr) => {
        const name = tr.children[0].textContent.toLowerCase();
        tr.style.display = name.includes(term) ? "" : "none";
    });
});
