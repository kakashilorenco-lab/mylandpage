// Runs INSIDE the page (passed to page.evaluate). Plain browser JS, no imports.
// Returns a structured brief of the rendered page: sections, typography, assets,
// design tokens, detected libraries and interactive elements.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function extractPage(opts) {
  const MAX = opts?.max ?? 300;
  const vw = window.innerWidth;
  const round = (n) => Math.round(n * 10) / 10;
  const short = (s, n = 80) => (s || "").replace(/\s+/g, " ").trim().slice(0, n);
  const abs = (u) => {
    try {
      return new URL(u, location.href).href;
    } catch {
      return u;
    }
  };
  const isVisible = (el) => {
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) return false;
    const cs = getComputedStyle(el);
    return cs.visibility !== "hidden" && cs.display !== "none" && Number(cs.opacity) > 0.01;
  };
  const rectOf = (el) => {
    const r = el.getBoundingClientRect();
    return { x: round(r.left + scrollX), y: round(r.top + scrollY), w: round(r.width), h: round(r.height) };
  };
  const cssPath = (el) => {
    const parts = [];
    while (el && el.nodeType === 1 && parts.length < 4) {
      let p = el.tagName.toLowerCase();
      if (el.id) {
        parts.unshift(`${p}#${CSS.escape(el.id)}`);
        break;
      }
      const cls = [...el.classList].filter((c) => !/^(css|framer|sc|jsx|tw)-/i.test(c) && c.length < 30).slice(0, 2);
      if (cls.length) p += "." + cls.map(CSS.escape).join(".");
      parts.unshift(p);
      el = el.parentElement;
    }
    return parts.join(" > ");
  };

  // ---------- meta ----------
  const metaContent = (sel) => document.querySelector(sel)?.getAttribute("content") || null;
  const meta = {
    url: location.href,
    title: document.title,
    lang: document.documentElement.lang || null,
    description: metaContent('meta[name="description"]'),
    ogTitle: metaContent('meta[property="og:title"]'),
    ogImage: metaContent('meta[property="og:image"]'),
    themeColor: metaContent('meta[name="theme-color"]'),
    icons: [...document.querySelectorAll('link[rel*="icon"]')].map((l) => abs(l.getAttribute("href"))),
    scrollHeight: document.documentElement.scrollHeight,
    viewport: { w: vw, h: innerHeight },
    horizontalOverflow: document.documentElement.scrollWidth > vw + 1,
  };

  // ---------- stylesheets: tokens + font-face ----------
  const rootVars = {};
  const fontFaces = [];
  const keyframes = [];
  const blockedSheets = [];
  const walkRules = (rules) => {
    for (const r of rules) {
      if (r instanceof CSSFontFaceRule) {
        fontFaces.push({
          family: r.style.getPropertyValue("font-family").replace(/["']/g, "").trim(),
          weight: r.style.getPropertyValue("font-weight") || "normal",
          style: r.style.getPropertyValue("font-style") || "normal",
          display: r.style.getPropertyValue("font-display") || null,
          src: [...r.style.getPropertyValue("src").matchAll(/url\(["']?([^"')]+)["']?\)/g)].map((m) => abs(m[1])),
        });
      } else if (r instanceof CSSKeyframesRule) {
        keyframes.push(r.name);
      } else if (r instanceof CSSStyleRule && /^(:root|html)$/.test(r.selectorText.trim())) {
        for (const prop of r.style) if (prop.startsWith("--")) rootVars[prop] = r.style.getPropertyValue(prop).trim();
      } else if (r.cssRules) walkRules(r.cssRules);
    }
  };
  for (const sheet of document.styleSheets) {
    try {
      walkRules(sheet.cssRules);
    } catch {
      if (sheet.href) blockedSheets.push(sheet.href);
    }
  }
  const loadedFonts = document.fonts
    ? [...document.fonts].filter((f) => f.status === "loaded").map((f) => `${f.family.replace(/["']/g, "")} ${f.weight} ${f.style}`)
    : [];

  // ---------- typography ----------
  const typeSel = ["h1", "h2", "h3", "h4", "p", "a", "button", "li", "nav a", "input", "label", "small"];
  const typography = {};
  for (const sel of typeSel) {
    const seen = new Set();
    const samples = [];
    for (const el of document.querySelectorAll(sel)) {
      if (samples.length >= 3) break;
      if (!isVisible(el) || !short(el.textContent)) continue;
      const cs = getComputedStyle(el);
      const key = [cs.fontFamily, cs.fontSize, cs.fontWeight, cs.color].join("|");
      if (seen.has(key)) continue;
      seen.add(key);
      samples.push({
        text: short(el.textContent, 50),
        fontFamily: cs.fontFamily,
        fontSize: cs.fontSize,
        fontWeight: cs.fontWeight,
        lineHeight: cs.lineHeight,
        letterSpacing: cs.letterSpacing,
        textTransform: cs.textTransform,
        color: cs.color,
      });
    }
    if (samples.length) typography[sel] = samples;
  }

  // ---------- sections ----------
  // Descend through single-child wrappers until a level with several tall blocks appears.
  // Descend through a lone wrapper (e.g. a centered 800px container) regardless of its
  // width, then keep children that span most of that level's content width.
  const substantial = (el) => el.getBoundingClientRect().height >= 80 && isVisible(el);
  let level = document.body;
  for (let depth = 0; depth < 8; depth++) {
    const kids = [...level.children].filter(substantial);
    if (kids.length === 1) level = kids[0];
    else break;
  }
  const lcs = getComputedStyle(level);
  const contentW = level.getBoundingClientRect().width - parseFloat(lcs.paddingLeft) - parseFloat(lcs.paddingRight);
  const sectionEls = [...level.children].filter((el) => {
    const r = el.getBoundingClientRect();
    return r.height >= 40 && r.width >= contentW * 0.6 && isVisible(el) && !/^(script|style|link|noscript)$/i.test(el.tagName);
  });
  const sections = sectionEls.slice(0, 60).map((el, i) => {
    const cs = getComputedStyle(el);
    const heading = el.matches("h1,h2,h3,h4,[role=heading]") ? el : el.querySelector("h1,h2,h3,[role=heading]");
    return {
      index: i,
      tag: el.tagName.toLowerCase(),
      selector: cssPath(el),
      framerName: el.getAttribute("data-framer-name"),
      id: el.id || null,
      rect: rectOf(el),
      position: cs.position,
      background: cs.backgroundColor,
      backgroundImage: cs.backgroundImage !== "none" ? cs.backgroundImage.slice(0, 200) : null,
      padding: cs.padding,
      heading: heading ? short(heading.textContent, 100) : null,
      textPreview: short(el.innerText, 160),
      images: el.querySelectorAll("img").length,
      videos: el.querySelectorAll("video").length,
      links: el.querySelectorAll("a").length,
    };
  });

  // ---------- fixed / sticky layers ----------
  const layers = [];
  for (const el of document.querySelectorAll("body *")) {
    if (layers.length >= 20) break;
    const pos = getComputedStyle(el).position;
    if ((pos === "fixed" || pos === "sticky") && isVisible(el)) {
      layers.push({ selector: cssPath(el), position: pos, rect: rectOf(el), zIndex: getComputedStyle(el).zIndex });
    }
  }

  // ---------- images / backgrounds / video / svg ----------
  const images = [...document.images].slice(0, MAX).map((img) => {
    const cs = getComputedStyle(img);
    return {
      src: img.currentSrc || abs(img.getAttribute("src") || ""),
      srcset: img.getAttribute("srcset") ? true : false,
      alt: img.alt,
      natural: { w: img.naturalWidth, h: img.naturalHeight },
      rendered: rectOf(img),
      objectFit: cs.objectFit,
      objectPosition: cs.objectPosition,
      loading: img.loading || null,
      visible: isVisible(img),
    };
  });
  const backgrounds = [];
  for (const el of document.querySelectorAll("body *")) {
    if (backgrounds.length >= MAX) break;
    const bg = getComputedStyle(el).backgroundImage;
    if (bg && bg.includes("url(")) {
      for (const m of bg.matchAll(/url\(["']?([^"')]+)["']?\)/g)) {
        backgrounds.push({ url: abs(m[1]), selector: cssPath(el), rect: rectOf(el), size: getComputedStyle(el).backgroundSize, position: getComputedStyle(el).backgroundPosition });
      }
    }
  }
  const videos = [...document.querySelectorAll("video")].map((v) => ({
    src: v.currentSrc || abs(v.getAttribute("src") || ""),
    sources: [...v.querySelectorAll("source")].map((s) => ({ src: abs(s.getAttribute("src")), type: s.type })),
    poster: v.poster || null,
    autoplay: v.autoplay,
    loop: v.loop,
    muted: v.muted,
    playsInline: v.playsInline,
    controls: v.controls,
    rect: rectOf(v),
  }));
  const iframes = [...document.querySelectorAll("iframe")].map((f) => ({ src: f.src, rect: rectOf(f) }));

  // Scroll-driven "3D" media: a big canvas or a non-autoplay video pinned inside a tall
  // section is almost always an image sequence / video scrubbed by scroll.
  const pinnedAncestor = (el) => {
    for (let a = el.parentElement; a && a !== document.body; a = a.parentElement) {
      const pos = getComputedStyle(a).position;
      if (pos === "sticky" || pos === "fixed") return a;
    }
    return null;
  };
  const scrollMedia = [];
  for (const el of document.querySelectorAll("canvas, video")) {
    const r = el.getBoundingClientRect();
    if (r.width < innerWidth * 0.5 || r.height < innerHeight * 0.4) continue;
    const pin = pinnedAncestor(el) || (getComputedStyle(el).position === "sticky" ? el : null);
    const track = pin?.parentElement;
    const trackH = track ? track.getBoundingClientRect().height : 0;
    const isVideo = el.tagName === "VIDEO";
    if (!pin && !(isVideo && !el.autoplay)) continue;
    scrollMedia.push({
      kind: isVideo ? "video" : "canvas",
      selector: cssPath(el),
      src: isVideo ? el.currentSrc || el.querySelector("source")?.src || null : null,
      autoplay: isVideo ? el.autoplay : null,
      pinned: !!pin,
      trackHeightScreens: trackH ? +(trackH / innerHeight).toFixed(1) : null,
      rect: rectOf(el),
    });
  }
  const svgSeen = new Set();
  const svgs = [];
  for (const svg of document.querySelectorAll("svg")) {
    if (svgs.length >= 80) break;
    if (svg.parentElement?.closest("svg")) continue;
    const html = svg.outerHTML;
    if (html.length > 60_000 || svgSeen.has(html)) continue;
    svgSeen.add(html);
    const r = svg.getBoundingClientRect();
    svgs.push({
      label: svg.getAttribute("aria-label") || svg.closest("a,button")?.getAttribute("aria-label") || short(svg.closest("a,button")?.textContent, 30) || null,
      w: round(r.width),
      h: round(r.height),
      usesDefs: !!svg.querySelector("use,defs"),
      markup: html,
    });
  }

  // ---------- colors ----------
  const tally = {};
  const bump = (c, w = 1) => {
    if (!c || c === "rgba(0, 0, 0, 0)" || c === "transparent") return;
    tally[c] = (tally[c] || 0) + w;
  };
  let counted = 0;
  for (const el of document.querySelectorAll("body *")) {
    if (counted++ > 4000) break;
    if (!isVisible(el)) continue;
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    if (el.childNodes.length && [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) bump(cs.color, 1);
    bump(cs.backgroundColor, Math.max(1, Math.round((r.width * r.height) / 50_000)));
    if (cs.borderTopWidth !== "0px") bump(cs.borderTopColor, 1);
  }
  const colors = Object.entries(tally)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 24)
    .map(([color, weight]) => ({ color, weight }));

  // ---------- container widths ----------
  const widths = {};
  for (const el of document.querySelectorAll("body *")) {
    const mw = getComputedStyle(el).maxWidth;
    if (mw !== "none" && mw.endsWith("px") && parseFloat(mw) >= 600) widths[mw] = (widths[mw] || 0) + 1;
  }
  const containerWidths = Object.entries(widths).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([w, n]) => ({ maxWidth: w, count: n }));

  // ---------- libraries & page-wide behavior ----------
  const html = document.documentElement;
  const scripts = [...document.scripts].map((s) => s.src).filter(Boolean);
  const anyScript = (re) => scripts.some((s) => re.test(s));
  const libs = {
    framer: !!document.querySelector("[data-framer-name],[data-framer-component-type]") || anyScript(/framerusercontent|framer\.com/),
    webflow: html.hasAttribute("data-wf-page") || anyScript(/webflow/),
    wordpress: anyScript(/wp-content|wp-includes/) || !!document.querySelector('link[href*="wp-content"]'),
    elementor: !!document.querySelector(".elementor"),
    shopify: !!window.Shopify,
    wix: !!document.querySelector('meta[name="generator"][content*="Wix"]'),
    nextjs: !!window.__NEXT_DATA__ || !!document.querySelector("#__next") || anyScript(/\/_next\//),
    gsap: !!window.gsap,
    scrollTrigger: !!window.ScrollTrigger,
    lenis: html.classList.contains("lenis") || !!window.lenis || anyScript(/lenis/),
    locomotive: html.classList.contains("has-scroll-smooth") || anyScript(/locomotive/),
    swiper: !!document.querySelector(".swiper,.swiper-container") || !!window.Swiper,
    splide: !!document.querySelector(".splide"),
    aos: !!document.querySelector("[data-aos]"),
    lottie: !!document.querySelector("lottie-player,dotlottie-player,[data-animation-path]") || !!window.lottie,
    three: !!window.THREE || !!document.querySelector("canvas[data-engine*='three']"),
    canvas: document.querySelectorAll("canvas").length,
    jquery: !!window.jQuery,
    tailwind: !!document.querySelector('[class*="md:"],[class*="lg:"]'),
  };
  const smoothScroll = window.lenis?.options
    ? { lib: "lenis", options: JSON.parse(JSON.stringify(window.lenis.options, (k, v) => (typeof v === "function" ? String(v).slice(0, 80) : v))) }
    : null;

  // ---------- links & interactives ----------
  const links = [...document.querySelectorAll("a[href]")].slice(0, MAX).map((a) => {
    const href = abs(a.getAttribute("href"));
    let internal = false;
    try {
      internal = new URL(href).origin === location.origin;
    } catch {}
    return { text: short(a.textContent, 50) || a.getAttribute("aria-label"), href, internal, target: a.target || null };
  });
  const interactives = {
    buttons: [...document.querySelectorAll("button,[role=button]")].filter(isVisible).slice(0, 40).map((b) => ({ text: short(b.textContent, 40) || b.getAttribute("aria-label"), selector: cssPath(b) })),
    expanders: [...document.querySelectorAll("[aria-expanded],details,summary")].slice(0, 30).map((e) => ({ selector: cssPath(e), text: short(e.textContent, 40) })),
    tabs: document.querySelectorAll("[role=tab]").length,
    dialogs: document.querySelectorAll("dialog,[role=dialog]").length,
    forms: [...document.forms].map((f) => ({
      action: f.action,
      method: f.method,
      fields: [...f.elements].filter((e) => e.name || e.type).map((e) => ({ name: e.name, type: e.type, placeholder: e.placeholder || null })).slice(0, 20),
    })),
  };

  return {
    meta,
    tokens: { rootVars, colors, containerWidths },
    fonts: { fontFaces, loaded: loadedFonts, blockedSheets },
    keyframes: [...new Set(keyframes)].slice(0, 60),
    typography,
    sections,
    layers,
    media: { images, backgrounds, videos, iframes, svgs, scrollMedia },
    libs,
    smoothScroll,
    links,
    interactives,
  };
}
