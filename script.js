const header = document.querySelector(".site-header");
const menuToggle = document.querySelector(".menu-toggle");
const nav = document.querySelector(".nav");
const trailerModal = document.getElementById("trailerModal");
const watchTrailer = document.getElementById("watchTrailer");
const closeModal = document.getElementById("closeModal");
const signupForm = document.getElementById("signupForm");
const formNote = document.getElementById("formNote");
const featureTabs = document.querySelectorAll(".feature-tab");

document.getElementById("year").textContent = new Date().getFullYear();

window.addEventListener("scroll", () => {
  header.classList.toggle("scrolled", window.scrollY > 20);
});

menuToggle.addEventListener("click", () => {
  const isOpen = nav.classList.toggle("open");
  menuToggle.setAttribute("aria-expanded", isOpen);
  menuToggle.textContent = isOpen ? "×" : "☰";
});

nav.querySelectorAll("a").forEach(link => {
  link.addEventListener("click", () => {
    nav.classList.remove("open");
    menuToggle.setAttribute("aria-expanded", "false");
    menuToggle.textContent = "☰";
  });
});

watchTrailer.addEventListener("click", () => {
  trailerModal.hidden = false;
  document.body.classList.add("modal-open");
});

function hideModal() {
  trailerModal.hidden = true;
  document.body.classList.remove("modal-open");
}

closeModal.addEventListener("click", hideModal);
trailerModal.addEventListener("click", event => {
  if (event.target === trailerModal) hideModal();
});
document.addEventListener("keydown", event => {
  if (event.key === "Escape" && !trailerModal.hidden) hideModal();
});

signupForm.addEventListener("submit", event => {
  event.preventDefault();
  const name = new FormData(signupForm).get("name");
  formNote.textContent = `Thanks, ${name}! This demo is working. Connect a form service to save real submissions.`;
  formNote.style.color = "#23d9ff";
  signupForm.reset();
});

const featureContent = {
  studio: {
    kicker: "CREATE WITHOUT LEAVING THE WORLD",
    title: "Your apartment becomes your first studio.",
    text: "Develop tracks, invite collaborators, save sessions, and turn ideas into performances without breaking the flow of the game."
  },
  collab: {
    kicker: "FIND THE PEOPLE YOUR SOUND NEEDS",
    title: "Build songs, teams, and labels together.",
    text: "Match with producers, engineers, writers, performers, managers, and visual creators based on style, goals, and reputation."
  },
  venues: {
    kicker: "EVERY STAGE IS A NEW LEVEL",
    title: "Start small. Earn the arena.",
    text: "Play open mics, clubs, theaters, festivals, and stadiums. Better performances unlock bigger crowds, stronger payouts, and new districts."
  },
  economy: {
    kicker: "TURN CREATIVITY INTO OPPORTUNITY",
    title: "Build a business around your music.",
    text: "Offer services, sell virtual merchandise, host events, develop property, secure sponsorships, and grow a creator-owned ecosystem."
  },
  fans: {
    kicker: "YOUR COMMUNITY MOVES YOUR CAREER",
    title: "Fans do more than watch.",
    text: "Fans discover talent, support releases, attend events, vote in competitions, help trends grow, and influence who rises through the city."
  }
};

featureTabs.forEach(tab => {
  tab.addEventListener("click", () => {
    featureTabs.forEach(item => item.classList.remove("active"));
    tab.classList.add("active");

    const content = featureContent[tab.dataset.feature];
    document.getElementById("featureKicker").textContent = content.kicker;
    document.getElementById("featureTitle").textContent = content.title;
    document.getElementById("featureText").textContent = content.text;
  });
});
