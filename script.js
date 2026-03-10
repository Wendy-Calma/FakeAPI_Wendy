const API_URL = 'https://fakestoreapi.com/products';

let allProducts      = [];
let filteredProducts = [];

// ── DOM References ──
const tableBody      = document.getElementById('tableBody');
const searchInput    = document.getElementById('searchInput');
const categoryFilter = document.getElementById('categoryFilter');
const sortSelect     = document.getElementById('sortSelect');
const resultCount    = document.getElementById('resultCount');
const refreshBtn     = document.getElementById('refreshBtn');

// Stats
const statTotal  = document.getElementById('statTotal');
const statCats   = document.getElementById('statCats');
const statAvg    = document.getElementById('statAvg');
const statRating = document.getElementById('statRating');

// Modal
const backdrop   = document.getElementById('productBackdrop');
const modalClose = document.getElementById('modalClose');

async function fetchProducts() {
  showLoading();
  try {
    const response = await fetch(API_URL);

    if (!response.ok) {
      throw new Error(`HTTP Error: ${response.status}`);
    }

    allProducts = await response.json();

    populateCategories(allProducts);
    updateStats(allProducts);
    applyFilters();
    showToast(`✓ Loaded ${allProducts.length} products`);

  } catch (err) {
    console.error('Fetch error:', err);

    tableBody.innerHTML = `
      <tr><td colspan="7">
        <div class="empty-state">
          <i class="bi bi-wifi-off" style="font-size:2rem;color:var(--brand-accent2)"></i>
          <div style="margin-top:.75rem;font-weight:600">Failed to fetch products</div>
          <div style="font-size:.82rem;margin-top:.3rem">${err.message}</div>
        </div>
      </td></tr>`;

    showToast('⚠ API error — check connection', true);
  }
}

function showLoading() {
  tableBody.innerHTML = `
    <tr class="loading-row"><td colspan="7">
      <div class="spinner-rizz"></div>
      <div style="color:var(--brand-muted);font-size:.88rem">Fetching products from API…</div>
    </td></tr>`;
}

function populateCategories(products) {
  const categories = [...new Set(products.map(p => p.category))].sort();

  categoryFilter.innerHTML = '<option value="">All Categories</option>';

  categories.forEach(cat => {
    const option       = document.createElement('option');
    option.value       = cat;
    option.textContent = capitalize(cat);
    categoryFilter.appendChild(option);
  });
}

function updateStats(products) {
  if (!products.length) return;

  const totalCats  = new Set(products.map(p => p.category)).size;
  const avgPrice   = products.reduce((sum, p) => sum + p.price, 0) / products.length;
  const avgRating  = products.reduce((sum, p) => sum + p.rating.rate, 0) / products.length;

  animateNumber(statTotal,  products.length, '');
  animateNumber(statCats,   totalCats,        '');
  animateNumber(statAvg,    avgPrice,         '$', true);
  animateNumber(statRating, avgRating,        '', true);
}

function animateNumber(el, target, prefix, isFloat = false) {
  let startTime = null;
  const duration = 600;

  function step(timestamp) {
    if (!startTime) startTime = timestamp;
    const progress = Math.min((timestamp - startTime) / duration, 1);
    const value    = target * easeOut(progress);

    el.textContent = prefix + (isFloat ? value.toFixed(1) : Math.round(value));

    if (progress < 1) requestAnimationFrame(step);
  }

  requestAnimationFrame(step);
}

function easeOut(t) {
  return 1 - Math.pow(1 - t, 3);
}

function applyFilters() {
  const query    = searchInput.value.toLowerCase().trim();
  const category = categoryFilter.value;
  const sort     = sortSelect.value;

  filteredProducts = allProducts.filter(product => {
    const matchesQuery    = !query ||
      product.title.toLowerCase().includes(query) ||
      product.description.toLowerCase().includes(query);
    const matchesCategory = !category || product.category === category;
    return matchesQuery && matchesCategory;
  });

  if (sort === 'price-asc')   filteredProducts.sort((a, b) => a.price - b.price);
  if (sort === 'price-desc')  filteredProducts.sort((a, b) => b.price - a.price);
  if (sort === 'rating-desc') filteredProducts.sort((a, b) => b.rating.rate - a.rating.rate);
  if (sort === 'name-asc')    filteredProducts.sort((a, b) => a.title.localeCompare(b.title));

  renderTable(filteredProducts);

  const count = filteredProducts.length;
  resultCount.textContent = `${count} result${count !== 1 ? 's' : ''}`;
}

