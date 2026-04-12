/* =====================================================================
   L'Oréal Routine Builder — script.js
   Features:
     ✅ Load & display all products from products.json
     ✅ Product search (by name / brand / keyword)
     ✅ Category filter (works alongside search)
     ✅ Product selection / deselection with visual highlight
     ✅ Product description modal
     ✅ Selected products list with remove & clear all
     ✅ localStorage persistence of selected products
     ✅ Generate Routine via Cloudflare Worker → OpenAI
     ✅ Chat bubble UI (user / AI distinct)
     ✅ Conversation history (multi-turn context)
     ✅ Typing indicator
     ✅ System prompt restricts to beauty topics only
   ===================================================================== */

/* ── Configuration ────────────────────────────────────────────────── */

// 🔧 REPLACE with your deployed Cloudflare Worker URL
const WORKER_URL = "https://loreal-chatbot.cornisj.workers.dev/";

const SYSTEM_PROMPT = `You are the L'Oréal Smart Beauty Advisor — an expert, warm, and elegantly professional beauty consultant for L'Oréal and its family of brands (CeraVe, La Roche-Posay, Lancôme, Garnier, Maybelline, Kiehl's, Kérastase, SkinCeuticals, Urban Decay, YSL Beauty, Redken, Vichy, and more).

Your role:
- Build personalized beauty routines using the selected products the user provides.
- Explain how to use each product, in what order, AM vs PM if relevant.
- Answer follow-up questions about the routine, ingredients, skin/hair types, and beauty tips.
- Keep responses warm, concise, and actionable — use short paragraphs or numbered steps.
- Use occasional beauty-relevant emojis (✨💄🌿💧) to stay friendly.
- Remember the user's name if they share it.

Restrictions:
- ONLY answer questions related to: skincare, haircare, makeup, fragrance, beauty routines, L'Oréal products and brands, ingredient education, and beauty-related wellness.
- If asked about ANYTHING unrelated (politics, sports, coding, food recipes, news, finance, travel, etc.), respond ONLY with:
  "I'm your L'Oréal Beauty Advisor — I can only help with beauty routines and products! ✨ Is there something beauty-related I can assist with?"
- Never discuss competitor brands in a negative light; redirect to L'Oréal alternatives when relevant.`;

/* ── State ────────────────────────────────────────────────────────── */
let allProducts = [];
let selectedIds = new Set();
let conversationHistory = [{ role: "system", content: SYSTEM_PROMPT }];
let modalProductId = null;

/* ── DOM refs ─────────────────────────────────────────────────────── */
const productsContainer = document.getElementById("productsContainer");
const noResults         = document.getElementById("noResults");
const searchInput       = document.getElementById("searchInput");
const categoryFilter    = document.getElementById("categoryFilter");
const selectedList      = document.getElementById("selectedProductsList");
const clearAllBtn       = document.getElementById("clearAllBtn");
const generateBtn       = document.getElementById("generateRoutine");
const chatForm          = document.getElementById("chatForm");
const chatWindow        = document.getElementById("chatWindow");
const userInput         = document.getElementById("userInput");
const sendBtn           = document.getElementById("sendBtn");
const descModal         = document.getElementById("descModal");
const modalClose        = document.getElementById("modalClose");
const modalImg          = document.getElementById("modalImg");
const modalBrand        = document.getElementById("modalBrand");
const modalName         = document.getElementById("modalName");
const modalCategory     = document.getElementById("modalCategory");
const modalDesc         = document.getElementById("modalDesc");
const modalSelectBtn    = document.getElementById("modalSelectBtn");

/* ── Boot ─────────────────────────────────────────────────────────── */
(async function init() {
  allProducts = await loadProducts();
  loadSelectedFromStorage();
  renderGrid(allProducts);
  renderSelectedList();
})();

/* ── Load products.json ───────────────────────────────────────────── */
async function loadProducts() {
  try {
    const res = await fetch("products.json");
    const data = await res.json();
    return data.products;
  } catch (e) {
    console.error("Failed to load products.json", e);
    return [];
  }
}

/* ── localStorage persistence ────────────────────────────────────── */
function saveSelectedToStorage() {
  localStorage.setItem("loreal_selected", JSON.stringify([...selectedIds]));
}

function loadSelectedFromStorage() {
  try {
    const saved = JSON.parse(localStorage.getItem("loreal_selected") || "[]");
    selectedIds = new Set(saved.map(Number));
  } catch {
    selectedIds = new Set();
  }
}

