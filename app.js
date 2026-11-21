const root = document.documentElement;
const themeButton = document.querySelector(".theme-switch");
const languageButton = document.querySelector(".language-switch");
const menuButton = document.querySelector(".menu-switch");
const mobileNavigation = document.querySelector(".mobile-nav");

function readPreference(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function rememberPreference(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // The controls also work when the browser blocks site storage.
  }
}

for (const panel of document.querySelectorAll(".study-table--changes")) {
  const table = panel.querySelector("table");
  const headings = Array.from(table.tHead.rows[0].cells, (cell) => cell.firstElementChild);

  for (const row of table.tBodies[0].rows) {
    Array.from(row.cells).forEach((cell, index) => {
      const label = headings[index].cloneNode(true);
      label.className = "study-table__field-label";
      label.setAttribute("aria-hidden", "true");
      cell.prepend(label);
    });
  }

  panel.classList.add("study-table--labeled");
}

function setupStudyViewer(viewer) {
  const title = viewer.querySelector("h2");
  const canvas = viewer.querySelector(".study-viewer__canvas");
  const enlarged = viewer.querySelector("img");
  const zoom = viewer.querySelector(".study-viewer__zoom");
  let trigger;

  const imageSelectors = [
    ".study-cover img",
    ".study-diagram__image",
    ".study-solution img",
    ".study-board img",
    ".study-table__preview img",
    ".study-summary-gallery img",
  ].join(", ");

  for (const image of document.querySelectorAll(imageSelectors)) {
    const caption = image.closest("figure")?.querySelector("figcaption:not(.study-diagram__transcript)");
    const heading = caption?.querySelector("p") ?? caption ??
      image.closest(".study-diagram--architecture")?.closest("section")?.querySelector("h2");
    const ru = heading?.textContent.trim() || image.alt;
    const en = heading?.dataset.en || image.dataset.enAlt || ru;
    const existingLink = image.closest("a.study-image-link");
    const link = existingLink ?? document.createElement("a");
    if (!existingLink) {
      link.className = "study-image-link";
      link.href = image.src;
      if (image.dataset.enSrc) link.dataset.enHref = image.dataset.enSrc;
      image.before(link);
      link.append(image);
    }
    link.setAttribute("aria-label", `Открыть изображение — ${ru}`);
    link.dataset.enLabel = `Open image — ${en}`;

    if (link.closest(".study-table__preview")) {
      const action = document.createElement("span");
      action.className = "study-table__preview-action";
      action.textContent = "Открыть таблицу на весь экран";
      action.dataset.en = "Open table in full screen";
      link.append(action);
    }

    if (typeof viewer.showModal !== "function") continue;
    link.setAttribute("aria-haspopup", "dialog");
    link.addEventListener("click", (event) => {
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      trigger = link;
      title.textContent = root.lang === "en" ? en : ru;
      enlarged.src = link.href;
      enlarged.alt = image.alt || title.textContent;
      enlarged.style.setProperty("--study-image-width", `${image.getAttribute("width")}px`);
      viewer.showModal();
      canvas.scrollTo(0, 0);
    });
  }

  zoom.addEventListener("click", () => {
    const zoomed = viewer.classList.toggle("study-viewer--zoomed");
    zoom.setAttribute("aria-pressed", String(zoomed));
    if (!zoomed || trigger?.closest(".study-table__preview")) {
      canvas.scrollTo(0, 0);
      return;
    }
    canvas.scrollTo(
      (canvas.scrollWidth - canvas.clientWidth) / 2,
      (canvas.scrollHeight - canvas.clientHeight) / 2,
    );
  });

  canvas.addEventListener("click", (event) => {
    if (event.target === canvas) viewer.close();
  });

  viewer.addEventListener("close", () => {
    viewer.classList.remove("study-viewer--zoomed");
    zoom.setAttribute("aria-pressed", "false");
    enlarged.removeAttribute("src");
    trigger?.focus({ preventScroll: true });
  });
}

const studyViewer = document.querySelector(".study-viewer");
if (studyViewer) setupStudyViewer(studyViewer);

const translatedText = Array.from(document.querySelectorAll("[data-en]"), (element) => ({
  element,
  ru: element.textContent,
  en: element.dataset.en,
}));
const translatedAttributes = [
  ["aria-label", "data-en-label"],
  ["alt", "data-en-alt"],
  ["src", "data-en-src"],
  ["href", "data-en-href"],
].flatMap(([attribute, translation]) =>
  Array.from(document.querySelectorAll(`[${translation}]`), (element) => ({
    element,
    attribute,
    ru: element.getAttribute(attribute),
    en: element.getAttribute(translation),
  })),
);

