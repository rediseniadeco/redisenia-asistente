document.getElementById("form").addEventListener("submit", async function (e) {
  e.preventDefault();

  const m2 = Number(document.getElementById("m2").value);
  const altura = Number(document.getElementById("altura").value);
  const ambiente = document.getElementById("ambiente").value;
  const color = document.getElementById("color").value;
  const uso = document.getElementById("uso").value;
const estilo = document.getElementById("estilo").value;

  let wattsPorM2 = 0;
  let temperaturaColor = "";
  let recomendacionTexto = "";

  if (ambiente === "living") {
    wattsPorM2 = 12;
    temperaturaColor = "3000K cálida";
    recomendacionTexto = "Ideal para generar una atmósfera confortable y versátil.";
  } else if (ambiente === "cocina") {
    wattsPorM2 = 16;
    temperaturaColor = "4000K neutra";
    recomendacionTexto = "Conviene una luz más funcional para tareas y buena percepción de detalles.";
  } else if (ambiente === "baño") {
    wattsPorM2 = 14;
    temperaturaColor = "4000K neutra";
    recomendacionTexto = "Se recomienda una iluminación pareja y clara, especialmente frente al espejo.";
  } else if (ambiente === "dormitorio") {
    wattsPorM2 = 10;
    temperaturaColor = "3000K cálida";
    recomendacionTexto = "Se prioriza una sensación de descanso y confort visual.";
  }

  if (color === "oscuro") {
    wattsPorM2 += 3;
  } else if (color === "medio") {
    wattsPorM2 += 1.5;
  }

  if (altura >= 2.8 && altura < 3.2) {
    wattsPorM2 += 2;
  } else if (altura >= 3.2) {
    wattsPorM2 += 4;
  }

  if (uso === "confort") {
    wattsPorM2 -= 1;
  } else if (uso === "intenso") {
    wattsPorM2 += 2;
  }

  const potenciaObjetivo = Math.round(m2 * wattsPorM2);

  try {
    const respuesta = await fetch("/api/productos");
    const productos = await respuesta.json();

    const productosFiltrados = productos.filter(producto => {
      return (
        producto.stock > 0 &&
        producto.calculable === true &&
        producto.rol === "principal" &&
        producto.ambientes &&
        producto.ambientes.includes(ambiente)
      );
    });

    const recomendaciones = generarRecomendaciones(productosFiltrados, potenciaObjetivo, estilo);
    const complemento = generarComplemento(productos, ambiente, estilo);
    mostrarResultado(
      potenciaObjetivo,
      temperaturaColor,
      recomendacionTexto,
      recomendaciones,
      complemento
    );

  } catch (error) {
  document.getElementById("resultado").innerHTML = `
    <strong>Error:</strong> No se pudieron cargar o procesar los productos.<br><br>
    Detalle: ${error.message}
  `;
  console.error("Error completo:", error);
  }
});


function generarRecomendaciones(productos, potenciaObjetivo, estiloElegido) {
  const opciones = [];

  productos.forEach(producto => {
    const potencia = Number(producto.potencia_calculo_w);
    const stock = Number(producto.stock);

    if (!potencia || potencia <= 0 || stock <= 0) return;

    const cantidad = Math.ceil(potenciaObjetivo / potencia);

    if (cantidad <= stock) {
      const potenciaTotal = cantidad * potencia;

      opciones.push({
        tipo: "simple",
        items: [
          {
            producto,
            cantidad
          }
        ],
        potenciaTotal,
        diferencia: potenciaTotal - potenciaObjetivo,
        scoreEstilo: calcularScoreEstilo([producto], estiloElegido)
      });
    }
  });

  for (let i = 0; i < productos.length; i++) {
    for (let j = i + 1; j < productos.length; j++) {
      const productoA = productos[i];
      const productoB = productos[j];

      const potenciaA = Number(productoA.potencia_calculo_w);
      const potenciaB = Number(productoB.potencia_calculo_w);
      const stockA = Number(productoA.stock);
      const stockB = Number(productoB.stock);

      if (!potenciaA || !potenciaB || stockA <= 0 || stockB <= 0) continue;

      for (let cantA = 1; cantA <= stockA; cantA++) {
        for (let cantB = 1; cantB <= stockB; cantB++) {
          const potenciaTotal = cantA * potenciaA + cantB * potenciaB;

          if (potenciaTotal >= potenciaObjetivo) {
            opciones.push({
              tipo: "combinada",
              items: [
                { producto: productoA, cantidad: cantA },
                { producto: productoB, cantidad: cantB }
              ],
              potenciaTotal,
              diferencia: potenciaTotal - potenciaObjetivo,
              scoreEstilo: calcularScoreEstilo([productoA, productoB], estiloElegido)
            });
          }
        }
      }
    }
  }

  opciones.sort((a, b) => {
    const unidadesA = totalUnidades(a);
    const unidadesB = totalUnidades(b);

    if (a.scoreEstilo !== b.scoreEstilo) {
      return b.scoreEstilo - a.scoreEstilo;
    }

    if (unidadesA !== unidadesB) {
      return unidadesA - unidadesB;
    }

    return a.diferencia - b.diferencia;
  });

  return opciones.slice(0, 3);
}

