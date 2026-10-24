// Post page: share button (native sheet -> clipboard -> legacy copy -> prompt).
(() => {
  const share = document.getElementById("sShare");
  if (!share) return;
  let t = 0;
  const flash = (txt) => {
    share.textContent = txt;
    clearTimeout(t);
    t = setTimeout(() => (share.textContent = "SHARE"), 1600);
  };
  const legacyCopy = (text) => {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.cssText = "position:fixed;top:0;left:0;opacity:0;pointer-events:none";
    document.body.appendChild(ta);
    ta.select();
    let ok = false;
    try { ok = document.execCommand("copy"); } catch (e) {}
    ta.remove();
    share.focus({ preventScroll: true });
    return ok;
  };
  share.addEventListener("click", async () => {
    const url = (document.querySelector('link[rel="canonical"]') || {}).href || location.href;
    if (navigator.share) {
      try { await navigator.share({ title: document.title, url }); return; }
      catch (e) { if (e && e.name === "AbortError") return; }
    }
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) { await navigator.clipboard.writeText(url); flash("COPIED"); return; }
    } catch (e) {}
    if (legacyCopy(url)) { flash("COPIED"); return; }
    try { window.prompt("Copy this link:", url); } catch (e) {}
  });
})();