/* ── Filtering ────────────────────────────────────────────────────── */
function getFilteredProducts() {
  const query    = searchInput.value.trim().toLowerCase();
  const category = categoryFilter.value;
  return allProducts.filter(p => {
    const matchCat  = !category || p.category === category;
    const matchText = !query ||
      p.name.toLowerCase().includes(query) ||
      p.brand.toLowerCase().includes(query) ||
      p.description.toLowerCase().includes(query);
    return matchCat && matchText;
  });
}

function applyFilters() {
  const filtered = getFilteredProducts();
  renderGrid(filtered);
}

searchInput.addEventListener("input", applyFilters);
categoryFilter.addEventListener("change", applyFilters);

/* ── Render product grid ──────────────────────────────────────────── */
function renderGrid(products) {
  if (products.length === 0) {
    productsContainer.innerHTML = "";
    noResults.classList.remove("hidden");
    return;
  }
  noResults.classList.add("hidden");
  productsContainer.innerHTML = products.map(p => productCardHTML(p)).join("");
  // Attach events
  productsContainer.querySelectorAll(".product-card").forEach(card => {
    const id = Number(card.dataset.id);
    card.addEventListener("click", e => {
      if (e.target.closest(".info-btn")) return;
      toggleSelect(id);
    });
    card.querySelector(".info-btn")?.addEventListener("click", e => {
      e.stopPropagation();
      openModal(id);
    });
  });
}

function productCardHTML(p) {
  const isSelected = selectedIds.has(p.id);
  return `
    <div class="product-card${isSelected ? " selected" : ""}" data-id="${p.id}" role="button" tabindex="0" aria-pressed="${isSelected}">
      <div class="product-img-wrap">
        <img src="${p.image}" alt="${p.name}" loading="lazy" />
      </div>
      <div class="product-info">
        <p class="product-brand">${p.brand}</p>
        <p class="product-name">${p.name}</p>
        <div class="product-card-actions">
          <button class="info-btn" aria-label="View description for ${p.name}">View details</button>
        </div>
      </div>
    </div>`;
}

/* ── Select / deselect ────────────────────────────────────────────── */
function toggleSelect(id) {
  if (selectedIds.has(id)) {
    selectedIds.delete(id);
  } else {
    selectedIds.add(id);
  }
  saveSelectedToStorage();
  // Update card visual without full re-render
  const card = productsContainer.querySelector(`[data-id="${id}"]`);
  if (card) {
    const isNowSelected = selectedIds.has(id);
    card.classList.toggle("selected", isNowSelected);
    card.setAttribute("aria-pressed", isNowSelected);
  }
  renderSelectedList();
  // Update modal button if open
  if (modalProductId === id) updateModalBtn(id);
}

/* ── Render selected list ─────────────────────────────────────────── */
function renderSelectedList() {
  const selected = allProducts.filter(p => selectedIds.has(p.id));
  generateBtn.disabled = selected.length === 0;
  clearAllBtn.classList.toggle("hidden", selected.length === 0);

  if (selected.length === 0) {
    selectedList.innerHTML = `<p class="empty-selected">Click any product card to add it to your routine.</p>`;
    return;
  }

  selectedList.innerHTML = selected.map(p => `
    <div class="selected-pill" data-id="${p.id}">
      <img src="${p.image}" alt="${p.name}" />
      <span class="pill-name" title="${p.name}">${p.name}</span>
      <button class="pill-remove" aria-label="Remove ${p.name}"><i class="fa-solid fa-xmark"></i></button>
    </div>`).join("");

  selectedList.querySelectorAll(".pill-remove").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = Number(btn.closest(".selected-pill").dataset.id);
      toggleSelect(id);
    });
  });
}

/* Clear all */
clearAllBtn.addEventListener("click", () => {
  selectedIds.clear();
  saveSelectedToStorage();
  renderGrid(getFilteredProducts());
  renderSelectedList();
});

/* ── Description Modal ────────────────────────────────────────────── */
function openModal(id) {
  const p = allProducts.find(p => p.id === id);
  if (!p) return;
  modalProductId = id;
  modalImg.src     = p.image;
  modalImg.alt     = p.name;
  modalBrand.textContent    = p.brand;
  modalName.textContent     = p.name;
  modalCategory.textContent = p.category;
  modalDesc.textContent     = p.description;
  updateModalBtn(id);
  descModal.classList.remove("hidden");
  document.body.style.overflow = "hidden";
}

