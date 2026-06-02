/**
 * SheetDash - Multi-Step Wizard & Packaging Calculator (INR)
 */

// List of standard paper board sizes (width x height in mm)
const STANDARD_BOARDS = [
    { name: '762mm x 1016 mm', x: 1016, y: 762 },
    { name: '508mm x 762 mm', x: 762, y: 508 },
    { name: '420mm x 594 mm', x: 594, y: 420 },
    { name: '594mm x 841 mm', x: 841, y: 594 }
];

// App Global State
const state = {
    currentStep: 1,
    // Article parameters
    boxX: 320,
    boxY: 260,
    gsm: 270,
    // Board size selection
    boardX: 1016,
    boardY: 762,
    smartBoard: null, // Holds details of recommended board
    // Coating settings
    coatGsm: 6,
    coatSolids: 22,
    coatPrice: 180,
    dilutionSol: 5,
    dilutionWat: 4,
    // Overheads
    opexPct: 12.5,
    capexPct: 12.5,
    wastePct: 5,
    surchPct: 10,
    // Processing costs
    punchCost: 400,
    printCost: 1250,
    // Margin & markup
    markup: 25,
    sheetTitle: 'COATED PAPER PUNCHING BOARD BOX'
};

document.addEventListener('DOMContentLoaded', () => {
    // Initial UI Icons
    lucide.createIcons();

    // Event listener: Start button (Step 1)
    const btnStart = document.getElementById('btn-start');
    if (btnStart) {
        btnStart.addEventListener('click', () => {
            goToStep(2);
        });
    }

    // Event listener: Done button (Step 2)
    const btnDone = document.getElementById('btn-done');
    if (btnDone) {
        btnDone.addEventListener('click', () => {
            const x = parseFloat(document.getElementById('box-x').value);
            const y = parseFloat(document.getElementById('box-y').value);
            const g = parseFloat(document.getElementById('gsm').value);

            if (!x || !y || !g || x <= 0 || y <= 0 || g <= 0) {
                alert('Please enter valid positive numbers for Article dimensions and GSM.');
                return;
            }

            // Store state
            state.boxX = x;
            state.boxY = y;
            state.gsm = g;

            goToStep(3);
        });
    }

    // Event listener: Configure & Save (Step 3)
    const btnConfigSave = document.getElementById('btn-configure-save');
    if (btnConfigSave) {
        btnConfigSave.addEventListener('click', () => {
            saveStep3Inputs();
            goToStep(4);
        });
    }

    // Wire up Step 3 slider label updates
    setupSliderLabel('coat-gsm', 'val-coat-gsm', ' gsm');
    setupSliderLabel('margin-opex', 'val-opex', '%');
    setupSliderLabel('margin-capex', 'val-capex', '%');
    setupSliderLabel('margin-waste', 'val-waste', '%');
    setupSliderLabel('margin-surch', 'val-surch', '%');
    setupSliderLabel('markup-slider', 'markup-val', '%');

    // Dynamic calculations update during sizing change in Step 3 dropdown
    const boardSelect = document.getElementById('board-size-select');
    if (boardSelect) {
        boardSelect.addEventListener('change', (e) => {
            const val = e.target.value;
            let selectedBoard = null;

            if (val === 'smart') {
                selectedBoard = state.smartBoard;
            } else {
                const dims = val.split('x');
                selectedBoard = { x: parseInt(dims[0]), y: parseInt(dims[1]) };
            }

            if (selectedBoard) {
                state.boardX = selectedBoard.x;
                state.boardY = selectedBoard.y;
            }

            // Re-evaluate temporary yield
            const yieldDetails = calculateYield(state.boxX, state.boxY, state.boardX, state.boardY);
            const yieldBadge = document.getElementById('yield-summary');
            if (yieldBadge) {
                yieldBadge.textContent = `Yield: ${yieldDetails.ups} UPS`;
            }
        });
    }

    // Dashboard Export PDF
    const btnExportPdf = document.getElementById('btn-export-pdf');
    if (btnExportPdf) {
        btnExportPdf.addEventListener('click', () => window.print());
    }

    // Reverse Calculator event listener
    const btnReverseCalc = document.getElementById('btn-reverse-calc');
    if (btnReverseCalc) {
        btnReverseCalc.addEventListener('click', reverseCalculate);
    }

    // Google Sheet Sync logic
    const btnSync = document.getElementById('btn-sync');
    const sheetUrlInput = document.getElementById('sheet-url');
    const syncFeedback = document.getElementById('sync-feedback');
    if (btnSync && sheetUrlInput && syncFeedback) {
        btnSync.addEventListener('click', () => {
            const url = sheetUrlInput.value.trim();
            if (!url) {
                syncFeedback.style.display = 'block';
                syncFeedback.textContent = 'Please enter a Google Sheet URL.';
                syncFeedback.style.color = 'red';
                return;
            }
            // Convert to CSV export URL if needed
            let csvUrl = url;
            if (!url.includes('/export?')) {
                const match = url.match(/\/d\/([^\/]+)/);
                if (match) {
                    const id = match[1];
                    csvUrl = `https://docs.google.com/spreadsheets/d/${id}/export?format=csv`;
                }
            }
            syncFeedback.style.display = 'block';
            syncFeedback.textContent = 'Syncing...';
            syncFeedback.style.color = 'inherit';

            Papa.parse(csvUrl, {
                download: true,
                header: true,
                skipEmptyLines: true,
                complete: function (results) {
                    if (results.errors.length) {
                        syncFeedback.textContent = 'Error parsing sheet data.';
                        syncFeedback.style.color = 'red';
                        console.error('PapaParse errors:', results.errors);
                        return;
                    }
                    const row = results.data[0];
                    if (!row) {
                        syncFeedback.textContent = 'No data found in sheet.';
                        syncFeedback.style.color = 'red';
                        return;
                    }
                    // Map sheet columns to state (case‑insensitive)
                    const mapKey = (key) => {
                        const lowered = key.toLowerCase().replace(/\s+/g, '');
                        const map = {
                            'articlewidth': 'boxX',
                            'articleheight': 'boxY',
                            'gsm': 'gsm',
                            'coatgsm': 'coatGsm',
                            'coatprice': 'coatPrice',
                            'paperprice': 'paperPrice',
                            'punchcost': 'punchCost',
                            'printcost': 'printCost',
                            'opexpct': 'opexPct',
                            'capexpct': 'capexPct',
                            'wastepct': 'wastePct',
                            'surchpct': 'surchPct',
                            'markup': 'markup'
                        };
                        return map[lowered];
                    };
                    for (const col in row) {
                        const stateKey = mapKey(col);
                        if (stateKey && row[col] !== undefined && row[col] !== '') {
                            const val = parseFloat(row[col]);
                            if (!isNaN(val)) {
                                state[stateKey] = val;
                                // Update UI inputs if present (convert camelCase to kebab-id)
                                const inputId = stateKey.replace(/([A-Z])/g, '-$1').toLowerCase();
                                const input = document.getElementById(inputId);
                                if (input) input.value = val;
                            }
                        }
                    }
                    syncFeedback.textContent = 'Sync successful!';
                    syncFeedback.style.color = 'green';
                },
                error: function (err) {
                    syncFeedback.textContent = 'Failed to fetch sheet.';
                    syncFeedback.style.color = 'red';
                    console.error(err);
                }
            });
        });
    }
});

