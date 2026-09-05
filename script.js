const STARTING_STATE = { name: "Rookie", cash: 100, fans: 0, xp: 0, day: 1, songs: 0, battles: 0 };

const locations = [
  { id: "studio", name: "Bedroom Studio", icon: "🎧", requirement: () => true, label: "Your home base", bg: "linear-gradient(135deg,#2c1b62,#b03d87)" },
  { id: "cafe", name: "Small Cafe", icon: "☕", requirement: s => s.xp >= 10, label: "Requires 10 XP", bg: "linear-gradient(135deg,#4a261e,#ca6d44)" },
  { id: "battle", name: "Music Battle", icon: "⚡", requirement: s => s.fans >= 25, label: "Requires 25 fans", bg: "linear-gradient(135deg,#471247,#db3c92)" },
  { id: "nightclub", name: "Nightclub", icon: "🪩", requirement: s => s.fans >= 50 && s.xp >= 75, label: "50 fans · 75 XP", bg: "linear-gradient(135deg,#131f5c,#6341cf)" },
  { id: "hiphop", name: "Hip-Hop District", icon: "🎤", requirement: s => s.fans >= 100 && s.xp >= 150, label: "100 fans · 150 XP", bg: "linear-gradient(135deg,#42210d,#e4891c)" },
  { id: "rnb", name: "R&B District", icon: "🌙", requirement: s => s.fans >= 175 && s.xp >= 250, label: "175 fans · 250 XP", bg: "linear-gradient(135deg,#2b164e,#b23e93)" },
  { id: "downtown", name: "Downtown", icon: "🏙️", requirement: s => s.fans >= 300 && s.xp >= 400, label: "300 fans · 400 XP", bg: "linear-gradient(135deg,#153647,#159a9e)" }
];

const phonePanels = {
  contacts: { title: "Contacts", html: () => `<div class="contact"><span class="contact-icon">🎛</span><div><strong>Maya Beats</strong><small>Bedroom producer · Online</small></div><b>NEW</b></div><div class="contact"><span class="contact-icon">☕</span><div><strong>Andre Cole</strong><small>Small Cafe manager</small></div></div><div class="contact"><span class="contact-icon">🎧</span><div><strong>Unknown DJ</strong><small>Unlock the Nightclub to connect</small></div></div>` },
  messages: { title: "Messages", html: () => `<div class="message"><span class="contact-icon">🎛</span><div><strong>Maya Beats</strong><small>I left a starter beat in your studio. Make something fire! 🔥</small></div></div><div class="message"><span class="contact-icon">🏙</span><div><strong>Music City Guide</strong><small>Earn 10 XP to unlock your first cafe show.</small></div></div>` },
  social: { title: "Social", html: s => `<div class="social-post"><span class="contact-icon">✨</span><p><strong>@${escapeHtml(s.name.replaceAll(" ", ""))}</strong><br>${s.fans ? `The city is listening. ${s.fans} fans and counting!` : "No posts yet. Promote your first song to start the conversation."}</p></div><div class="empty-state"><span>♥</span><p>Fan voting and social posting are coming in the next update.</p></div>` },
  releases: { title: "Music Releases", html: s => s.songs ? Array.from({length:s.songs},(_,i)=>`<div class="release"><span class="contact-icon">♫</span><div><strong>Bedroom Demo #${i+1}</strong><small>Demo · ${Math.min(99, 12 + i * 9)} plays</small></div></div>`).join("") : `<div class="empty-state"><span>♫</span><p>No music yet. Head to the studio and create your first song.</p></div>` }
};

let state = loadState();
let toastTimer;

function loadState() {
  try { return { ...STARTING_STATE, ...JSON.parse(localStorage.getItem("mce-save")) }; }
  catch { return { ...STARTING_STATE }; }
}

function saveState() { localStorage.setItem("mce-save", JSON.stringify(state)); }
function escapeHtml(value) { const node = document.createElement("div"); node.textContent = value; return node.innerHTML; }

function getLevel() {
  if (state.xp >= 400) return "City Headliner";
  if (state.xp >= 250) return "Rising Star";
  if (state.xp >= 150) return "Local Favorite";
  if (state.xp >= 75) return "Opening Act";
  if (state.xp >= 10) return "Cafe Performer";
  return "Bedroom Artist";
}

function getNextGoal() {
  return locations.slice(1).find(location => !location.requirement(state));
}

