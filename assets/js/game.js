/* ==========================================================================
   Gardening — Garden Game
   Pick a plant, mix soil, water day by day, see who survives 21 days.
   ========================================================================== */
(function () {
  "use strict";

  const PLANTS = [
    { id: "tomato",   name: "Tomato",       image: "assets/images/tomato.jpg",             every: 1,  water: "Daily",          soil: { loam: 50, compost: 40, drainage: 10 }, tip: "A hungry, thirsty crop. Rich soil and a daily drink keep it happy." },
    { id: "mint",     name: "Mint",         image: "assets/images/mint.jpg",               every: 1,  water: "Daily",          soil: { loam: 45, compost: 45, drainage: 10 }, tip: "Mint loves damp, fertile soil. It forgives a lot — except drought." },
    { id: "fern",     name: "Boston fern",  image: "assets/images/boston-fern.png",        every: 1,  water: "Daily",          soil: { loam: 40, compost: 50, drainage: 10 }, tip: "Needs steady moisture and humus-rich soil, but never a swamp." },
    { id: "monstera", name: "Monstera",     image: "assets/images/monstera.jpg",           every: 3,  water: "Every 3 days",   soil: { loam: 40, compost: 40, drainage: 20 }, tip: "Rich soil with a little drainage. Let the top inch dry between drinks." },
    { id: "snake",    name: "Snake plant",  image: "assets/images/snake-plant.jpg",        every: 7,  water: "Weekly",         soil: { loam: 40, compost: 15, drainage: 45 }, tip: "Gritty, fast-draining soil. Too much water is its undoing." },
    { id: "lavender", name: "Lavender",     image: "assets/images/lavender.jpg",           every: 7,  water: "Weekly",         soil: { loam: 30, compost: 10, drainage: 60 }, tip: "Loves lean, sharp, well-drained soil and dry spells." },
    { id: "aloe",     name: "Aloe vera",    image: "assets/images/aloe-vera.png",          every: 14, water: "Every 2 weeks",  soil: { loam: 25, compost: 15, drainage: 60 }, tip: "Let the soil dry out completely before watering again." },
    { id: "bougainvillea", name: "Bougainvillea", image: "assets/images/bougainvillea.jpg", every: 3, water: "Every 3 days", soil: { loam: 45, compost: 10, drainage: 45 }, tip: "Loves sun and lean, sharp-draining soil — too much compost gives leaves instead of flowers." }
  ];

  const WEATHER = [
    { id: "sunny",  name: "Sunny",     icon: "☀️", delta: 0,   weight: 45 },
    { id: "cloudy", name: "Cloudy",    icon: "⛅", delta: -4,  weight: 25 },
    { id: "rainy",  name: "Rainy",     icon: "🌧️", delta: 18,  weight: 18 },
    { id: "heat",   name: "Heatwave",  icon: "🔥", delta: -14, weight: 12 }
  ];

  const BADGES = [
    { id: "first",  icon: "🌱", label: "First Sprout" },
    { id: "water",  icon: "💧", label: "Water Wizard" },
    { id: "rain",   icon: "🌧️", label: "Rain Dancer" },
    { id: "green",  icon: "🌿", label: "Green Thumb" },
    { id: "dry",    icon: "🌵", label: "Dry-Root Pro" },
    { id: "master", icon: "🏆", label: "Master Gardener" }
  ];

  const TOTAL_DAYS = 21;
  const KEYS = ["loam", "compost", "drainage"];
  const $ = (sel) => document.querySelector(sel);
  const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
  function sound(name) {
    const s = window.GameSound;
    if (s && typeof s[name] === "function") s[name]();
  }

  const state = {
    selectedPlot: 0,
    view: 0,
    selectedPlant: null,
    mix: { loam: 40, compost: 30, drainage: 30 },
    plots: [null, null, null],
    finished: false,
    diary: [],
    badges: {},
    waterCount: 0
  };

  const els = {
    plots: $("#plots"),
    plotTabs: $("#plotTabs"),
    picker: $("#plantPicker"),
    plantTip: $("#plantTip"),
    dayCount: $("#dayCount"),
    daySub: $("#daySub"),
    hint: $("#gameHint"),
    result: $("#result"),
    plantBtn: $("#plantBtn"),
    waterBtn: $("#waterBtn"),
    skipBtn: $("#skipBtn"),
    skipDays: $("#skipDays"),
    skipManyBtn: $("#skipManyBtn"),
    weekBtn: $("#weekBtn"),
    resetBtn: $("#resetBtn"),
    soundBtn: $("#soundBtn"),
    balancedBtn: $("#balancedBtn"),
    weatherIcon: $("#weatherIcon"),
    weatherName: $("#weatherName"),
    timeline: $("#gameTimeline"),
    diary: $("#diaryList"),
    badges: $("#badgeList")
  };

  if (!els.plots || !els.picker) return;

  /* ---------- helpers ---------- */
  function findPlant(id) { return PLANTS.find((p) => p.id === id); }

  function moistureBand(every) {
    if (every === 1) return [50, 100];
    if (every === 3) return [30, 78];
    if (every === 7) return [15, 55];
    return [5, 38];
  }

  function soilMismatch(mix, ideal) {
    return KEYS.reduce((sum, k) => sum + Math.abs(mix[k] - ideal[k]), 0) / 2;
  }

  function say(message) { els.hint.textContent = message; }

  function selectedPlotData() { return state.plots[state.selectedPlot]; }

  function esc(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[c]));
  }

  function rollWeather() {
    const total = WEATHER.reduce((sum, w) => sum + w.weight, 0);
    let r = Math.random() * total;
    for (const w of WEATHER) { r -= w.weight; if (r <= 0) return w; }
    return WEATHER[0];
  }

  function log(icon, text, plot) {
    state.diary.unshift({
      day: plot ? plot.day : 0,
      plot: plot ? state.plots.indexOf(plot) + 1 : null,
      icon: icon,
      text: text
    });
    if (state.diary.length > 12) state.diary.pop();
  }

  function earn(id) {
    if (state.badges[id]) return;
    const badge = BADGES.find((b) => b.id === id);
    if (!badge) return;
    state.badges[id] = true;
    log(badge.icon, `Badge unlocked: ${badge.label}`);
    sound("select");
  }

  function growthStage(p) {
    if (!p) return "";
    if (p.dead) return "Gone";
    if (p.day >= TOTAL_DAYS) return "Blooming";
    if (p.day >= 14) return "Mature";
    if (p.day >= 7) return "Growing";
    if (p.day >= 3) return "Sprout";
    return "Seed";
  }

  function animatePlot(cls) {
    const el = els.plots.querySelector(".plot.is-active") || els.plots.querySelector(".plot");
    if (!el) return;
    el.classList.add(cls);
    window.setTimeout(() => el.classList.remove(cls), 950);
  }

  function syncDayCounter() {
    const p = selectedPlotData();
    els.dayCount.textContent = String(state.selectedPlot + 1);
    if (els.daySub) {
      els.daySub.textContent = p ? `day ${p.day} of ${TOTAL_DAYS}` : "empty";
    }
    if (els.dayCount.parentElement) {
      els.dayCount.parentElement.setAttribute(
        "aria-label",
        p ? `Plot ${state.selectedPlot + 1}, day ${p.day} of ${TOTAL_DAYS}`
          : `Plot ${state.selectedPlot + 1}, empty`
      );
    }
  }

  /* ---------- plant picker ---------- */
  function buildPicker() {
    els.picker.innerHTML = PLANTS.map((p) => `
      <button class="plant-option" type="button" data-id="${p.id}" aria-pressed="false">
        <span class="plant-option__top">
          <img class="plant-option__img" src="${p.image}" alt="" loading="lazy">
          <b>${p.name}</b>
        </span>
        <small>💧 ${p.water}</small>
        <small>🪴 ${p.soil.loam}% loam · ${p.soil.compost}% compost · ${p.soil.drainage}% drainage</small>
      </button>`).join("");

    els.picker.addEventListener("click", (e) => {
      const btn = e.target.closest(".plant-option");
      if (!btn) return;
      state.selectedPlant = btn.dataset.id;
      els.picker.querySelectorAll(".plant-option").forEach((el) => {
        el.setAttribute("aria-pressed", String(el === btn));
      });
      const plant = findPlant(state.selectedPlant);
      els.plantTip.textContent = plant.tip;
      sound("select");
      say(`${plant.name} selected. Mix the soil, then plant it.`);
    });
  }

  /* ---------- soil sliders ---------- */
  function syncMixUI() {
    KEYS.forEach((k) => {
      const slider = document.getElementById(k);
      if (slider) slider.value = state.mix[k];
      const out = document.getElementById(k + "Val");
      if (out) out.value = state.mix[k] + "%";
      const bar = document.getElementById("bar" + k.charAt(0).toUpperCase() + k.slice(1));
      if (bar) bar.style.width = state.mix[k] + "%";
    });
  }

  function setMix(changed, raw) {
    const value = clamp(Math.round(Number(raw) / 10) * 10, 0, 100);
    const others = KEYS.filter((k) => k !== changed);
    const remaining = 100 - value;
    const sumOthers = others.reduce((s, k) => s + state.mix[k], 0);
    let first;
    if (sumOthers === 0) {
      first = Math.round(remaining / 2 / 10) * 10;
    } else {
      first = Math.round((remaining * state.mix[others[0]] / sumOthers) / 10) * 10;
    }
    first = clamp(first, 0, remaining);
    state.mix[changed] = value;
    state.mix[others[0]] = first;
    state.mix[others[1]] = remaining - first;
    syncMixUI();
  }

  function bindSoil() {
    KEYS.forEach((k) => {
      const slider = document.getElementById(k);
      if (slider) slider.addEventListener("input", (e) => setMix(k, e.target.value));
    });
    els.balancedBtn.addEventListener("click", () => {
      state.mix = { loam: 40, compost: 30, drainage: 30 };
      syncMixUI();
      say("Balanced mix ready — good for many houseplants.");
    });
    syncMixUI();
  }

  /* ---------- plots ---------- */
  function plotStatus(p) {
    if (p.dead) return "Gone 🥀";
    const [lo, hi] = moistureBand(p.plant.every);
    if (p.moisture > hi + 12) return "Too soggy 💧";
    if (p.moisture < lo - 8) return "Thirsty 🌵";
    if (p.mismatch > 25) return "Soil is off 🪴";
    if (p.health >= 80) return "Happy 🌿";
    if (p.health >= 50) return "Hanging on 🌱";
    return "Struggling ⚠️";
  }

  function renderTabs() {
    const tabs = [0, 1, 2].map((i) => `
      <button class="plot-tab" type="button" data-view="${i}" aria-pressed="${state.view === i}">
        Plot ${i + 1}${state.plots[i]
          ? ` · ${state.plots[i].plant.name} · ${state.plots[i].day}/${TOTAL_DAYS}d`
          : ""}
      </button>`).join("");
    els.plotTabs.innerHTML = tabs + `
      <button class="plot-tab" type="button" data-view="all" aria-pressed="${state.view === "all"}">All pots</button>`;
  }

  function renderPlots() {
    const shown = state.plots
      .map((p, i) => ({ p, i }))
      .filter(({ i }) => state.view === "all" || i === state.view);

    els.plots.className = state.view === "all" ? "plot-grid" : "plot-grid is-single";
    els.plots.innerHTML = shown.map(({ p, i }) => {
      const active = i === state.selectedPlot ? " is-active" : "";
      const planted = Boolean(p);
      const growth = planted
        ? (p.dead ? .72 : .55 + .45 * (Math.min(p.day, TOTAL_DAYS) / TOTAL_DAYS) * (p.health / 100))
        : .62;
      const visual = planted
        ? `<img class="plot__photo${p.dead ? " is-dead" : ""}" src="${p.plant.image}" alt="${p.plant.name}" style="--growth:${growth.toFixed(2)}" loading="lazy">`
        : `<span class="plot__plant" style="--growth:.62" aria-hidden="true">🌱</span>`;
      const bars = planted ? `
        <div class="plot__bars">
          <span class="meter">Health<i style="--level:${Math.round(p.health)}%;--meter-color:${p.health > 55 ? "#66b8b0" : "#dda675"}"></i></span>
          <span class="meter">Water<i style="--level:${Math.round(p.moisture)}%;--meter-color:#82c6d0"></i></span>
        </div>` : "";
      return `
        <div class="plot${active}" data-plot="${i}">
          <span class="plot__name">Plot ${i + 1}</span>
          <span class="plot__stage">
            ${visual}
            <span class="plot__soil"></span>
          </span>
          <span class="plot__status">${planted ? plotStatus(p) : "Empty pot"}</span>
          <span class="plot__meta">${planted ? `${p.plant.name} · day ${p.day}/${TOTAL_DAYS} · ${growthStage(p)}` : "Ready for a plant"}</span>
          ${bars}
          ${planted ? `<button class="plot__clear" type="button" data-clear="${i}" aria-label="Clear plot ${i + 1}">×</button>` : ""}
        </div>`;
    }).join("");

    els.plantBtn.textContent = `Plant in plot ${state.selectedPlot + 1}`;
    els.waterBtn.textContent = `💧 Water plot ${state.selectedPlot + 1} only`;
    syncDayCounter();
    renderTabs();
    renderWeather();
    renderTimeline();
    renderDiary();
    renderBadges();
  }

  function renderWeather() {
    const p = selectedPlotData();
    const last = p && p.weatherLog && p.weatherLog.length
      ? WEATHER.find((w) => w.id === p.weatherLog[p.weatherLog.length - 1])
      : null;
    if (els.weatherIcon) els.weatherIcon.textContent = last ? last.icon : "🌤️";
    if (els.weatherName) els.weatherName.textContent = last ? last.name : "A fine day";
  }

  function renderTimeline() {
    if (!els.timeline) return;
    const p = selectedPlotData();
    let html = "";
    for (let i = 1; i <= TOTAL_DAYS; i++) {
      const done = p && p.day >= i;
      const today = p && p.day + 1 === i;
      const id = p && p.weatherLog && p.weatherLog[i - 1];
      const w = id ? WEATHER.find((x) => x.id === id) : null;
      html += `<i class="${done ? "done" : ""} ${today ? "today" : ""}" title="Day ${i}">${w ? w.icon : ""}</i>`;
    }
    els.timeline.innerHTML = html;
  }

  function renderDiary() {
    if (!els.diary) return;
    els.diary.innerHTML = state.diary.length
      ? state.diary.map((e) => `<li><b>Day ${e.day}${e.plot ? " · Plot " + e.plot : ""}</b><span>${e.icon} ${esc(e.text)}</span></li>`).join("")
      : '<li><b>—</b><span>Your garden diary begins when you plant something.</span></li>';
  }

  function renderBadges() {
    if (!els.badges) return;
    els.badges.innerHTML = BADGES.map((b) => `
      <span class="game-badge${state.badges[b.id] ? " is-earned" : ""}" title="${b.label}">${b.icon} ${b.label}</span>
    `).join("");
  }

  function selectPlot(i) {
    state.selectedPlot = i;
    state.view = i;
    renderPlots();
    const p = state.plots[i];
    say(p ? `Plot ${i + 1} has ${p.plant.name}. Watering now affects this pot only.` : "");
  }

  function bindPlots() {
    els.plotTabs.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-view]");
      if (!btn) return;
      sound("click");
      if (btn.dataset.view === "all") {
        state.view = "all";
        renderPlots();
        say("All pots shown. Watering still goes to the selected plot only.");
      } else {
        selectPlot(Number(btn.dataset.view));
      }
    });
    els.plots.addEventListener("click", (e) => {
      const clear = e.target.closest("[data-clear]");
      if (clear) {
        e.stopPropagation();
        state.plots[Number(clear.dataset.clear)] = null;
        state.finished = false;
        els.result.hidden = true;
        els.result.innerHTML = "";
        sound("click");
        renderPlots();
        say("Pot cleared. Ready for something new.");
        return;
      }
      const plot = e.target.closest("[data-plot]");
      if (plot) selectPlot(Number(plot.dataset.plot));
    });
    els.plots.addEventListener("keydown", (e) => {
      if (e.key !== "Enter" && e.key !== " ") return;
      const plot = e.target.closest("[data-plot]");
      if (plot) { e.preventDefault(); selectPlot(Number(plot.dataset.plot)); }
    });
  }

  /* ---------- planting ---------- */
  function plantIt() {
    if (!state.selectedPlant) { say("Pick a plant first — then give it a home."); return; }
    if (state.plots[state.selectedPlot]) { say("That pot is taken. Choose an empty pot or clear it first."); return; }
    const plant = findPlant(state.selectedPlant);
    state.plots[state.selectedPlot] = {
      plant: plant,
      mix: { ...state.mix },
      mismatch: soilMismatch(state.mix, plant.soil),
      health: 100,
      moisture: 20,
      day: 0,
      dead: false,
      weatherLog: []
    };
    state.view = state.selectedPlot;
    state.finished = false;
    els.result.hidden = true;
    els.result.innerHTML = "";
    sound("plant");
    log("🌱", `${plant.name} found a home in plot ${state.selectedPlot + 1}.`, state.plots[state.selectedPlot]);
    earn("first");
    renderPlots();
    say(`${plant.name} planted in plot ${state.selectedPlot + 1}. Water now feeds this pot only.`);
  }

  /* ---------- simulation ---------- */
  function simulatePlotDay(p, watered, weather) {
    if (!p || p.dead) return;
    p.moisture = clamp(p.moisture + (watered ? 45 : -30) + weather.delta, 0, 100);
    if (!p.weatherLog) p.weatherLog = [];
    p.weatherLog.push(weather.id);
    if (p.weatherLog.length > TOTAL_DAYS) p.weatherLog.shift();

      const [lo, hi] = moistureBand(p.plant.every);
      let stress = 0;
      if (p.moisture > hi) stress += (p.moisture - hi) / 12;
      if (p.moisture < lo) stress += (lo - p.moisture) / 10;

      const idealDrainage = p.plant.soil.drainage;
      if (p.mix.drainage < idealDrainage - 15 && p.moisture > hi) stress *= 1.6;
      if (p.mix.drainage > idealDrainage + 15 && p.moisture < lo) stress *= 1.4;

      stress += p.mismatch / 30;

      if (stress < .5) p.health = clamp(p.health + 2.5, 0, 100);
      else if (stress < 1) p.health = clamp(p.health + .5, 0, 100);
      else p.health = clamp(p.health - Math.min(25, stress * 1.2), 0, 100);

      if (p.health <= 0) {
        p.dead = true;
        sound("fail");
      }
  }

  function allDone() {
    const planted = state.plots.filter(Boolean);
    return planted.length > 0 && planted.every((p) => p.day >= TOTAL_DAYS);
  }

  function advance(days, watered) {
    const p = selectedPlotData();
    if (!p) { say(`Plot ${state.selectedPlot + 1} is empty. Plant something there first.`); return; }
    if (p.day >= TOTAL_DAYS) {
      say(`Plot ${state.selectedPlot + 1} has finished its ${TOTAL_DAYS} days. Pick another plot.`);
      return;
    }

    sound(watered ? "water" : "skip");
    if (watered) {
      state.waterCount += 1;
      if (state.waterCount >= 5) earn("water");
    }

    const count = clamp(Math.round(Number(days) || 1), 1, TOTAL_DAYS - p.day);
    let stepped = 0;
    let lastWeather = WEATHER[0];
    for (let i = 0; i < count && p.day < TOTAL_DAYS; i++) {
      p.day += 1;
      const wasDead = p.dead;
      lastWeather = rollWeather();
      simulatePlotDay(p, watered && i === 0, lastWeather);
      log(lastWeather.icon, `${lastWeather.name} weather over plot ${state.selectedPlot + 1}.`, p);
      if (lastWeather.id === "rainy") earn("rain");
      if (!wasDead && p.dead) log("🥀", `${p.plant.name} did not make it.`, p);
      else if (!p.dead && p.health >= 95 && p.day >= 10) earn("green");
      stepped += 1;
    }

    animatePlot(watered ? "is-watering" : (lastWeather.id === "rainy" ? "is-rainy" : "is-sunny"));
    if (!p.dead && p.health >= 90 && Math.random() < .35) {
      window.setTimeout(() => animatePlot("is-sparkle"), 550);
    }

    renderPlots();

    if (allDone()) { finish(); return; }
    if (p.day >= TOTAL_DAYS) {
      say(`Plot ${state.selectedPlot + 1} has finished its ${TOTAL_DAYS} days. Pick another plot — it has its own fresh ${TOTAL_DAYS} days.`);
      return;
    }

    const detail = watered
      ? `Watered${stepped > 1 ? `, then skipped ${stepped - 1} more days` : ""}`
      : (stepped === 1 ? "Skipped a day" : `Skipped ${stepped} days`);
    say(`Plot ${state.selectedPlot + 1}: day ${p.day}/${TOTAL_DAYS}. ${detail}. Other plots keep their own day.`);
  }

  function finish() {
    state.finished = true;
    const planted = state.plots.filter(Boolean);
    if (!planted.length) {
      els.result.innerHTML = "<h2>Nothing grew this time.</h2><p>Plant something and try again.</p>";
    } else {
      const lines = planted.map((p) => {
        let verdict;
        if (p.dead || p.health < 35) verdict = "didn't make it 🥀";
        else if (p.health < 60) verdict = "survived, but it was a struggle 🌱";
        else verdict = "thrived 🌿";
        return `<li><strong>${p.plant.name}</strong> ${verdict} — health ${Math.round(p.health)}%</li>`;
      }).join("");
      const survived = planted.filter((p) => !p.dead && p.health >= 35).length;
      if (survived === planted.length) earn("master");
      planted.forEach((p) => {
        if (!p.dead && p.health >= 35 && ["snake", "aloe"].includes(p.plant.id)) earn("dry");
      });
      log("🏁", `Three weeks later: ${survived} of ${planted.length} plants made it.`);
      renderPlots();
      sound(survived >= Math.ceil(planted.length / 2) ? "win" : "fail");
      els.result.innerHTML = `
        <h2>Three weeks later…</h2>
        <p>${survived} of ${planted.length} plants made it. Match the water rhythm and soil to each plant to do better.</p>
        <ul>${lines}</ul>
        <p><button class="text-btn" type="button" id="againBtn">↺ Play again</button></p>`;
      const again = $("#againBtn");
      if (again) again.addEventListener("click", reset);
    }
    els.result.hidden = false;
    say("The three weeks are up — scroll down to see how your garden did.");
  }

  function reset() {
    state.finished = false;
    state.plots = [null, null, null];
    state.selectedPlot = 0;
    state.view = 0;
    state.selectedPlant = null;
    state.mix = { loam: 40, compost: 30, drainage: 30 };
    state.diary = [];
    state.badges = {};
    state.waterCount = 0;
    els.result.hidden = true;
    els.result.innerHTML = "";
    els.picker.querySelectorAll(".plant-option").forEach((el) => el.setAttribute("aria-pressed", "false"));
    els.plantTip.textContent = "Select a plant to see what it likes.";
    syncMixUI();
    renderPlots();
    sound("click");
    say("Fresh garden, fresh start. Pick a plant!");
  }

  /* ---------- wire up ---------- */
  buildPicker();
  bindSoil();
  bindPlots();
  renderPlots();

  els.plantBtn.addEventListener("click", plantIt);
  els.waterBtn.addEventListener("click", () => advance(1, true));
  els.skipBtn.addEventListener("click", () => advance(1, false));
  els.skipManyBtn.addEventListener("click", () => advance(els.skipDays ? els.skipDays.value : 3, false));
  els.weekBtn.addEventListener("click", () => advance(7, false));
  els.resetBtn.addEventListener("click", reset);

  if (els.soundBtn) {
    els.soundBtn.addEventListener("click", () => {
      const muted = window.GameSound ? window.GameSound.toggleMuted() : true;
      els.soundBtn.textContent = muted ? "🔇" : "🔊";
      els.soundBtn.setAttribute("aria-pressed", String(!muted));
      els.soundBtn.setAttribute("aria-label", muted ? "Unmute sounds" : "Mute sounds");
      els.soundBtn.title = muted ? "Sound off" : "Sound on";
      say(muted ? "Sounds turned off." : "Sounds turned on.");
    });
  }
})();
