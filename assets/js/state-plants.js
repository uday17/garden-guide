/* State flowers and trees of India — based on Wikipedia's list of Indian state symbols. */
window.STATE_PLANTS = [
  { state: "Andhra Pradesh", region: "South", flower: "Jasmine", tree: "Neem" },
  { state: "Arunachal Pradesh", region: "North East", flower: "Foxtail orchid", tree: "Hollong" },
  { state: "Assam", region: "North East", flower: "Foxtail orchid", tree: "Hollong" },
  { state: "Bihar", region: "East", flower: "Marigold", tree: "Peepal" },
  { state: "Chhattisgarh", region: "Central", flower: "French marigold", tree: "Sal" },
  { state: "Goa", region: "West", flower: "Frangipani", tree: "Matti" },
  { state: "Gujarat", region: "West", flower: "Marigold", tree: "Banyan" },
  { state: "Haryana", region: "North", flower: "Lotus", tree: "Peepal" },
  { state: "Himachal Pradesh", region: "North", flower: "Pink rhododendron", tree: "Deodar" },
  { state: "Jharkhand", region: "East", flower: "Palash", tree: "Sal" },
  { state: "Karnataka", region: "South", flower: "Lotus (Kendaavare Hoo)", tree: "Sandalwood" },
  { state: "Kerala", region: "South", flower: "Golden shower (Cassia fistula)", tree: "Coconut palm" },
  { state: "Madhya Pradesh", region: "Central", flower: "Madonna lily", tree: "Banyan" },
  { state: "Maharashtra", region: "West", flower: "Pride of India / Jarul", tree: "Mango" },
  { state: "Manipur", region: "North East", flower: "Siroi lily", tree: "Uningthou" },
  { state: "Meghalaya", region: "North East", flower: "Lady's slipper orchid", tree: "Gamhar" },
  { state: "Mizoram", region: "North East", flower: "Red vanda", tree: "Indian rose chestnut" },
  { state: "Nagaland", region: "North East", flower: "Tree rhododendron", tree: "Alder" },
  { state: "Odisha", region: "East", flower: "Ashoka tree", tree: "Sacred fig" },
  { state: "Punjab", region: "North", flower: "Gladiolus", tree: "Sheesham" },
  { state: "Rajasthan", region: "North", flower: "Rohida", tree: "Khejri" },
  { state: "Sikkim", region: "North East", flower: "Noble dendrobium", tree: "Rhododendron" },
  { state: "Tamil Nadu", region: "South", flower: "Gloriosa lily", tree: "Palmyra palm" },
  { state: "Telangana", region: "South", flower: "Tangidi Puvvu", tree: "Jammi Chettu" },
  { state: "Tripura", region: "North East", flower: "Indian rose chestnut", tree: "Agarwood" },
  { state: "Uttar Pradesh", region: "North", flower: "Palash", tree: "Ashoka" },
  { state: "Uttarakhand", region: "North", flower: "Brahmakamal", tree: "Burans (Rhododendron)" },
  { state: "West Bengal", region: "East", flower: "Night-flowering jasmine", tree: "Blackboard tree" },
  { state: "Andaman & Nicobar Islands", region: "Union territory", flower: "Andaman Pyinma", tree: "Andaman redwood" },
  { state: "Chandigarh", region: "Union territory", flower: "Dhak flower", tree: "Mango" },
  { state: "Dadra & Nagar Haveli and Daman & Diu", region: "Union territory", flower: "No official flower listed", tree: "No official tree listed" },
  { state: "Delhi", region: "Union territory", flower: "Alfalfa", tree: "Flamboyant" },
  { state: "Jammu & Kashmir", region: "Union territory", flower: "Common rhododendron", tree: "Chinar" },
  { state: "Ladakh", region: "Union territory", flower: "Himalayan blue poppy", tree: "Juniper" },
  { state: "Lakshadweep", region: "Union territory", flower: "Neelakurinji", tree: "Breadfruit" },
  { state: "Puducherry", region: "Union territory", flower: "Cannonball", tree: "Bael" }
];

(function () {
  "use strict";
  const grid = document.getElementById("stateGrid");
  if (!grid || !window.STATE_PLANTS) return;
  const input = document.getElementById("stateSearch");
  const chips = Array.prototype.slice.call(document.querySelectorAll("[data-region]"));
  const count = document.getElementById("stateCount");
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  let active = "All";

  function render() {
    const q = (input && input.value ? input.value : "").trim().toLowerCase();
    const list = window.STATE_PLANTS.filter((s) => {
      const inRegion = active === "All" || s.region === active;
      const inSearch = !q || (s.state + " " + s.flower + " " + s.tree).toLowerCase().indexOf(q) !== -1;
      return inRegion && inSearch;
    });
    grid.innerHTML = list.map((s) => {
      const flowerImg = window.STATE_PLANT_IMAGES && window.STATE_PLANT_IMAGES[s.flower];
      const treeImg = window.STATE_PLANT_IMAGES && window.STATE_PLANT_IMAGES[s.tree];
      return `
      <article class="card card--hover">
        <span class="pill ${s.region === "Union territory" ? "pill--sky" : ""}">${esc(s.region)}</span>
        <h3 style="margin-top:.7rem">${esc(s.state)}</h3>
        <div class="state-pair">
          <div class="state-plant">
            <span class="state-plant__label">State flower</span>
            ${flowerImg ? `<img src="${esc(flowerImg)}" alt="${esc(s.flower)}" loading="lazy">`
                        : `<span class="state-plant__fallback" aria-hidden="true">🌸</span>`}
            <b>${esc(s.flower)}</b>
          </div>
          <div class="state-plant">
            <span class="state-plant__label">State tree</span>
            ${treeImg ? `<img src="${esc(treeImg)}" alt="${esc(s.tree)}" loading="lazy">`
                      : `<span class="state-plant__fallback" aria-hidden="true">🌳</span>`}
            <b>${esc(s.tree)}</b>
          </div>
        </div>
      </article>`;
    }).join("");
    if (count) count.textContent = list.length + " of " + window.STATE_PLANTS.length + " regions";
  }

  chips.forEach((chip) => chip.addEventListener("click", () => {
    active = chip.getAttribute("data-region");
    chips.forEach((c) => c.setAttribute("aria-pressed", String(c === chip)));
    render();
  }));
  if (input) input.addEventListener("input", render);
  render();
})();
