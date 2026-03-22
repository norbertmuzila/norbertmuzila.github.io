/* ================================================
   PENSION FUND DIGITAL TWIN — ZIMBABWE (Enhanced v2)
   Full Simulation Engine with ZAPF Competition Features
   Live RBZ / IOBZ data, Draggable Output, IPEC Inline
   ================================================ */
(function () {
  'use strict';

  // ═══════════════════════════════════════════════
  // MOSI OA TUNYA GOLD COIN DATA
  // RBZ: LBMA PM Fix + 5% premium, 1 troy oz 22-carat
  // ═══════════════════════════════════════════════
  const GOLD_DATA = {
    name: 'Mosi oa Tunya Gold Coin',
    description: '1 troy oz, 22-carat (91.67% pure gold)',
    issuer: 'Reserve Bank of Zimbabwe (RBZ)',
    pricingBasis: 'LBMA PM Fix + 5% premium',
    historicalPrices: [
      { date: '2022-07-25', usd: 1824.00, event: 'Launch date' },
      { date: '2023-01-03', usd: 1857.60, event: 'Early 2023' },
      { date: '2023-06-15', usd: 2016.00, event: 'Mid 2023' },
      { date: '2023-12-29', usd: 2172.80, event: 'End 2023' },
      { date: '2024-01-02', usd: 2182.32, event: 'Start 2024' },
      { date: '2024-01-30', usd: 2022.50, event: 'Jan dip' },
      { date: '2024-02-13', usd: 2015.20, event: 'Feb 2024' },
      { date: '2024-04-05', usd: 2300.00, event: 'ZiG introduction' },
      { date: '2024-05-22', usd: 2427.30, event: 'May 2024 (Peak)' },
      { date: '2024-09-15', usd: 2580.00, event: 'Sep 2024' },
      { date: '2024-12-31', usd: 2650.00, event: 'End 2024' },
      { date: '2025-03-14', usd: 2890.00, event: 'Mar 2025 est.' },
    ],
    currentPrice: 2400, // Configurable baseline
    annualAppreciation: 0.10, // ~10% per year historically
    zigConversion: 13, // Market rate ZiG per USD
  };

  // ═══════════════════════════════════════════════
  // ZiG HISTORICAL DATA (for Live Rates sparkline)
  // Approximate RBZ reference rates since ZiG launch
  // ═══════════════════════════════════════════════
  const ZIG_HISTORY = [
    { date: 'Apr 2024', rate: 13.56, event: 'ZiG Launch (RBZ)' },
    { date: 'May 2024', rate: 13.56 },
    { date: 'Jun 2024', rate: 13.90 },
    { date: 'Jul 2024', rate: 14.80 },
    { date: 'Aug 2024', rate: 16.20 },
    { date: 'Sep 2024', rate: 17.50 },
    { date: 'Oct 2024', rate: 19.10 },
    { date: 'Nov 2024', rate: 20.30 },
    { date: 'Dec 2024', rate: 21.40 },
    { date: 'Jan 2025', rate: 22.00 },
    { date: 'Feb 2025', rate: 22.80 },
    { date: 'Mar 2025', rate: 23.50, event: 'Current est.' },
  ];

  // ═══════════════════════════════════════════════
  // SCENARIO PRESETS
  // ═══════════════════════════════════════════════
  const PRESETS = {
    custom: null,
    '2008crisis': {
      name: '2008 Hyperinflation Crisis',
      employeeContrib: 30, employerContrib: 45, payout: 100,
      age: 35, retirement: 60, inflation: 231,
      allocEquities: 10, allocBonds: 5, allocRealestate: 15, allocMoney: 60, allocGold: 10,
      inflationModel: 'volatile', lifeExpectancy: 62, longevityUncertainty: 5,
    },
    covid2020: {
      name: 'COVID-19 Impact (2020)',
      employeeContrib: 40, employerContrib: 60, payout: 150,
      age: 30, retirement: 60, inflation: 350,
      allocEquities: 30, allocBonds: 30, allocRealestate: 20, allocMoney: 15, allocGold: 5,
      inflationModel: 'volatile', lifeExpectancy: 68, longevityUncertainty: 10,
    },
    zig2024: {
      name: 'ZiG Currency Transition (2024)',
      employeeContrib: 50, employerContrib: 75, payout: 200,
      age: 30, retirement: 60, inflation: 55,
      allocEquities: 40, allocBonds: 20, allocRealestate: 20, allocMoney: 10, allocGold: 10,
      inflationModel: 'volatile', lifeExpectancy: 72, longevityUncertainty: 8,
    },
    stable: {
      name: 'Stable Growth Baseline',
      employeeContrib: 80, employerContrib: 120, payout: 300,
      age: 25, retirement: 65, inflation: 5,
      allocEquities: 50, allocBonds: 25, allocRealestate: 15, allocMoney: 5, allocGold: 5,
      inflationModel: 'decreasing', lifeExpectancy: 80, longevityUncertainty: 5,
    },
    nssa: {
      name: 'NSSA Default Parameters',
      employeeContrib: 45, employerContrib: 45, payout: 180,
      age: 30, retirement: 60, inflation: 25,
      allocEquities: 35, allocBonds: 30, allocRealestate: 20, allocMoney: 10, allocGold: 5,
      inflationModel: 'constant', lifeExpectancy: 75, longevityUncertainty: 8,
    },
  };

  // ═══════════════════════════════════════════════
  // DOM REFERENCES
  // ═══════════════════════════════════════════════
  const $ = (id) => document.getElementById(id);
  const canvas = $('sim-canvas');
  const ctx = canvas.getContext('2d');

  const sliders = {
    employeeContrib: $('slider-employee-contrib'), employerContrib: $('slider-employer-contrib'),
    payout: $('slider-payout'), age: $('slider-age'), retirement: $('slider-retirement'),
    inflation: $('slider-inflation'),
    allocEquities: $('slider-alloc-equities'), allocBonds: $('slider-alloc-bonds'),
    allocRealestate: $('slider-alloc-realestate'), allocMoney: $('slider-alloc-money'),
    allocGold: $('slider-alloc-gold'),
    lifeExpectancy: $('slider-life-expectancy'), longevityUncertainty: $('slider-longevity-uncertainty'),
    minFunding: $('slider-min-funding'), replacementRatio: $('slider-replacement-ratio'),
  };
  const vals = {};
  Object.keys(sliders).forEach(k => {
    const valEl = document.querySelector(`#val-${k.replace(/([A-Z])/g, '-$1').toLowerCase()}`);
    if (valEl) vals[k] = valEl;
  });
  // Manual mappings for mismatched names
  vals.employeeContrib = $('val-employee-contrib');
  vals.employerContrib = $('val-employer-contrib');
  vals.lifeExpectancy = $('val-life-expectancy');
  vals.longevityUncertainty = $('val-longevity-uncertainty');
  vals.minFunding = $('val-min-funding');
  vals.replacementRatio = $('val-replacement-ratio');
  vals.allocEquities = $('val-alloc-equities');
  vals.allocBonds = $('val-alloc-bonds');
  vals.allocRealestate = $('val-alloc-realestate');
  vals.allocMoney = $('val-alloc-money');
  vals.allocGold = $('val-alloc-gold');
  vals.payout = $('val-payout');
  vals.age = $('val-age');
  vals.retirement = $('val-retirement');
  vals.inflation = $('val-inflation');

  // ═══════════════════════════════════════════════
  // STATE
  // ═══════════════════════════════════════════════
  let simState = {
    running: false, animFrame: null, projectionData: [],
    currentStep: 0, challengeEvents: [],
    currency: 'USD', projectionYears: 30, inflationModel: 'decreasing',
    goldBasePrice: 2400, zigRate: 13,
  };

  // ═══════════════════════════════════════════════
  // SLIDER SYNC
  // ═══════════════════════════════════════════════
  Object.keys(sliders).forEach(k => {
    if (sliders[k] && vals[k]) {
      sliders[k].addEventListener('input', () => { vals[k].textContent = sliders[k].value; });
    }
  });

  // Allocation total tracking
  const allocSliders = ['allocEquities', 'allocBonds', 'allocRealestate', 'allocMoney', 'allocGold'];
  // Retirement age dropdown
  const retirementSelect = document.getElementById('select-retirement');
  if (retirementSelect) {
    retirementSelect.addEventListener('change', () => {
      const v = retirementSelect.value;
      if (v === 'custom') {
        sliders.retirement.style.display = '';
      } else {
        sliders.retirement.style.display = 'none';
        sliders.retirement.value = v;
        vals.retirement.textContent = v;
      }
    });
  }

  allocSliders.forEach(k => {
    sliders[k].addEventListener('input', updateAllocTotal);
  });
  function updateAllocTotal() {
    const total = allocSliders.reduce((s, k) => s + parseInt(sliders[k].value), 0);
    const el = $('alloc-total');
    const summary = $('allocation-summary');
    el.textContent = total;
    summary.className = 'allocation-summary ' + (total > 100 ? 'over' : total < 100 ? 'under' : 'ok');
    drawAllocChart();
  }

  // ═══════════════════════════════════════════════
  // ALLOCATION DONUT CHART
  // ═══════════════════════════════════════════════
  function drawAllocChart() {
    const c = $('alloc-chart');
    if (!c) return;
    const cx2d = c.getContext('2d');
    const w = c.width, h = c.height, cx = w/2, cy = h/2, r = 60;
    cx2d.clearRect(0, 0, w, h);

    const data = [
      { val: parseInt(sliders.allocEquities.value), color: '#ef4444', label: 'Equities' },
      { val: parseInt(sliders.allocBonds.value), color: '#3b82f6', label: 'Bonds' },
      { val: parseInt(sliders.allocRealestate.value), color: '#a855f7', label: 'Property' },
      { val: parseInt(sliders.allocMoney.value), color: '#06d6a0', label: 'Cash' },
      { val: parseInt(sliders.allocGold.value), color: '#d4a843', label: 'Gold' },
    ];
    const total = data.reduce((s, d) => s + d.val, 0) || 1;
    let startAngle = -Math.PI / 2;

    data.forEach(d => {
      const slice = (d.val / total) * Math.PI * 2;
      cx2d.beginPath();
      cx2d.moveTo(cx, cy);
      cx2d.arc(cx, cy, r, startAngle, startAngle + slice);
      cx2d.closePath();
      cx2d.fillStyle = d.color;
      cx2d.fill();
      startAngle += slice;
    });

    cx2d.beginPath();
    cx2d.arc(cx, cy, r * 0.55, 0, Math.PI * 2);
    cx2d.fillStyle = '#0d1117';
    cx2d.fill();

    cx2d.fillStyle = '#e2e8f0';
    cx2d.font = '700 14px "Plus Jakarta Sans"';
    cx2d.textAlign = 'center';
    cx2d.fillText(total + '%', cx, cy + 5);
  }

  // ═══════════════════════════════════════════════
  // TABS
  // ═══════════════════════════════════════════════
  document.querySelectorAll('.editor-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.editor-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      $('tab-' + tab.dataset.tab).classList.add('active');
    });
  });

  document.querySelectorAll('.term-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.term-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.term-content').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      $('terminal-' + tab.dataset.termtab).classList.add('active');
    });
  });

  // ═══════════════════════════════════════════════
  // CURRENCY & SETTINGS
  // ═══════════════════════════════════════════════
  $('select-currency').addEventListener('change', () => { simState.currency = $('select-currency').value; });
  $('setting-inflation-model').addEventListener('change', () => { simState.inflationModel = $('setting-inflation-model').value; });

  // Settings modal
  $('settings-gear').addEventListener('click', () => $('modal-overlay').classList.add('open'));
  $('modal-close').addEventListener('click', () => $('modal-overlay').classList.remove('open'));
  $('modal-overlay').addEventListener('click', e => { if (e.target === $('modal-overlay')) $('modal-overlay').classList.remove('open'); });
  $('setting-years').addEventListener('change', () => { simState.projectionYears = parseInt($('setting-years').value); });
  $('setting-gold-price').addEventListener('change', () => { simState.goldBasePrice = parseInt($('setting-gold-price').value); GOLD_DATA.currentPrice = simState.goldBasePrice; });
  $('setting-zig-rate').addEventListener('change', () => { simState.zigRate = parseFloat($('setting-zig-rate').value); GOLD_DATA.zigConversion = simState.zigRate; });

  // Mode toggle / Pensioner View / Live Rates
  function setActiveMode(mode) {
    $('btn-scenario').classList.toggle('active', mode === 'scenario');
    $('btn-live').classList.toggle('active', mode === 'live');
    if ($('btn-rates')) $('btn-rates').classList.toggle('active', mode === 'rates');
    $('pensioner-overlay').classList.toggle('open', mode === 'live');
    if ($('rates-overlay')) $('rates-overlay').classList.toggle('open', mode === 'rates');
    if (mode !== 'rates') stopRatesRefresh();
  }

  $('btn-scenario').addEventListener('click', () => setActiveMode('scenario'));
  $('btn-live').addEventListener('click', () => { setActiveMode('live'); showPensionerView(); });
  $('pensioner-close').addEventListener('click', () => setActiveMode('scenario'));
  $('pensioner-overlay').addEventListener('click', e => {
    if (e.target === $('pensioner-overlay')) setActiveMode('scenario');
  });

  if ($('btn-rates')) {
    $('btn-rates').addEventListener('click', () => {
      setActiveMode('rates');
      startRatesView();
    });
  }
  if ($('rates-close')) {
    $('rates-close').addEventListener('click', () => setActiveMode('scenario'));
  }
  if ($('rates-overlay')) {
    $('rates-overlay').addEventListener('click', e => {
      if (e.target === $('rates-overlay')) setActiveMode('scenario');
    });
  }
  if ($('rates-refresh-btn')) {
    $('rates-refresh-btn').addEventListener('click', () => loadRatesData());
  }

  // Pensioner View — run simulation button inside the modal
  const pensionerRunBtn = $('pensioner-run-sim');
  if (pensionerRunBtn) {
    pensionerRunBtn.addEventListener('click', () => {
      $('pensioner-overlay').classList.remove('open');
      $('btn-scenario').classList.add('active');
      $('btn-live').classList.remove('active');
      startSimulation();
    });
  }

  // ═══════════════════════════════════════════════
  // SCENARIO PRESETS
  // ═══════════════════════════════════════════════
  function applyPreset(key) {
    const p = PRESETS[key];
    if (!p) return;
    sliders.employeeContrib.value = p.employeeContrib; vals.employeeContrib.textContent = p.employeeContrib;
    sliders.employerContrib.value = p.employerContrib; vals.employerContrib.textContent = p.employerContrib;
    sliders.payout.value = p.payout; vals.payout.textContent = p.payout;
    sliders.age.value = p.age; vals.age.textContent = p.age;
    sliders.retirement.value = p.retirement; vals.retirement.textContent = p.retirement;
    sliders.inflation.value = Math.min(p.inflation, 500); vals.inflation.textContent = Math.min(p.inflation, 500);
    sliders.allocEquities.value = p.allocEquities; vals.allocEquities.textContent = p.allocEquities;
    sliders.allocBonds.value = p.allocBonds; vals.allocBonds.textContent = p.allocBonds;
    sliders.allocRealestate.value = p.allocRealestate; vals.allocRealestate.textContent = p.allocRealestate;
    sliders.allocMoney.value = p.allocMoney; vals.allocMoney.textContent = p.allocMoney;
    sliders.allocGold.value = p.allocGold; vals.allocGold.textContent = p.allocGold;
    sliders.lifeExpectancy.value = p.lifeExpectancy; vals.lifeExpectancy.textContent = p.lifeExpectancy;
    sliders.longevityUncertainty.value = p.longevityUncertainty; vals.longevityUncertainty.textContent = p.longevityUncertainty;
    $('setting-inflation-model').value = p.inflationModel;
    simState.inflationModel = p.inflationModel;
    // Sync retirement select dropdown
    const retSel = $('select-retirement');
    if (retSel) {
      const opt = retSel.querySelector(`option[value="${p.retirement}"]`);
      if (opt) { retSel.value = String(p.retirement); sliders.retirement.style.display = 'none'; }
      else { retSel.value = 'custom'; sliders.retirement.style.display = ''; }
    }
    updateAllocTotal();
  }

  $('preset-select').addEventListener('change', () => {
    const key = $('preset-select').value;
    if (key === 'custom' || !PRESETS[key]) return;
    applyPreset(key);
    logTerminal(`Loaded preset: ${PRESETS[key].name}`, 'success', 'log');
  });

  // ═══════════════════════════════════════════════
  // CANVAS RESIZE
  // ═══════════════════════════════════════════════
  function resizeCanvas() {
    const panel = $('right-panel');
    canvas.width = panel.clientWidth;
    canvas.height = panel.clientHeight;
    if (!simState.running && simState.projectionData.length > 0) {
      drawProjection(simState.projectionData, simState.projectionData.length);
    } else if (!simState.running) { drawGrid(); }
  }
  window.addEventListener('resize', resizeCanvas);
  requestAnimationFrame(resizeCanvas);

  // ═══════════════════════════════════════════════
  // SIMULATION ENGINE (Enhanced)
  // ═══════════════════════════════════════════════
  function getAssetAllocation() {
    const eq = parseInt(sliders.allocEquities.value);
    const bo = parseInt(sliders.allocBonds.value);
    const re = parseInt(sliders.allocRealestate.value);
    const mo = parseInt(sliders.allocMoney.value);
    const go = parseInt(sliders.allocGold.value);
    const total = eq + bo + re + mo + go || 1;
    return {
      equities: { weight: eq / total, expectedReturn: 0.12, volatility: 0.25 },
      bonds: { weight: bo / total, expectedReturn: 0.06, volatility: 0.08 },
      realestate: { weight: re / total, expectedReturn: 0.08, volatility: 0.15 },
      moneyMarket: { weight: mo / total, expectedReturn: 0.03, volatility: 0.02 },
      gold: { weight: go / total, expectedReturn: GOLD_DATA.annualAppreciation, volatility: 0.18 },
    };
  }

  function computePortfolioReturn(allocation) {
    let portfolioReturn = 0;
    Object.values(allocation).forEach(a => {
      const noise = (Math.random() - 0.5) * a.volatility * 0.3;
      const monthlyReturn = (a.expectedReturn + noise) / 12;
      portfolioReturn += a.weight * monthlyReturn;
    });
    return portfolioReturn;
  }

  function computeProjection() {
    const empContrib = parseFloat(sliders.employeeContrib.value);
    const erContrib = parseFloat(sliders.employerContrib.value);
    const totalContrib = empContrib + erContrib;
    const inflation = parseFloat(sliders.inflation.value) / 100;
    const retirementAge = parseInt(sliders.retirement.value);
    const currentAge = parseInt(sliders.age.value);
    const monthlyPayout = parseFloat(sliders.payout.value);
    const years = simState.projectionYears;
    const inflModel = simState.inflationModel;
    const lifeExp = parseInt(sliders.lifeExpectancy.value);
    const allocation = getAssetAllocation();

    const months = years * 12;
    const retirementMonth = Math.max(0, (retirementAge - currentAge) * 12);
    const data = [];
    let balance = 0, cumulativeInflation = 1, totalContributions = 0;
    let goldHoldings = 0;

    for (let m = 0; m <= months; m++) {
      let currentInflation = inflation;
      if (inflModel === 'volatile') {
        const spike = Math.random() < 0.03 ? (2 + Math.random() * 8) : 1;
        currentInflation = inflation * (0.5 + Math.random()) * spike;
      } else if (inflModel === 'decreasing') {
        currentInflation = inflation * Math.max(0.1, 1 - (m / months) * 0.8);
      } else if (inflModel === 'historical') {
        const yearInSim = m / 12;
        if (yearInSim < 5) currentInflation = inflation * 0.5;
        else if (yearInSim < 10) currentInflation = inflation * 2;
        else if (yearInSim < 15) currentInflation = inflation * 5;
        else currentInflation = inflation * 0.3;
      }

      cumulativeInflation *= (1 + currentInflation / 12);
      const portfolioReturn = computePortfolioReturn(allocation);

      const goldPrice = GOLD_DATA.currentPrice * Math.pow(1 + GOLD_DATA.annualAppreciation/12, m);
      const goldAllocationValue = balance * allocation.gold.weight;
      goldHoldings = goldAllocationValue / goldPrice;

      if (m < retirementMonth) {
        balance = balance * (1 + portfolioReturn) + totalContrib;
        totalContributions += totalContrib;
      } else {
        const adjustedPayout = monthlyPayout * cumulativeInflation / (1 + inflation);
        balance = balance * (1 + portfolioReturn) - adjustedPayout;
      }
      if (balance < 0) balance = 0;

      const targetLiability = monthlyPayout * 12 * Math.max(0, lifeExp - currentAge - m/12);
      const fundingRatio = targetLiability > 0 ? (balance / targetLiability) * 100 : 0;

      data.push({
        month: m, year: m/12, balance, realBalance: balance / cumulativeInflation,
        inflation: currentInflation,
        phase: m < retirementMonth ? 'accumulation' : 'drawdown',
        fundingRatio, goldHoldings, goldPrice, totalContributions,
        goldValue: goldHoldings * goldPrice,
      });
    }
    return data;
  }

  // ═══════════════════════════════════════════════
  // DRAWING
  // ═══════════════════════════════════════════════
  const P = { top: 55, right: 35, bottom: 75, left: 75 };

  function drawGrid() {
    const w = canvas.width, h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    const bg = ctx.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, '#0f1623'); bg.addColorStop(1, '#0a0e1a');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = 'rgba(148,163,184,0.1)'; ctx.lineWidth = 1;
    for (let x = P.left; x < w - P.right; x += 40) { ctx.beginPath(); ctx.moveTo(x, P.top); ctx.lineTo(x, h - P.bottom); ctx.stroke(); }
    for (let y = P.top; y < h - P.bottom; y += 40) { ctx.beginPath(); ctx.moveTo(P.left, y); ctx.lineTo(w - P.right, y); ctx.stroke(); }

    ctx.strokeStyle = 'rgba(148,163,184,0.35)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(P.left, P.top); ctx.lineTo(P.left, h - P.bottom); ctx.lineTo(w - P.right, h - P.bottom); ctx.stroke();

    ctx.fillStyle = '#e2e8f0'; ctx.font = '11px "JetBrains Mono"'; ctx.textAlign = 'center';
    ctx.fillText('Years →', w/2, h - P.bottom + 38);
    ctx.save(); ctx.translate(16, h/2); ctx.rotate(-Math.PI/2); ctx.fillText('Fund Balance →', 0, 0); ctx.restore();
    ctx.fillStyle = '#ffffff'; ctx.font = '600 13px "Plus Jakarta Sans"'; ctx.textAlign = 'center';
    ctx.fillText('Pension Fund Projection — Zimbabwe', w/2, 28);
  }

  function drawProjection(data, stepCount) {
    const w = canvas.width, h = canvas.height;
    drawGrid();
    if (!data.length) return;
    const cW = w - P.left - P.right, cH = h - P.top - P.bottom;
    const maxBal = Math.max(...data.map(d => d.balance), 1000);
    const totalM = data[data.length-1].month;
    const xS = m => P.left + (m / totalM) * cW;
    const yS = b => P.top + cH - (b / maxBal) * cH;

    ctx.fillStyle = '#e2e8f0'; ctx.font = '10px "JetBrains Mono"'; ctx.textAlign = 'center';
    const yrs = totalM/12, yStp = yrs <= 20 ? 2 : yrs <= 40 ? 5 : 10;
    for (let y = 0; y <= yrs; y += yStp) { ctx.fillText(`${y}y`, xS(y*12), h - P.bottom + 16); }

    const bStp = getBalanceStep(maxBal);
    for (let b = 0; b <= maxBal; b += bStp) {
      ctx.fillStyle = '#e2e8f0'; ctx.font = '10px "JetBrains Mono"'; ctx.textAlign = 'right';
      ctx.fillText(formatCompact(b), P.left - 8, yS(b) + 3);
    }

    const retM = data.findIndex(d => d.phase === 'drawdown');
    if (retM > 0 && retM < stepCount) {
      const rx = xS(retM);
      ctx.strokeStyle = 'rgba(251,191,36,0.5)'; ctx.lineWidth = 1.5; ctx.setLineDash([5,3]);
      ctx.beginPath(); ctx.moveTo(rx, P.top); ctx.lineTo(rx, h - P.bottom); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = '#fbbf24'; ctx.font = '600 10px "JetBrains Mono"'; ctx.textAlign = 'center';
      ctx.fillText('RETIREMENT', rx, P.top - 6);
    }

    const lifeExp = parseInt(sliders.lifeExpectancy.value);
    const uncert = parseInt(sliders.longevityUncertainty.value);
    const curAge = parseInt(sliders.age.value);
    const lifeMonth = (lifeExp - curAge) * 12;
    const lifeMinMonth = (lifeExp - uncert - curAge) * 12;
    const lifeMaxMonth = (lifeExp + uncert - curAge) * 12;
    if (lifeMonth > 0 && lifeMonth < totalM) {
      const lx1 = xS(Math.max(0, lifeMinMonth)), lx2 = xS(Math.min(totalM, lifeMaxMonth));
      ctx.fillStyle = 'rgba(139,92,246,0.12)'; ctx.fillRect(lx1, P.top, lx2 - lx1, cH);
      const lx = xS(lifeMonth);
      ctx.strokeStyle = 'rgba(167,139,250,0.6)'; ctx.lineWidth = 1; ctx.setLineDash([3,3]);
      ctx.beginPath(); ctx.moveTo(lx, P.top); ctx.lineTo(lx, h - P.bottom); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = '#a78bfa'; ctx.font = '600 9px "JetBrains Mono"'; ctx.fillText('LIFE EXP.', lx, P.top - 6);
    }

    ctx.beginPath(); ctx.moveTo(xS(0), yS(0));
    for (let i = 0; i < Math.min(stepCount, data.length); i++) ctx.lineTo(xS(data[i].month), yS(data[i].balance));
    const lD = Math.min(stepCount, data.length) - 1;
    ctx.lineTo(xS(data[lD].month), yS(0)); ctx.closePath();
    const aG = ctx.createLinearGradient(0, P.top, 0, h - P.bottom);
    aG.addColorStop(0, 'rgba(59,130,246,0.25)'); aG.addColorStop(1, 'rgba(59,130,246,0.02)');
    ctx.fillStyle = aG; ctx.fill();

    ctx.beginPath();
    for (let i = 0; i < Math.min(stepCount, data.length); i++) {
      const x = xS(data[i].month), y = yS(data[i].balance);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.strokeStyle = '#60a5fa'; ctx.lineWidth = 2.5; ctx.shadowColor = 'rgba(96,165,250,0.5)'; ctx.shadowBlur = 6;
    ctx.stroke(); ctx.shadowBlur = 0;

    ctx.beginPath();
    for (let i = 0; i < Math.min(stepCount, data.length); i++) {
      const x = xS(data[i].month), y = yS(data[i].realBalance);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.strokeStyle = '#34d399'; ctx.lineWidth = 1.8; ctx.setLineDash([4,3]); ctx.stroke(); ctx.setLineDash([]);

    const maxGold = Math.max(...data.slice(0, Math.min(stepCount, data.length)).map(d => d.goldValue || 0), 1);
    if (maxGold > 10) {
      ctx.beginPath();
      for (let i = 0; i < Math.min(stepCount, data.length); i++) {
        const x = xS(data[i].month), y = yS((data[i].goldValue / maxGold) * maxBal * 0.3);
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.strokeStyle = '#d4a843'; ctx.lineWidth = 1.5; ctx.setLineDash([2,3]); ctx.stroke(); ctx.setLineDash([]);
    }

    const lX = w - P.right - 190, lY = P.top + 6;
    ctx.fillStyle = 'rgba(15,22,36,0.92)'; ctx.strokeStyle = 'rgba(148,163,184,0.25)'; ctx.lineWidth = 1;
    roundRect(ctx, lX, lY, 180, 62, 6); ctx.fill(); ctx.stroke();
    ctx.font = '10px "JetBrains Mono"'; ctx.textAlign = 'left';
    const legs = [
      { color: '#60a5fa', dash: false, label: 'Nominal Balance' },
      { color: '#34d399', dash: true,  label: 'Real (inflation-adj)' },
      { color: '#d4a843', dash: true,  label: 'Gold Allocation Value' },
    ];
    legs.forEach((l, i) => {
      const ly = lY + 14 + i * 16;
      ctx.strokeStyle = l.color; ctx.lineWidth = l.dash ? 1.8 : 2.5;
      if (l.dash) ctx.setLineDash([4,3]); else ctx.setLineDash([]);
      ctx.beginPath(); ctx.moveTo(lX + 8, ly); ctx.lineTo(lX + 28, ly); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = '#e2e8f0'; ctx.fillText(l.label, lX + 34, ly + 3);
    });

    if (stepCount > 0 && stepCount < data.length) {
      const d = data[stepCount - 1];
      ctx.beginPath(); ctx.arc(xS(d.month), yS(d.balance), 4, 0, Math.PI * 2);
      ctx.fillStyle = '#38bdf8'; ctx.fill();
    }
  }

  // ═══════════════════════════════════════════════
  // ANIMATION
  // ═══════════════════════════════════════════════
  function startSimulation() {
    if (simState.running) return;
    const data = computeProjection();
    simState.projectionData = data; simState.currentStep = 0; simState.running = true;
    setStatus('Running', 'status-running');
    logTerminal('Simulation started...', 'success', 'log');
    logTerminal(`Employee: $${sliders.employeeContrib.value}/mo + Employer: $${sliders.employerContrib.value}/mo`, 'data', 'log');
    logTerminal(`Inflation: ${sliders.inflation.value}% | Model: ${simState.inflationModel}`, 'data', 'log');
    logTerminal(`Gold Base: $${simState.goldBasePrice}/oz (Mosi oa Tunya)`, 'gold', 'log');

    const totalSteps = data.length, stepsPerFrame = Math.max(1, Math.floor(totalSteps / 300));

    function animate() {
      if (!simState.running) return;
      simState.currentStep += stepsPerFrame;
      if (simState.currentStep >= totalSteps) {
        simState.currentStep = totalSteps; simState.running = false;
        completeSimulation(data);
        return;
      }
      const d = data[simState.currentStep];
      updateStatusPanel(d, '—');
      drawProjection(data, simState.currentStep);
      simState.animFrame = requestAnimationFrame(animate);
    }
    simState.animFrame = requestAnimationFrame(animate);
  }

  function completeSimulation(data) {
    const final = data[data.length - 1];
    const peak = Math.max(...data.map(d => d.balance));
    const depPt = data.findIndex(d => d.phase === 'drawdown' && d.balance <= 0);
    const ytd = depPt > 0 ? (depPt / 12).toFixed(1) : '∞';
    const minFundingReq = parseInt(sliders.minFunding.value);
    const replRatio = parseInt(sliders.replacementRatio.value);

    updateStatusPanel(final, ytd);
    setStatus('Complete', 'status-complete');
    drawProjection(data, data.length);

    logTerminal('══════════════════════════════════', 'info', 'log');
    logTerminal('SIMULATION COMPLETE', 'success', 'log');
    logTerminal(`Peak Balance: ${fmtCur(peak)}`, 'data', 'log');
    logTerminal(`Final Nominal: ${fmtCur(final.balance)} | Real: ${fmtCur(final.realBalance)}`, 'data', 'log');
    logTerminal(`Gold Holdings: ${final.goldHoldings.toFixed(4)} oz (${fmtCur(final.goldValue)})`, 'gold', 'log');
    if (depPt > 0) logTerminal(`FUND DEPLETED at year ${ytd}`, 'error', 'log');
    else logTerminal('✓ Fund solvent through projection period.', 'success', 'log');

    generateIPECReport(data, minFundingReq, replRatio, depPt);
    generateRecommendations(data, depPt, peak, final);
    updateIPECBadge(data, minFundingReq);
    updateInlineIPEC(data, minFundingReq);
  }

  function stopSimulation() {
    simState.running = false;
    if (simState.animFrame) cancelAnimationFrame(simState.animFrame);
    setStatus('Stopped', 'status-idle');
    logTerminal('Simulation stopped.', 'warning', 'log');
  }

  function resetSimulation() {
    stopSimulation();
    simState.projectionData = []; simState.currentStep = 0; simState.challengeEvents = [];
    $('status-balance').textContent = '$0'; $('status-payout').textContent = '$0';
    $('status-inflation').textContent = '0%'; $('status-depletion').textContent = '—';
    $('status-funding-ratio').textContent = '—';
    setStatus('Idle', 'status-idle');
    $('ipec-badge').className = 'ipec-badge'; $('ipec-status-text').textContent = 'IPEC: —';
    const inlineIPEC = $('canvas-ipec-status');
    if (inlineIPEC) { inlineIPEC.textContent = 'IPEC: —'; inlineIPEC.className = 'canvas-ipec-label'; }
    drawGrid();
    logTerminal('Scenario reset.', 'info', 'log');
  }

  $('btn-run').addEventListener('click', startSimulation);
  $('btn-stop').addEventListener('click', stopSimulation);
  $('btn-reset').addEventListener('click', resetSimulation);

  // ═══════════════════════════════════════════════
  // INLINE IPEC STATUS (canvas controls bar)
  // ═══════════════════════════════════════════════
  function updateInlineIPEC(data, minFunding) {
    const el = $('canvas-ipec-status');
    if (!el) return;
    const avgFR = data.reduce((s, d) => s + d.fundingRatio, 0) / data.length;
    if (avgFR >= minFunding) {
      el.textContent = 'IPEC: Compliant ✓';
      el.className = 'canvas-ipec-label compliant';
    } else if (avgFR >= minFunding * 0.7) {
      el.textContent = 'IPEC: At Risk ⚠';
      el.className = 'canvas-ipec-label warning';
    } else {
      el.textContent = 'IPEC: Non-Compliant ✗';
      el.className = 'canvas-ipec-label danger';
    }
  }

  // ═══════════════════════════════════════════════
  // IPEC COMPLIANCE REPORT
  // ═══════════════════════════════════════════════
  function generateIPECReport(data, minFunding, replRatio, depPt) {
    const term = $('terminal-ipec');
    term.innerHTML = '';
    const retM = data.findIndex(d => d.phase === 'drawdown');
    const retData = retM > 0 ? data[retM] : data[data.length-1];
    const avgFundingRatio = data.reduce((s, d) => s + d.fundingRatio, 0) / data.length;
    const monthlyIncome = parseFloat(sliders.payout.value);
    const preRetIncome = (parseFloat(sliders.employeeContrib.value) + parseFloat(sliders.employerContrib.value)) * 4;
    const actualReplRatio = preRetIncome > 0 ? (monthlyIncome / preRetIncome * 100).toFixed(1) : 0;

    addTermLine(term, 'IPEC COMPLIANCE ASSESSMENT', 'ipec');
    addTermLine(term, '────────────────────────────────', 'info');
    addTermLine(term, `Min Funding Ratio Required: ${minFunding}%`, 'data');
    addTermLine(term, `Avg Funding Ratio Achieved: ${avgFundingRatio.toFixed(1)}%`, avgFundingRatio >= minFunding ? 'success' : 'error');
    addTermLine(term, `${avgFundingRatio >= minFunding ? '✓ COMPLIANT' : '✗ NON-COMPLIANT'} with IPEC SI 95/2014`, avgFundingRatio >= minFunding ? 'success' : 'error');
    addTermLine(term, '', 'info');
    addTermLine(term, `Target Replacement Ratio: ${replRatio}%`, 'data');
    addTermLine(term, `Actual Replacement Ratio: ${actualReplRatio}%`, parseFloat(actualReplRatio) >= replRatio ? 'success' : 'warning');
    addTermLine(term, '', 'info');
    addTermLine(term, `Fund Balance at Retirement: ${fmtCur(retData.balance)}`, 'data');
    addTermLine(term, `Total Contributions: ${fmtCur(retData.totalContributions)}`, 'data');
    addTermLine(term, `Gold Hedge Value: ${fmtCur(retData.goldValue)} (${retData.goldHoldings.toFixed(4)} oz)`, 'gold');
    if (depPt > 0) addTermLine(term, `WARNING: Fund depletes at year ${(depPt/12).toFixed(1)} — fails sustainability test`, 'error');
    else addTermLine(term, '✓ Fund passes IPEC long-term sustainability test', 'success');
  }

  function updateIPECBadge(data, minFunding) {
    const badge = $('ipec-badge');
    const text = $('ipec-status-text');
    const avgFR = data.reduce((s, d) => s + d.fundingRatio, 0) / data.length;
    if (avgFR >= minFunding) { badge.className = 'ipec-badge compliant'; text.textContent = 'IPEC: Compliant'; }
    else if (avgFR >= minFunding * 0.7) { badge.className = 'ipec-badge warning'; text.textContent = 'IPEC: At Risk'; }
    else { badge.className = 'ipec-badge non-compliant'; text.textContent = 'IPEC: Non-Compliant'; }
  }

  // ═══════════════════════════════════════════════
  // SMART RECOMMENDATIONS ENGINE
  // ═══════════════════════════════════════════════
  function generateRecommendations(data, depPt, peak, final) {
    const term = $('terminal-recommend');
    term.innerHTML = '';
    const inflation = parseFloat(sliders.inflation.value);
    const empContrib = parseFloat(sliders.employeeContrib.value);
    const erContrib = parseFloat(sliders.employerContrib.value);
    const payout = parseFloat(sliders.payout.value);
    const goldAlloc = parseInt(sliders.allocGold.value);
    const equityAlloc = parseInt(sliders.allocEquities.value);
    const cashAlloc = parseInt(sliders.allocMoney.value);

    addTermLine(term, 'STRATEGIC RECOMMENDATIONS', 'success');
    addTermLine(term, '────────────────────────────────', 'info');

    if (empContrib + erContrib < 150) {
      addTermLine(term, `INCREASE CONTRIBUTIONS: Total $${empContrib + erContrib}/mo is below recommended. Target >=$150/mo combined.`, 'warning');
      addTermLine(term, `   → Advocate for employer match increase under Pension & Provident Funds Act`, 'info');
    }

    if (inflation > 50 && goldAlloc < 15) {
      addTermLine(term, `GOLD HEDGE: With ${inflation}% inflation, increase Mosi oa Tunya Gold allocation from ${goldAlloc}% to 15-20%.`, 'gold');
      addTermLine(term, `   → Gold coins preserve purchasing power per RBZ Exchange Control Directive`, 'info');
    }

    if (equityAlloc > 60) addTermLine(term, `DIVERSIFY: ${equityAlloc}% equities exceeds IPEC prudential limit. Consider rebalancing.`, 'warning');
    if (cashAlloc > 30 && inflation > 10) addTermLine(term, `REDUCE CASH: ${cashAlloc}% in money market losing value at ${inflation}% inflation. Shift to inflation-linked bonds.`, 'warning');

    if (depPt > 0) {
      addTermLine(term, '', 'info');
      addTermLine(term, 'CRITICAL: FUND DEPLETION RISK', 'error');
      addTermLine(term, `   Solution 1: Reduce monthly payout from $${payout} to $${Math.round(payout * 0.6)}`, 'info');
      addTermLine(term, `   Solution 2: Extend working years (delay retirement by 3-5 years)`, 'info');
      addTermLine(term, `   Solution 3: Implement annuity-based drawdown (IPEC Directive 2/2020)`, 'info');
      addTermLine(term, `   Solution 4: Increase gold allocation as inflation hedge`, 'gold');
    } else {
      addTermLine(term, '', 'info');
      addTermLine(term, 'Fund is sustainable — consider these optimizations:', 'success');
    }

    addTermLine(term, '', 'info');
    addTermLine(term, 'ZIMBABWE-SPECIFIC STRATEGIES:', 'ipec');
    addTermLine(term, `   • Multi-currency strategy (USD/ZiG/Gold) mitigates FX risk`, 'info');
    addTermLine(term, `   • Mosi oa Tunya Gold coins: LBMA-pegged store of value`, 'gold');
    addTermLine(term, `   • Regional diversification: invest in SADC pension markets`, 'info');
    addTermLine(term, `   • Lobby IPEC for inflation-indexed annuity regulations`, 'info');
    addTermLine(term, `   • Digital pension tracking via mobile to rebuild trust`, 'info');
  }

  // ═══════════════════════════════════════════════
  // PENSIONER TRANSPARENCY VIEW (Improved)
  // ═══════════════════════════════════════════════
  function showPensionerView() {
    const data = simState.projectionData;
    const hasData = data.length > 0;
    const retM = hasData ? data.findIndex(d => d.phase === 'drawdown') : -1;
    const noDataDiv = $('pensioner-no-data');
    const tipsDiv = $('pensioner-tips');

    if (hasData && retM > 0) {
      const retData = data[retM];
      const depPt = data.findIndex(d => d.phase === 'drawdown' && d.balance <= 0);
      const peak = Math.max(...data.map(d => d.balance));
      const final = data[data.length - 1];

      $('p-monthly-income').textContent = fmtCur(parseFloat(sliders.payout.value));
      $('p-total-savings').textContent = fmtCur(retData.balance);
      $('p-duration').textContent = depPt > 0 ? `${((depPt - retM)/12).toFixed(0)} years` : '30+ years ✓';

      const healthCard = $('p-health-card');
      if (depPt > 0 && (depPt - retM) / 12 < 10) {
        $('p-health').textContent = '⚠ At Risk';
        $('p-health-advice').textContent = 'Your fund may not last through retirement. See tips below.';
        healthCard.className = 'pensioner-card red';
      } else if (depPt > 0) {
        $('p-health').textContent = '▲ Fair';
        $('p-health-advice').textContent = 'Your fund has limited runway. Consider increasing savings.';
        healthCard.className = 'pensioner-card orange';
      } else {
        $('p-health').textContent = '✓ Healthy';
        $('p-health-advice').textContent = 'Your pension fund is on a sustainable path.';
        healthCard.className = 'pensioner-card green';
      }

      const tips = [];
      tips.push('Save consistently — even small increases to monthly contributions compound over decades.');
      if (depPt > 0) tips.push('Ask your employer about increasing their contribution match.');
      tips.push(`Your pension is partly backed by gold (Mosi oa Tunya) — this protects against inflation.`);
      tips.push('Consider delaying retirement by 2–3 years for significantly higher monthly income.');
      if (parseFloat(sliders.inflation.value) > 50) tips.push('High inflation is eroding your savings — talk to your fund about inflation-protected investments.');
      tips.push('Check your pension balance regularly through your IPEC-registered fund administrator.');
      $('p-tips-list').innerHTML = tips.map(t => `<li>${t}</li>`).join('');

      if (noDataDiv) noDataDiv.style.display = 'none';
      if (tipsDiv) tipsDiv.style.display = '';
    } else {
      // No simulation run yet — show call to action
      $('p-monthly-income').textContent = fmtCur(parseFloat(sliders.payout.value));
      $('p-total-savings').textContent = '—';
      $('p-duration').textContent = '—';
      $('p-health').textContent = '—';
      $('p-health-advice').textContent = 'Run a simulation to see your pension health.';
      $('p-health-card').className = 'pensioner-card';
      $('p-tips-list').innerHTML = '<li>Run a simulation first to get personalized advice.</li>';
      if (noDataDiv) noDataDiv.style.display = '';
      if (tipsDiv) tipsDiv.style.display = 'none';
    }

    $('pensioner-overlay').classList.add('open');
  }

  // ═══════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════
  function setStatus(t, c) { $('status-state').textContent = t; $('status-state').className = c; }
  function updateStatusPanel(d, ytd) {
    $('status-balance').textContent = fmtCur(d.balance);
    $('status-payout').textContent = '$' + parseFloat(sliders.payout.value);
    $('status-inflation').textContent = (d.inflation * 100).toFixed(1) + '%';
    $('status-depletion').textContent = ytd;
    $('status-funding-ratio').textContent = d.fundingRatio.toFixed(1) + '%';
  }

  function logTerminal(msg, type, tab) {
    const body = $('terminal-' + (tab || 'log'));
    if (!body) return;
    const line = document.createElement('p');
    line.className = `terminal-line ${type}`;
    line.innerHTML = msg;
    body.appendChild(line);
    body.scrollTop = body.scrollHeight;
    while (body.children.length > 150) body.removeChild(body.firstChild);
  }
  function addTermLine(container, msg, type) {
    const p = document.createElement('p');
    p.className = `terminal-line ${type}`;
    p.innerHTML = msg;
    container.appendChild(p);
  }

  function fmtCur(val) {
    if (simState.currency === 'MOT') {
      const oz = val / GOLD_DATA.currentPrice;
      if (oz >= 1) return oz.toFixed(2) + ' oz';
      return (oz * 1000).toFixed(1) + ' mg Au';
    }
    const prefix = simState.currency === 'ZiG' ? 'ZiG ' : '$';
    const converted = simState.currency === 'ZiG' ? val * simState.zigRate : val;
    if (converted >= 1e6) return prefix + (converted / 1e6).toFixed(2) + 'M';
    if (converted >= 1e3) return prefix + (converted / 1e3).toFixed(1) + 'K';
    return prefix + converted.toFixed(0);
  }
  function formatCompact(v) { if (v >= 1e6) return '$' + (v/1e6).toFixed(1) + 'M'; if (v >= 1e3) return '$' + (v/1e3).toFixed(0) + 'K'; return '$' + v.toFixed(0); }
  function getBalanceStep(m) { if (m >= 1e7) return 2e6; if (m >= 1e6) return 200000; if (m >= 5e5) return 100000; if (m >= 1e5) return 20000; if (m >= 1e4) return 2000; return 500; }

  function getChallengeColor(t) {
    return { hyperinflation:'#ef4444', currency:'#f59e0b', drought:'#a855f7', policy:'#38bdf8', demographic:'#06d6a0', gold_surge:'#d4a843' }[t] || '#38bdf8';
  }
  function getChallengeLabel(t) {
    return { hyperinflation:'Hyperinflation', currency:'Currency Deval.', drought:'Drought/Crisis', policy:'Policy Change', demographic:'Demographic', gold_surge:'Gold Surge' }[t] || t;
  }
  function roundRect(c, x, y, w, h, r) {
    c.beginPath(); c.moveTo(x+r,y); c.lineTo(x+w-r,y); c.quadraticCurveTo(x+w,y,x+w,y+r);
    c.lineTo(x+w,y+h-r); c.quadraticCurveTo(x+w,y+h,x+w-r,y+h); c.lineTo(x+r,y+h);
    c.quadraticCurveTo(x,y+h,x,y+h-r); c.lineTo(x,y+r); c.quadraticCurveTo(x,y,x+r,y); c.closePath();
  }

  // ═══════════════════════════════════════════════
  // DRAG HANDLE — Resize Analysis Output panel
  // ═══════════════════════════════════════════════
  function initDragHandle() {
    const handle = $('drag-handle');
    const terminal = $('terminal-section');
    if (!handle || !terminal) return;

    let isDragging = false, startY = 0, startHeight = 0;

    handle.addEventListener('mousedown', e => {
      isDragging = true;
      startY = e.clientY;
      startHeight = terminal.offsetHeight;
      document.body.style.userSelect = 'none';
      document.body.style.cursor = 'ns-resize';
      e.preventDefault();
    });
    document.addEventListener('mousemove', e => {
      if (!isDragging) return;
      const delta = startY - e.clientY; // drag up = bigger terminal
      const newH = Math.max(60, Math.min(420, startHeight + delta));
      terminal.style.height = newH + 'px';
    });
    document.addEventListener('mouseup', () => {
      if (!isDragging) return;
      isDragging = false;
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    });

    // Touch support
    handle.addEventListener('touchstart', e => {
      isDragging = true;
      startY = e.touches[0].clientY;
      startHeight = terminal.offsetHeight;
      e.preventDefault();
    }, { passive: false });
    document.addEventListener('touchmove', e => {
      if (!isDragging) return;
      const delta = startY - e.touches[0].clientY;
      const newH = Math.max(60, Math.min(420, startHeight + delta));
      terminal.style.height = newH + 'px';
    });
    document.addEventListener('touchend', () => { isDragging = false; });
  }

  // ═══════════════════════════════════════════════
  // LIVE RATES VIEW — Tab panel, sparklines, auto-refresh
  // ═══════════════════════════════════════════════
  let ratesRefreshTimer = null;
  let ratesCountdownSecs = 300;
  let ratesCountdownInterval = null;
  let ratesLastZig = null;
  let ratesLastGold = null;

  function startRatesView() {
    loadRatesData();
    startRatesCountdown();
  }

  function stopRatesRefresh() {
    clearTimeout(ratesRefreshTimer);
    clearInterval(ratesCountdownInterval);
    ratesRefreshTimer = null;
    ratesCountdownInterval = null;
  }

  function startRatesCountdown() {
    clearInterval(ratesCountdownInterval);
    ratesCountdownSecs = 300;
    updateCountdownDisplay();
    ratesCountdownInterval = setInterval(() => {
      ratesCountdownSecs--;
      updateCountdownDisplay();
      if (ratesCountdownSecs <= 0) {
        loadRatesData();
        ratesCountdownSecs = 300;
      }
    }, 1000);
  }

  function updateCountdownDisplay() {
    const el = $('rates-countdown');
    if (!el) return;
    const m = Math.floor(ratesCountdownSecs / 60);
    const s = String(ratesCountdownSecs % 60).padStart(2, '0');
    el.textContent = `\u21BB ${m}:${s}`;
  }

  // When served from GitHub Pages (crayson2002mangwiro.github.io), API calls must be
  // absolute — pointing to the deployed Replit backend. On Replit itself (dev + production)
  // the relative path '/api' resolves correctly via path-based routing.
  const API_BASE = window.location.hostname.endsWith('github.io')
    ? 'https://workspace--norbertmuzila60.replit.app/api'
    : '/api';

  let _ratesRetryCount = 0;
  const _RATES_MAX_RETRIES = 4;
  const _RATES_RETRY_DELAYS = [5000, 10000, 20000, 30000];

  function _fetchJson(url, timeoutMs = 12000) {
    const ctrl = new AbortController();
    const tid = setTimeout(() => ctrl.abort(), timeoutMs);
    return fetch(url, { signal: ctrl.signal })
      .then(r => { clearTimeout(tid); if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .catch(e => { clearTimeout(tid); throw e; });
  }

  async function loadRatesData() {
    const updatedEl = $('rates-updated');
    if (updatedEl) updatedEl.textContent = 'Fetching\u2026';

    const isGitHubPages = window.location.hostname.endsWith('github.io');

    // On GitHub Pages, start static cache fetch immediately — it resolves in <200ms
    // and gives the user instant data even when the live API is cold.
    const staticCachePromise = isGitHubPages
      ? _fetchJson('/rates-cache.json', 5000).catch(() => null)
      : Promise.resolve(null);

    // Live API fetches run in parallel
    const livePromise = Promise.allSettled([
      _fetchJson(`${API_BASE}/rates/zig-usd`),
      _fetchJson(`${API_BASE}/rates/gold-coin`),
      _fetchJson(`${API_BASE}/rates/idbz-fx`),
      _fetchJson(`${API_BASE}/rates/rbz-history`),
    ]);

    // Await cache first (fast, <200ms) — render it immediately so cards are
    // populated before the live API timeout fires.
    const staticCache = await staticCachePromise;
    if (staticCache && staticCache.latestZigUsd && staticCache.latestGoldCoin) {
      const zigEl = $('rc-zig'); if (zigEl) zigEl.textContent = `${staticCache.latestZigUsd.toFixed(4)} ZiG`;
      const zigMeta = $('rc-zig-meta'); if (zigMeta) { zigMeta.textContent = `RBZ PDF (${staticCache.latestDate} cached)`; zigMeta.className = 'rate-card-meta'; }
      const goldEl = $('rc-gold'); if (goldEl) goldEl.textContent = `$${Number(staticCache.latestGoldCoin).toLocaleString()}`;
      const goldMeta = $('rc-gold-meta'); if (goldMeta) { goldMeta.textContent = `RBZ PDF (${staticCache.latestDate} cached)`; goldMeta.className = 'rate-card-meta'; }
      if (updatedEl) updatedEl.textContent = `Cached: ${staticCache.latestDate} \u2014 checking live\u2026`;
    }

    // Now await live API results (may take up to 12s or fail entirely)
    const [zigRes, goldRes, idbzRes, histRes] = await livePromise;

    // Prefer live API history; fall back to static cache if live failed
    const liveHistory = histRes.status === 'fulfilled' ? histRes.value : null;
    const rbzHistory = liveHistory || staticCache;
    const histLive = rbzHistory && !rbzHistory.fallback && rbzHistory.points && rbzHistory.points.length > 0;
    const usingCache = !liveHistory && !!staticCache;

    let zigRate = null, goldUsd = null;

    // ── ZiG/USD Rate Card ──────────────────────────────────────────────────────
    // Primary source: RBZ daily PDF history (authoritative interbank mid rate).
    // Fallback: RBZ website HTML scrape (may be stale/unavailable).
    if (histLive && rbzHistory.latestZigUsd) {
      // PDF history is the authoritative source — always use it when available
      zigRate = rbzHistory.latestZigUsd;
      const el = $('rc-zig');
      if (el) el.textContent = `${zigRate.toFixed(4)} ZiG`;
      const meta = $('rc-zig-meta');
      if (meta) {
        meta.textContent = usingCache ? `RBZ PDF (${rbzHistory.latestDate} cached)` : `RBZ PDF (${rbzHistory.latestDate})`;
        meta.className = usingCache ? 'rate-card-meta' : 'rate-card-meta live';
      }
    } else if (zigRes.status === 'fulfilled') {
      // HTML scrape as fallback when PDF history is unavailable / still building
      const z = zigRes.value;
      zigRate = z.rate;
      ratesLastZig = z;
      const el = $('rc-zig');
      if (el) el.textContent = z.rate ? `${z.rate.toFixed(4)} ZiG` : '\u2014';
      const meta = $('rc-zig-meta');
      if (meta) {
        meta.textContent = z.source || '\u2014';
        meta.className = 'rate-card-meta' + (z.source === 'RBZ (live)' ? ' live' : '');
      }
    } else {
      // All ZiG sources failed — clear the Loading spinner so the user isn't left waiting
      const el = $('rc-zig');
      if (el && el.textContent.includes('…')) el.textContent = '\u2014';
      const meta = $('rc-zig-meta');
      if (meta) { meta.textContent = 'Unavailable — retry later'; meta.className = 'rate-card-meta'; }
    }

    // ── Gold Card (Mosi oa Tunya / XAU) ────────────────────────────────────────
    // Primary source: RBZ daily PDF history — XAU INDICES MID rate in USD.
    // The Mosi oa Tunya gold coin (1 troy oz) is priced at the XAU spot rate.
    // Fallback: IOBZ or IDBZ scrape endpoints.
    const idbzOk = idbzRes.status === 'fulfilled';
    if (histLive && rbzHistory.latestGoldCoin) {
      // PDF XAU MID = Mosi oa Tunya coin USD base price (authoritative)
      goldUsd = rbzHistory.latestGoldCoin;
      const el = $('rc-gold');
      if (el) el.textContent = `$${Number(goldUsd).toLocaleString()}`;
      const meta = $('rc-gold-meta');
      if (meta) {
        meta.textContent = usingCache ? `RBZ PDF / MOTC (${rbzHistory.latestDate} cached)` : `RBZ PDF / MOTC (${rbzHistory.latestDate})`;
        meta.className = usingCache ? 'rate-card-meta' : 'rate-card-meta live';
      }
    } else {
      // Fallback: IOBZ/IDBZ scrape
      const goldCoinFromIdbz = idbzOk && idbzRes.value.goldCoin;
      if (goldRes.status === 'fulfilled') {
        const g = goldRes.value;
        goldUsd = goldCoinFromIdbz || g.priceUsd;
        ratesLastGold = g;
        const el = $('rc-gold');
        if (el) el.textContent = goldUsd ? `$${Number(goldUsd).toLocaleString()}` : '\u2014';
        const src = goldCoinFromIdbz ? (idbzOk ? idbzRes.value.source : g.source) : g.source;
        const meta = $('rc-gold-meta');
        if (meta) {
          meta.textContent = src || '\u2014';
          meta.className = 'rate-card-meta' + (src && src.includes('live') ? ' live' : '');
        }
      } else {
        // All gold sources failed — clear the Loading spinner
        const el = $('rc-gold');
        if (el && el.textContent.includes('…')) el.textContent = '\u2014';
        const meta = $('rc-gold-meta');
        if (meta) { meta.textContent = 'Unavailable — retry later'; meta.className = 'rate-card-meta'; }
      }
    }

    // Gold coin in ZiG
    if (goldUsd && zigRate) {
      const el = $('rc-gold-zig');
      if (el) el.textContent = `ZiG ${(goldUsd * zigRate).toLocaleString(undefined, {maximumFractionDigits: 0})}`;
    }

    // IDBZ rates table
    if (idbzOk) {
      renderIdbzTable(idbzRes.value);
    } else {
      const t = $('idbz-rates-table');
      if (t) t.innerHTML = '<p class="rates-no-data">IDBZ data unavailable</p>';
    }

    // Draw sparklines — use live RBZ PDF series if available, else static fallback
    // The history endpoint returns { date, zigUsd, goldCoin } points
    setTimeout(() => {
      if (histLive) {
        const pts = rbzHistory.points;
        drawSparkline('zig-sparkline', pts, '#60a5fa', 'date', 'zigUsd', '', ' ZiG');
        const goldPts = pts.filter(p => p.goldCoin != null);
        if (goldPts.length >= 2) {
          drawSparkline('gold-sparkline', goldPts, '#d4a843', 'date', 'goldCoin', '$', '');
        } else {
          drawSparkline('gold-sparkline', GOLD_DATA.historicalPrices, '#d4a843', 'date', 'usd', '$', '');
        }
        // Update source badge — shows live vs cached state
        const srcEl = $('history-source');
        if (srcEl) {
          const ptCount = rbzHistory.points.length;
          const srcLabel = usingCache
            ? `source: ${rbzHistory.source} (${ptCount} pts, cached)`
            : `source: ${rbzHistory.source} (${ptCount} daily pts)`;
          srcEl.textContent = srcLabel;
          srcEl.className = usingCache ? 'rates-source-tag stale' : 'rates-source-tag live';
        }
      } else {
        drawSparkline('gold-sparkline', GOLD_DATA.historicalPrices, '#d4a843', 'date', 'usd', '$', '');
        drawSparkline('zig-sparkline', ZIG_HISTORY, '#60a5fa', 'date', 'rate', '', ' ZiG');
        // Show fallback state in source badge
        const srcEl = $('history-source');
        if (srcEl) {
          const msg = rbzHistory && rbzHistory.building
            ? 'source: building live history\u2026'
            : 'source: static estimates (PDF history unavailable)';
          srcEl.textContent = msg;
          srcEl.className = 'rates-source-tag stale';
        }
      }
    }, 80);

    // Retry whenever live API data is absent (all API calls failed)
    // — this covers both "no data at all" and "cache only" scenarios
    const liveApiFailed = !liveHistory && zigRes.status === 'rejected' && goldRes.status === 'rejected';
    const allFailed = liveApiFailed && !rbzHistory;

    if (liveApiFailed && _ratesRetryCount < _RATES_MAX_RETRIES) {
      const delay = _RATES_RETRY_DELAYS[_ratesRetryCount] || 30000;
      _ratesRetryCount++;
      if (updatedEl) {
        if (usingCache) {
          updatedEl.textContent = `Cached: ${rbzHistory.latestDate} \u2014 connecting to live API\u2026`;
        } else {
          updatedEl.textContent = `Connecting\u2026 (retry ${_ratesRetryCount}/${_RATES_MAX_RETRIES})`;
        }
      }
      setTimeout(loadRatesData, delay);
    } else {
      _ratesRetryCount = 0;
      if (updatedEl) {
        if (allFailed) {
          updatedEl.textContent = 'Live data unavailable \u2014 using defaults';
        } else if (usingCache) {
          updatedEl.textContent = `Cached: ${rbzHistory.latestDate} \u2014 live API unavailable`;
        } else {
          updatedEl.textContent = `Updated: ${new Date().toLocaleTimeString()}`;
        }
      }
    }
  }

  function renderIdbzTable(data) {
    const container = $('idbz-rates-table');
    if (!container) return;
    const tag = $('idbz-source-tag');
    if (tag) {
      tag.textContent = data.source || '\u2014';
      tag.className = 'rates-source-tag' + (data.source === 'IDBZ (live)' ? ' live' : ' stale');
    }
    if (!data.rates || data.rates.length === 0) {
      container.innerHTML = `<p class="rates-no-data">No rates available \u2014 ${data.source}</p>`;
      return;
    }
    let html = '<table class="rates-table"><thead><tr><th>Currency</th><th>Buying Rate</th><th>Selling Rate</th></tr></thead><tbody>';
    for (const r of data.rates) {
      const buy = r.buying != null ? r.buying.toFixed(4) : '\u2014';
      const sell = r.selling != null ? r.selling.toFixed(4) : '\u2014';
      html += `<tr><td>${r.currency}</td><td>${buy}</td><td>${sell}</td></tr>`;
    }
    html += '</tbody></table>';
    if (data.goldCoin) {
      html += `<p style="font-family:var(--font-mono);font-size:0.72rem;color:var(--accent-gold);margin-top:8px;">
        \u25CF Mosi oa Tunya Gold Coin detected on IDBZ: <strong>$${data.goldCoin.toLocaleString()}</strong></p>`;
    }
    container.innerHTML = html;
  }

  function drawSparkline(canvasId, data, lineColor, labelKey, valueKey, prefix, suffix) {
    const canvas = $(canvasId);
    if (!canvas) return;
    const W = canvas.offsetWidth || 400;
    const H = 120;
    canvas.width = W;
    canvas.height = H;
    const ctx2 = canvas.getContext('2d');
    ctx2.clearRect(0, 0, W, H);

    if (!data || data.length < 2) {
      ctx2.fillStyle = '#666';
      ctx2.font = '12px monospace';
      ctx2.fillText('No data', W / 2 - 25, H / 2);
      return;
    }

    const values = data.map(d => d[valueKey]);
    const minVal = Math.min(...values);
    const maxVal = Math.max(...values);
    const range = maxVal - minVal || 1;

    const pad = { top: 18, right: 16, bottom: 28, left: 54 };
    const cW = W - pad.left - pad.right;
    const cH = H - pad.top - pad.bottom;

    const toX = i => pad.left + (i / (data.length - 1)) * cW;
    const toY = v => pad.top + cH - ((v - minVal) / range) * cH;

    // Gradient fill
    const grad = ctx2.createLinearGradient(0, pad.top, 0, pad.top + cH);
    grad.addColorStop(0, lineColor + '55');
    grad.addColorStop(1, lineColor + '08');
    ctx2.beginPath();
    ctx2.moveTo(toX(0), toY(values[0]));
    for (let i = 1; i < data.length; i++) ctx2.lineTo(toX(i), toY(values[i]));
    ctx2.lineTo(toX(data.length - 1), pad.top + cH);
    ctx2.lineTo(toX(0), pad.top + cH);
    ctx2.closePath();
    ctx2.fillStyle = grad;
    ctx2.fill();

    // Line
    ctx2.beginPath();
    ctx2.moveTo(toX(0), toY(values[0]));
    for (let i = 1; i < data.length; i++) ctx2.lineTo(toX(i), toY(values[i]));
    ctx2.strokeStyle = lineColor;
    ctx2.lineWidth = 2;
    ctx2.lineJoin = 'round';
    ctx2.stroke();

    // Dots at first, last, and event points
    data.forEach((d, i) => {
      if (i === 0 || i === data.length - 1 || d.event) {
        ctx2.beginPath();
        ctx2.arc(toX(i), toY(values[i]), 3.5, 0, Math.PI * 2);
        ctx2.fillStyle = lineColor;
        ctx2.fill();
        // Event label above dot
        if (d.event) {
          ctx2.fillStyle = lineColor;
          ctx2.font = '9px monospace';
          ctx2.textAlign = 'center';
          ctx2.fillText(d.event, toX(i), toY(values[i]) - 7);
        }
      }
    });

    // Y-axis: min / max labels
    ctx2.fillStyle = '#8899aa';
    ctx2.font = '9px monospace';
    ctx2.textAlign = 'right';
    ctx2.fillText(prefix + maxVal.toLocaleString() + suffix, pad.left - 4, pad.top + 9);
    ctx2.fillText(prefix + minVal.toLocaleString() + suffix, pad.left - 4, pad.top + cH + 2);

    // X-axis: first and last date
    ctx2.fillStyle = '#8899aa';
    ctx2.font = '9px monospace';
    ctx2.textAlign = 'left';
    ctx2.fillText(data[0][labelKey], toX(0), H - 6);
    ctx2.textAlign = 'right';
    ctx2.fillText(data[data.length - 1][labelKey], toX(data.length - 1), H - 6);

    // Y-axis line
    ctx2.beginPath();
    ctx2.moveTo(pad.left, pad.top);
    ctx2.lineTo(pad.left, pad.top + cH);
    ctx2.strokeStyle = '#2a3550';
    ctx2.lineWidth = 1;
    ctx2.stroke();
  }

  // ═══════════════════════════════════════════════
  // LIVE DATA — ZiG/USD rate (RBZ) & Gold price (IOBZ)
  // ═══════════════════════════════════════════════
  async function fetchLiveRates() {
    try {
      const [zigRes, goldRes, histRes] = await Promise.allSettled([
        fetch(`${API_BASE}/rates/zig-usd`),
        fetch(`${API_BASE}/rates/gold-coin`),
        fetch(`${API_BASE}/rates/rbz-history`),
      ]);

      // Get PDF-sourced rate for fallback
      let pdfZigRate = null, pdfGoldRate = null, pdfDate = null;
      if (histRes.status === 'fulfilled' && histRes.value.ok) {
        const h = await histRes.value.json();
        if (h && !h.fallback && h.latestZigUsd) {
          pdfZigRate = h.latestZigUsd;
          pdfGoldRate = h.latestGoldCoin;
          pdfDate = h.latestDate;
        }
      }

      let bestZigRate = null, bestZigSource = null;
      if (zigRes.status === 'fulfilled' && zigRes.value.ok) {
        const zigData = await zigRes.value.json();
        if (zigData.rate && zigData.rate > 0) {
          bestZigRate = zigData.rate;
          bestZigSource = zigData.source;
          // Upgrade stale HTML value with authoritative PDF rate if available
          if (zigData.rate <= 13.5 && pdfZigRate && pdfZigRate > 13.5) {
            bestZigRate = pdfZigRate;
            bestZigSource = `RBZ PDF (${pdfDate})`;
          }
        }
      } else if (pdfZigRate) {
        bestZigRate = pdfZigRate;
        bestZigSource = `RBZ PDF (${pdfDate})`;
      }

      if (bestZigRate) {
        simState.zigRate = bestZigRate;
        GOLD_DATA.zigConversion = bestZigRate;
        const zigSelect = $('setting-zig-rate');
        if (zigSelect) {
          // Remove old live option if any
          const old = zigSelect.querySelector('option[data-live="1"]');
          if (old) old.remove();
          const opt = document.createElement('option');
          opt.value = String(bestZigRate);
          opt.dataset.live = '1';
          opt.textContent = `${bestZigRate.toFixed(2)} ZiG/USD — ${bestZigSource}`;
          opt.selected = true;
          zigSelect.insertBefore(opt, zigSelect.firstChild);
        }
        const badge = $('zig-live-badge');
        if (badge) badge.style.display = (bestZigSource && bestZigSource.includes('live') || bestZigSource && bestZigSource.includes('PDF')) ? '' : 'none';
        logTerminal(`ZiG rate: ${bestZigRate.toFixed(4)} ZiG/USD (${bestZigSource})`, 'success', 'log');
      }

      let bestGoldPrice = null, bestGoldSource = null;
      if (goldRes.status === 'fulfilled' && goldRes.value.ok) {
        const goldData = await goldRes.value.json();
        if (goldData.priceUsd && goldData.priceUsd > 0) {
          bestGoldPrice = goldData.priceUsd;
          bestGoldSource = goldData.source;
        }
      }
      // Upgrade stale or missing IOBZ gold value with authoritative RBZ PDF rate
      if (pdfGoldRate && pdfGoldRate > 100) {
        if (!bestGoldPrice || bestGoldPrice < pdfGoldRate * 0.8 || bestGoldPrice > pdfGoldRate * 1.2) {
          bestGoldPrice = pdfGoldRate;
          bestGoldSource = `RBZ PDF (${pdfDate})`;
        }
      }
      if (bestGoldPrice) {
        simState.goldBasePrice = bestGoldPrice;
        GOLD_DATA.currentPrice = bestGoldPrice;
        const goldSelect = $('setting-gold-price');
        if (goldSelect) {
          const old = goldSelect.querySelector('option[data-live="1"]');
          if (old) old.remove();
          const opt = document.createElement('option');
          opt.value = String(bestGoldPrice);
          opt.dataset.live = '1';
          opt.textContent = `$${bestGoldPrice.toLocaleString()} — ${bestGoldSource}`;
          opt.selected = true;
          goldSelect.insertBefore(opt, goldSelect.firstChild);
        }
        const badge = $('gold-live-badge');
        if (badge) badge.style.display = (bestGoldSource && (bestGoldSource.includes('live') || bestGoldSource.includes('PDF'))) ? '' : 'none';
        logTerminal(`Gold price: $${bestGoldPrice.toLocaleString()} (${bestGoldSource})`, 'gold', 'log');
      }
    } catch (err) {
      logTerminal('Live rate fetch unavailable — using defaults.', 'warning', 'log');
    }
  }

  // ═══════════════════════════════════════════════
  // INIT
  // ═══════════════════════════════════════════════
  drawGrid();
  drawAllocChart();
  updateAllocTotal();
  initDragHandle();

  // Apply Stable Growth Baseline as default on load
  applyPreset('stable');

  // Fetch live exchange rate and gold price after a short delay
  setTimeout(fetchLiveRates, 800);

})();