/**
 * Navigation flow controller
 */
window.goToStep = function(stepNumber) {
    // Hide all steps
    document.querySelectorAll('.wizard-step').forEach(step => {
        step.classList.remove('active');
    });

    // Show selected step
    const targetStep = document.getElementById(`step-${stepNumber}`);
    if (targetStep) {
        targetStep.classList.add('active');
        state.currentStep = stepNumber;
    }

    // Trigger step-specific logic
    if (stepNumber === 3) {
        runSmartBoardRecommendation();
    } else if (stepNumber === 4) {
        runDashboardCalculations();
    }

    // Refresh icons
    lucide.createIcons();
};

/**
 * Switch Light/Dark App Themes globally
 */
window.toggleAppTheme = function() {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);

    // Sync labels on footer buttons
    document.querySelectorAll('.theme-text').forEach(el => {
        el.textContent = newTheme === 'light' ? 'Dark Mode' : 'Light Mode';
    });

    if (window.dashboardCharts) {
        window.dashboardCharts.updateThemes(newTheme);
    }
};

/**
 * Automatically updates text labels when sliders are adjusted
 */
function setupSliderLabel(sliderId, labelId, suffix = '') {
    const slider = document.getElementById(sliderId);
    const label = document.getElementById(labelId);
    if (slider && label) {
        slider.addEventListener('input', (e) => {
            label.textContent = `${e.target.value}${suffix}`;
            
            if (sliderId === 'coat-gsm') {
                state.coatGsm = parseFloat(e.target.value);
            }
        });
    }
}