function render() {
  document.getElementById("artistName").textContent = state.name;
  document.getElementById("careerLevel").textContent = getLevel();
  document.getElementById("cashStat").textContent = `$${state.cash.toLocaleString()}`;
  document.getElementById("fansStat").textContent = state.fans.toLocaleString();
  const levelFloor = state.xp >= 400 ? 400 : state.xp >= 250 ? 250 : state.xp >= 150 ? 150 : state.xp >= 75 ? 75 : state.xp >= 10 ? 10 : 0;
  const levelCeiling = state.xp >= 400 ? 600 : state.xp >= 250 ? 400 : state.xp >= 150 ? 250 : state.xp >= 75 ? 150 : state.xp >= 10 ? 75 : 10;
  document.getElementById("xpStat").textContent = `${state.xp} XP`;
  document.getElementById("xpBar").style.width = `${Math.min(100, ((state.xp-levelFloor)/(levelCeiling-levelFloor))*100)}%`;
  document.getElementById("dayLabel").textContent = `DAY ${state.day} · 8:00 PM`;
  document.getElementById("phoneTime").textContent = `${8 + (state.day % 4)}:00`;

  const battleOpen = state.fans >= 25;
  const battleButton = document.querySelector('[data-action="battle"]');
  battleButton.classList.toggle("locked-action", !battleOpen);
  battleButton.querySelector(".lock-icon")?.replaceWith(Object.assign(document.createElement("b"), { textContent: battleOpen ? "→" : "🔒", className: battleOpen ? "" : "lock-icon" }));
  document.getElementById("battleRequirement").textContent = battleOpen ? "Challenge a local rival" : `Reach 25 fans to unlock · ${state.fans}/25`;

  const goal = getNextGoal();
  const goalEl = document.getElementById("nextGoal");
  if (goal) {
    const fanGoal = Number(goal.label.match(/(\d+) fans/)?.[1] || 0);
    const xpGoal = Number(goal.label.match(/(\d+) XP/)?.[1] || 0);
    const requirements = [fanGoal ? state.fans / fanGoal : null, xpGoal ? state.xp / xpGoal : null].filter(value => value !== null);
    const progress = Math.min(100, Math.min(...requirements) * 100);
    goalEl.innerHTML = `<span class="goal-icon">${goal.icon}</span><div><small>NEXT UNLOCK</small><strong>${goal.name}</strong><div class="progress"><i style="width:${progress}%"></i></div></div><b>${goal.label.replace("Requires ", "")}</b>`;
  } else goalEl.innerHTML = `<span class="goal-icon">★</span><div><small>CITY STATUS</small><strong>Every location unlocked!</strong><div class="progress"><i style="width:100%"></i></div></div><b>LEGEND</b>`;
  renderMap();
}

function renderMap() {
  document.getElementById("mapGrid").innerHTML = locations.map(location => {
    const open = location.requirement(state);
    return `<button class="location-card ${open ? "" : "locked"}" style="--location-bg:${location.bg}" data-location="${location.id}" aria-label="${location.name}, ${open ? "unlocked" : "locked"}"><span class="status">${open ? "● UNLOCKED" : location.label.toUpperCase()}</span><span class="art-icon">${location.icon}</span><div><h2>${location.name}</h2><p>${open ? (location.id === "studio" ? "Create your next track" : "Travel here") : location.label}</p></div></button>`;
  }).join("");
}

function showToast(message) {
  const toast = document.getElementById("toast");
  toast.textContent = message; toast.classList.add("show");
  clearTimeout(toastTimer); toastTimer = setTimeout(() => toast.classList.remove("show"), 2600);
}

function applyAction(action) {
  if (action === "song") { state.xp += 10; state.fans += 3; state.songs += 1; state.day += 1; showToast("New demo created! +10 XP · +3 fans"); }
  if (action === "promote") {
    if (state.cash < 15) return showToast("You need $15 to promote your music.");
    state.cash -= 15; state.fans += 5; state.xp += 5; state.day += 1; showToast("Your post is gaining traction! +5 fans · +5 XP");
  }
  if (action === "perform") {
    if (!state.songs) return showToast("Create a song before booking a performance.");
    const cafeOpen = state.xp >= 10; state.cash += cafeOpen ? 35 : 15; state.fans += cafeOpen ? 8 : 4; state.xp += cafeOpen ? 15 : 8; state.day += 1;
    showToast(cafeOpen ? "Cafe show complete! +$35 · +8 fans · +15 XP" : "Livestream complete! +$15 · +4 fans · +8 XP");
  }
  if (action === "battle") {
    if (state.fans < 25) return showToast(`You need ${25-state.fans} more fans to enter a battle.`);
    state.cash += 50; state.fans += 15; state.xp += 25; state.battles += 1; state.day += 1; showToast("Battle won! +$50 · +15 fans · +25 XP");
  }
  saveState(); render();
}

function showScreen(name) {
  document.querySelectorAll(".screen").forEach(screen => screen.classList.toggle("active", screen.id === `${name}Screen`));
  document.querySelectorAll(".game-nav [data-screen]").forEach(button => button.classList.toggle("active", button.dataset.screen === name));
  if (name === "phone") document.getElementById("messageBadge").hidden = true;
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function showPhonePanel(tab) {
  const panel = phonePanels[tab];
  document.getElementById("phonePanelTitle").textContent = panel.title;
  document.getElementById("phoneContent").innerHTML = panel.html(state);
  document.querySelectorAll("[data-phone-tab]").forEach(button => button.classList.toggle("active", button.dataset.phoneTab === tab));
}

document.addEventListener("click", event => {
  const screenButton = event.target.closest("[data-screen]");
  if (screenButton) showScreen(screenButton.dataset.screen);
  const actionButton = event.target.closest("[data-action]");
  if (actionButton) applyAction(actionButton.dataset.action);
  const phoneButton = event.target.closest("[data-phone-tab]");
  if (phoneButton) showPhonePanel(phoneButton.dataset.phoneTab);
  const locationButton = event.target.closest("[data-location]");
  if (locationButton) {
    const location = locations.find(item => item.id === locationButton.dataset.location);
    if (!location.requirement(state)) showToast(`${location.name} is locked. ${location.label}.`);
    else if (location.id === "studio") showScreen("studio");
    else showToast(`Welcome to ${location.name}! Venue gameplay is coming next.`);
  }
});

const dialog = document.getElementById("nameDialog");
document.getElementById("editName").addEventListener("click", () => { document.getElementById("nameInput").value = state.name; dialog.showModal(); });
document.getElementById("nameForm").addEventListener("submit", event => {
  if (event.submitter?.value !== "save") return;
  event.preventDefault(); const name = document.getElementById("nameInput").value.trim();
  if (name) { state.name = name; saveState(); render(); dialog.close(); showToast(`Welcome to Music City, ${name}!`); }
});

render();
showPhonePanel("contacts");
