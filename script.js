const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const upload = document.getElementById('upload');
const downloadBtn = document.getElementById('download');
const paletteDiv = document.getElementById('palette');
const previewImg = document.getElementById('preview');
const cellCountInput = document.getElementById('cell-count');
const showGrid = document.getElementById('toggle-grid');
showGrid.addEventListener('change', drawGrid);
let uploadedImage = null;
upload.addEventListener('change', handleUpload);
let gridWidth = parseInt(cellCountInput.value, 10);

document.getElementById('fill-all')?.addEventListener('click', () => {
  for (let y = 0; y < gridHeight; y++) {
    for (let x = 0; x < gridWidth; x++) {
      const cell = colorGrid[y][x];
      cell.filled = true;
    }
  }
  drawGrid();
  updateProgressBar();
});


// Listen for changes
cellCountInput.addEventListener('input', () => {
    const value = parseInt(cellCountInput.value, 10);
    if (!isNaN(value) && value > 0 && value<200) {
      gridWidth = value;
      if (uploadedImage) {
        processImage(uploadedImage);
        updateProgressBar();
      }
    }
});
let selectedColorIndex = null;
let colorPalette = [];
let colorGrid = [];

let gridHeight;
let baseCellSize = 20;
let zoomLevel = 1;

downloadBtn.addEventListener('click', downloadImage);



document.getElementById('zoom-in')?.addEventListener('click', () => {
  zoomLevel = Math.min(zoomLevel + 0.1, 8);
  updateCanvasSize();
});
document.getElementById('zoom-out')?.addEventListener('click', () => {
  zoomLevel = Math.max(zoomLevel - 0.1, 0.05);
  updateCanvasSize();
});

canvas.addEventListener('mousedown', (e) => {
  isMouseDown = true;
  fillCellAtMouse(e);
});
canvas.addEventListener('mousemove', (e) => {
  if (isMouseDown) fillCellAtMouse(e);
});
canvas.addEventListener('mouseup', () => isMouseDown = false);
canvas.addEventListener('mouseleave', () => isMouseDown = false);

let isMouseDown = false;

function handleUpload(e) {
  const file = e.target.files[0];
  if (!file) return;

  const img = new Image();
  img.onload = () => {
    previewImg.src = img.src;
    uploadedImage = img;
    processImage(img);
    updateProgressBar();
  };
  img.src = URL.createObjectURL(file);
}

function processImage(img) {
  const tempCanvas = document.createElement('canvas');
  const tempCtx = tempCanvas.getContext('2d');

  gridHeight = Math.floor((img.height / img.width) * gridWidth);
  tempCanvas.width = gridWidth;
  tempCanvas.height = gridHeight;
  tempCtx.drawImage(img, 0, 0, gridWidth, gridHeight);

  const pixels = [];
  const imageData = tempCtx.getImageData(0, 0, gridWidth, gridHeight).data;

  for (let y = 0; y < gridHeight; y++) {
    colorGrid[y] = [];
    for (let x = 0; x < gridWidth; x++) {
      const i = (y * gridWidth + x) * 4;
      const color = [imageData[i], imageData[i + 1], imageData[i + 2]];
      pixels.push(color);
    }
  }

  colorPalette = generateDistinctPalette(pixels, 32);
  renderPalette();

  for (let y = 0; y < gridHeight; y++) {
    for (let x = 0; x < gridWidth; x++) {
      const i = (y * gridWidth + x);
      const color = pixels[i];
      const paletteIndex = getClosestColorIndex(color, colorPalette);
      colorGrid[y][x] = { index: paletteIndex, filled: false };
    }
  }

  updateCanvasSize();
}

function updateCanvasSize() {
  const zoomedCellSize = baseCellSize * zoomLevel;
  canvas.width = gridWidth * zoomedCellSize;
  canvas.height = gridHeight * zoomedCellSize;
  canvas.style.width = `${gridWidth * zoomedCellSize}px`;
  canvas.style.height = `${gridHeight * zoomedCellSize}px`;
  drawGrid();
}

