const API_BASE = "http://localhost:8000/videos";

const vistaGaleria = document.querySelector("#vista-galeria");
const vistaReproductor = document.querySelector("#vista-reproductor");
const divContainer = document.querySelector(".container");
const categoriesNav = document.querySelector("#categories-nav");

const reproductorPrincipal = document.querySelector("#reproductor-principal");
const detalleTitulo = document.querySelector("#detalle-titulo");
const detalleCategoria = document.querySelector("#detalle-categoria");
const listaComentarios = document.querySelector("#lista-comentarios");
const formComentario = document.querySelector("#form-comentario");
const contenedorRecomendaciones = document.querySelector("#contenedor-recomendaciones");

let videoActual = null;

function construirTarjetaVideo(video) {
    const card = document.createElement("div");
    card.className = "video-card";

    const thumbWrapper = document.createElement("div");
    thumbWrapper.className = "thumb-wrapper";

    const imgMiniatura = document.createElement("img");
    imgMiniatura.className = "video-poster";
    imgMiniatura.src = video.miniatura;
    imgMiniatura.alt = video.titulo;

    imgMiniatura.addEventListener("error", () => {
        thumbWrapper.replaceChildren();
        const videoContainer = document.createElement("video");
        videoContainer.className = "video-preview";
        videoContainer.src = video.source;
        videoContainer.muted = true;
        videoContainer.preload = "metadata";
        thumbWrapper.appendChild(videoContainer);
    });

    thumbWrapper.appendChild(imgMiniatura);

    const infoDiv = document.createElement("div");
    infoDiv.className = "card-info";

    const badge = document.createElement("span");
    badge.className = "badge-cat";
    badge.textContent = video.categoria;

    const videoTitulo = document.createElement("h2");
    videoTitulo.textContent = video.titulo;

    infoDiv.appendChild(badge);
    infoDiv.appendChild(videoTitulo);

    card.appendChild(thumbWrapper);
    card.appendChild(infoDiv);

    card.addEventListener("click", () => {
        abrirReproductor(video);
    });

    return card;
}

function cargarVideos(categoria = "") {
    const url = categoria
        ? `${API_BASE}?categoria=${encodeURIComponent(categoria)}`
        : API_BASE;

    fetch(url)
        .then(res => res.json())
        .then(videos => {
            divContainer.replaceChildren();
            videos.forEach(video => {
                divContainer.appendChild(construirTarjetaVideo(video));
            });
        })
        .catch(err => console.error("Error al cargar videos:", err));
}

function cargarCategorias() {
    fetch(`${API_BASE}/categorias`)
        .then(res => res.json())
        .then(categorias => {
            categoriesNav.replaceChildren();
            const todas = ["Todas", ...categorias];

            todas.forEach(cat => {
                const btn = document.createElement("button");
                btn.className = "cat-btn";
                btn.textContent = cat;
                btn.addEventListener("click", () => {
                    volverAlCatalogo();
                    cargarVideos(cat === "Todas" ? "" : cat);
                });
                categoriesNav.appendChild(btn);
            });
        });
}

function crearElementoComentario(comentario) {
    const li = document.createElement("li");
    li.className = "comment-item";

    const autor = document.createElement("strong");
    autor.textContent = comentario.autor;

    const texto = document.createElement("p");
    texto.textContent = comentario.contenido;

    li.appendChild(autor);
    li.appendChild(texto);
    return li;
}

function abrirReproductor(video) {
    videoActual = video;
    vistaGaleria.classList.add("hidden");
    vistaReproductor.classList.remove("hidden");

    reproductorPrincipal.src = video.source;
    reproductorPrincipal.controls = true;
    detalleTitulo.textContent = video.titulo;
    detalleCategoria.textContent = video.categoria;

    fetch(`${API_BASE}/${video.id}/comments`)
        .then(res => res.json())
        .then(comentarios => {
            listaComentarios.replaceChildren();
            comentarios.forEach(c => {
                listaComentarios.appendChild(crearElementoComentario(c));
            });
        });

    fetch(`${API_BASE}/recomendaciones/${encodeURIComponent(video.categoria)}?excluir_id=${video.id}`)
        .then(res => res.json())
        .then(recomendados => {
            contenedorRecomendaciones.replaceChildren();
            recomendados.forEach(rec => {
                contenedorRecomendaciones.appendChild(construirTarjetaVideo(rec));
            });
        });
}

formComentario.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!videoActual) return;

    const inputAutor = document.querySelector("#input-autor");
    const inputContenido = document.querySelector("#input-contenido");

    fetch(`${API_BASE}/${videoActual.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            autor: inputAutor.value,
            contenido: inputContenido.value
        })
    })
    .then(res => res.json())
    .then(nuevoComentario => {
        listaComentarios.appendChild(crearElementoComentario(nuevoComentario));
        inputContenido.value = "";
    });
});

function volverAlCatalogo() {
    reproductorPrincipal.pause();
    vistaReproductor.classList.add("hidden");
    vistaGaleria.classList.remove("hidden");
}

document.querySelector("#btn-volver").addEventListener("click", volverAlCatalogo);
document.querySelector("#btn-inicio").addEventListener("click", () => {
    volverAlCatalogo();
    cargarVideos();
});

cargarCategorias();
cargarVideos();