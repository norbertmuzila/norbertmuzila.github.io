/* ================================================
   PENSION FUND DIGITAL TWIN — ZIMBABWE (Enhanced)
   Full Simulation Engine with ZAPF Competition Features
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
  // SCENARIO PRESETS
  // ═══════════════════════════════════════════════
  const PRESETS = {
    custom: null,
    '2008crisis': {
      name: '2008 Hyperinflation Crisis',
      employeeContrib: 30, employerContrib: 45, payout: 100,
      age: 35, retirement: 60, inflation: 231, // million % but capped for sim
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
    currency: 'USD', projectionYears: 30, inflationModel: 'constant',
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

    // Inner circle (donut hole)
    cx2d.beginPath();
    cx2d.arc(cx, cy, r * 0.55, 0, Math.PI * 2);
    cx2d.fillStyle = '#ffffff';
    cx2d.fill();

    // Center text
    cx2d.fillStyle = '#0f172a';
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
  $('setting-zig-rate').addEventListener('change', () => { simState.zigRate = parseInt($('setting-zig-rate').value); GOLD_DATA.zigConversion = simState.zigRate; });

  // Mode toggle / Pensioner View
  $('btn-scenario').addEventListener('click', () => {
    $('btn-scenario').classList.add('active');
    $('btn-live').classList.remove('active');
    $('pensioner-overlay').classList.remove('open');
  });
  $('btn-live').addEventListener('click', () => {
    $('btn-live').classList.add('active');
    $('btn-scenario').classList.remove('active');
    showPensionerView();
  });
  $('pensioner-close').addEventListener('click', () => {
    $('pensioner-overlay').classList.remove('open');
    $('btn-scenario').classList.add('active');
    $('btn-live').classList.remove('active');
  });
  $('pensioner-overlay').addEventListener('click', e => {
    if (e.target === $('pensioner-overlay')) {
      $('pensioner-overlay').classList.remove('open');
      $('btn-scenario').classList.add('active');
      $('btn-live').classList.remove('active');
    }
  });

  // ═══════════════════════════════════════════════
  // SCENARIO PRESETS
  // ═══════════════════════════════════════════════
  $('preset-select').addEventListener('change', () => {
    const key = $('preset-select').value;
    if (key === 'custom' || !PRESETS[key]) return;
    const p = PRESETS[key];
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
    updateAllocTotal();
    logTerminal(`Loaded preset: ${p.name}`, 'success', 'log');
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

  function computePortfolioReturn(allocation, month) {
    let portfolioReturn = 0;
    Object.values(allocation).forEach(a => {
      // Stochastic return simulation
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
    let goldHoldings = 0; // Track gold allocation in ounces equivalent

    for (let m = 0; m <= months; m++) {
      let currentInflation = inflation;
      if (inflModel === 'volatile') {
        const spike = Math.random() < 0.03 ? (2 + Math.random() * 8) : 1;
        currentInflation = inflation * (0.5 + Math.random()) * spike;
      } else if (inflModel === 'decreasing') {
        currentInflation = inflation * Math.max(0.1, 1 - (m / months) * 0.8);
      } else if (inflModel === 'historical') {
        // Simplified Zimbabwe historical pattern
        const yearInSim = m / 12;
        if (yearInSim < 5) currentInflation = inflation * 0.5;
        else if (yearInSim < 10) currentInflation = inflation * 2;
        else if (yearInSim < 15) currentInflation = inflation * 5;
        else currentInflation = inflation * 0.3; // Post-reform
      }

      // Challenge events
      let challengeMultiplier = 1;
      simState.challengeEvents.forEach(ce => {
        const ceMonth = Math.round(ce.yearFraction * months);
        if (Math.abs(m - ceMonth) < 6) {
          switch (ce.type) {
            case 'hyperinflation': challengeMultiplier *= 3; break;
            case 'currency': challengeMultiplier *= 2; break;
            case 'drought': challengeMultiplier *= 1.5; break;
            case 'policy': challengeMultiplier *= 0.7; break;
            case 'demographic': challengeMultiplier *= 1.3; break;
            case 'gold_surge': challengeMultiplier *= 0.6; break; // Gold hedge helps
          }
        }
      });

      cumulativeInflation *= (1 + (currentInflation * challengeMultiplier) / 12);
      const portfolioReturn = computePortfolioReturn(allocation, m);

      // Gold tracking
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

      // IPEC Funding ratio (simplified: assets / liabilities)
      const targetLiability = monthlyPayout * 12 * Math.max(0, lifeExp - currentAge - m/12);
      const fundingRatio = targetLiability > 0 ? (balance / targetLiability) * 100 : 0;

      data.push({
        month: m, year: m/12, balance, realBalance: balance / cumulativeInflation,
        inflation: currentInflation * challengeMultiplier,
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
    bg.addColorStop(0, '#ffffff'); bg.addColorStop(1, '#f1f5f9');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = 'rgba(15,23,42,0.06)'; ctx.lineWidth = 1;
    for (let x = P.left; x < w - P.right; x += 40) { ctx.beginPath(); ctx.moveTo(x, P.top); ctx.lineTo(x, h - P.bottom); ctx.stroke(); }
    for (let y = P.top; y < h - P.bottom; y += 40) { ctx.beginPath(); ctx.moveTo(P.left, y); ctx.lineTo(w - P.right, y); ctx.stroke(); }

    ctx.strokeStyle = 'rgba(15,23,42,0.2)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(P.left, P.top); ctx.lineTo(P.left, h - P.bottom); ctx.lineTo(w - P.right, h - P.bottom); ctx.stroke();

    ctx.fillStyle = '#64748b'; ctx.font = '10px "JetBrains Mono"'; ctx.textAlign = 'center';
    ctx.fillText('Years →', w/2, h - P.bottom + 35);
    ctx.save(); ctx.translate(16, h/2); ctx.rotate(-Math.PI/2); ctx.fillText('Fund Balance →', 0, 0); ctx.restore();
    ctx.fillStyle = '#0f172a'; ctx.font = '600 12px "Plus Jakarta Sans"'; ctx.textAlign = 'center';
    ctx.fillText('Pension Fund Projection — Zimbabwe', w/2, 26);
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

    // X labels
    ctx.fillStyle = '#64748b'; ctx.font = '9px "JetBrains Mono"'; ctx.textAlign = 'center';
    const yrs = totalM/12, yStp = yrs <= 20 ? 2 : yrs <= 40 ? 5 : 10;
    for (let y = 0; y <= yrs; y += yStp) { ctx.fillText(`${y}y`, xS(y*12), h - P.bottom + 15); }

    // Y labels
    const bStp = getBalanceStep(maxBal);
    for (let b = 0; b <= maxBal; b += bStp) {
      ctx.fillStyle = '#64748b'; ctx.font = '9px "JetBrains Mono"'; ctx.textAlign = 'right';
      ctx.fillText(formatCompact(b), P.left - 8, yS(b) + 3);
    }

    // Retirement line
    const retM = data.findIndex(d => d.phase === 'drawdown');
    if (retM > 0 && retM < stepCount) {
      const rx = xS(retM);
      ctx.strokeStyle = 'rgba(217,119,6,0.4)'; ctx.lineWidth = 1.5; ctx.setLineDash([5,3]);
      ctx.beginPath(); ctx.moveTo(rx, P.top); ctx.lineTo(rx, h - P.bottom); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = '#d97706'; ctx.font = '600 9px "JetBrains Mono"'; ctx.textAlign = 'center';
      ctx.fillText('RETIREMENT', rx, P.top - 6);
    }

    // Longevity markers
    const lifeExp = parseInt(sliders.lifeExpectancy.value);
    const uncert = parseInt(sliders.longevityUncertainty.value);
    const curAge = parseInt(sliders.age.value);
    const lifeMonth = (lifeExp - curAge) * 12;
    const lifeMinMonth = (lifeExp - uncert - curAge) * 12;
    const lifeMaxMonth = (lifeExp + uncert - curAge) * 12;
    if (lifeMonth > 0 && lifeMonth < totalM) {
      // Longevity band
      const lx1 = xS(Math.max(0, lifeMinMonth)), lx2 = xS(Math.min(totalM, lifeMaxMonth));
      ctx.fillStyle = 'rgba(124,58,237,0.06)'; ctx.fillRect(lx1, P.top, lx2 - lx1, cH);
      const lx = xS(lifeMonth);
      ctx.strokeStyle = 'rgba(124,58,237,0.35)'; ctx.lineWidth = 1; ctx.setLineDash([3,3]);
      ctx.beginPath(); ctx.moveTo(lx, P.top); ctx.lineTo(lx, h - P.bottom); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = '#7c3aed'; ctx.font = '600 8px "JetBrains Mono"'; ctx.fillText('LIFE EXP.', lx, P.top - 6);
    }

    // Area fill
    ctx.beginPath(); ctx.moveTo(xS(0), yS(0));
    for (let i = 0; i < Math.min(stepCount, data.length); i++) ctx.lineTo(xS(data[i].month), yS(data[i].balance));
    const lD = Math.min(stepCount, data.length) - 1;
    ctx.lineTo(xS(data[lD].month), yS(0)); ctx.closePath();
    const aG = ctx.createLinearGradient(0, P.top, 0, h - P.bottom);
    aG.addColorStop(0, 'rgba(30,64,175,0.12)'); aG.addColorStop(1, 'rgba(30,64,175,0.01)');
    ctx.fillStyle = aG; ctx.fill();

    // Nominal line
    ctx.beginPath();
    for (let i = 0; i < Math.min(stepCount, data.length); i++) {
      const x = xS(data[i].month), y = yS(data[i].balance);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.strokeStyle = '#1e40af'; ctx.lineWidth = 2.5; ctx.shadowColor = 'rgba(30,64,175,0.3)'; ctx.shadowBlur = 4;
    ctx.stroke(); ctx.shadowBlur = 0;

    // Real balance line
    ctx.beginPath();
    for (let i = 0; i < Math.min(stepCount, data.length); i++) {
      const x = xS(data[i].month), y = yS(data[i].realBalance);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.strokeStyle = '#059669'; ctx.lineWidth = 1.5; ctx.setLineDash([4,3]); ctx.stroke(); ctx.setLineDash([]);

    // Gold value line
    const maxGold = Math.max(...data.slice(0, Math.min(stepCount, data.length)).map(d => d.goldValue || 0), 1);
    if (maxGold > 10) {
      ctx.beginPath();
      for (let i = 0; i < Math.min(stepCount, data.length); i++) {
        const x = xS(data[i].month), y = yS((data[i].goldValue / maxGold) * maxBal * 0.3);
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.strokeStyle = '#d4a843'; ctx.lineWidth = 1.2; ctx.setLineDash([2,3]); ctx.stroke(); ctx.setLineDash([]);
    }

    // Legend
    const lX = w - P.right - 190, lY = P.top + 6;
    ctx.fillStyle = 'rgba(255,255,255,0.92)'; ctx.strokeStyle = 'rgba(15,23,42,0.1)'; ctx.lineWidth = 1;
    roundRect(ctx, lX, lY, 180, 62, 6); ctx.fill(); ctx.stroke();
    ctx.font = '9px "JetBrains Mono"'; ctx.textAlign = 'left';
    const legs = [
      { color: '#1e40af', dash: false, label: 'Nominal Balance' },
      { color: '#059669', dash: true, label: 'Real (inflation-adj)' },
      { color: '#b8860b', dash: true, label: 'Gold Allocation Value' },
    ];
    legs.forEach((l, i) => {
      const ly = lY + 14 + i * 16;
      ctx.strokeStyle = l.color; ctx.lineWidth = l.dash ? 1.5 : 2;
      if (l.dash) ctx.setLineDash([4,3]); else ctx.setLineDash([]);
      ctx.beginPath(); ctx.moveTo(lX + 8, ly); ctx.lineTo(lX + 28, ly); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = '#94a3b8'; ctx.fillText(l.label, lX + 34, ly + 3);
    });

    // Challenge markers
    simState.challengeEvents.forEach(ce => {
      const ceM = Math.round(ce.yearFraction * totalM);
      if (ceM < stepCount && ceM < data.length) {
        const cx2 = xS(ceM), cy2 = yS(data[ceM].balance);
        ctx.beginPath(); ctx.arc(cx2, cy2, 5, 0, Math.PI * 2);
        ctx.fillStyle = getChallengeColor(ce.type); ctx.fill();
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; ctx.stroke();
        ctx.fillStyle = getChallengeColor(ce.type);
        ctx.font = '600 8px "JetBrains Mono"'; ctx.textAlign = 'center';
        ctx.fillText(getChallengeLabel(ce.type), cx2, cy2 - 12);
      }
    });

    // Animated dot
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
    if (simState.challengeEvents.length > 0) {
      logTerminal(`Active challenges: ${simState.challengeEvents.map(c => getChallengeLabel(c.type)).join(', ')}`, 'warning', 'log');
    }

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

    // Log tab
    logTerminal('══════════════════════════════════', 'info', 'log');
    logTerminal('SIMULATION COMPLETE', 'success', 'log');
    logTerminal(`Peak Balance: ${fmtCur(peak)}`, 'data', 'log');
    logTerminal(`Final Nominal: ${fmtCur(final.balance)} | Real: ${fmtCur(final.realBalance)}`, 'data', 'log');
    logTerminal(`Gold Holdings: ${final.goldHoldings.toFixed(4)} oz (${fmtCur(final.goldValue)})`, 'gold', 'log');
    if (depPt > 0) logTerminal(`⚠ FUND DEPLETED at year ${ytd}`, 'error', 'log');
    else logTerminal('✓ Fund solvent through projection period.', 'success', 'log');

    // IPEC tab
    generateIPECReport(data, minFundingReq, replRatio, depPt);

    // Strategy tab
    generateRecommendations(data, depPt, peak, final);

    // IPEC badge
    updateIPECBadge(data, minFundingReq);
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
    document.querySelectorAll('.challenge-marker').forEach(el => el.remove());
    $('status-balance').textContent = '$0'; $('status-payout').textContent = '$0';
    $('status-inflation').textContent = '0%'; $('status-depletion').textContent = '—';
    $('status-funding-ratio').textContent = '—';
    setStatus('Idle', 'status-idle');
    $('ipec-badge').className = 'ipec-badge'; $('ipec-status-text').textContent = 'IPEC: —';
    drawGrid();
    logTerminal('Scenario reset.', 'info', 'log');
  }

  $('btn-run').addEventListener('click', startSimulation);
  $('btn-stop').addEventListener('click', stopSimulation);
  $('btn-reset').addEventListener('click', resetSimulation);

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

    addTermLine(term, '⚖️ IPEC COMPLIANCE ASSESSMENT', 'ipec');
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
    if (depPt > 0) addTermLine(term, `⚠ WARNING: Fund depletes at year ${(depPt/12).toFixed(1)} — fails sustainability test`, 'error');
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

    addTermLine(term, '💡 STRATEGIC RECOMMENDATIONS', 'success');
    addTermLine(term, '────────────────────────────────', 'info');

    // Contribution analysis
    if (empContrib + erContrib < 150) {
      addTermLine(term, `📈 INCREASE CONTRIBUTIONS: Total $${empContrib + erContrib}/mo is below recommended. Target ≥$150/mo combined.`, 'warning');
      addTermLine(term, `   → Advocate for employer match increase under Pension & Provident Funds Act`, 'info');
    }

    // Inflation hedging
    if (inflation > 50 && goldAlloc < 15) {
      addTermLine(term, `🪙 GOLD HEDGE: With ${inflation}% inflation, increase Mosi oa Tunya Gold allocation from ${goldAlloc}% to 15-20%.`, 'gold');
      addTermLine(term, `   → Gold coins preserve purchasing power per RBZ Exchange Control Directive`, 'info');
    }

    // Asset allocation advice
    if (equityAlloc > 60) addTermLine(term, `⚠ DIVERSIFY: ${equityAlloc}% equities exceeds IPEC prudential limit. Consider rebalancing.`, 'warning');
    if (cashAlloc > 30 && inflation > 10) addTermLine(term, `📉 REDUCE CASH: ${cashAlloc}% in money market losing value at ${inflation}% inflation. Shift to inflation-linked bonds.`, 'warning');

    // Fund depletion
    if (depPt > 0) {
      addTermLine(term, '', 'info');
      addTermLine(term, '🚨 CRITICAL: FUND DEPLETION RISK', 'error');
      addTermLine(term, `   Solution 1: Reduce monthly payout from $${payout} to $${Math.round(payout * 0.6)}`, 'info');
      addTermLine(term, `   Solution 2: Extend working years (delay retirement by 3-5 years)`, 'info');
      addTermLine(term, `   Solution 3: Implement annuity-based drawdown (IPEC Directive 2/2020)`, 'info');
      addTermLine(term, `   Solution 4: Increase gold allocation as inflation hedge`, 'gold');
    } else {
      addTermLine(term, '', 'info');
      addTermLine(term, '✅ Fund is sustainable — consider these optimizations:', 'success');
    }

    // Zimbabwe-specific
    addTermLine(term, '', 'info');
    addTermLine(term, '🇿🇼 ZIMBABWE-SPECIFIC STRATEGIES:', 'ipec');
    addTermLine(term, `   • Multi-currency strategy (USD/ZiG/Gold) mitigates FX risk`, 'info');
    addTermLine(term, `   • Mosi oa Tunya Gold coins: LBMA-pegged store of value`, 'gold');
    addTermLine(term, `   • Regional diversification: invest in SADC pension markets`, 'info');
    addTermLine(term, `   • Lobby IPEC for inflation-indexed annuity regulations`, 'info');
    addTermLine(term, `   • Digital pension tracking via mobile to rebuild trust`, 'info');
  }

  // ═══════════════════════════════════════════════
  // PENSIONER TRANSPARENCY VIEW
  // ═══════════════════════════════════════════════
  function showPensionerView() {
    const data = simState.projectionData;
    const hasData = data.length > 0;
    const retM = hasData ? data.findIndex(d => d.phase === 'drawdown') : -1;

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
        $('p-health').textContent = '⚠️ At Risk';
        $('p-health-advice').textContent = 'Your fund may not last through retirement. See tips below.';
        healthCard.className = 'pensioner-card red';
      } else if (depPt > 0) {
        $('p-health').textContent = '⚡ Fair';
        $('p-health-advice').textContent = 'Your fund has limited runway. Consider increasing savings.';
        healthCard.className = 'pensioner-card orange';
      } else {
        $('p-health').textContent = '✅ Healthy';
        $('p-health-advice').textContent = 'Your pension fund is on a sustainable path.';
        healthCard.className = 'pensioner-card green';
      }

      // Tips
      const tips = [];
      tips.push('Save consistently — even small increases to monthly contributions compound over decades');
      if (depPt > 0) tips.push('Ask your employer about increasing their contribution match');
      tips.push(`Your pension is partly backed by gold (Mosi oa Tunya) — this protects against inflation`);
      tips.push('Consider delaying retirement by 2-3 years for significantly higher monthly income');
      if (parseFloat(sliders.inflation.value) > 50) tips.push('High inflation is eroding your savings — talk to your fund about inflation-protected investments');
      tips.push('You can check your pension balance anytime through IPEC-registered fund administrators');
      $('p-tips-list').innerHTML = tips.map(t => `<li>${t}</li>`).join('');
    }

    $('pensioner-overlay').classList.add('open');
  }

  // ═══════════════════════════════════════════════
  // CANVAS CLICK → CHALLENGE EVENTS
  // ═══════════════════════════════════════════════
  canvas.addEventListener('click', e => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left, y = e.clientY - rect.top;
    const cW = canvas.width - P.left - P.right;
    if (x < P.left || x > canvas.width - P.right || y < P.top || y > canvas.height - P.bottom) return;
    const yearFraction = (x - P.left) / cW;
    const type = $('select-challenge').value;
    simState.challengeEvents.push({ yearFraction, type, x, y });
    logTerminal(`Challenge: ${getChallengeLabel(type)} at year ${(yearFraction * simState.projectionYears).toFixed(1)}`, 'warning', 'log');
    const marker = document.createElement('div');
    marker.className = 'challenge-marker';
    marker.style.cssText = `left:${e.clientX - rect.left - 30}px; top:${e.clientY - rect.top - 22}px; background:${getChallengeColor(type)}22; color:${getChallengeColor(type)}; border:1px solid ${getChallengeColor(type)}55;`;
    marker.textContent = getChallengeLabel(type);
    $('right-panel').appendChild(marker);
    if (simState.projectionData.length > 0 && !simState.running) {
      simState.projectionData = computeProjection();
      drawProjection(simState.projectionData, simState.projectionData.length);
    }
  });

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
  // INIT
  // ═══════════════════════════════════════════════
  drawGrid();
  drawAllocChart();
  updateAllocTotal();

})();