function renderTable(products) {
  if (!products.length) {
    tableBody.innerHTML = `
      <tr><td colspan="7">
        <div class="empty-state">
          <i class="bi bi-search" style="font-size:2rem;opacity:.3"></i>
          <div style="margin-top:.75rem">No products match your filters</div>
        </div>
      </td></tr>`;
    return;
  }

  tableBody.innerHTML = products.map((product, index) => `
    <tr onclick="openModal(${product.id})" style="animation-delay:${Math.min(index * 20, 400)}ms">
      <td class="id-cell">#${product.id}</td>
      <td>
        <img
          class="product-img-thumb"
          src="${product.image}"
          alt="${escapeHtml(product.title)}"
          loading="lazy"
        />
      </td>
      <td class="product-title-cell" title="${escapeHtml(product.title)}">
        ${escapeHtml(product.title)}
      </td>
      <td>
        <span class="badge-cat">${escapeHtml(capitalize(product.category))}</span>
      </td>
      <td class="price-cell">$${product.price.toFixed(2)}</td>
      <td>
        <div class="rating-cell">
          <span class="stars">${renderStars(product.rating.rate)}</span>
          <span style="font-size:.83rem;font-weight:500">${product.rating.rate}</span>
          <span class="rating-count hide-mobile">(${product.rating.count})</span>
        </div>
      </td>
      <td class="hide-mobile">
        <i class="bi bi-arrow-right-circle detail-link"></i>
      </td>
    </tr>
  `).join('');
}

function renderStars(rate) {
  const fullStars  = Math.floor(rate);
  const halfStar   = rate % 1 >= 0.4 ? 1 : 0;
  const emptyStars = 5 - fullStars - halfStar;

  return '★'.repeat(fullStars) + (halfStar ? '½' : '') + '☆'.repeat(emptyStars);
}

function openModal(id) {
  const product = allProducts.find(p => p.id === id);
  if (!product) return;

  document.getElementById('modalTitle').textContent      = product.title;
  document.getElementById('modalId').textContent         = `#${product.id}`;
  document.getElementById('modalImage').src              = product.image;
  document.getElementById('modalImage').alt              = product.title;
  document.getElementById('modalPrice').textContent      = `$${product.price.toFixed(2)}`;
  document.getElementById('modalCategory').textContent   = capitalize(product.category);
  document.getElementById('modalStars').textContent      = renderStars(product.rating.rate);
  document.getElementById('modalRatingVal').textContent  = `${product.rating.rate} / 5`;
  document.getElementById('modalReviews').textContent    = `${product.rating.count} reviews`;
  document.getElementById('modalDescription').textContent = product.description;

  backdrop.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  backdrop.classList.remove('active');
  document.body.style.overflow = '';
}

modalClose.addEventListener('click', closeModal);

backdrop.addEventListener('click', function (e) {
  if (e.target === backdrop) closeModal();
});

document.addEventListener('keydown', function (e) {
  if (e.key === 'Escape') closeModal();
});

searchInput.addEventListener('input', applyFilters);
categoryFilter.addEventListener('change', applyFilters);
sortSelect.addEventListener('change', applyFilters);

refreshBtn.addEventListener('click', function () {
  refreshBtn.innerHTML = '<i class="bi bi-arrow-clockwise" style="animation:spin .5s linear infinite"></i> Refreshing';
  fetchProducts().finally(() => {
    refreshBtn.innerHTML = '<i class="bi bi-arrow-clockwise"></i> Refresh';
  });
});

let toastTimer;

function showToast(message, isError = false) {
  const toast = document.getElementById('rizzToast');
  toast.textContent = message;
  toast.style.borderLeftColor = isError ? 'var(--brand-accent2)' : 'var(--brand-accent)';
  toast.classList.add('show');

  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 3000);
}

function capitalize(str) {
  return str ? str.charAt(0).toUpperCase() + str.slice(1) : str;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

fetchProducts();
