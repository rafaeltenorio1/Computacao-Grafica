document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('main-canvas');
    const ctx = canvas.getContext('2d');
    const algorithmSelect = document.getElementById('algorithm-select');
    const parametersArea = document.getElementById('parameters-area');
    const drawButton = document.getElementById('draw-button');
    const clearButton = document.getElementById('clear-button');
    const statusArea = document.getElementById('status-area');

    const GRID_SIZE = 20;
    const LARGURA_GRID = 45;
    const ALTURA_GRID = 45;

    const COR_BORDA = '#dc2626';
    const COR_PREENCHIMENTO = 'cyan';
    const COR_CLICK = 'black';
    const COR_JANELA = 'purple';

    const INSIDE = 0; // 0000
    const LEFT = 1; // 0001
    const RIGHT = 2; // 0010
    const BOTTOM = 4; // 0100
    const TOP = 8; // 1000

    function rotateY(point, angle) {
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        const x = point.x * cos - point.z * sin;
        const z = point.x * sin + point.z * cos;
        return { x: x, y: point.y, z: z };
    }

    function rotateX(point, angle) {
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        const y = point.y * cos - point.z * sin;
        const z = point.y * sin + point.z * cos;
        return { x: point.x, y: y, z: z };
    }

    let grid_color = [];
    for (let i = 0; i < ALTURA_GRID; i++) {
        let linha = [];
        for (let j = 0; j < LARGURA_GRID; j++) {
            linha.push('white');
        }
        grid_color.push(linha);
    }

    // Função para ajustar o tamanho do canvas e desenhar a grade
    function setupCanvas() {
        const container = canvas.parentElement;
        const containerSize = Math.min(container.clientWidth - 32, container.clientHeight - 32); 
        canvas.width = containerSize;
        canvas.height = containerSize;
        drawGrid();
    }

    // Função para desenhar a grade de fundo
    function drawGrid() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.strokeStyle = '#000000'; 
        ctx.lineWidth = 1;

        for (let x = 0; x <= canvas.width; x += GRID_SIZE) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, canvas.height);
            ctx.stroke();
        }

        for (let y = 0; y <= canvas.height; y += GRID_SIZE) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(canvas.width, y);
            ctx.stroke();
        }
    }

    function pixelToCell(x, y) {
        const cellX = Math.floor(x / GRID_SIZE);
        const cellY = Math.floor(y / GRID_SIZE);

        return { x: cellX, y: cellY };
    }

    function desenharCelula(x, y, color = COR_CLICK){

        if (x < 0 || x >= LARGURA_GRID || y < 0 || y >= ALTURA_GRID) {
            return; 
        }
        grid_color[x][y] = color;
        const gridX = x * GRID_SIZE;
        const gridY = y * GRID_SIZE;

        ctx.fillStyle = color;

        ctx.fillRect(gridX + 1, gridY + 1, GRID_SIZE - 2, GRID_SIZE - 2);
    }

    function drawHorizontalLine(x1, x2, y, color = COR_PREENCHIMENTO) {
        for (let x = Math.round(x1); x < Math.round(x2); x++) {
            desenharCelula(x, y, color);
        }
    }

    function euclideanDistance(x1, y1, x2, y2) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        return Math.hypot(dx, dy);
    }


    const parametersHTML = {
        bresenham: `
                    <p class="text-xs text-gray-500">Clique em 2 pontos no canvas ou insira as coordenadas.</p>
                    <div>
                        <label class="block text-xs font-medium">Ponto Inicial (X1, Y1)</label>
                        <div class="flex space-x-2 mt-1">
                            <input type="number" id="x1" placeholder="X1" class="w-full border-gray-300 rounded-md shadow-sm text-sm p-2"/>
                            <input type="number" id="y1" placeholder="Y1" class="w-full border-gray-300 rounded-md shadow-sm text-sm p-2"/>
                        </div>
                    </div>
                    <div>
                        <label class="block text-xs font-medium">Ponto Final (X2, Y2)</label>
                        <div class="flex space-x-2 mt-1">
                            <input type="number" id="x2" placeholder="X2" class="w-full border-gray-300 rounded-md shadow-sm text-sm p-2"/>
                            <input type="number" id="y2" placeholder="Y2" class="w-full border-gray-300 rounded-md shadow-sm text-sm p-2"/>
                        </div>
                    </div>
                `,
        circulo: `
                    <p class="text-xs text-gray-500">Clique no centro e insira o raio.</p>
                    <div>
                        <label class="block text-xs font-medium">Centro (Xc, Yc)</label>
                        <div class="flex space-x-2 mt-1">
                            <input type="number" id="xc" placeholder="Xc" class="w-full border-gray-300 rounded-md shadow-sm text-sm p-2"/>
                            <input type="number" id="yc" placeholder="Yc" class="w-full border-gray-300 rounded-md shadow-sm text-sm p-2"/>
                        </div>
                    </div>
                    <div>
                        <label class="block text-xs font-medium">Raio (R)</label>
                        <input type="number" id="raio" placeholder="Raio" class="w-full mt-1 border-gray-300 rounded-md shadow-sm text-sm p-2"/>
                    </div>
                `,
        elipse: `
                    <p class="text-xs text-gray-500">Clique no centro, depois em 2 pontos para os raios (horizontal e vertical).</p>
                    <div>
                        <label class="block text-xs font-medium">Centro (Xc, Yc)</label>
                        <div class="flex space-x-2 mt-1">
                            <input type="number" id="xc" placeholder="Xc" class="w-full border-gray-300 rounded-md shadow-sm text-sm p-2"/>
                            <input type="number" id="yc" placeholder="Yc" class="w-full border-gray-300 rounded-md shadow-sm text-sm p-2"/>
                        </div>
                    </div>
                    <div>
                        <label class="block text-xs font-medium">Raio X (Rx)</label>
                        <input type="number" id="rx" placeholder="Raio X" class="w-full mt-1 border-gray-300 rounded-md shadow-sm text-sm p-2"/>
                    </div>
                    <div>
                        <label class="block text-xs font-medium">Raio Y (Ry)</label>
                        <input type="number" id="ry" placeholder="Raio Y" class="w-full mt-1 border-gray-300 rounded-md shadow-sm text-sm p-2"/>
                    </div>
                `,
        curva: `
                    <p class="text-xs text-gray-500">Defina 4 pontos de controle para a Curva de Bézier.</p>
                    ${[1, 2, 3, 4].map(i => `
                    <div>
                        <label class="block text-xs font-medium">Ponto ${i} (P${i})</label>
                        <div class="flex space-x-2 mt-1">
                            <input type="number" id="p${i}x" placeholder="X${i}" class="w-full border-gray-300 rounded-md shadow-sm text-sm p-2"/>
                            <input type="number" id="p${i}y" placeholder="Y${i}" class="w-full border-gray-300 rounded-md shadow-sm text-sm p-2"/>
                        </div>
                    </div>
                    `).join('')}
                `,
        polilinha: `
                    <p class="text-xs text-gray-500">Adicione os vértices do polígono. Os algoritmos de preenchimento e recorte usarão este polígono.</p>
                    <div id="vertex-list" class="text-xs bg-white p-2 rounded border max-h-24 overflow-y-auto">Nenhum vértice adicionado.</div>
                    <div>
                        <input id="fechado" type="checkbox" name="fechado" checked />
                        <label for="fechado" class="text-xs text-gray-500 mt-2">Fechado</label>
                    </div>
                     <p class="text-xs text-gray-500 mt-2">Clique no canvas para adicionar vértices.</p>
                `,
        preenchimento_recursivo: `
                    <p class="text-xs text-gray-500">Use o polígono definido em "Polilinha". Clique em um ponto inicial dentro dele.</p>
                    <div>
                        <label class="block text-xs font-medium">Ponto Inicial (X, Y)</label>
                        <div class="flex space-x-2 mt-1">
                            <input type="number" id="startX" placeholder="X" class="w-full border-gray-300 rounded-md shadow-sm text-sm p-2"/>
                            <input type="number" id="startY" placeholder="Y" class="w-full border-gray-300 rounded-md shadow-sm text-sm p-2"/>
                        </div>
                    </div>
                     <div>
                        <label class="block text-xs font-medium">Cor de Preenchimento</label>
                        <input type="color" id="fillColor" value="#3b82f6" class="w-full mt-1 rounded-md"/>
                    </div>
                `,
        preenchimento_varredura: `
                     <p class="text-xs text-gray-500">Use o polígono definido em "Polilinha" para preencher.</p>
                     <div>
                        <label class="block text-xs font-medium">Cor de Preenchimento</label>
                        <input type="color" id="scanlineColor" value="#10b981" class="w-full mt-1 rounded-md"/>
                    </div>
                `,
        recorte_linha: `
                    <p class="text-xs text-gray-500">Defina a janela de recorte e a linha.</p>
                     <div>
                        <label class="block text-xs font-medium">Janela (Xmin, Ymin) e (Xmax, Ymax)</label>
                        <div class="grid grid-cols-2 gap-2 mt-1">
                            <input type="number" id="xmin" placeholder="Xmin" class="w-full border-gray-300 rounded-md shadow-sm text-sm p-2"/>
                            <input type="number" id="ymin" placeholder="Ymin" class="w-full border-gray-300 rounded-md shadow-sm text-sm p-2"/>
                            <input type="number" id="xmax" placeholder="Xmax" class="w-full border-gray-300 rounded-md shadow-sm text-sm p-2"/>
                            <input type="number" id="ymax" placeholder="Ymax" class="w-full border-gray-300 rounded-md shadow-sm text-sm p-2"/>
                        </div>
                    </div>
                    <div>
                        <label class="block text-xs font-medium">Linha a ser recortada</label>
                        <div class="grid grid-cols-2 gap-2 mt-1">
                            <input type="number" id="lx1" placeholder="X1" class="w-full border-gray-300 rounded-md shadow-sm text-sm p-2"/>
                            <input type="number" id="ly1" placeholder="Y1" class="w-full border-gray-300 rounded-md shadow-sm text-sm p-2"/>
                            <input type="number" id="lx2" placeholder="X2" class="w-full border-gray-300 rounded-md shadow-sm text-sm p-2"/>
                            <input type="number" id="ly2" placeholder="Y2" class="w-full border-gray-300 rounded-md shadow-sm text-sm p-2"/>
                        </div>
                    </div>
                `,
        recorte_poligono: `
                    <p class="text-xs text-gray-500">Define uma janela e recorta o polígono definido em "Polilinha".</p>
                    <div>
                        <label class="block text-xs font-medium">Janela de Recorte</label>
                         <div class="grid grid-cols-2 gap-2 mt-1">
                            <input type="number" id="cxmin" placeholder="Xmin" class="w-full border-gray-300 rounded-md shadow-sm text-sm p-2"/>
                            <input type="number" id="cymin" placeholder="Ymin" class="w-full border-gray-300 rounded-md shadow-sm text-sm p-2"/>
                            <input type="number" id="cxmax" placeholder="Xmax" class="w-full border-gray-300 rounded-md shadow-sm text-sm p-2"/>
                            <input type="number" id="cymax" placeholder="Ymax" class="w-full border-gray-300 rounded-md shadow-sm text-sm p-2"/>
                        </div>
                    </div>
                `,
        transformacoes: `
                    <p class="text-xs text-gray-500">Aplica transformações no polígono de "Polilinha".</p>
                     <div>
                        <label class="block text-xs font-medium">Tipo</label>
                        <select id="transform-type" class="w-full mt-1 border-gray-300 rounded-md shadow-sm text-sm p-2">
                            <option value="translacao">Translação</option>
                            <option value="rotacao">Rotação</option>
                            <option value="escala">Escala</option>
                        </select>
                    </div>
                    <div id="transform-params"></div>
                `,
        projecao_ortogonal: `
                    <p class="text-xs text-gray-500">Projeta um objeto 3D.</p>
                    <p class="text-xs text-gray-500">Lista de vétices:</p>
                    <textarea id="vertex" name="vertex-orto" rows="5" cols="33" placeholder="Lista de vértices...">[{ "x": -8, "y": -8, "z": -8 }, { "x": 8, "y": -8, "z": -8 }, { "x": 8, "y": 8, "z": -8 }, { "x": -8, "y": 8, "z": -8 }, { "x": -8, "y": -8, "z": 8 }, { "x": 8, "y": -8, "z": 8 }, { "x": 8, "y": 8, "z": 8 }, { "x": -8, "y": 8, "z": 8 }]</textarea>
                    <p class="text-xs text-gray-500">Lista de arestas:</p>
                    <textarea id="egde" name="egde-orto" rows="5" cols="33" placeholder="Lista de arestas...">[[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]]</textarea>

                    <div>
                        <label class="block text-xs font-medium mt-2">Rotação X: <span id="rotX-val">0</span>°</label>
                        <input type="range" id="rotX" min="-180" max="180" value="0" class="w-full"/>
                    </div>
                     <div>
                        <label class="block text-xs font-medium">Rotação Y: <span id="rotY-val">0</span>°</label>
                        <input type="range" id="rotY" min="-180" max="180" value="0" class="w-full"/>
                    </div>
                `,
        projecao_perspectiva: `
                    <p class="text-xs text-gray-500">Projeta um objeto 3D.</p>
                    <p class="text-xs text-gray-500">Lista de vétices:</p>
                    <textarea id="vertex" name="vertex-persp" rows="5" cols="33" placeholder="Lista de vértices...">[{ "x": -8, "y": -8, "z": -8 }, { "x": 8, "y": -8, "z": -8 }, { "x": 8, "y": 8, "z": -8 }, { "x": -8, "y": 8, "z": -8 }, { "x": -8, "y": -8, "z": 8 }, { "x": 8, "y": -8, "z": 8 }, { "x": 8, "y": 8, "z": 8 }, { "x": -8, "y": 8, "z": 8 }]</textarea>
                    <p class="text-xs text-gray-500">Lista de arestas:</p>
                    <textarea id="egde" name="egde-persp" rows="5" cols="33" placeholder="Lista de arestas...">[[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]]</textarea>

                     <div>
                        <label class="block text-xs font-medium mt-2">Distância da Câmera: <span id="dist-val">16</span></label>
                        <input type="range" id="dist" min="0" max="100" value="16" class="w-full"/>
                    </div>
                     <div>
                        <label class="block text-xs font-medium">Rotação X: <span id="rotX-persp-val">0</span>°</label>
                        <input type="range" id="rotX-persp" min="-180" max="180" value="0" class="w-full"/>
                    </div>
                     <div>
                        <label class="block text-xs font-medium">Rotação Y: <span id="rotY-persp-val">0</span>°</label>
                        <input type="range" id="rotY-persp" min="-180" max="180" value="0" class="w-full"/>
                    </div>
                `,
        projecao_cavalier: `
                    <p class="text-xs text-gray-500">Projeta um objeto 3D.</p>
                    <p class="text-xs text-gray-500">Lista de vétices:</p>
                    <textarea id="vertex" name="vertex-cava" rows="5" cols="33" placeholder="Lista de vértices...">[{ "x": -8, "y": -8, "z": -8 }, { "x": 8, "y": -8, "z": -8 }, { "x": 8, "y": 8, "z": -8 }, { "x": -8, "y": 8, "z": -8 }, { "x": -8, "y": -8, "z": 8 }, { "x": 8, "y": -8, "z": 8 }, { "x": 8, "y": 8, "z": 8 }, { "x": -8, "y": 8, "z": 8 }]</textarea>
                    <p class="text-xs text-gray-500">Lista de arestas:</p>
                    <textarea id="egde" name="egde-cava" rows="5" cols="33" placeholder="Lista de arestas...">[[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]]</textarea>

                     <div>
                        <label class="block text-xs font-medium mt-2">Ângulo de Projeção: <span id="angle-cava-val"></span></label>
                        <input type="range" id="angle-cava" min="30" max="45" value="30" class="w-full"/>
                    </div>
                     <div>
                        <label class="block text-xs font-medium">Rotação X: <span id="rotX-cava-val">0</span>°</label>
                        <input type="range" id="rotX-cava" min="-180" max="180" value="0" class="w-full"/>
                    </div>
                     <div>
                        <label class="block text-xs font-medium">Rotação Y: <span id="rotY-cava-val">0</span>°</label>
                        <input type="range" id="rotY-cava" min="-180" max="180" value="0" class="w-full"/>
                    </div>
                `,
        projecao_cabinet: `
                    <p class="text-xs text-gray-500">Projeta um objeto 3D.</p>
                    <p class="text-xs text-gray-500">Lista de vétices:</p>
                    <textarea id="vertex" name="vertex-cabi" rows="5" cols="33" placeholder="Lista de vértices...">[{ "x": -8, "y": -8, "z": -8 }, { "x": 8, "y": -8, "z": -8 }, { "x": 8, "y": 8, "z": -8 }, { "x": -8, "y": 8, "z": -8 }, { "x": -8, "y": -8, "z": 8 }, { "x": 8, "y": -8, "z": 8 }, { "x": 8, "y": 8, "z": 8 }, { "x": -8, "y": 8, "z": 8 }]</textarea>
                    <p class="text-xs text-gray-500">Lista de arestas:</p>
                    <textarea id="egde" name="egde-cabi" rows="5" cols="33" placeholder="Lista de arestas...">[[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]]</textarea>

                     <div>
                        <label class="block text-xs font-medium mt-2">Ângulo de Projeção: <span id="angle-cabi-val"></span></label>
                        <input type="range" id="angle-cabi" min="30" max="45" value="30" class="w-full"/>
                    </div>
                     <div>
                        <label class="block text-xs font-medium">Rotação X: <span id="rotX-cabi-val">0</span>°</label>
                        <input type="range" id="rotX-cabi" min="-180" max="180" value="0" class="w-full"/>
                    </div>
                     <div>
                        <label class="block text-xs font-medium">Rotação Y: <span id="rotY-cabi-val">0</span>°</label>
                        <input type="range" id="rotY-cabi" min="-180" max="180" value="0" class="w-full"/>
                    </div>
                `,
    };

    const transformParamsHTML = {
        translacao: `
                    <label class="block text-xs font-medium mt-2">Fatores (Tx, Ty)</label>
                    <div class="flex space-x-2 mt-1">
                        <input type="number" id="tx" placeholder="Tx" value="10" class="w-full border-gray-300 rounded-md shadow-sm text-sm p-2"/>
                        <input type="number" id="ty" placeholder="Ty" value="10" class="w-full border-gray-300 rounded-md shadow-sm text-sm p-2"/>
                    </div>
                `,
        rotacao: `
                    <label class="block text-xs font-medium mt-2">Ângulo (°)</label>
                    <input type="number" id="angle" placeholder="Ângulo" value="45" class="w-full mt-1 border-gray-300 rounded-md shadow-sm text-sm p-2"/>
                `,
        escala: `
                    <label class="block text-xs font-medium mt-2">Fatores (Sx, Sy)</label>
                    <div class="flex space-x-2 mt-1">
                        <input type="number" step="0.1" id="sx" placeholder="Sx" value="1.5" class="w-full border-gray-300 rounded-md shadow-sm text-sm p-2"/>
                        <input type="number" step="0.1" id="sy" placeholder="Sy" value="1.5" class="w-full border-gray-300 rounded-md shadow-sm text-sm p-2"/>
                    </div>
                `
    };

    function updateParametersUI() {
        const selectedAlgorithm = algorithmSelect.value;
        parametersArea.innerHTML = parametersHTML[selectedAlgorithm];

        // Lógica especial para o painel de transformações
        if (selectedAlgorithm === 'transformacoes') {
            const transformTypeSelect = document.getElementById('transform-type');
            const transformParamsDiv = document.getElementById('transform-params');

            function updateTransformParams() {
                transformParamsDiv.innerHTML = transformParamsHTML[transformTypeSelect.value];
            }

            transformTypeSelect.addEventListener('change', updateTransformParams);
            updateTransformParams(); 
        }

        // Lógica para atualizar os valores dos sliders de projeção
        if (selectedAlgorithm.startsWith('projecao')) {
            document.querySelectorAll('input[type="range"]').forEach(slider => {
                const valueSpan = document.getElementById(`${slider.id}-val`);
                if (valueSpan) {
                    valueSpan.textContent = slider.value;
                    slider.addEventListener('input', () => {
                        valueSpan.textContent = slider.value;
                    });
                }
            });
        }
    }

    // Função para lidar com cliques no canvas
    let clickCount = 0;
    let polygonVertices = [];

    canvas.addEventListener('click', (e) => {
        const rect = canvas.getBoundingClientRect();
        const x = Math.round(e.clientX - rect.left);
        const y = Math.round(e.clientY - rect.top);

        const cell = pixelToCell(x, y);
        desenharCelula(cell.x, cell.y, 'black');

        const selectedAlgorithm = algorithmSelect.value;

        switch (selectedAlgorithm) {
            case 'bresenham':
                if (clickCount === 0) {
                    document.getElementById('x1').value = cell.x;
                    document.getElementById('y1').value = cell.y;
                    clickCount++;
                } else {
                    document.getElementById('x2').value = cell.x;
                    document.getElementById('y2').value = cell.y;
                    clickCount = 0;
                }
                break;
            case 'circulo':
                if (clickCount === 0) {
                    document.getElementById('xc').value = cell.x;
                    document.getElementById('yc').value = cell.y;
                    clickCount++;
                } else {
                    const x1 = document.getElementById('xc').value;
                    const y1 = document.getElementById('yc').value;
                    const x2 = cell.x;
                    const y2 = cell.y;

                    const raio = euclideanDistance(x1, y1, x2, y2);
                    document.getElementById('raio').value = Math.round(raio);
                    clickCount = 0;
                };
                break;
            case 'curva':
                if (clickCount === 0) {
                    document.getElementById('p1x').value = cell.x;
                    document.getElementById('p1y').value = cell.y;
                    clickCount++;
                } else if (clickCount === 1) {
                    document.getElementById('p2x').value = cell.x;
                    document.getElementById('p2y').value = cell.y;
                    clickCount++;
                } else if (clickCount === 2) {
                    document.getElementById('p3x').value = cell.x;
                    document.getElementById('p3y').value = cell.y;
                    clickCount++;
                } else {
                    document.getElementById('p4x').value = cell.x;
                    document.getElementById('p4y').value = cell.y;
                    clickCount = 0;
                }
                break;
            case 'recorte_linha':
                polygonVertices.push(cell);
                if (polygonVertices.length === 2) {
                    let { x_min, y_min, x_max, y_max, largura, altura } = calcularTamanhoJanela(polygonVertices[0], polygonVertices[1]);
                    document.getElementById('xmin').value = x_min;
                    document.getElementById('ymin').value = y_min;
                    document.getElementById('xmax').value = x_max;
                    document.getElementById('ymax').value = y_max;

                    desenhaJanela(x_min, x_max, y_min, y_max);
                } else if (polygonVertices.length === 3) {
                    document.getElementById('lx1').value = cell.x;
                    document.getElementById('ly1').value = cell.y;
                } else if (polygonVertices.length === 4) {
                    document.getElementById('lx2').value = cell.x;
                    document.getElementById('ly2').value = cell.y;
                    polygonVertices = [];
                }
                break;
            case 'polilinha':

                polygonVertices.push(cell);
                const vertexList = document.getElementById('vertex-list');
                if (polygonVertices.length === 1) vertexList.innerHTML = '';
                vertexList.innerHTML += `<div class="p-1">Vértice ${polygonVertices.length}: (${cell.x}, ${cell.y})</div>`;
                break;
            case 'preenchimento_recursivo':
                document.getElementById('startX').value = cell.x;
                document.getElementById('startY').value = cell.y;
                break;
            case 'preenchimento_varredura':
                polygonVertices.push(cell);
                break;
            case 'elipse':
                if (clickCount === 0) {
                    document.getElementById('xc').value = cell.x;
                    document.getElementById('yc').value = cell.y;
                    clickCount++;
                } else if (clickCount === 1) {
                    const xc = document.getElementById('xc').value;
                    const rx = Math.abs(cell.x - xc); 
                    document.getElementById('rx').value = rx;
                    clickCount++;
                } else {
                    const yc = document.getElementById('yc').value;
                    const ry = Math.abs(cell.y - yc); 
                    document.getElementById('ry').value = ry;
                    clickCount = 0; 
                }
                break;
        }
    });

    // Função para mostrar coordenadas no mouse move
    canvas.addEventListener('mousemove', (e) => {
        const rect = canvas.getBoundingClientRect();
        const x = Math.round(e.clientX - rect.left);
        const y = Math.round(e.clientY - rect.top);

        const cell = pixelToCell(x, y);
        statusArea.textContent = `Célula: (X: ${cell.x}, Y: ${cell.y})`;
    });

    canvas.addEventListener('mouseleave', () => {
        statusArea.textContent = 'Passe o mouse sobre o canvas para ver as coordenadas.';
    });

    // ------------- INÍCIO DA IMPLEMENTAÇÃO DOS ALGORITMOS -----------------------------------

    // Algoritmo de bresenham 
    function bresenham(x0, y0, x1, y1, color = COR_BORDA) {
        const dx = Math.abs(x1 - x0);
        const dy = -Math.abs(y1 - y0);

        const sx = x0 < x1 ? 1 : -1;
        const sy = y0 < y1 ? 1 : -1;

        let err = dx + dy;

        while (true) {
            desenharCelula(x0, y0, color);

            if (x0 === x1 && y0 === y1) {
                break;
            }

            let e2 = 2 * err;

            if (e2 >= dy) {
                err += dy;
                x0 += sx;
            }

            if (e2 <= dx) {
                err += dx;
                y0 += sy;
            }
        }
    }

    // Algortimo bresenham para circulos
    function desenhaCirculo(xc, yc, x, y) {
        desenharCelula(xc + x, yc + y, COR_BORDA);
        desenharCelula(xc - x, yc + y, COR_BORDA);
        desenharCelula(xc + x, yc - y, COR_BORDA);
        desenharCelula(xc - x, yc - y, COR_BORDA);
        desenharCelula(xc + y, yc + x, COR_BORDA);
        desenharCelula(xc - y, yc + x, COR_BORDA);
        desenharCelula(xc + y, yc - x, COR_BORDA);
        desenharCelula(xc - y, yc - x, COR_BORDA);
    }

    function bresenhamCirculo(xc, yc, radius) {
        let x = radius;
        let y = 0;

        let P = 1 - radius;

        desenhaCirculo(xc, yc, x, y);

        while (x > y) {
            y++;

            if (P <= 0) {
                P = P + 2 * y + 1;
            }
            else {
                x--;
                P = P + 2 * y - 2 * x + 1;
            }

            if (x < y) {
                break;
            }
            desenhaCirculo(xc, yc, x, y);
        }
    }

    // Algoritmo de elipse
    function desenhaElipse(xc, yc, x, y) {
        desenharCelula(xc + x, yc + y, COR_BORDA);
        desenharCelula(xc - x, yc + y, COR_BORDA);
        desenharCelula(xc + x, yc - y, COR_BORDA);
        desenharCelula(xc - x, yc - y, COR_BORDA);
    }

    function pontoMedioElipse(xc, yc, rx, ry) {
        const rx2 = rx * rx;
        const ry2 = ry * ry;
        const twoRx2 = 2 * rx2;
        const twoRy2 = 2 * ry2;

        let p;
        let x = 0;
        let y = ry;
        let px = 0;
        let py = twoRx2 * y;

        desenhaElipse(xc, yc, x, y);

        p = Math.round(ry2 - (rx2 * ry) + (0.25 * rx2));
        while (px < py) {
            x++;
            px += twoRy2;
            if (p < 0) {
                p += ry2 + px;
            } else {
                y--;
                py -= twoRx2;
                p += ry2 + px - py;
            }

            desenhaElipse(xc, yc, x, y);

        }
        p = Math.round(ry2 * (x + 0.5) * (x + 0.5) + rx2 * (y - 1) * (y - 1) - rx2 * ry2);
        while (y > 0) {
            y--;
            py -= twoRx2;
            if (p > 0) {
                p += rx2 - py;
            } else {
                x++;
                px += twoRy2;
                p += rx2 - py + px;
            }
            desenhaElipse(xc, yc, x, y);
        }
    }

    //Desenhar curva de bezier
    function desenhaCurvaBezier(p0, p1, p2, p3, steps = 1000) {
        let lastX = -1;
        let lastY = -1;

        for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            const invT = 1 - t;

            const x = Math.round(
                invT * invT * invT * p0.x +
                3 * invT * invT * t * p1.x +
                3 * invT * t * t * p2.x +
                t * t * t * p3.x
            );

            const y = Math.round(
                invT * invT * invT * p0.y +
                3 * invT * invT * t * p1.y +
                3 * invT * t * t * p2.y +
                t * t * t * p3.y
            );

            if (i > 0) {
                if (x !== lastX || y !== lastY) {
                    bresenham(lastX, lastY, x, y, COR_BORDA);
                }
            }

            lastX = x;
            lastY = y;
        }
    }
    //Algoritmo de polilinhas e poligonos
    function desenhaPolilinhas(points, isClosed = false) {
        if (!points || points.length < 2) {
            console.log("É necessário pelo menos 2 pontos para desenhar.");
            return;
        }

        for (let i = 0; i < points.length - 1; i++) {
            const startPoint = points[i];
            const endPoint = points[i + 1];
            bresenham(startPoint.x, startPoint.y, endPoint.x, endPoint.y);
        }

        if (isClosed && points.length > 2) {
            const lastPoint = points[points.length - 1];
            const firstPoint = points[0];
            bresenham(lastPoint.x, lastPoint.y, firstPoint.x, firstPoint.y);
        }
    }

    //Algoritmo de preenchimento recursivo
    function getPixelColor(x, y) {
        if (x < 0 || x >= LARGURA_GRID || y < 0 || y >= ALTURA_GRID) {
            return 'uncolor'; 
        }
        return grid_color[x][y];
    }

    //Algoritmo de preenchimento recursivo
    function preenchimentoRecursivo(x, y, color = COR_PREENCHIMENTO) {

        const currentColor = getPixelColor(x, y);
        if (currentColor === "uncolor" || currentColor === COR_BORDA || currentColor === color) {
            return;
        }

        desenharCelula(x, y, color);

        preenchimentoRecursivo(x + 1, y, color);
        preenchimentoRecursivo(x - 1, y, color);
        preenchimentoRecursivo(x, y + 1, color);
        preenchimentoRecursivo(x, y - 1, color);
    }

    // Preenchimento de Varredura
    function preenchimentoVarredura(points, color = COR_PREENCHIMENTO) {
        let minY = Infinity;
        let maxY = -Infinity;

        points.forEach(p => {
            minY = Math.min(minY, p.y);
            maxY = Math.max(maxY, p.y);
        });

        const edgeTable = [];
        for (let i = 0; i < ALTURA_GRID; i++) {
            edgeTable[i] = [];
        }

        for (let i = 0; i < points.length; i++) {
            const p1 = points[i];
            const p2 = points[(i + 1) % points.length];

            if (p1.y === p2.y) continue;

            const yMin = Math.min(p1.y, p2.y);
            const yMax = Math.max(p1.y, p2.y);
            const xAtYMin = (p1.y < p2.y) ? p1.x : p2.x;
            const inverseSlope = (p2.x - p1.x) / (p2.y - p1.y);

            edgeTable[yMin].push({
                yMax: yMax,
                x: xAtYMin,
                invSlope: inverseSlope
            });
        }

        let activeEdgeTable = [];

        for (let y = minY; y < maxY; y++) {
            if (edgeTable[y]) {
                activeEdgeTable.push(...edgeTable[y]);
            }

            activeEdgeTable = activeEdgeTable.filter(edge => edge.yMax !== y);

            activeEdgeTable.sort((a, b) => a.x - b.x);

            for (let i = 0; i < activeEdgeTable.length; i += 2) {
                if (activeEdgeTable[i + 1]) {
                    drawHorizontalLine(activeEdgeTable[i].x, activeEdgeTable[i + 1].x, y, color);
                }
            }

            activeEdgeTable.forEach(edge => {
                edge.x += edge.invSlope;
            });
        }
    }

    
    function calculateCentroid(points) {
        if (!points || points.length === 0) {
            return { x: 0, y: 0 };
        }
        let totalX = 0;
        let totalY = 0;
        for (const p of points) {
            totalX += p.x;
            totalY += p.y;
        }
        return {
            x: totalX / points.length,
            y: totalY / points.length
        };
    }

    // Função para transladar o polígono
    function translacao(points, tx, ty) {
        return points.map(p => ({
            x: p.x + tx,
            y: p.y + ty
        }));
    }

    // Função para rotacionar o polígono em torno de seu centroide
    function rotacao(points, angleDegrees) {
        const angleRadians = angleDegrees * (Math.PI / 180);
        const cosA = Math.cos(angleRadians);
        const sinA = Math.sin(angleRadians);
        const centroid = calculateCentroid(points);

        return points.map(p => {
            const tempX = p.x - centroid.x;
            const tempY = p.y - centroid.y;

            const rotatedX = tempX * cosA - tempY * sinA;
            const rotatedY = tempX * sinA + tempY * cosA;

            return {
                x: Math.round(rotatedX + centroid.x),
                y: Math.round(rotatedY + centroid.y)
            };
        });
    }

    // Função para Escalar o polígono em torno de seu centro
    function escala(points, sx, sy) {
        const centroid = calculateCentroid(points);

        return points.map(p => {
            const tempX = p.x - centroid.x;
            const tempY = p.y - centroid.y;

            const scaledX = tempX * sx;
            const scaledY = tempY * sy;

            return {
                x: Math.round(scaledX + centroid.x),
                y: Math.round(scaledY + centroid.y)
            };
        });
    }

    //Algoritmo de projeção ortogonal
    function projecaoOrtogonal(point) {
        return { x: point.x, y: point.y };
    }

    function desenhaOrtogonal(angleX, angleY, vertices, edges) {
        const radX = angleX * Math.PI / 180;
        const radY = angleY * Math.PI / 180;

        let projectedPoints = [];

        for (const vertex of vertices) {
            let rotated = rotateY(vertex, radY);
            rotated = rotateX(rotated, radX);

            const projected = projecaoOrtogonal(rotated);

            const screenX = Math.floor(projected.x + LARGURA_GRID / 2);
            const screenY = Math.floor(projected.y + ALTURA_GRID / 2);

            projectedPoints.push({ x: screenX, y: screenY });
        }

        for (const edge of edges) {
            const p1 = projectedPoints[edge[0]];
            const p2 = projectedPoints[edge[1]];
            bresenham(p1.x, p1.y, p2.x, p2.y);
        }
    }

    //Algoritmo de projeção perspectiva
    function projecaoPerspectiva(point, viewerDistance) {
        const factor = viewerDistance / (viewerDistance + point.z);

        return {
            x: point.x * factor,
            y: point.y * factor
        };
    }

    function desenhaPerspectiva(angleX, angleY, viewerDistance = 30, vertices, edges) {
        const radX = angleX * Math.PI / 180;
        const radY = angleY * Math.PI / 180;

        const projectedPoints = [];

        for (const vertex of vertices) {
            let rotated = rotateY(vertex, radY);
            rotated = rotateX(rotated, radX);

            const projected = projecaoPerspectiva(rotated, viewerDistance);

            const screenX = Math.floor(projected.x + LARGURA_GRID / 2);
            const screenY = Math.floor(projected.y + ALTURA_GRID / 2);

            projectedPoints.push({ x: screenX, y: screenY });
        }

        for (const edge of edges) {
            const p1 = projectedPoints[edge[0]];
            const p2 = projectedPoints[edge[1]];
            bresenham(p1.x, p1.y, p2.x, p2.y);
        }
    }

    //Algoritmo de projeção Cavalier
    function projecaoCavalier(point, angleDeg) {
        const angleRad = angleDeg * Math.PI / 180;

        const scaleZ = 1;

        return {
            x: point.x + point.z * scaleZ * Math.cos(angleRad),
            y: point.y + point.z * scaleZ * Math.sin(angleRad)
        };
    }

    function desenhaCavalier(angleX, angleY, angleDeg = 45, vertices, edges) {
        const radX = angleX * Math.PI / 180;
        const radY = angleY * Math.PI / 180;

        const projectedPoints = [];

        for (const vertex of vertices) {
            let rotated = rotateY(vertex, radY);
            rotated = rotateX(rotated, radX);

            const projected = projecaoCavalier(rotated, angleDeg);

            const screenX = Math.floor(projected.x + LARGURA_GRID / 2);
            const screenY = Math.floor(projected.y + ALTURA_GRID / 2);

            projectedPoints.push({ x: screenX, y: screenY });
        }

        for (const edge of edges) {
            const p1 = projectedPoints[edge[0]];
            const p2 = projectedPoints[edge[1]];
            bresenham(p1.x, p1.y, p2.x, p2.y);
        }
    }

    function projecaoCabinet(point, angleDeg) {
        const angleRad = angleDeg * Math.PI / 180;

        const scaleZ = 0.5;

        return {
            x: point.x + point.z * scaleZ * Math.cos(angleRad),
            y: point.y + point.z * scaleZ * Math.sin(angleRad)
        };
    }

    function desenhaCabinet(angleX, angleY, angleDeg = 45, vertices, edges) {
        const radX = angleX * Math.PI / 180;
        const radY = angleY * Math.PI / 180;

        const projectedPoints = [];

        for (const vertex of vertices) {
            let rotated = rotateY(vertex, radY);
            rotated = rotateX(rotated, radX);

            const projected = projecaoCabinet(rotated, angleDeg);

            const screenX = Math.floor(projected.x + LARGURA_GRID / 2);
            const screenY = Math.floor(projected.y + ALTURA_GRID / 2);

            projectedPoints.push({ x: screenX, y: screenY });
        }

        for (const edge of edges) {
            const p1 = projectedPoints[edge[0]];
            const p2 = projectedPoints[edge[1]];
            bresenham(p1.x, p1.y, p2.x, p2.y);
        }
    }

    function computeOutcode(x, y, xMin, xMax, yMin, yMax) {
        let code = INSIDE;
        if (x < xMin) code |= LEFT;
        else if (x > xMax) code |= RIGHT;
        if (y < yMin) code |= BOTTOM;
        else if (y > yMax) code |= TOP;
        return code;
    }

    // Recorte de Linha
    function cohenSutherland(x1, y1, x2, y2, xMin, xMax, yMin, yMax) {

        let outcode1 = computeOutcode(x1, y1, xMin, xMax, yMin, yMax);
        let outcode2 = computeOutcode(x2, y2, xMin, xMax, yMin, yMax);
        let accept = false;

        while (true) {
            if ((outcode1 | outcode2) === 0) {
                accept = true;
                break;
            }
            else if ((outcode1 & outcode2) !== 0) {
                break;
            }
            else {
                let x, y;

                const outcodeOut = outcode1 !== 0 ? outcode1 : outcode2;

                if (outcodeOut & TOP) {
                    x = (y2 - y1 === 0) ? x1 : x1 + (x2 - x1) * (yMax - y1) / (y2 - y1);
                    y = yMax;
                } else if (outcodeOut & BOTTOM) {
                    x = (y2 - y1 === 0) ? x1 : x1 + (x2 - x1) * (yMin - y1) / (y2 - y1);
                    y = yMin;
                } else if (outcodeOut & RIGHT) {
                    y = (x2 - x1 === 0) ? y1 : y1 + (y2 - y1) * (xMax - x1) / (x2 - x1);
                    x = xMax;
                } else if (outcodeOut & LEFT) {
                    y = (x2 - x1 === 0) ? y1 : y1 + (y2 - y1) * (xMin - x1) / (x2 - x1);
                    x = xMin;
                }

                if (outcodeOut === outcode1) {
                    x1 = x;
                    y1 = y;
                    outcode1 = computeOutcode(x1, y1, xMin, xMax, yMin, yMax);
                } else {
                    x2 = x;
                    y2 = y;
                    outcode2 = computeOutcode(x2, y2, xMin, xMax, yMin, yMax);
                }
            }
        }

        if (accept) {
            bresenham(Math.round(x1), Math.round(y1), Math.round(x2), Math.round(y2));
        }
    }

    function calcularTamanhoJanela(p1, p2) {
        const x_min = Math.min(p1.x, p2.x);
        const y_min = Math.min(p1.y, p2.y);
        const x_max = Math.max(p1.x, p2.x);
        const y_max = Math.max(p1.y, p2.y);

        const largura = x_max - x_min;
        const altura = y_max - y_min;

        return { x_min, y_min, x_max, y_max, largura, altura };
    }

    function desenhaJanela(xMin, xMax, yMin, yMax) {
        bresenham(xMin, yMin, xMax, yMin, COR_JANELA);
        bresenham(xMin, yMax, xMax, yMax, COR_JANELA);

        bresenham(xMax, yMin, xMax, yMax, COR_JANELA);
        bresenham(xMin, yMax, xMin, yMin, COR_JANELA);
    }

    // -------------------- FIM DA IMPLEMENTAÇÃO DOS ALGORITMOS ------------------------------


    // Função de Desenho
    drawButton.addEventListener('click', () => {
        const algorithm = algorithmSelect.value;

        switch (algorithm) {
            case 'bresenham':
                const x1 = parseInt(document.getElementById('x1').value);
                const y1 = parseInt(document.getElementById('y1').value);
                const x2 = parseInt(document.getElementById('x2').value);
                const y2 = parseInt(document.getElementById('y2').value);


                if (!isNaN(x1) && !isNaN(y1) && !isNaN(x2) && !isNaN(y2)) {
                    bresenham(x1, y1, x2, y2);
                } else {
                    alert("Por favor, defina um ponto inicial e final para a reta.");
                }
                break;
            case 'circulo':
                const xc = parseInt(document.getElementById('xc').value);
                const yc = parseInt(document.getElementById('yc').value);
                const raio = parseInt(document.getElementById('raio').value);

                bresenhamCirculo(xc, yc, raio);

                break;
            case 'curva':
                const p1 = {
                    x: parseInt(document.getElementById('p1x').value),
                    y: parseInt(document.getElementById('p1y').value)
                };
                const p2 = {
                    x: parseInt(document.getElementById('p2x').value),
                    y: parseInt(document.getElementById('p2y').value)
                };

                const p3 = {
                    x: parseInt(document.getElementById('p3x').value),
                    y: parseInt(document.getElementById('p3y').value)
                };

                const p4 = {
                    x: parseInt(document.getElementById('p4x').value),
                    y: parseInt(document.getElementById('p4y').value)
                };

                desenhaCurvaBezier(p1, p2, p3, p4);

                break;
            case 'polilinha':
                const isClosed = document.getElementById('fechado').checked;
                desenhaPolilinhas(polygonVertices, isClosed);
                break;
            case 'preenchimento_recursivo':
                const startX = parseInt(document.getElementById('startX').value);
                const startY = parseInt(document.getElementById('startY').value);
                const colorRecursive = document.getElementById('fillColor').value;
                preenchimentoRecursivo(startX, startY, colorRecursive);
                break;
            case 'recorte_linha':

                const lx1 = parseInt(document.getElementById('lx1').value);
                const ly1 = parseInt(document.getElementById('ly1').value);
                const lx2 = parseInt(document.getElementById('lx2').value);
                const ly2 = parseInt(document.getElementById('ly2').value);

                const xmin = parseInt(document.getElementById('xmin').value);
                const xmax = parseInt(document.getElementById('xmax').value);
                const ymin = parseInt(document.getElementById('ymin').value);
                const ymax = parseInt(document.getElementById('ymax').value);

                cohenSutherland(lx1, ly1, lx2, ly2, xmin, xmax, ymin, ymax);
                break;
            case 'transformacoes':
                if (polygonVertices.length < 2) {
                    alert("Por favor, defina um polígono na aba 'Polilinha' primeiro.");
                    return;
                }
                const transformType = document.getElementById('transform-type').value;
                let transformedVertices = [];

                switch (transformType) {
                    case 'translacao':
                        const tx = parseInt(document.getElementById('tx').value);
                        const ty = parseInt(document.getElementById('ty').value);
                        transformedVertices = translacao(polygonVertices, tx, ty);
                        break;
                    case 'rotacao':
                        const angle = parseInt(document.getElementById('angle').value);
                        transformedVertices = rotacao(polygonVertices, angle);
                        break;
                    case 'escala':
                        const sx = parseFloat(document.getElementById('sx').value);
                        const sy = parseFloat(document.getElementById('sy').value);
                        transformedVertices = escala(polygonVertices, sx, sy);
                        break;
                }

                polygonVertices = transformedVertices;

                setupCanvas();
                desenhaPolilinhas(polygonVertices, document.getElementById('fechado')?.checked || true);

                const vertexList = document.getElementById('vertex-list');
                if (vertexList) {
                    vertexList.innerHTML = ''; // Limpa a lista
                    polygonVertices.forEach((cell, index) => {
                        vertexList.innerHTML += `<div class="p-1">Vértice ${index + 1}: (${cell.x}, ${cell.y})</div>`;
                    });
                }
                break;
            case 'preenchimento_varredura':
                const scanlineColor = document.getElementById('scanlineColor').value;
                preenchimentoVarredura(polygonVertices, scanlineColor);
                desenhaPolilinhas(polygonVertices, true);
                break;
            case 'projecao_ortogonal':
                const rotX = parseInt(document.getElementById('rotX').value);
                const rotY = parseInt(document.getElementById('rotY').value);

                const vertexOrto = eval(document.getElementById('vertex').value);
                const edgeOrto = eval(document.getElementById('egde').value);

                setupCanvas();
                desenhaOrtogonal(rotX, rotY, vertexOrto, edgeOrto);
                break;

            case 'projecao_perspectiva':
                const rotXpersp = parseInt(document.getElementById('rotX-persp').value);
                const rotYpersp = parseInt(document.getElementById('rotY-persp').value);
                const dist = parseInt(document.getElementById('dist').value);

                const vertexPersp = eval(document.getElementById('vertex').value);
                const edgePersp = eval(document.getElementById('egde').value);

                setupCanvas();
                desenhaPerspectiva(rotXpersp, rotYpersp, dist, vertexPersp, edgePersp);
                break;
            case 'projecao_cavalier':
                const rotXcava = parseInt(document.getElementById('rotX-cava').value);
                const rotYcava = parseInt(document.getElementById('rotY-cava').value);
                const angleCava = parseInt(document.getElementById('angle-cava').value);

                const vertexCava = eval(document.getElementById('vertex').value);
                const edgeCava = eval(document.getElementById('egde').value);

                setupCanvas();
                desenhaCavalier(rotXcava, rotYcava, angleCava, vertexCava, edgeCava);
                break;
            case 'projecao_cabinet':
                const rotXcabi = parseInt(document.getElementById('rotX-cabi').value);
                const rotYcabi = parseInt(document.getElementById('rotY-cabi').value);
                const angleCabi = parseInt(document.getElementById('angle-cabi').value);

                const vertexCabi = eval(document.getElementById('vertex').value);
                const edgeCabi = eval(document.getElementById('egde').value);

                setupCanvas();
                desenhaCabinet(rotXcabi, rotYcabi, angleCabi, vertexCabi, edgeCabi);
                break;
            case 'elipse':
                const xc_elipse = parseInt(document.getElementById('xc').value);
                const yc_elipse = parseInt(document.getElementById('yc').value);
                const rx = parseInt(document.getElementById('rx').value);
                const ry = parseInt(document.getElementById('ry').value);

                if (!isNaN(xc_elipse) && !isNaN(yc_elipse) && !isNaN(rx) && !isNaN(ry)) {
                    pontoMedioElipse(xc_elipse, yc_elipse, rx, ry);
                } else {
                    alert("Por favor, defina o centro e os raios da elipse.");
                }
                break;
            default:
                console.log(`Botão 'Desenhar' clicado para o algoritmo: ${algorithm}`);
                alert(`O algoritmo "${algorithm}" seria executado agora. A lógica de desenho ainda precisa ser implementada.`);
                break;
        }
    });

    // Limpar Tela
    clearButton.addEventListener('click', () => {
        setupCanvas(); 
        polygonVertices = []; 
        if (document.getElementById('vertex-list')) {
            document.getElementById('vertex-list').innerHTML = 'Nenhum vértice adicionado.';
        }

        for (let i = 0; i < ALTURA_GRID; i++) {
            for (let j = 0; j < LARGURA_GRID; j++) {
                grid_color[i][j] = 'white';
            }
        }
        if (!algorithmSelect.value.startsWith('projecao')) {
            const inputs = parametersArea.querySelectorAll('input');

            inputs.forEach(input => {
                if (input.type === 'checkbox' || input.type === 'color'){
                    input.checked = false; 
                } else {
                    input.value = ''; 
                }
            });
        }

        clickCount = 0;

        console.log("Tela limpa e campos resetados.");
    });

    algorithmSelect.addEventListener('change', () => {
        updateParametersUI();
        clickCount = 0; 
    });

    window.addEventListener('resize', setupCanvas);
    setupCanvas();
    updateParametersUI(); 
});