function drawGrid() {
  const cellSize = baseCellSize * zoomLevel;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const showGrid = document.getElementById('toggle-grid')?.checked;

  for (let y = 0; y < gridHeight; y++) {
    for (let x = 0; x < gridWidth; x++) {
      const cell = colorGrid[y][x];
      const posX = x * cellSize;
      const posY = y * cellSize;

      ctx.fillStyle = cell.filled ? colorPalette[cell.index] : '#fff';
      ctx.fillRect(posX, posY, cellSize, cellSize);

      if (showGrid) {
        ctx.strokeStyle = '#ccc';
        ctx.strokeRect(posX, posY, cellSize, cellSize);
      }

      if (!cell.filled) {
        ctx.fillStyle = '#000';
        ctx.font = `${cellSize * 0.4}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(cell.index + 1, posX + cellSize / 2, posY + cellSize / 2);
      }
    }
  }
}


function fillCellAtMouse(e) {
  if (selectedColorIndex === null) return;

  const rect = canvas.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;
  const cellSize = baseCellSize * zoomLevel;

  const gridX = Math.floor(mouseX / cellSize);
  const gridY = Math.floor(mouseY / cellSize);

  const cell = colorGrid[gridY]?.[gridX];
  if (!cell || cell.filled || cell.index !== selectedColorIndex) return;

  if (document.getElementById('splash-fill').checked) {
    splashFill(gridX, gridY, cell.index);
  } else {
    cell.filled = true;
  }
  
  drawGrid();
  updateProgressBar();
}
function splashFill(x, y, targetIndex) {
  const queue = [[x, y]];
  const visited = new Set();
  const delay = 4; // Delay in milliseconds between each ripple

  function fillStep() {
    if (queue.length === 0) return;

    const [cx, cy] = queue.shift();
    const key = `${cx},${cy}`;
    if (visited.has(key)) {
      setTimeout(fillStep, delay);
      return;
    }

    visited.add(key);

    const cell = colorGrid[cy]?.[cx];
    if (!cell || cell.filled || cell.index !== targetIndex) {
      setTimeout(fillStep, delay);
      return;
    }

    cell.filled = true;
    drawGrid();

    // Push 4-directional neighbors
    queue.push([cx + 1, cy]);
    queue.push([cx - 1, cy]);
    queue.push([cx, cy + 1]);
    queue.push([cx, cy - 1]);

    setTimeout(fillStep, delay);
    updateProgressBar();
  }

  fillStep();
}



function renderPalette() {
  paletteDiv.innerHTML = '';
  colorPalette.forEach((color, index) => {
    const swatch = document.createElement('div');
    swatch.className = 'palette-color';
    swatch.style.background = color;
    swatch.textContent = index + 1;

    // Highlight if currently selected
    if (index === selectedColorIndex) {
      swatch.classList.add('selected');
    }

    swatch.addEventListener('click', () => {
      selectedColorIndex = index;

      // Remove highlight from all, then add to clicked
      document.querySelectorAll('.palette-color').forEach(el => el.classList.remove('selected'));
      swatch.classList.add('selected');
    });

    paletteDiv.appendChild(swatch);
  });
}

function downloadImage() {
  const downloadCanvas = document.createElement('canvas');
  downloadCanvas.width = gridWidth * baseCellSize;
  downloadCanvas.height = gridHeight * baseCellSize;
  const dCtx = downloadCanvas.getContext('2d');

  for (let y = 0; y < gridHeight; y++) {
    for (let x = 0; x < gridWidth; x++) {
      const cell = colorGrid[y][x];
      dCtx.fillStyle = cell.filled ? colorPalette[cell.index] : '#fff';
      dCtx.fillRect(x * baseCellSize, y * baseCellSize, baseCellSize, baseCellSize);
    }
  }

  const link = document.createElement('a');
  link.download = 'color-by-number.png';
  link.href = downloadCanvas.toDataURL();
  link.click();
}

// Utility Functions
function colorDistance(c1, c2) {
  return Math.sqrt((c1[0] - c2[0]) ** 2 + (c1[1] - c2[1]) ** 2 + (c1[2] - c2[2]) ** 2);
}

function rgbStringToArray(rgb) {
  return rgb.match(/\d+/g).map(Number);
}

function getClosestColorIndex(color, palette) {
  let min = Infinity;
  let idx = 0;
  palette.forEach((p, i) => {
    const dist = colorDistance(color, rgbStringToArray(p));
    if (dist < min) {
      min = dist;
      idx = i;
    }
  });
  return idx;
}

function generateDistinctPalette(pixels, count) {
  const candidates = requireKMeans(pixels, count * 4);
  const palette = [];

  for (let c of candidates) {
    if (!palette.some(p => colorDistance(rgbStringToArray(p), c) < 15)) {
      palette.push(`rgb(${c[0]},${c[1]},${c[2]})`);
      if (palette.length === count) break;
    }
  }
  return palette;
}

function requireKMeans(pixels, k) {
  const centers = [];
  const used = new Set();
  while (centers.length < k && centers.length < pixels.length) {
    const i = Math.floor(Math.random() * pixels.length);
    if (!used.has(i)) {
      centers.push(pixels[i]);
      used.add(i);
    }
  }
  return centers;
}
function updateProgressBar() {
  const totalCells = gridWidth * gridHeight;
  let filled = 0;
  for (let row of colorGrid) {
    for (let cell of row) {
      if (cell.filled) filled++;
    }
  }
  const percent = Math.round((filled / totalCells) * 100);
  document.getElementById('progress-fill').style.width = `${percent}%`;
  document.getElementById('progress-text').textContent = `${percent}%`;
}
