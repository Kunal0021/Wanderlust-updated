(() => {
  'use strict';

  // Fetch all the forms we want to apply custom Bootstrap validation styles to
  const forms = document.querySelectorAll('.needs-validation');

  // Loop over them and prevent submission
  Array.from(forms).forEach(form => {
    form.addEventListener('submit', event => {
      if (!form.checkValidity()) {
        event.preventDefault();
        event.stopPropagation();
      }
      form.classList.add('was-validated');
    }, false);
  });
})();

// ====================
// Interactive Functions for Wanderlust Home & Listing pages
// ====================

// 1. Quick Location Tag Selection
function selectQuickTag(tagName) {
  const input = document.getElementById('searchLocation');
  if (input) {
    input.value = tagName;
    input.focus();
  }
}

// 2. GST Tax Price Toggle Switch (18% GST)
function toggleGST(isTaxIncluded) {
  const priceNumbers = document.querySelectorAll('.price-number');
  const taxInfos = document.querySelectorAll('.tax-info');

  priceNumbers.forEach(el => {
    const basePrice = parseFloat(el.getAttribute('data-base-price'));
    if (!isNaN(basePrice)) {
      if (isTaxIncluded) {
        const totalPrice = Math.round(basePrice * 1.18);
        el.textContent = totalPrice.toLocaleString('en-IN');
      } else {
        el.textContent = basePrice.toLocaleString('en-IN');
      }
    }
  });

  taxInfos.forEach(info => {
    info.style.display = isTaxIncluded ? 'inline' : 'none';
  });
}

// 3. Category Filter Switcher
function filterCategory(element, category) {
  // Update active pill styling
  document.querySelectorAll('.category-item').forEach(item => {
    item.classList.remove('active');
  });
  element.classList.add('active');

  // Filter items if listing items exist
  const items = document.querySelectorAll('.listing-item');
  items.forEach(item => {
    const itemCat = item.getAttribute('data-category');
    if (category === 'all' || itemCat === category || itemCat === 'all') {
      item.style.display = 'block';
    } else {
      item.style.display = 'none';
    }
  });
}