/**
 * Calculates board layout nesting yield and orientation efficiency
 */
function calculateYield(boxX, boxY, boardX, boardY) {
    // Orientation 1 (Landscape)
    const x1 = Math.floor(boardX / boxX);
    const y1 = Math.floor(boardY / boxY);
    const total1 = x1 * y1;

    // Orientation 2 (Portrait)
    const x2 = Math.floor(boardX / boxY);
    const y2 = Math.floor(boardY / boxX);
    const total2 = x2 * y2;

    if (total1 >= total2 && total1 > 0) {
        return { ups: total1, orientation: `MD ${x1} x CD ${y1}`, efficiency: (total1 * boxX * boxY) / (boardX * boardY) * 100 };
    } else if (total2 > 0) {
        return { ups: total2, orientation: `MD ${x2} x CD ${y2}`, efficiency: (total2 * boxX * boxY) / (boardX * boardY) * 100 };
    } else {
        return { ups: 1, orientation: 'N/A', efficiency: (1 * boxX * boxY) / (boardX * boardY) * 100 };
    }
}

/**
 * Evaluates board sizes to recommend the one with the highest area utilization
 */
function runSmartBoardRecommendation() {
    let bestBoard = null;
    let highestEff = -1;

    STANDARD_BOARDS.forEach(board => {
        const yieldDetails = calculateYield(state.boxX, state.boxY, board.x, board.y);
        if (yieldDetails.efficiency > highestEff) {
            highestEff = yieldDetails.efficiency;
            bestBoard = { ...board, ...yieldDetails };
        }
    });

    state.smartBoard = bestBoard;
    
    // Default select choice is smart board dimensions
    state.boardX = bestBoard.x;
    state.boardY = bestBoard.y;

    // Populate dropdown
    const select = document.getElementById('board-size-select');
    if (select) {
        select.options[0].textContent = `Smart Suggestion: ${bestBoard.x}mm x ${bestBoard.y}mm (${bestBoard.efficiency.toFixed(1)}% eff.)`;
        select.options[0].value = 'smart';
        select.value = 'smart';
    }

    const yieldBadge = document.getElementById('yield-summary');
    if (yieldBadge) {
        yieldBadge.textContent = `Yield: ${bestBoard.ups} UPS`;
    }
}

/**
 * Collects input form values into global state before saving
 */
function saveStep3Inputs() {
    state.coatPrice = parseFloat(document.getElementById('coat-price').value) || 0;
    state.paperPrice = parseFloat(document.getElementById('paper-price').value) || 0;
    state.punchCost = parseFloat(document.getElementById('punch-cost').value) || 0;
    state.printCost = parseFloat(document.getElementById('print-cost').value) || 0;

    state.coatGsm = parseFloat(document.getElementById('coat-gsm').value) || 0;
    state.opexPct = parseFloat(document.getElementById('margin-opex').value) || 0;
    state.capexPct = parseFloat(document.getElementById('margin-capex').value) || 0;
    state.wastePct = parseFloat(document.getElementById('margin-waste').value) || 0;
    state.surchPct = parseFloat(document.getElementById('margin-surch').value) || 0;
    state.markup = parseInt(document.getElementById('markup-slider').value) || 0;
}

/**
 * Main dashboard calculations and outputs mapping
 */
