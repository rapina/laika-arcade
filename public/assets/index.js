import { initializeI18n } from "/assets/i18n.js";

initializeI18n();

const chapters = [...document.querySelectorAll("[data-world-step]")];
const counter = document.querySelector("[data-world-current]");

if ("IntersectionObserver" in window && chapters.length) {
  const observer = new IntersectionObserver((entries) => {
    const visible = entries
      .filter((entry) => entry.isIntersecting)
      .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
    if (!visible) return;
    document.body.dataset.world = visible.target.dataset.worldStep;
    const index = chapters.indexOf(visible.target) + 1;
    if (counter) counter.textContent = String(index).padStart(2, "0");
  }, { threshold: [.35, .55, .7] });
  chapters.forEach((chapter) => observer.observe(chapter));
}