function updateThemeLabel() {
  const light = root.dataset.theme === "light";
  const label = root.lang === "ru" ? "Светлая тема" : "Light theme";
  themeButton.setAttribute("aria-label", label);
  themeButton.setAttribute("aria-pressed", String(light));
}

function setTheme(theme) {
  root.dataset.theme = theme;
  updateThemeLabel();
}

function setLanguage(language) {
  root.lang = language;

  for (const entry of translatedText) {
    entry.element.textContent = entry[language];
  }
  for (const entry of translatedAttributes) {
    entry.element.setAttribute(entry.attribute, entry[language]);
  }

  languageButton.textContent = language.toUpperCase();
  languageButton.setAttribute("aria-label", language === "ru" ? "Switch to English" : "Переключить на русский");
  updateThemeLabel();
}

setTheme(readPreference("portfolio-theme") === "light" ? "light" : "dark");
setLanguage(readPreference("portfolio-language") === "en" ? "en" : "ru");

themeButton.addEventListener("click", () => {
  const theme = root.dataset.theme === "dark" ? "light" : "dark";
  themeButton.classList.add("theme-switch--animated");
  setTheme(theme);
  rememberPreference("portfolio-theme", theme);
});

languageButton.addEventListener("click", () => {
  const language = root.lang === "ru" ? "en" : "ru";
  setLanguage(language);
  rememberPreference("portfolio-language", language);
});

function setMenuOpen(open) {
  mobileNavigation.hidden = !open;
  menuButton.setAttribute("aria-expanded", String(open));
}

menuButton.addEventListener("click", () => setMenuOpen(mobileNavigation.hidden));
mobileNavigation.addEventListener("click", (event) => {
  if (event.target.closest("a")) setMenuOpen(false);
});
document.addEventListener("click", (event) => {
  if (!mobileNavigation.hidden && !event.target.closest(".nav-shell")) setMenuOpen(false);
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !mobileNavigation.hidden) {
    setMenuOpen(false);
    menuButton.focus();
  }
});
matchMedia("(max-width: 1000px)").addEventListener("change", () => setMenuOpen(false));

const caseTilt = matchMedia("(min-width: 1001px) and (hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)");
const caseFrames = document.querySelectorAll(".case-frame");

for (const frame of caseFrames) {
  const card = frame.querySelector(".case-card");
  let bounds;
  let nextFrame = null;
  let pointerX;
  let pointerY;

  const drawTilt = () => {
    nextFrame = null;
    bounds ??= frame.getBoundingClientRect();
    const { left, top, width, height } = bounds;
    if (!width || !height) return;

    const x = (pointerX - left) / width - 0.5;
    const y = (pointerY - top) / height - 0.5;
    const pitch = Math.max(-7, Math.min(7, -14 * y));
    const yaw = Math.max(-7, Math.min(7, 14 * x));
    card.style.transform = `perspective(950px) rotateX(${pitch}deg) rotateY(${yaw}deg)`;
  };

  frame.addEventListener("pointermove", (event) => {
    if (!caseTilt.matches || event.pointerType !== "mouse") return;

    pointerX = event.clientX;
    pointerY = event.clientY;
    if (nextFrame === null) nextFrame = requestAnimationFrame(drawTilt);
  }, { passive: true });

  const invalidateBounds = () => { bounds = undefined; };
  const resetTilt = () => {
    if (nextFrame !== null) cancelAnimationFrame(nextFrame);
    nextFrame = null;
    invalidateBounds();
    card.style.removeProperty("transform");
  };
  frame.addEventListener("pointerleave", resetTilt);
  window.addEventListener("scroll", invalidateBounds, { passive: true });
  window.addEventListener("resize", invalidateBounds);
  window.addEventListener("blur", resetTilt);
  caseTilt.addEventListener("change", resetTilt);
}

const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");

