/* ==========================================================================
   GrowWell — Location-based plant suggestions
   Free public endpoints, no API keys. Location & weather are never stored.
   ========================================================================== */
(function () {
  "use strict";

  const root = document.getElementById("localPlants");
  if (!root) return;

  const statusEl = document.getElementById("locatorStatus");
  const resultEl = document.getElementById("locatorResult");
  const searchInput = document.getElementById("locatorQuery");
  const promptEl = document.getElementById("gpsPrompt");
  const allowBtn = document.getElementById("gpsAllow");
  const placeBtn = document.getElementById("gpsPlaceInstead");
  const dismissBtn = document.getElementById("gpsDismiss");

  const esc = (s) =>
    String(s).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    })[c]);

  const status = (t) => {
    if (statusEl) statusEl.textContent = t;
  };

  /* Typical comfortable temperature range per category, with species overrides.
     These are growing guidelines, not hardiness-zone certificates. */
  const CATEGORY = {
    "Indoor": { min: 12, max: 32, indoor: true },
    "Succulents & Cacti": { min: 8, max: 42, indoor: false },
    "Climbers & Creepers": { min: 10, max: 36, indoor: false },
    "Herbs": { min: 5, max: 34, indoor: false },
    "Vegetables": { min: 8, max: 34, indoor: false },
    "Flowers": { min: 5, max: 34, indoor: false },
    "Fruit": { min: 10, max: 38, indoor: false },
    "Trees & Shrubs": { min: -10, max: 36, indoor: false }
  };

  const OVERRIDES = {
    "Bougainvillea": { min: 18, max: 42 },
    "Star Jasmine": { min: 8, max: 32 },
    "Rangoon Creeper": { min: 18, max: 38 },
    "Wisteria": { min: -15, max: 28 },
    "Clematis": { min: -10, max: 27 },
    "English Ivy": { min: -10, max: 26 },
    "Aloe Vera": { min: 10, max: 42 },
    "Echeveria": { min: 8, max: 36 },
    "Zebra Haworthia": { min: 10, max: 32 },
    "Christmas Cactus": { min: 12, max: 28 },
    "Boston Fern": { min: 14, max: 28 },
    "Peace Lily": { min: 16, max: 30 },
    "Monstera": { min: 16, max: 32 },
    "Lavender": { min: -5, max: 28 },
    "Rosemary": { min: -5, max: 30 },
    "Thyme": { min: -12, max: 28 },
    "Oregano": { min: -8, max: 30 },
    "Mint": { min: -5, max: 28 },
    "Curry Leaf": { min: 18, max: 38 },
    "Lettuce": { min: 3, max: 24 },
    "Spinach": { min: 3, max: 23 },
    "Carrot": { min: 4, max: 25 },
    "Strawberry": { min: 0, max: 26 },
    "Lemon": { min: 5, max: 38 },
    "Banana": { min: 18, max: 40 },
    "Guava": { min: 14, max: 38 },
    "Neem": { min: 12, max: 45 },
    "Hydrangea": { min: -10, max: 27 },
    "Boxwood": { min: -15, max: 30 },
    "Ficus (Weeping Fig)": { min: 14, max: 32 }
  };

  function weatherText(code) {
    if (code === 0) return "Clear sky";
    if (code <= 3) return "Partly cloudy";
    if (code <= 48) return "Foggy";
    if (code <= 67) return "Rainy";
    if (code <= 77) return "Snowy";
    if (code <= 82) return "Showers";
    if (code <= 86) return "Snow showers";
    return "Thunderstorms";
  }

  function band(t) {
    if (t >= 32) return {
      name: "Hot", advice: "Favour heat-loving plants with good drainage. Water early in the morning and mulch to slow evaporation."
    };
    if (t >= 24) return {
      name: "Warm", advice: "Excellent conditions for most tropical houseplants, summer vegetables, herbs and climbers."
    };
    if (t >= 15) return {
      name: "Mild", advice: "Ideal for leafy greens, herbs, roses and many flowers. Tender tropicals may need shelter at night."
    };
    if (t >= 5) return {
      name: "Cool", advice: "Focus on cool-season crops and hardy shrubs. Keep tender plants pots so they can move under cover."
    };
    return {
      name: "Cold", advice: "Grow indoors or under cover, and wait for frost risk to pass before planting outside."
    };
  }

  function scorePlant(p, temp, low) {
    const c = Object.assign({}, CATEGORY[p.category] || { min: 10, max: 34, indoor: false }, OVERRIDES[p.name] || {});
    let s = 0;
    if (temp >= c.min && temp <= c.max) s += 4;
    else if (temp < c.min) s -= Math.min(5, (c.min - temp) / 4);
    else s -= Math.min(5, (temp - c.max) / 4);
    if (low < c.min - 4) s -= 1.5;
    if (c.indoor) s += temp < 18 ? 1.5 : 0;
    else s += temp >= 15 ? 0.5 : 0;
    return { p: p, score: s, indoor: !!c.indoor, reason: c };
  }

  function render(place, wx) {
    const temp = Math.round(wx.current.temperature_2m);
    const low = Math.round(wx.daily.temperature_2m_min[0]);
    const high = Math.round(wx.daily.temperature_2m_max[0]);
    const zone = band(temp);
    const ranked = (window.PLANTS || [])
      .map((p) => scorePlant(p, temp, low))
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 8);

    resultEl.innerHTML =
      "<div class='locator__result'>" +
        "<div class='locator__summary'>" +
          "<div class='locator__stat'><b>" + esc(place) + "</b><span>Location</span></div>" +
          "<div class='locator__stat'><b>" + temp + "°C</b><span>" + esc(weatherText(wx.current.weather_code)) + " now</span></div>" +
          "<div class='locator__stat'><b>" + low + " / " + high + "°C</b><span>Today's low / high</span></div>" +
          "<div class='locator__stat'><b>" + esc(zone.name) + "</b><span> conditions</span></div>" +
        "</div>" +
        "<div class='doctor__note' style='margin-top:1rem'><strong>What this means:</strong> " + esc(zone.advice) +
        "</div>" +
        "<p class='doctor__label'>Plants likely to do well there right now</p>" +
        "<div class='locator__grid'>" +
          ranked.map((x) => {
            const img = window.PLANT_IMAGES && window.PLANT_IMAGES[x.p.name];
            return "<a class='locator__card' href='plants.html?q=" + encodeURIComponent(x.p.name) + "'>" +
              (img ? "<img src='" + esc(img.file) + "' alt='" + esc(x.p.name) + "' loading='lazy'>" : "") +
              "<div><b>" + esc(x.p.name) + "</b>" +
              "<span class='pill " + (x.indoor ? "pill--sky" : "") + "'>" +
              (x.indoor ? "Indoor" : esc(x.p.category)) + "</span>" +
              "<p class='small muted'>" + esc(x.p.light) + " · " + esc(x.p.water) + "</p></div></a>";
          }).join("") +
        "</div>" +
        "<p class='small muted' style='margin-top:1rem'>Based on current weather, not long-term hardiness. " +
        "Check your local frost dates before planting outdoors permanently.</p>" +
      "</div>";
    resultEl.hidden = false;
    status("Done — suggestions are based on live weather for " + place + ".");
  }

  async function byCoords(lat, lon, name) {
    status("Checking the weather at your location…");
    resultEl.hidden = true;
    try {
      const url =
        "https://api.open-meteo.com/v1/forecast?latitude=" + lat + "&longitude=" + lon +
        "&current=temperature_2m,weather_code&daily=temperature_2m_max,temperature_2m_min" +
        "&timezone=auto&forecast_days=2";
      const wx = await fetch(url).then((r) => {
        if (!r.ok) throw new Error("Weather service unavailable.");
        return r.json();
      });

      let place = name;
      if (!place) {
        try {
          const g = await fetch(
            "https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=" + lat +
            "&longitude=" + lon + "&localityLanguage=en"
          ).then((r) => r.json());
          place = g.city || g.locality || g.principalSubdivision || g.countryName || lat.toFixed(2) + ", " + lon.toFixed(2);
        } catch (e) {
          place = lat.toFixed(2) + ", " + lon.toFixed(2);
        }
      }
      render(place, wx);
    } catch (e) {
      status("Could not reach the weather service. Please try again in a moment.");
    }
  }

  function hidePrompt() {
    if (promptEl) promptEl.hidden = true;
  }

  function showGpsPrompt() {
    if (!navigator.geolocation) {
      status("Your browser does not support GPS location. Type a city or landmark instead.");
      return;
    }
    resultEl.hidden = true;
    status("");
    if (promptEl) {
      promptEl.hidden = false;
      if (allowBtn) allowBtn.focus();
    } else {
      requestGps();
    }
  }

  function requestGps() {
    hidePrompt();
    status("Waiting for location permission — please allow access in your browser…");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        status("Location found — checking the weather…");
        byCoords(pos.coords.latitude, pos.coords.longitude, "");
      },
      (err) => {
        if (err && err.code === 1) {
          status("Location permission was blocked. Allow Location in your browser's site settings, then try again — or type a city or landmark.");
        } else if (err && err.code === 2) {
          status("Your position is unavailable right now. Try again outdoors, or type a city or landmark.");
        } else {
          status("Location request timed out. Try again, or type a city or landmark.");
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 600000 }
    );
  }

  function usePlaceInstead() {
    hidePrompt();
    status("Type a city or landmark above — no location permission needed.");
    if (searchInput) searchInput.focus();
  }

  async function searchPlace() {
    const q = (searchInput && searchInput.value ? searchInput.value : "").trim();
    if (!q) {
      status("Enter a city or landmark first.");
      if (searchInput) searchInput.focus();
      return;
    }
    status("Looking up “" + q + "”…");
    resultEl.hidden = true;
    try {
      const hits = await fetch(
        "https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=" + encodeURIComponent(q),
        { headers: { Accept: "application/json" } }
      ).then((r) => {
        if (!r.ok) throw new Error("Place search unavailable.");
        return r.json();
      });
      if (!hits.length) throw new Error("No place found.");
      const hit = hits[0];
      const parts = hit.display_name.split(",").map((s) => s.trim());
      await byCoords(parseFloat(hit.lat), parseFloat(hit.lon), parts[0] + (parts[2] ? ", " + parts[2] : ""));
    } catch (e) {
      status("No match for that place. Try a nearby city, or use “My location”.");
    }
  }

  const locateBtn = document.getElementById("locatorUse");
  const searchBtn = document.getElementById("locatorSearch");
  const locateForm = document.getElementById("locatorForm");

  if (locateBtn) locateBtn.addEventListener("click", showGpsPrompt);
  if (allowBtn) allowBtn.addEventListener("click", requestGps);
  if (placeBtn) placeBtn.addEventListener("click", usePlaceInstead);
  if (dismissBtn) dismissBtn.addEventListener("click", () => {
    hidePrompt();
    status("");
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && promptEl && !promptEl.hidden) {
      hidePrompt();
      if (locateBtn) locateBtn.focus();
    }
  });
  if (searchBtn) searchBtn.addEventListener("click", searchPlace);
  if (locateForm) {
    locateForm.addEventListener("submit", (e) => {
      e.preventDefault();
      searchPlace();
    });
  }
})();