function runDashboardCalculations() {
    // 1. Calculations values
    const yieldDetails = calculateYield(state.boxX, state.boxY, state.boardX, state.boardY);
    const ups = yieldDetails.ups;
    const efficiency = yieldDetails.efficiency;

    const sheetArea = (state.boardX * state.boardY) / 1000000; // in square meters
    const sheetWeight = sheetArea * state.gsm; // total grams per sheet
    const weightPerUp = sheetWeight / ups; // grams per single box unit

    // A. Paper Board Cost
    const costPaperBoard = (weightPerUp * state.paperPrice) / 1000;

    // B. Coating cost
    const dryCoatWeight = sheetArea * state.coatGsm;
    const wetCoatWeight = dryCoatWeight / (state.coatSolids / 100);
    const dilutionFactor = state.dilutionSol / (state.dilutionSol + state.dilutionWat);
    const dilutedCostPerGram = (state.coatPrice * dilutionFactor) / 1000;
    const baseCoatCost = wetCoatWeight * dilutedCostPerGram;

    // OVERHEAD Burden Loading multipliers
    const costAfterOpex = baseCoatCost * (1 + state.opexPct / 100);
    const costAfterCapex = costAfterOpex * (1 + state.capexPct / 100);
    const costAfterWaste = costAfterCapex * (1 + state.wastePct / 100);
    const boardCoatCost = costAfterWaste * (1 + state.surchPct / 100);
    const costCoating = boardCoatCost / ups;

    // C. Punching cost per UP
    const costPunching = state.punchCost / (ups * 1000);

    // D. Printing cost per UP
    const costPrinting = state.printCost / (ups * 1000);

    // Calculations Summary
    const totalCost = costPaperBoard + costCoating + costPunching + costPrinting;
    
    // Sugested Sale price
    const margin = Math.min(state.markup, 99.9);
    let salePrice = 0;
    if (margin >= 100) {
        salePrice = totalCost * (1 + state.markup / 100);
    } else {
        salePrice = totalCost / (1 - margin / 100);
    }
    const marginProfit = salePrice - totalCost;

    // Wastages Math
    const areaWastedPct = 100 - efficiency;
    const paperWeightWastedSheet = sheetWeight * (areaWastedPct / 100); // weight wasted per sheet
    const wastageCostBox = costPaperBoard * (100 / efficiency - 1); // direct paper waste cost per box
    const burdenLoadingCost = costCoating - (baseCoatCost / ups); // loading burden per box

    // 2. Map Metric Cards UI
    document.getElementById('metric-total-cost').textContent = totalCost.toFixed(3);
    document.getElementById('metric-sale-price').textContent = salePrice.toFixed(3);
    document.getElementById('metric-profit-est').innerHTML = `<i data-lucide="trending-up"></i> Est. Profit: +₹${marginProfit.toFixed(3)} (${state.markup}%)`;
    document.getElementById('metric-ups').textContent = ups;
    document.getElementById('metric-ups-layout').textContent = `${state.boardX}mm x ${state.boardY}mm`;
    document.getElementById('metric-efficiency').textContent = efficiency.toFixed(1);

    // 3. Map Engineering Calculations Table
    document.getElementById('table-sheet-area').textContent = sheetArea.toFixed(3);
    document.getElementById('table-gsm').textContent = state.gsm;
    document.getElementById('table-ups-val').textContent = ups;
    document.getElementById('table-weight-up').textContent = weightPerUp.toFixed(2);
    document.getElementById('table-weight-up-txt').textContent = weightPerUp.toFixed(2);
    document.getElementById('table-cost-board').textContent = `₹${costPaperBoard.toFixed(3)}`;

    document.getElementById('table-sheet-area-2').textContent = sheetArea.toFixed(3);
    document.getElementById('table-coat-gsm').textContent = state.coatGsm;
    document.getElementById('table-wet-wt').textContent = wetCoatWeight.toFixed(2);
    document.getElementById('table-sheet-coat-cost').textContent = boardCoatCost.toFixed(3);
    document.getElementById('table-cost-coating').textContent = `₹${costCoating.toFixed(3)}`;

    const yield1k = ups * 1000;
    document.getElementById('table-punch-cost').textContent = `₹${state.punchCost}`;
    document.getElementById('table-ups-val-2').textContent = ups;
    document.getElementById('table-punch-yield').textContent = yield1k;
    document.getElementById('table-cost-punching').textContent = `₹${costPunching.toFixed(3)}`;

    document.getElementById('table-print-cost').textContent = `₹${state.printCost}`;
    document.getElementById('table-ups-val-3').textContent = ups;
    document.getElementById('table-print-yield').textContent = yield1k;
    document.getElementById('table-cost-printing').textContent = `₹${costPrinting.toFixed(3)}`;

    // 4. Map Wastages & Efficiency Card
    document.getElementById('waste-area-pct').textContent = areaWastedPct.toFixed(1);
    document.getElementById('waste-board-wt').textContent = paperWeightWastedSheet.toFixed(1);
    document.getElementById('waste-cost-box').textContent = wastageCostBox.toFixed(3);
    document.getElementById('burden-loading-cost').textContent = burdenLoadingCost.toFixed(3);

    // 5. Update Charts
    const chartLabels = ['Paper Board', 'Coating', 'Punching', 'Printing'];
    const chartData = [costPaperBoard, costCoating, costPunching, costPrinting];
    if (window.dashboardCharts) {
        window.dashboardCharts.render(chartLabels, chartData, totalCost);
    }
}