for (const item of document.querySelectorAll(".experience-item")) {
  if (typeof item.animate !== "function") continue;

  const summary = item.querySelector("summary");
  let motion;

  summary.addEventListener("click", (event) => {
    if (event.defaultPrevented || reducedMotion.matches) return;
    event.preventDefault();

    const from = item.getBoundingClientRect().height;
    const expanding = !item.open || item.classList.contains("is-closing");
    motion?.cancel();

    item.classList.toggle("is-closing", !expanding);
    item.open = true;
    const to = expanding
      ? item.getBoundingClientRect().height
      : summary.getBoundingClientRect().height + (item.offsetHeight - item.clientHeight);

    const animation = item.animate(
      { height: [`${from}px`, `${to}px`] },
      { duration: 370, easing: "cubic-bezier(.25, .7, .3, 1)", fill: "both" },
    );
    motion = animation;
    animation.onfinish = () => {
      if (motion !== animation) return;
      item.open = expanding;
      item.classList.remove("is-closing");
      animation.cancel();
      motion = undefined;
    };
  });

  reducedMotion.addEventListener("change", () => {
    if (reducedMotion.matches) motion?.finish();
  });
}

for (const card of document.querySelectorAll(".case-card--pending")) {
  const lock = card.querySelector(".case-status .icon");
  let shake;

  card.addEventListener("click", () => {
    if (reducedMotion.matches || shake?.playState === "running" || typeof card.animate !== "function") return;

    const timing = { duration: 360, easing: "ease-out" };
    shake = card.animate({ translate: ["0", "-3px", "3px", "-1.5px", "1px", "0"] }, timing);
    lock.animate({ rotate: ["0deg", "-10deg", "9deg", "-5deg", "3deg", "0deg"] }, timing);
  });
}

const brandMarquee = document.querySelector(".brand-marquee");
if (brandMarquee) {
  const brandRunner = document.querySelector(".brand-runner");
  const brandList = brandRunner.firstElementChild;

  function updateBrandMotion() {
    const animate = !reducedMotion.matches && brandList.offsetWidth > 0;
    brandMarquee.classList.toggle("is-animated", animate);

    if (animate) {
      brandMarquee.scrollLeft = 0;
      const speed = 70;
      brandRunner.style.setProperty("--brand-duration", `${brandList.offsetWidth / speed}s`);
    }
  }

  const brandCopy = brandList.cloneNode(true);
  brandCopy.setAttribute("aria-hidden", "true");
  brandCopy.classList.add("brand-copy");
  brandRunner.append(brandCopy);

  reducedMotion.addEventListener("change", updateBrandMotion);
  if ("ResizeObserver" in window) {
    new ResizeObserver(updateBrandMotion).observe(brandList);
  } else {
    window.addEventListener("resize", updateBrandMotion);
  }
  updateBrandMotion();
}

const previewButton = document.querySelector(".motion-preview");
if (previewButton && new URLSearchParams(location.search).get("preview") === "motion" && typeof previewButton.animate === "function") {
  const previewSection = document.querySelector("#cases");
  const previewBlocks = Array.from(previewSection.querySelectorAll("[data-reveal]"));
  const revealStyle = getComputedStyle(root);
  const distance = revealStyle.getPropertyValue("--reveal-distance").trim();
  const duration = Number(revealStyle.getPropertyValue("--reveal-duration-ms"));
  const easing = revealStyle.getPropertyValue("--reveal-easing").trim();
  let replay = [];

  for (const block of previewBlocks) block.classList.add("is-visible");
  previewButton.hidden = false;

  previewButton.addEventListener("click", () => {
    previewSection.scrollIntoView({ behavior: "instant" });
    for (const animation of replay) animation.cancel();

    replay = previewBlocks.flatMap((block, index) => {
      const timing = { duration, delay: index * 75, fill: "backwards" };
      return [
        block.animate({ opacity: [0, 1] }, { ...timing, easing: "ease-out" }),
        block.animate({ transform: [`translateY(${distance})`, "translateY(0)"] }, { ...timing, easing }),
      ];
    });
  });
}

if ("IntersectionObserver" in window && !reducedMotion.matches) {
  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      }
    }
  }, { rootMargin: "0px 0px -16px", threshold: 0.06 });

  for (const element of document.querySelectorAll("[data-reveal]")) {
    if (element.getBoundingClientRect().top < window.innerHeight - 16) {
      element.classList.add("is-visible");
    } else {
      observer.observe(element);
    }
  }
  root.classList.add("reveal-ready");
  reducedMotion.addEventListener("change", () => {
    if (reducedMotion.matches) {
      observer.disconnect();
      root.classList.remove("reveal-ready");
    }
  });
}
