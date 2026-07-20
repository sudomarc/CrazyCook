document.addEventListener('DOMContentLoaded', () => {
    const header = document.querySelector('.site-header');
    const revealItems = document.querySelectorAll('.reveal');
    const cartToggle = document.getElementById('header-cart-toggle');
    const cartDrawer = document.getElementById('cart-drawer');
    const cartOverlay = document.getElementById('cart-overlay');
    const drawerClose = document.getElementById('drawer-close');
    const cartValidateButton = document.getElementById('cart-validate');
    const cartBody = document.getElementById('cart-drawer-body');
    const cartTotalPrice = document.getElementById('cart-total-price');
    const cartCountBadge = document.getElementById('header-cart-count');

    const state = {
        items: [],
        step: 'cart',
        delivery: {
            name: '',
            phone: '',
            address: '',
            note: ''
        }
    };

    const toggleHeader = () => {
        if (!header) return;
        header.classList.toggle('scrolled', window.scrollY > 24);
    };

    const formatPrice = (value) => `${value.toLocaleString('fr-FR')} GNF`;

    const getSubtotal = () => state.items.reduce((total, item) => total + item.quantity * item.price, 0);

    const bumpBadge = () => {
        cartCountBadge?.classList.remove('bump');
        void cartCountBadge?.offsetWidth;
        cartCountBadge?.classList.add('bump');
    };

    const renderCart = () => {
        if (!cartBody) return;

        const itemCount = state.items.reduce((total, item) => total + item.quantity, 0);
        cartCountBadge.textContent = itemCount;

        if (!state.items.length) {
            cartBody.innerHTML = '<p class="empty-state">Ajoutez un plat pour composer votre commande.</p>';
            cartTotalPrice.textContent = '0 GNF';
            cartValidateButton.textContent = 'Valider ma commande';
            return;
        }

        if (state.step === 'cart') {
            cartBody.innerHTML = `
                <div class="cart-items">
                    ${state.items.map((item) => `
                        <article class="cart-item-card">
                            <div class="cart-item-card__top">
                                <div>
                                    <strong>${item.name}</strong>
                                    <p>${formatPrice(item.price)} / unité</p>
                                </div>
                                <button type="button" class="cart-remove" data-remove="${item.name}">Supprimer</button>
                            </div>
                            <div class="cart-item-card__meta">
                                <div class="cart-stepper">
                                    <button type="button" data-change="-" data-name="${item.name}">−</button>
                                    <span>${item.quantity}</span>
                                    <button type="button" data-change="+" data-name="${item.name}">+</button>
                                </div>
                                <strong>${formatPrice(item.quantity * item.price)}</strong>
                            </div>
                        </article>
                    `).join('')}
                </div>
            `;
            cartTotalPrice.textContent = formatPrice(getSubtotal());
            cartValidateButton.textContent = 'Valider ma commande';
            return;
        }

        if (state.step === 'delivery') {
            cartBody.innerHTML = `
                <form class="cart-form" id="delivery-form">
                    <label>
                        Nom
                        <input type="text" name="name" value="${state.delivery.name}" required>
                    </label>
                    <label>
                        Téléphone
                        <input type="tel" name="phone" value="${state.delivery.phone}" required>
                    </label>
                    <label>
                        Adresse de livraison
                        <input type="text" name="address" value="${state.delivery.address}" required>
                    </label>
                    <label>
                        Note pour le chef
                        <textarea name="note">${state.delivery.note}</textarea>
                    </label>
                    <div class="cart-actions">
                        <button type="button" class="button button-light" id="back-to-cart">Retour</button>
                        <button type="submit" class="button button-dark">Continuer</button>
                    </div>
                </form>
            `;
            cartValidateButton.textContent = 'Passer à la livraison';
            return;
        }

        if (state.step === 'confirmation') {
            cartBody.innerHTML = `
                <div class="cart-confirmation">
                    <h4>Commande enregistrée</h4>
                    <p>Prototype de livraison — rien n’est réellement traité.</p>
                    <p><strong>Client :</strong> ${state.delivery.name || 'À renseigner'}</p>
                    <p><strong>Téléphone :</strong> ${state.delivery.phone || 'À renseigner'}</p>
                    <p><strong>Adresse :</strong> ${state.delivery.address || 'À renseigner'}</p>
                    <div class="cart-summary">
                        <div class="cart-summary__row"><span>Sous-total</span><strong>${formatPrice(getSubtotal())}</strong></div>
                        <div class="cart-summary__row"><span>Livraison</span><strong>2 000 GNF</strong></div>
                        <div class="cart-summary__row"><span>Total</span><strong>${formatPrice(getSubtotal() + 2000)}</strong></div>
                    </div>
                    <button type="button" class="button button-dark full" id="restart-order">Nouvelle commande</button>
                </div>
            `;
            cartTotalPrice.textContent = formatPrice(getSubtotal() + 2000);
            cartValidateButton.textContent = 'Commande prête';
        }
    };

    const openCart = () => {
        if (!cartDrawer) return;
        cartDrawer.classList.add('is-open');
        cartDrawer.setAttribute('aria-hidden', 'false');
        cartOverlay?.classList.add('is-visible');
        cartToggle?.setAttribute('aria-expanded', 'true');
    };

    const closeCart = () => {
        if (!cartDrawer) return;
        cartDrawer.classList.remove('is-open');
        cartDrawer.setAttribute('aria-hidden', 'true');
        cartOverlay?.classList.remove('is-visible');
        cartToggle?.setAttribute('aria-expanded', 'false');
    };

    const addToCart = (name, price) => {
        const existingItem = state.items.find((item) => item.name === name);
        if (existingItem) {
            existingItem.quantity += 1;
        } else {
            state.items.push({ name, price, quantity: 1 });
        }
        bumpBadge();
        renderCart();
        openCart();
    };

    const updateQuantity = (name, delta) => {
        state.items = state.items
            .map((item) => item.name === name ? { ...item, quantity: item.quantity + delta } : item)
            .filter((item) => item.quantity > 0);
        renderCart();
    };

    const removeItem = (name) => {
        state.items = state.items.filter((item) => item.name !== name);
        renderCart();
    };

    const validateOrder = () => {
        if (!state.items.length) return;
        if (state.step === 'cart') {
            state.step = 'delivery';
            renderCart();
            return;
        }
        if (state.step === 'delivery') {
            const form = document.getElementById('delivery-form');
            if (!form) return;
            const data = new FormData(form);
            state.delivery = Object.fromEntries(data.entries());
            state.step = 'confirmation';
            renderCart();
        }
    };

    const restartOrder = () => {
        state.items = [];
        state.step = 'cart';
        state.delivery = { name: '', phone: '', address: '', note: '' };
        renderCart();
        closeCart();
    };

    toggleHeader();
    window.addEventListener('scroll', toggleHeader, { passive: true });

    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-visible');
                observer.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.15
    });

    revealItems.forEach((item) => observer.observe(item));

    document.querySelectorAll('.add-to-cart').forEach((button) => {
        button.addEventListener('click', () => {
            addToCart(button.dataset.name, Number(button.dataset.price));
        });
    });

    cartToggle?.addEventListener('click', () => {
        const isOpen = cartDrawer?.classList.contains('is-open');
        if (isOpen) {
            closeCart();
        } else {
            openCart();
        }
    });

    drawerClose?.addEventListener('click', closeCart);
    cartOverlay?.addEventListener('click', closeCart);

    cartBody?.addEventListener('click', (event) => {
        const target = event.target;
        if (!(target instanceof HTMLElement)) return;

        if (target.matches('[data-remove]')) {
            removeItem(target.dataset.remove);
            return;
        }

        if (target.matches('[data-change]')) {
            updateQuantity(target.dataset.name, target.dataset.change === '+' ? 1 : -1);
            return;
        }

        if (target.id === 'back-to-cart') {
            state.step = 'cart';
            renderCart();
            return;
        }

        if (target.id === 'restart-order') {
            restartOrder();
        }
    });

    cartBody?.addEventListener('submit', (event) => {
        if (event.target instanceof HTMLFormElement && event.target.id === 'delivery-form') {
            event.preventDefault();
            validateOrder();
        }
    });

    cartValidateButton?.addEventListener('click', () => {
        if (state.step === 'confirmation') {
            restartOrder();
            return;
        }
        validateOrder();
    });

    renderCart();
});