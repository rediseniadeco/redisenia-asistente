const express = require("express");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = 3000;

// servir frontend
app.use(express.static(path.join(__dirname, "public")));

// endpoint para productos
app.get("/api/productos", (req, res) => {
  const dataPath = path.join(__dirname, "data", "productos.json");

  fs.readFile(dataPath, "utf8", (err, data) => {
    if (err) {
      return res.status(500).json({ error: "Error leyendo productos" });
    }

    res.json(JSON.parse(data));
  });
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});