function totalUnidades(opcion) {
  return opcion.items.reduce((total, item) => total + item.cantidad, 0);
}
function calcularScoreEstilo(productos, estiloElegido) {
  if (estiloElegido === "sin-preferencia") {
    return 0;
  }

  let score = 0;

  productos.forEach(producto => {
    const estilosProducto = String(producto.estilos || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

    if (estilosProducto.includes(estiloElegido)) {
      score += 1;
    }

    if (
      estiloElegido === "nordico" &&
      (estilosProducto.includes("nordico") || estilosProducto.includes("escandinavo"))
    ) {
      score += 1;
    }

    if (
      estiloElegido === "vintage" &&
      (estilosProducto.includes("vintage") || estilosProducto.includes("retro"))
    ) {
      score += 1;
    }
  });

  return score;
}

function mostrarResultado(potenciaObjetivo, temperaturaColor, recomendacionTexto, recomendaciones, complemento) {
  let html = `
    <div class="bloque-resultado">
      <h2>Resultado técnico</h2>
      <p>Potencia estimada a instalar: <strong>${potenciaObjetivo} W</strong></p>
      <p>Temperatura de color recomendada: <strong>${temperaturaColor}</strong></p>
      <p>${recomendacionTexto}</p>
    </div>
  `;

  if (recomendaciones.length === 0) {
    html += `
      <div class="bloque-resultado">
        <strong>No encontramos productos principales compatibles en stock.</strong><br>
        Podés consultar por una alternativa personalizada.
      </div>
    `;
  } else {
    html += `
      <div class="bloque-resultado">
        <h2>Solución principal recomendada</h2>
    `;

    recomendaciones.forEach((opcion, index) => {
      html += `
        <div class="opcion-recomendada">
          <h3>Opción ${index + 1}</h3>
          <p>Tipo: ${opcion.tipo === "simple" ? "un solo modelo" : "combinación de modelos"}</p>
          <p>Potencia total instalada: <strong>${opcion.potenciaTotal} W</strong></p>

          <div class="grid-productos">
      `;

      opcion.items.forEach(item => {
        html += crearCardProducto(item.producto, item.cantidad);
      });

      html += `
          </div>
        </div>
      `;
    });

    html += `</div>`;
  }

  if (complemento) {
    html += `
      <div class="bloque-resultado">
        <h2>Complemento decorativo sugerido</h2>
        <div class="grid-productos">
          ${crearCardProducto(complemento, 1, true)}
        </div>
      </div>
    `;
  }

  document.getElementById("resultado").innerHTML = html;
}
function crearCardProducto(producto, cantidad, esComplemento = false) {
  const imagen = producto.imagen_url || "";
  const potencia = producto.potencia_calculo_w ? `${producto.potencia_calculo_w} W` : "Según lámpara";
  const categoria = producto.categoria || "Producto";
  const url = producto.url || "#";

  return `
    <div class="card-producto ${esComplemento ? "card-complemento" : ""}">
      <img 
  src="${imagen}" 
  alt="${producto.nombre}" 
  class="card-imagen"
  onerror="this.src='https://via.placeholder.com/300x200?text=Sin+imagen'"
>
      
      <div class="card-contenido">
        <span class="card-etiqueta">${esComplemento ? "Complemento" : "Principal"}</span>
        <h4>${cantidad} x ${producto.nombre}</h4>
        <p>Categoría: ${categoria}</p>
        <p>Potencia: ${potencia}</p>
        <p>Stock disponible: ${producto.stock}</p>
        <a href="${url}" target="_blank" class="card-boton">Ver producto</a>
      </div>
    </div>
  `;
}

function generarComplemento(productos, ambiente, estiloElegido) {
  const candidatos = productos.filter(producto => {
    const stock = Number(producto.stock);

    return (
      stock > 0 &&
      producto.rol !== "principal" &&
      producto.ambientes &&
      producto.ambientes.includes(ambiente)
    );
  });

  if (candidatos.length === 0) {
    return null;
  }

  candidatos.sort((a, b) => {
    const scoreA = calcularScoreEstilo([a], estiloElegido);
    const scoreB = calcularScoreEstilo([b], estiloElegido);

    if (scoreA !== scoreB) {
      return scoreB - scoreA;
    }

    return Number(b.stock) - Number(a.stock);
  });

  return candidatos[0];
}