// Reverse engineering calculator
function reverseCalculate() {
    // Guard: Ensure essential configuration is set before calculation
    if (!state.boardX || !state.boardY || !state.boxX || !state.boxY || !state.gsm) {
        alert('Please complete the article and board configuration before using the Reverse Calculator.');
        return;
    }
    const targetSp = parseFloat(document.getElementById('target-sp').value);
    const knownPaper = parseFloat(document.getElementById('known-paper-price').value);
    const knownCoat = parseFloat(document.getElementById('known-coat-price').value);
    if (isNaN(targetSp) || targetSp <= 0) {
        alert('Please enter a valid Target Selling Price.');
        return;
    }
    const hasPaper = !isNaN(knownPaper) && knownPaper > 0;
    const hasCoat = !isNaN(knownCoat) && knownCoat > 0;
    if (!hasPaper && !hasCoat) {
        alert('Provide either Known Paper Price or Known Coating Price.');
        return;
    }
    // Recalculate layout dependent variables
    const yieldDetails = calculateYield(state.boxX, state.boxY, state.boardX, state.boardY);
    const ups = yieldDetails.ups;
    const sheetArea = (state.boardX * state.boardY) / 1000000;
    const sheetWeight = sheetArea * state.gsm;
    const weightPerUp = sheetWeight / ups;
    const a = weightPerUp / 1000; // coefficient for paper price
    const wetCoatWeight = sheetArea * state.coatGsm;
    const dilutionFactor = state.dilutionSol / (state.dilutionSol + state.dilutionWat);
    const baseCoatFactor = wetCoatWeight * dilutionFactor / 1000; // linear w.r.t coat price
    const coatFactorTotal = baseCoatFactor * (1 + state.opexPct/100) * (1 + state.capexPct/100) * (1 + state.wastePct/100) * (1 + state.surchPct/100) / ups;
    const b = coatFactorTotal; // coefficient for coat price
    const costPunching = state.punchCost / (ups * 1000);
    const costPrinting = state.printCost / (ups * 1000);
    const constOther = costPunching + costPrinting;
    // Determine required total cost before markup
    let requiredTotalCost;
    if (state.markup >= 100) {
        requiredTotalCost = targetSp / (1 + state.markup/100);
    } else {
        requiredTotalCost = targetSp * (1 - state.markup/100);
    }
    if (hasPaper) {
        // Calculate coating price needed to meet target selling price
        const result = (requiredTotalCost - a * knownPaper - constOther) / b;
        const paperCost = a * knownPaper;
        const coatingCost = b * result;
        const totalCostCalc = paperCost + coatingCost + constOther;
        document.getElementById('calc-result').value = isFinite(result) ? result.toFixed(3) + ' (₹/kg Coating)' : 'N/A';
        document.getElementById('reverse-breakdown').innerHTML = `
            <p>Paper Cost: ₹${paperCost.toFixed(3)}</p>
            <p>Coating Cost (calculated): ₹${coatingCost.toFixed(3)}</p>
            <p>Punching + Printing: ₹${constOther.toFixed(3)}</p>
            <p>Total Cost before markup: ₹${totalCostCalc.toFixed(3)}</p>
            <p>Target Selling Price: ₹${targetSp.toFixed(3)}</p>
        `;
    } else {
        // Calculate paper price needed when coating price is known
        const result = (requiredTotalCost - b * knownCoat - constOther) / a;
        const coatCost = b * knownCoat;
        const paperCost = a * result;
        const totalCostCalc = paperCost + coatCost + constOther;
        document.getElementById('calc-result').value = isFinite(result) ? result.toFixed(3) + ' (₹/kg Paper)' : 'N/A';
        document.getElementById('reverse-breakdown').innerHTML = `
            <p>Coating Cost: ₹${coatCost.toFixed(3)}</p>
            <p>Paper Cost (calculated): ₹${paperCost.toFixed(3)}</p>
            <p>Punching + Printing: ₹${constOther.toFixed(3)}</p>
            <p>Total Cost before markup: ₹${totalCostCalc.toFixed(3)}</p>
            <p>Target Selling Price: ₹${targetSp.toFixed(3)}</p>
        `;
    }
}