function updateModalBtn(id) {
  const isSelected = selectedIds.has(id);
  modalSelectBtn.innerHTML = isSelected
    ? `<i class="fa-solid fa-check"></i> Remove from Routine`
    : `<i class="fa-solid fa-plus"></i> Add to Routine`;
  modalSelectBtn.classList.toggle("is-selected", isSelected);
}

function closeModal() {
  descModal.classList.add("hidden");
  document.body.style.overflow = "";
  modalProductId = null;
}

modalClose.addEventListener("click", closeModal);
descModal.addEventListener("click", e => { if (e.target === descModal) closeModal(); });
document.addEventListener("keydown", e => { if (e.key === "Escape") closeModal(); });

modalSelectBtn.addEventListener("click", () => {
  if (modalProductId !== null) {
    toggleSelect(modalProductId);
    renderGrid(getFilteredProducts());
  }
});

/* ── Generate Routine ─────────────────────────────────────────────── */
generateBtn.addEventListener("click", async () => {
  const selected = allProducts.filter(p => selectedIds.has(p.id));
  if (selected.length === 0) return;

  // Reset history for a fresh routine session
  conversationHistory = [{ role: "system", content: SYSTEM_PROMPT }];

  const productSummary = selected.map(p =>
    `• ${p.brand} ${p.name} (${p.category}): ${p.description}`
  ).join("\n");

  const routinePrompt = `The user has selected these products for their routine:\n\n${productSummary}\n\nPlease create a clear, personalized beauty routine using these products. Organize by AM/PM where relevant, explain the order of application, and offer a brief tip for each product.`;

  conversationHistory.push({ role: "user", content: routinePrompt });

  generateBtn.disabled = true;
  generateBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Generating…`;

  // Clear chat and show user "card"
  chatWindow.innerHTML = "";
  appendUserMessage("✨ Generate my personalized routine");
  const typingEl = showTyping();

  try {
    const reply = await fetchAI(conversationHistory);
    removeTyping(typingEl);
    conversationHistory.push({ role: "assistant", content: reply });
    appendAIMessage(reply);
  } catch (err) {
    removeTyping(typingEl);
    appendAIMessage("⚠️ Couldn't connect to the AI. Check your Cloudflare Worker URL in script.js.");
    console.error(err);
  }

  generateBtn.disabled = selectedIds.size === 0;
  generateBtn.innerHTML = `<i class="fa-solid fa-wand-magic-sparkles"></i> Generate My Routine`;
});

/* ── Chat follow-up ───────────────────────────────────────────────── */
chatForm.addEventListener("submit", async e => {
  e.preventDefault();
  const text = userInput.value.trim();
  if (!text) return;

  appendUserMessage(text);
  conversationHistory.push({ role: "user", content: text });
  userInput.value = "";
  sendBtn.disabled = true;

  const typingEl = showTyping();
  try {
    const reply = await fetchAI(conversationHistory);
    removeTyping(typingEl);
    conversationHistory.push({ role: "assistant", content: reply });
    appendAIMessage(reply);
  } catch (err) {
    removeTyping(typingEl);
    appendAIMessage("⚠️ Something went wrong. Please try again.");
    console.error(err);
  }
  sendBtn.disabled = false;
  userInput.focus();
});

/* ── API call ─────────────────────────────────────────────────────── */
async function fetchAI(messages) {
  const res = await fetch(WORKER_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages })
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return data.choices[0].message.content;
}

/* ── Chat UI helpers ──────────────────────────────────────────────── */
function appendUserMessage(text) {
  const row = document.createElement("div");
  row.className = "msg-row user";
  row.innerHTML = `<div class="msg-label">You</div><div class="bubble">${escapeHTML(text)}</div>`;
  chatWindow.appendChild(row);
  scrollChat();
}

function appendAIMessage(text) {
  const row = document.createElement("div");
  row.className = "msg-row ai";
  row.innerHTML = `<div class="msg-label">L'Oréal Advisor</div><div class="bubble">${formatText(text)}</div>`;
  chatWindow.appendChild(row);
  scrollChat();
}

function showTyping() {
  const wrap = document.createElement("div");
  wrap.className = "msg-row ai typing-row";
  wrap.innerHTML = `<div class="msg-label">L'Oréal Advisor</div><div class="typing-indicator"><span></span><span></span><span></span></div>`;
  chatWindow.appendChild(wrap);
  scrollChat();
  return wrap;
}

function removeTyping(el) {
  if (el?.parentNode) el.parentNode.removeChild(el);
}

function scrollChat() {
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

function escapeHTML(str) {
  return str.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
}

function formatText(text) {
  return escapeHTML(text)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/\n/g, "<br>");
}
