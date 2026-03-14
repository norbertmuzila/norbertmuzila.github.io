/* ================================================
   PENSION FUND DIGITAL TWIN — ZIMBABWE
   Interactive Simulation Engine
   ================================================ */

(function () {
  'use strict';

  // ── DOM REFS ──
  const canvas = document.getElementById('sim-canvas');
  const ctx = canvas.getContext('2d');

  // Sliders
  const sliders = {
    contribution: document.getElementById('slider-contribution'),
    inflation: document.getElementById('slider-inflation'),
    retirement: document.getElementById('slider-retirement'),
    age: document.getElementById('slider-age'),
    return: document.getElementById('slider-return'),
    payout: document.getElementById('slider-payout'),
  };
  const values = {
    contribution: document.getElementById('val-contribution'),
    inflation: document.getElementById('val-inflation'),
    retirement: document.getElementById('val-retirement'),
    age: document.getElementById('val-age'),
    return: document.getElementById('val-return'),
    payout: document.getElementById('val-payout'),
  };

  // Buttons
  const btnRun = document.getElementById('btn-run');
  const btnStop = document.getElementById('btn-stop');
  const btnReset = document.getElementById('btn-reset');
  const btnScenario = document.getElementById('btn-scenario');
  const btnLive = document.getElementById('btn-live');

  // Status
  const statusState = document.getElementById('status-state');
  const statusBalance = document.getElementById('status-balance');
  const statusPayout = document.getElementById('status-payout');
  const statusInflation = document.getElementById('status-inflation');
  const statusDepletion = document.getElementById('status-depletion');

  // Terminal
  const terminalBody = document.getElementById('terminal-body');

  // Settings
  const settingsGear = document.getElementById('settings-gear');
  const modalOverlay = document.getElementById('modal-overlay');
  const modalClose = document.getElementById('modal-close');
  const settingYears = document.getElementById('setting-years');
  const settingInflModel = document.getElementById('setting-inflation-model');
  const settingCurrency = document.getElementById('setting-currency');

  // Challenge
  const selectCurrency = document.getElementById('select-currency');
  const selectChallenge = document.getElementById('select-challenge');

  // ── STATE ──
  let simState = {
    running: false,
    animFrame: null,
    projectionData: [],
    currentStep: 0,
    challengeEvents: [],
    currency: 'USD',
    projectionYears: 30,
    inflationModel: 'constant',
  };

  // ── SLIDER SYNC ──
  Object.keys(sliders).forEach((key) => {
    sliders[key].addEventListener('input', () => {
      values[key].textContent = sliders[key].value;
    });
  });

  // Currency select sync
  selectCurrency.addEventListener('change', () => {
    simState.currency = selectCurrency.value;
    settingCurrency.value = selectCurrency.value;
  });

  // ── SETTINGS MODAL ──
  settingsGear.addEventListener('click', () => modalOverlay.classList.add('open'));
  modalClose.addEventListener('click', () => modalOverlay.classList.remove('open'));
  modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) modalOverlay.classList.remove('open');
  });

  settingYears.addEventListener('change', () => { simState.projectionYears = parseInt(settingYears.value); });
  settingInflModel.addEventListener('change', () => { simState.inflationModel = settingInflModel.value; });
  settingCurrency.addEventListener('change', () => {
    simState.currency = settingCurrency.value;
    selectCurrency.value = settingCurrency.value;
  });

  // ── MODE TOGGLE ──
  btnScenario.addEventListener('click', () => {
    btnScenario.classList.add('active');
    btnLive.classList.remove('active');
    logTerminal('Switched to Scenario Mode — configure parameters manually.', 'info');
  });
  btnLive.addEventListener('click', () => {
    btnLive.classList.add('active');
    btnScenario.classList.remove('active');
    logTerminal('Switched to Live Data Mode — using real-time estimates.', 'info');
  });

  // ── CANVAS RESIZE ──
  function resizeCanvas() {
    const panel = document.getElementById('right-panel');
    canvas.width = panel.clientWidth;
    canvas.height = panel.clientHeight;
    if (!simState.running && simState.projectionData.length > 0) {
      drawProjection(simState.projectionData, simState.projectionData.length);
    } else if (!simState.running) {
      drawGrid();
    }
  }
  window.addEventListener('resize', resizeCanvas);
  requestAnimationFrame(resizeCanvas);

  // ── SIMULATION ENGINE ──
  function computeProjection() {
    const contribution = parseFloat(sliders.contribution.value);
    const inflation = parseFloat(sliders.inflation.value) / 100;
    const retirementAge = parseInt(sliders.retirement.value);
    const currentAge = parseInt(sliders.age.value);
    const annualReturn = parseFloat(sliders.return.value) / 100;
    const monthlyPayout = parseFloat(sliders.payout.value);
    const years = simState.projectionYears;
    const inflModel = simState.inflationModel;

    const months = years * 12;
    const retirementMonth = Math.max(0, (retirementAge - currentAge) * 12);
    const data = [];

    let balance = 0;
    let cumulativeInflation = 1;

    for (let m = 0; m <= months; m++) {
      // Compute current inflation for this month
      let currentInflation = inflation;
      if (inflModel === 'volatile') {
        // Zimbabwe-style: random spikes
        const spike = Math.random() < 0.03 ? (2 + Math.random() * 8) : 1;
        currentInflation = inflation * (0.5 + Math.random()) * spike;
      } else if (inflModel === 'decreasing') {
        currentInflation = inflation * Math.max(0.1, 1 - (m / months) * 0.8);
      }

      // Apply challenge events
      let challengeMultiplier = 1;
      simState.challengeEvents.forEach((ce) => {
        const ceMonth = Math.round((ce.yearFraction) * months);
        if (Math.abs(m - ceMonth) < 6) {
          switch (ce.type) {
            case 'hyperinflation': challengeMultiplier *= 3; break;
            case 'currency': challengeMultiplier *= 2; break;
            case 'drought': challengeMultiplier *= 1.5; break;
            case 'policy': challengeMultiplier *= 0.7; break;
            case 'demographic': challengeMultiplier *= 1.3; break;
          }
        }
      });

      cumulativeInflation *= (1 + (currentInflation * challengeMultiplier) / 12);

      const monthlyReturn = annualReturn / 12;

      if (m < retirementMonth) {
        // Accumulation phase
        balance = balance * (1 + monthlyReturn) + contribution;
      } else {
        // Drawdown phase
        const adjustedPayout = monthlyPayout * cumulativeInflation / (1 + inflation);
        balance = balance * (1 + monthlyReturn) - adjustedPayout;
      }

      if (balance < 0) balance = 0;

      data.push({
        month: m,
        year: m / 12,
        balance: balance,
        realBalance: balance / cumulativeInflation,
        inflation: currentInflation * challengeMultiplier,
        phase: m < retirementMonth ? 'accumulation' : 'drawdown',
      });
    }

    return data;
  }

  // ── DRAWING ──
  const PADDING = { top: 60, right: 40, bottom: 80, left: 80 };

  function drawGrid() {
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    // Background
    const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
    bgGrad.addColorStop(0, '#0a0f1e');
    bgGrad.addColorStop(1, '#0f172a');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // Grid lines
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.06)';
    ctx.lineWidth = 1;
    const gridSpacing = 40;
    for (let x = PADDING.left; x < w - PADDING.right; x += gridSpacing) {
      ctx.beginPath();
      ctx.moveTo(x, PADDING.top);
      ctx.lineTo(x, h - PADDING.bottom);
      ctx.stroke();
    }
    for (let y = PADDING.top; y < h - PADDING.bottom; y += gridSpacing) {
      ctx.beginPath();
      ctx.moveTo(PADDING.left, y);
      ctx.lineTo(w - PADDING.right, y);
      ctx.stroke();
    }

    // Axes
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.3)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(PADDING.left, PADDING.top);
    ctx.lineTo(PADDING.left, h - PADDING.bottom);
    ctx.lineTo(w - PADDING.right, h - PADDING.bottom);
    ctx.stroke();

    // Labels
    ctx.fillStyle = '#64748b';
    ctx.font = '11px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('Years →', w / 2, h - PADDING.bottom + 40);

    ctx.save();
    ctx.translate(20, h / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('Fund Balance (USD) →', 0, 0);
    ctx.restore();

    // Title
    ctx.fillStyle = '#94a3b8';
    ctx.font = '600 13px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Pension Fund Projection', w / 2, 30);
  }

  function drawProjection(data, stepCount) {
    const w = canvas.width;
    const h = canvas.height;

    drawGrid();

    if (data.length === 0) return;

    const chartW = w - PADDING.left - PADDING.right;
    const chartH = h - PADDING.top - PADDING.bottom;

    // Scale
    const maxBalance = Math.max(...data.map((d) => d.balance), 1000);
    const totalMonths = data[data.length - 1].month;

    const xScale = (m) => PADDING.left + (m / totalMonths) * chartW;
    const yScale = (b) => PADDING.top + chartH - (b / maxBalance) * chartH;

    // Year labels on X axis
    ctx.fillStyle = '#64748b';
    ctx.font = '10px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    const yearsTotal = totalMonths / 12;
    const yearStep = yearsTotal <= 20 ? 2 : yearsTotal <= 40 ? 5 : 10;
    for (let y = 0; y <= yearsTotal; y += yearStep) {
      const x = xScale(y * 12);
      ctx.fillText(`${y}y`, x, h - PADDING.bottom + 18);
      // Tick
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.15)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, h - PADDING.bottom);
      ctx.lineTo(x, h - PADDING.bottom + 5);
      ctx.stroke();
    }

    // Balance labels on Y axis
    const balanceStep = getBalanceStep(maxBalance);
    for (let b = 0; b <= maxBalance; b += balanceStep) {
      const y = yScale(b);
      ctx.fillStyle = '#64748b';
      ctx.font = '10px "JetBrains Mono", monospace';
      ctx.textAlign = 'right';
      ctx.fillText(formatCompact(b), PADDING.left - 10, y + 4);
      // Horizontal grid line
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.05)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(PADDING.left, y);
      ctx.lineTo(w - PADDING.right, y);
      ctx.stroke();
    }

    // Find retirement month for marker
    const retMonth = data.findIndex((d) => d.phase === 'drawdown');

    // Draw retirement line
    if (retMonth > 0 && retMonth < stepCount) {
      const rx = xScale(retMonth);
      ctx.strokeStyle = 'rgba(245, 158, 11, 0.4)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.moveTo(rx, PADDING.top);
      ctx.lineTo(rx, h - PADDING.bottom);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = '#f59e0b';
      ctx.font = '600 10px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('RETIREMENT', rx, PADDING.top - 8);
    }

    // Draw filled area (nominal)
    ctx.beginPath();
    ctx.moveTo(xScale(0), yScale(0));
    for (let i = 0; i < Math.min(stepCount, data.length); i++) {
      ctx.lineTo(xScale(data[i].month), yScale(data[i].balance));
    }
    const lastDrawn = Math.min(stepCount, data.length) - 1;
    ctx.lineTo(xScale(data[lastDrawn].month), yScale(0));
    ctx.closePath();

    const areaGrad = ctx.createLinearGradient(0, PADDING.top, 0, h - PADDING.bottom);
    areaGrad.addColorStop(0, 'rgba(56, 189, 248, 0.15)');
    areaGrad.addColorStop(1, 'rgba(56, 189, 248, 0.01)');
    ctx.fillStyle = areaGrad;
    ctx.fill();

    // Draw line (nominal balance)
    ctx.beginPath();
    for (let i = 0; i < Math.min(stepCount, data.length); i++) {
      const x = xScale(data[i].month);
      const y = yScale(data[i].balance);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2.5;
    ctx.shadowColor = 'rgba(56, 189, 248, 0.5)';
    ctx.shadowBlur = 8;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Draw real balance line
    ctx.beginPath();
    for (let i = 0; i < Math.min(stepCount, data.length); i++) {
      const x = xScale(data[i].month);
      const y = yScale(data[i].realBalance);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = '#06d6a0';
    ctx.lineWidth = 1.8;
    ctx.setLineDash([4, 3]);
    ctx.stroke();
    ctx.setLineDash([]);

    // Legend
    const legendX = w - PADDING.right - 180;
    const legendY = PADDING.top + 10;
    ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.15)';
    ctx.lineWidth = 1;
    roundRect(ctx, legendX, legendY, 170, 50, 8);
    ctx.fill();
    ctx.stroke();

    ctx.font = '10px "JetBrains Mono", monospace';
    // Nominal
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(legendX + 10, legendY + 18); ctx.lineTo(legendX + 30, legendY + 18); ctx.stroke();
    ctx.fillStyle = '#94a3b8';
    ctx.textAlign = 'left';
    ctx.fillText('Nominal Balance', legendX + 36, legendY + 22);

    // Real
    ctx.strokeStyle = '#06d6a0';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 3]);
    ctx.beginPath(); ctx.moveTo(legendX + 10, legendY + 36); ctx.lineTo(legendX + 30, legendY + 36); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('Real (inflation-adj)', legendX + 36, legendY + 40);

    // Draw challenge event markers
    simState.challengeEvents.forEach((ce) => {
      const ceMonth = Math.round(ce.yearFraction * totalMonths);
      if (ceMonth < stepCount) {
        const cx = xScale(ceMonth);
        const cy = yScale(data[Math.min(ceMonth, data.length - 1)].balance);

        // Marker dot
        ctx.beginPath();
        ctx.arc(cx, cy, 6, 0, Math.PI * 2);
        ctx.fillStyle = getChallengeColor(ce.type);
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Label
        ctx.fillStyle = getChallengeColor(ce.type);
        ctx.font = '600 9px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(getChallengeLabel(ce.type), cx, cy - 14);
      }
    });

    // Current step marker (animated dot)
    if (stepCount > 0 && stepCount < data.length) {
      const d = data[stepCount - 1];
      const cx = xScale(d.month);
      const cy = yScale(d.balance);
      ctx.beginPath();
      ctx.arc(cx, cy, 5, 0, Math.PI * 2);
      ctx.fillStyle = '#38bdf8';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(cx, cy, 10, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }

  // ── ANIMATION ──
  function startSimulation() {
    if (simState.running) return;

    const data = computeProjection();
    simState.projectionData = data;
    simState.currentStep = 0;
    simState.running = true;

    setStatus('Running', 'status-running');
    logTerminal('Simulation started...', 'success');
    logTerminal(`Parameters: Contribution=$${sliders.contribution.value}/mo, Inflation=${sliders.inflation.value}%, Return=${sliders.return.value}%`, 'data');
    logTerminal(`Projection: ${simState.projectionYears} years, Model: ${simState.inflationModel}`, 'data');

    if (simState.challengeEvents.length > 0) {
      logTerminal(`Active challenges: ${simState.challengeEvents.map(c => getChallengeLabel(c.type)).join(', ')}`, 'warning');
    }

    const totalSteps = data.length;
    const stepsPerFrame = Math.max(1, Math.floor(totalSteps / 300));

    function animate() {
      if (!simState.running) return;

      simState.currentStep += stepsPerFrame;
      if (simState.currentStep >= totalSteps) {
        simState.currentStep = totalSteps;
        simState.running = false;

        // Final analysis
        const finalData = data[data.length - 1];
        const peakBalance = Math.max(...data.map((d) => d.balance));
        const depletionPoint = data.findIndex((d) => d.phase === 'drawdown' && d.balance <= 0);
        const yearsToDepletion = depletionPoint > 0 ? (depletionPoint / 12).toFixed(1) : '∞';

        updateStatusPanel(finalData, yearsToDepletion);
        setStatus('Complete', 'status-complete');

        logTerminal('─────────────────────────────────────', 'info');
        logTerminal('SIMULATION COMPLETE', 'success');
        logTerminal(`Peak Balance: ${formatCurrency(peakBalance)}`, 'data');
        logTerminal(`Final Nominal Balance: ${formatCurrency(finalData.balance)}`, 'data');
        logTerminal(`Final Real Balance: ${formatCurrency(finalData.realBalance)}`, 'data');

        if (depletionPoint > 0) {
          logTerminal(`⚠ FUND DEPLETED at year ${yearsToDepletion}`, 'error');
          logTerminal('Recommendation: Increase contributions or reduce post-retirement payouts.', 'warning');
        } else {
          logTerminal('✓ Fund remains solvent through projection period.', 'success');
        }

        drawProjection(data, totalSteps);
        return;
      }

      // Update display
      const d = data[simState.currentStep];
      const depIdx = data.findIndex((dd, i) => i >= simState.currentStep && dd.phase === 'drawdown' && dd.balance <= 0);
      const ytd = depIdx > 0 ? ((depIdx - simState.currentStep) / 12).toFixed(1) : '—';
      updateStatusPanel(d, ytd);

      drawProjection(data, simState.currentStep);
      simState.animFrame = requestAnimationFrame(animate);
    }

    simState.animFrame = requestAnimationFrame(animate);
  }

  function stopSimulation() {
    simState.running = false;
    if (simState.animFrame) cancelAnimationFrame(simState.animFrame);
    setStatus('Stopped', 'status-idle');
    logTerminal('Simulation stopped by user.', 'warning');
  }

  function resetSimulation() {
    stopSimulation();
    simState.projectionData = [];
    simState.currentStep = 0;
    simState.challengeEvents = [];

    // Remove challenge markers from DOM
    document.querySelectorAll('.challenge-marker').forEach((el) => el.remove());

    // Reset status
    statusBalance.textContent = '$0';
    statusPayout.textContent = '$0';
    statusInflation.textContent = '0%';
    statusDepletion.textContent = '—';
    setStatus('Idle', 'status-idle');

    drawGrid();
    logTerminal('Scenario reset. All parameters and events cleared.', 'info');
  }

  // ── BUTTONS ──
  btnRun.addEventListener('click', startSimulation);
  btnStop.addEventListener('click', stopSimulation);
  btnReset.addEventListener('click', resetSimulation);

  // ── CANVAS CLICK → CHALLENGE EVENTS ──
  canvas.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const chartW = canvas.width - PADDING.left - PADDING.right;
    const chartH = canvas.height - PADDING.top - PADDING.bottom;

    // Check if click is within chart area
    if (x < PADDING.left || x > canvas.width - PADDING.right ||
        y < PADDING.top || y > canvas.height - PADDING.bottom) return;

    const yearFraction = (x - PADDING.left) / chartW;
    const type = selectChallenge.value;

    simState.challengeEvents.push({ yearFraction, type, x, y });

    logTerminal(`Challenge event added: ${getChallengeLabel(type)} at year ${(yearFraction * simState.projectionYears).toFixed(1)}`, 'warning');

    // Visual feedback — create a floating marker
    const marker = document.createElement('div');
    marker.className = `challenge-marker marker-${type}`;
    marker.textContent = getChallengeLabel(type);
    marker.style.left = `${e.clientX - rect.left - 30}px`;
    marker.style.top = `${e.clientY - rect.top - 24}px`;
    document.getElementById('right-panel').appendChild(marker);

    // If there's projection data, redraw
    if (simState.projectionData.length > 0 && !simState.running) {
      simState.projectionData = computeProjection();
      drawProjection(simState.projectionData, simState.projectionData.length);
    }
  });

  // ── HELPERS ──
  function setStatus(text, className) {
    statusState.textContent = text;
    statusState.className = className;
  }

  function updateStatusPanel(d, ytd) {
    statusBalance.textContent = formatCurrency(d.balance);
    statusPayout.textContent = `$${parseFloat(sliders.payout.value).toFixed(0)}`;
    statusInflation.textContent = `${(d.inflation * 100).toFixed(1)}%`;
    statusDepletion.textContent = ytd;
  }

  function logTerminal(msg, type) {
    const line = document.createElement('p');
    line.className = `terminal-line ${type}`;
    line.innerHTML = msg;
    terminalBody.appendChild(line);
    terminalBody.scrollTop = terminalBody.scrollHeight;

    // Keep terminal from getting too long
    while (terminalBody.children.length > 100) {
      terminalBody.removeChild(terminalBody.firstChild);
    }
  }

  function formatCurrency(val) {
    const prefix = simState.currency === 'ZiG' ? 'ZiG ' : '$';
    if (val >= 1e6) return prefix + (val / 1e6).toFixed(2) + 'M';
    if (val >= 1e3) return prefix + (val / 1e3).toFixed(1) + 'K';
    return prefix + val.toFixed(0);
  }

  function formatCompact(val) {
    if (val >= 1e6) return `$${(val / 1e6).toFixed(1)}M`;
    if (val >= 1e3) return `$${(val / 1e3).toFixed(0)}K`;
    return `$${val.toFixed(0)}`;
  }

  function getBalanceStep(max) {
    if (max >= 1e7) return 2e6;
    if (max >= 1e6) return 200000;
    if (max >= 500000) return 100000;
    if (max >= 100000) return 20000;
    if (max >= 10000) return 2000;
    return 500;
  }

  function getChallengeColor(type) {
    const colors = {
      hyperinflation: '#ef4444',
      currency: '#f59e0b',
      drought: '#a855f7',
      policy: '#38bdf8',
      demographic: '#06d6a0',
    };
    return colors[type] || '#38bdf8';
  }

  function getChallengeLabel(type) {
    const labels = {
      hyperinflation: 'Hyperinflation',
      currency: 'Currency Devaluation',
      drought: 'Drought/Crisis',
      policy: 'Policy Change',
      demographic: 'Demographic Shift',
    };
    return labels[type] || type;
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  // ── INITIAL DRAW ──
  drawGrid();

})();
