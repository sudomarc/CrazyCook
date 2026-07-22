/**
 * CrazyCook — Système de commande interactif & Panier
 * Développeur : Jules (Senior Front-End)
 * Localisation : Conakry, Guinée (Prix en GNF, Téléphone +224)
 */

document.addEventListener('DOMContentLoaded', () => {
    // Éléments du DOM
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
    const mobileCartToggle = document.getElementById('mobile-cart-toggle');
    const mobileCartCountBadge = document.getElementById('mobile-cart-count');
    const stickyMobileCta = document.getElementById('sticky-mobile-cta');
    const themeToggle = document.getElementById('theme-toggle');
    const footerCartToggle = document.getElementById('footer-cart-toggle');
    const reorderBanner = document.getElementById('reorder-banner');
    const reorderSummary = document.getElementById('reorder-summary');
    const reorderButton = document.getElementById('reorder-button');
    const reorderDismiss = document.getElementById('reorder-dismiss');

    // Gestion de l'état simple (Panier & Étape de commande)
    let cart = [];
    let currentStep = 'cart'; // 'cart' | 'delivery' | 'payment' | 'processing' | 'confirmation'
    let paymentMethod = null; // 'orange_money' | 'cod'
    let transactionRef = null; // Référence simulée générée après paiement Orange Money
    let deliveryInfo = {
        name: '',
        phone: '',
        address: '',
        note: ''
    };

    // Gestion du défilement pour l'effet de transparence du header et la barre de CTA mobile
    const toggleHeader = () => {
        if (header) {
            header.classList.toggle('scrolled', window.scrollY > 24);
        }

        // Affichage de la barre mobile collante après avoir scrollé au-delà du hero section (min-height de 100vh)
        if (stickyMobileCta) {
            const heroHeight = document.querySelector('.hero')?.offsetHeight || window.innerHeight;
            stickyMobileCta.classList.toggle('is-visible', window.scrollY > heroHeight - 100);
        }
    };

    // Formatage des prix en GNF (ex: 16 000 GNF)
    const formatPrice = (value) => `${value.toLocaleString('fr-FR')} GNF`;

    // Calcul du sous-total du panier
    const getSubtotal = () => cart.reduce((total, item) => total + item.quantity * item.price, 0);

    // Déclenchement de l'animation CSS (bump/pulse) sur le badge du panier
    const bumpBadge = () => {
        if (cartCountBadge) {
            cartCountBadge.classList.remove('bump');
            // Force un reflow pour relancer l'animation CSS
            void cartCountBadge.offsetWidth;
            cartCountBadge.classList.add('bump');
        }
        if (mobileCartCountBadge) {
            mobileCartCountBadge.classList.remove('bump');
            // Force un reflow pour relancer l'animation CSS
            void mobileCartCountBadge.offsetWidth;
            mobileCartCountBadge.classList.add('bump');
        }
    };

    /* ---------- THEMES: gestion du thème sombre (persist + respect prefers-color-scheme) ---------- */
    const THEME_KEY = 'crazycook:theme';
    const applyTheme = (theme) => {
        if (theme === 'dark') {
            document.documentElement.setAttribute('data-theme', 'dark');
            themeToggle?.setAttribute('aria-pressed', 'true');
        } else {
            document.documentElement.removeAttribute('data-theme');
            themeToggle?.setAttribute('aria-pressed', 'false');
        }
        try { localStorage.setItem(THEME_KEY, theme); } catch (e) { /* ignore */ }
    };

    // Initial theme au chargement
    (function initTheme() {
        try {
            const saved = localStorage.getItem(THEME_KEY);
            if (saved) { applyTheme(saved); return; }
        } catch (e) {}
        const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        applyTheme(prefersDark ? 'dark' : 'light');
    }());

    themeToggle?.addEventListener('click', () => {
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        applyTheme(isDark ? 'light' : 'dark');
    });

    /* ---------- Image skeleton helper (appelé depuis l'attribut onload/onerror des images) ---------- */
    // Image de remplacement minimaliste et sans texte utilisant la palette chaude --cream (#F5F0E8) et --ochre (#C8832A)
    const FALLBACK_IMAGE = 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
        <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900" viewBox="0 0 1200 900">
            <rect width="1200" height="900" fill="#F5F0E8"/>
            <rect x="40" y="40" width="1120" height="820" rx="16" fill="none" stroke="#C8832A" stroke-width="3" stroke-dasharray="10 10" opacity="0.25"/>
            <circle cx="600" cy="450" r="80" fill="#C8832A" opacity="0.12"/>
            <path d="M580 450 H620 M600 430 V470" stroke="#C8832A" stroke-width="3" stroke-linecap="round" opacity="0.3"/>
        </svg>
    `);

    const revealImage = (imgEl) => {
        try {
            imgEl.classList.add('loaded');
            const skeleton = imgEl.previousElementSibling;
            if (skeleton && skeleton.classList.contains('img-skeleton')) {
                skeleton.style.transition = 'opacity 360ms ease';
                skeleton.style.opacity = '0';
                setTimeout(() => skeleton.remove(), 420);
            }
        } catch (e) { /* ne bloque pas l'application */ }
    };

    window.imageLoaded = function(imgEl) {
        revealImage(imgEl);
    };

    window.imageFailed = function(imgEl) {
        try {
            if (imgEl && imgEl.dataset.fallbackApplied !== 'true') {
                imgEl.dataset.fallbackApplied = 'true';
                imgEl.src = FALLBACK_IMAGE;
            }
            revealImage(imgEl);
        } catch (e) { /* ne bloque pas l'application */ }
    };

    document.querySelectorAll('.skeleton-img').forEach((imgEl) => {
        setTimeout(() => {
            if (!imgEl.classList.contains('loaded')) {
                window.imageFailed(imgEl);
            }
        }, 3500);
    });

    /* ---------- Micro-feedback +1 lors de l'ajout au panier ---------- */
    const showAddFeedback = (button) => {
        if (!(button instanceof HTMLElement)) return;
        const rect = button.getBoundingClientRect();
        const el = document.createElement('span');
        el.className = 'add-feedback';
        el.textContent = '+1';
        // Positionnement fixe pour éviter overflow/positioning complexe
        el.style.left = `${rect.left + rect.width / 2}px`;
        el.style.top = `${rect.top - 6}px`;
        el.style.transform = 'translate(-50%, 0)';
        el.style.position = 'fixed';
        document.body.appendChild(el);
        // Vibrate si supporté
        try { if (navigator.vibrate) navigator.vibrate(15); } catch (e) {}
        // Retirer après animation
        setTimeout(() => { el.remove(); }, 700);
    };

    // Rendu dynamique du tiroir panier selon l'étape actuelle
    const renderCart = () => {
        if (!cartBody) return;

        // Mise à jour du badge dans le header
        const itemCount = cart.reduce((total, item) => total + item.quantity, 0);
        if (cartCountBadge) {
            cartCountBadge.textContent = itemCount;
        }
        if (mobileCartCountBadge) {
            mobileCartCountBadge.textContent = itemCount;
        }

        // Si le panier est vide
        if (cart.length === 0) {
            cartBody.innerHTML = '<p class="empty-state">Ajoutez un plat pour composer votre commande.</p>';
            if (cartTotalPrice) cartTotalPrice.textContent = '0 GNF';
            if (cartValidateButton) {
                cartValidateButton.textContent = 'Valider ma commande';
                cartValidateButton.style.display = 'none'; // Cacher le bouton si vide
            }
            return;
        }

        // Afficher le bouton de validation s'il y a des articles
        if (cartValidateButton) {
            cartValidateButton.style.display = 'block';
        }

        // ÉTAPE 1 : Affichage du panier classique
        if (currentStep === 'cart') {
            cartBody.innerHTML = `
                <div class="cart-items">
                    ${cart.map((item) => `
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
            if (cartTotalPrice) cartTotalPrice.textContent = formatPrice(getSubtotal());
            if (cartValidateButton) cartValidateButton.textContent = 'Valider ma commande';
            return;
        }

        // ÉTAPE 2 : Saisie des informations de livraison
        if (currentStep === 'delivery') {
            cartBody.innerHTML = `
                <div class="cart-form-container">
                    <h4 style="margin-bottom: 1rem; font-family: 'Cormorant Garamond', serif; font-size: 1.3rem; color: var(--burnt-earth);">Informations de livraison</h4>
                    <form class="cart-form" id="delivery-form">
                        <label>
                            Nom complet
                            <input type="text" name="name" value="${deliveryInfo.name}" placeholder="Ex: Mamadou Diallo" required>
                        </label>
                        <label>
                            Numéro de téléphone
                            <input type="tel" name="phone" value="${deliveryInfo.phone}" placeholder="Ex: +224 628 06 94 79" required>
                        </label>
                        <label>
                            Adresse de livraison (ou lien Google Maps)
                            <input type="text" name="address" value="${deliveryInfo.address}" placeholder="Ex: Kaloum, Conakry" required>
                        </label>
                        <label>
                            Note spéciale pour le chef
                            <textarea name="note" placeholder="Ex: Épices douces, sans oignons...">${deliveryInfo.note}</textarea>
                        </label>
                        <div class="cart-actions" style="margin-top: 1rem; display: flex; gap: 0.5rem;">
                            <button type="button" class="button button-light" id="back-to-cart" style="flex: 1; padding: 0.75rem;">Retour</button>
                        </div>
                    </form>
                </div>
            `;
            if (cartTotalPrice) cartTotalPrice.textContent = formatPrice(getSubtotal());
            if (cartValidateButton) cartValidateButton.textContent = 'Choisir le paiement';
            return;
        }

        // ÉTAPE 3 : Choix du mode de paiement
        if (currentStep === 'payment') {
            cartBody.innerHTML = `
                <div class="payment-step">
                    <h4 style="margin-bottom: 1rem; font-family: 'Cormorant Garamond', serif; font-size: 1.3rem; color: var(--burnt-earth);">Mode de paiement</h4>
                    <div class="payment-options">
                        <button type="button" class="payment-option" data-payment="orange_money">
                            <span class="payment-option__badge" style="background:#FF6600;">OM</span>
                            <span class="payment-option__label">
                                <strong>Orange Money</strong>
                                <small>Paiement mobile instantané</small>
                            </span>
                        </button>
                        <button type="button" class="payment-option" data-payment="cod">
                            <span class="payment-option__badge">💵</span>
                            <span class="payment-option__label">
                                <strong>Paiement à la livraison</strong>
                                <small>Espèces à la réception</small>
                            </span>
                        </button>
                    </div>
                    <button type="button" class="button button-light" id="back-to-delivery" style="margin-top: 1rem; width: 100%; padding: 0.75rem;">Retour</button>
                </div>
            `;
            if (cartTotalPrice) cartTotalPrice.textContent = formatPrice(getSubtotal());
            if (cartValidateButton) cartValidateButton.style.display = 'none';
            return;
        }

        // ÉTAPE 3bis : Simulation du paiement Orange Money
        if (currentStep === 'orange_money_form') {
            cartBody.innerHTML = `
                <div class="om-simulation">
                    <p class="om-disclaimer"><!-- SIMULATION — pas de vrai paiement, prototype de démonstration --> Ceci est une simulation à des fins de démonstration.</p>
                    <h4 style="font-family: 'Cormorant Garamond', serif; font-size: 1.3rem; color: var(--burnt-earth);">Paiement Orange Money</h4>
                    <p style="font-size: 0.9rem; margin: 0.5rem 0 1rem;">Montant à payer : <strong>${formatPrice(getSubtotal() + 2000)}</strong></p>
                    <form class="cart-form" id="om-form">
                        <label>
                            Numéro Orange Money
                            <input type="tel" name="omPhone" value="${deliveryInfo.phone}" placeholder="Ex: 628 06 94 79" required>
                        </label>
                    </form>
                    <button type="button" class="button button-light" id="back-to-payment" style="margin-top: 0.75rem; width: 100%; padding: 0.75rem;">Retour</button>
                </div>
            `;
            if (cartValidateButton) {
                cartValidateButton.textContent = 'Confirmer le paiement';
                cartValidateButton.style.display = 'block';
            }
            return;
        }

        // ÉTAPE 3ter : Chargement (simulation de traitement du paiement)
        if (currentStep === 'processing') {
            cartBody.innerHTML = `
                <div class="om-processing">
                    <div class="om-spinner" aria-hidden="true"></div>
                    <p>Traitement du paiement en cours...</p>
                </div>
            `;
            if (cartValidateButton) cartValidateButton.style.display = 'none';
            return;
        }

        // ÉTAPE 4 : Confirmation de commande
        if (currentStep === 'confirmation') {
            const deliveryFee = 2000;
            const totalWithDelivery = getSubtotal() + deliveryFee;
            const paymentLabel = paymentMethod === 'orange_money' ? 'Orange Money' : 'Paiement à la livraison';

            cartBody.innerHTML = `
                <div class="cart-confirmation">
                    <h4 style="font-family: 'Cormorant Garamond', serif; font-size: 1.3rem; color: var(--forest-green); margin-bottom: 0.5rem;">
                        ${paymentMethod === 'orange_money' ? 'Paiement confirmé ✅' : 'Commande envoyée !'}
                    </h4>
                    ${paymentMethod === 'orange_money' ? `<p style="font-size: 0.85rem; color: #4e4638;">Référence : <strong>${transactionRef}</strong></p>` : ''}
                    <p style="font-size: 0.9rem; margin: 0.5rem 0 1rem;">Votre commande a été générée et vous allez être redirigé vers WhatsApp pour finaliser l'envoi.</p>
                    <p><strong>Client :</strong> ${deliveryInfo.name}</p>
                    <p><strong>Téléphone :</strong> ${deliveryInfo.phone}</p>
                    <p><strong>Adresse :</strong> ${deliveryInfo.address}</p>
                    <p><strong>Paiement :</strong> ${paymentLabel}</p>
                    <div class="cart-summary" style="margin-top: 1rem;">
                        <div class="cart-summary__row"><span>Sous-total</span><strong>${formatPrice(getSubtotal())}</strong></div>
                        <div class="cart-summary__row"><span>Livraison</span><strong>${formatPrice(deliveryFee)}</strong></div>
                        <div class="cart-summary__row"><span>Total</span><strong>${formatPrice(totalWithDelivery)}</strong></div>
                    </div>
                    <button type="button" class="button button-dark full" id="restart-order" style="margin-top: 1rem;">Nouvelle commande</button>
                </div>
            `;
            if (cartTotalPrice) cartTotalPrice.textContent = formatPrice(totalWithDelivery);
            if (cartValidateButton) {
                cartValidateButton.style.display = 'none'; // Cacher le bouton principal car on a le bouton 'restart-order'
            }
        }
    };

    /* ---------- Stockage & bannière "Recommander ma dernière commande" ---------- */
    const LAST_ORDER_KEY = 'crazycook:lastOrder';
    const saveLastOrder = () => {
        try {
            const payload = {
                items: cart.map(i => ({ name: i.name, price: i.price, quantity: i.quantity })),
                savedAt: Date.now()
            };
            localStorage.setItem(LAST_ORDER_KEY, JSON.stringify(payload));
        } catch (e) { /* ignore */ }
    };

    const readLastOrder = () => {
        try {
            const raw = localStorage.getItem(LAST_ORDER_KEY);
            if (!raw) return null;
            return JSON.parse(raw);
        } catch (e) { return null; }
    };

    const showReorderIfNeeded = () => {
        if (!reorderBanner) return;
        // Ne pas réafficher si déjà fermé en session
        if (sessionStorage.getItem('crazycook:reorderDismissed')) return;
        const last = readLastOrder();
        if (!last || !last.items || !last.items.length) return;
        reorderBanner.hidden = false;
        // Résumé succinct
        reorderSummary.textContent = last.items.map(i => `${i.name} ×${i.quantity}`).join(' · ');
    };

    // Recomposer le panier depuis la dernière commande
    reorderButton?.addEventListener('click', () => {
        const last = readLastOrder();
        if (!last) return;
        cart = last.items.map(i => ({ name: i.name, price: i.price, quantity: i.quantity }));
        bumpBadge();
        renderCart();
        // masquer la bannière pour cette session
        if (reorderBanner) reorderBanner.hidden = true;
        sessionStorage.setItem('crazycook:reorderDismissed', '1');
    });

    reorderDismiss?.addEventListener('click', () => {
        if (reorderBanner) reorderBanner.hidden = true;
        sessionStorage.setItem('crazycook:reorderDismissed', '1');
    });

    // Affiche la bannière si on a une commande précédente
    showReorderIfNeeded();

    // Ouvrir le tiroir panier
    const openCart = () => {
        if (!cartDrawer) return;
        cartDrawer.classList.add('is-open');
        cartDrawer.setAttribute('aria-hidden', 'false');
        cartOverlay?.classList.add('is-visible');
        cartToggle?.setAttribute('aria-expanded', 'true');
        mobileCartToggle?.setAttribute('aria-expanded', 'true');
    };

    // Fermer le tiroir panier
    const closeCart = () => {
        if (!cartDrawer) return;
        cartDrawer.classList.remove('is-open');
        cartDrawer.setAttribute('aria-hidden', 'true');
        cartOverlay?.classList.remove('is-visible');
        cartToggle?.setAttribute('aria-expanded', 'false');
        mobileCartToggle?.setAttribute('aria-expanded', 'false');
    };

    // Ajouter un élément au panier
    const addToCart = (name, price) => {
        const existingItem = cart.find((item) => item.name === name);
        if (existingItem) {
            existingItem.quantity += 1;
        } else {
            cart.push({ name, price, quantity: 1 });
        }
        bumpBadge();
        renderCart();
    };

    // Mettre à jour les quantités d'un plat
    const updateQuantity = (name, delta) => {
        cart = cart
            .map((item) => item.name === name ? { ...item, quantity: item.quantity + delta } : item)
            .filter((item) => item.quantity > 0);
        renderCart();
    };

    // Supprimer un plat du panier
    const removeItem = (name) => {
        cart = cart.filter((item) => item.name !== name);
        renderCart();
    };

    // Redirection WhatsApp de la commande formulée proprement
    const sendWhatsAppOrder = () => {
        const paymentLabel = paymentMethod === 'orange_money' ? `Orange Money (réf. ${transactionRef})` : 'Paiement à la livraison';

        // Génération de la liste des plats commandés (sans les prix)
        const itemsList = cart
            .map(item => `• *${item.quantity}x* ${item.name}`)
            .join('\n');

        // Formatage final premium et soigné du message (sans les prix)
        const message = `Bonjour CrazyCook 🍳 !

Voici une nouvelle commande :

${itemsList}

----------------------------------------
*Paiement* : ${paymentLabel}

----------------------------------------
*Informations de livraison* :
• *Nom* : ${deliveryInfo.name}
• *Téléphone* : ${deliveryInfo.phone}
• *Adresse* : ${deliveryInfo.address}
${deliveryInfo.note ? `• *Note pour le chef* : ${deliveryInfo.note}` : ''}

Merci et à très bientôt chez CrazyCook ! ✨`;

        // Encodage complet de l'URL WhatsApp
        const encodedMessage = encodeURIComponent(message);
        const phoneNumber = '224628069479'; // Restaurant localisé à Conakry, Guinée (+224)
        const whatsAppUrl = `https://wa.me/${phoneNumber}?text=${encodedMessage}`;

        // Redirige ou ouvre la discussion WhatsApp dans une nouvelle fenêtre
        window.open(whatsAppUrl, '_blank');
    };

    // Gérer l'étape suivante dans le processus de commande
    const validateOrder = () => {
        if (!cart.length) return;

        if (currentStep === 'cart') {
            currentStep = 'delivery';
            renderCart();
            return;
        }

        if (currentStep === 'delivery') {
            const form = document.getElementById('delivery-form');
            if (!form) return;

            // Déclencher et vérifier la validation HTML5 native
            if (!form.reportValidity()) {
                return;
            }

            const data = new FormData(form);
            deliveryInfo = Object.fromEntries(data.entries());

            currentStep = 'payment';
            renderCart();
            return;
        }

        if (currentStep === 'orange_money_form') {
            const form = document.getElementById('om-form');
            if (!form || !form.reportValidity()) return;

            // SIMULATION — pas de vrai paiement, prototype de démonstration
            currentStep = 'processing';
            renderCart();

            setTimeout(() => {
                transactionRef = `OM-${Math.floor(100000 + Math.random() * 900000)}`;
                currentStep = 'confirmation';
                renderCart();
                // Sauvegarde de la dernière commande puis envoi
                try { saveLastOrder(); } catch (e) {}
                sendWhatsAppOrder();
            }, 1800);
        }
    };

    // Réinitialisation complète du panier pour une nouvelle commande
    const restartOrder = () => {
        cart = [];
        currentStep = 'cart';
        paymentMethod = null;
        transactionRef = null;
        deliveryInfo = { name: '', phone: '', address: '', note: '' };
        renderCart();
        closeCart();
    };

    // Initialisation
    toggleHeader();
    window.addEventListener('scroll', toggleHeader, { passive: true });

    // Intersection Observer pour les révélations d'éléments lors du scroll
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

    // Attribution des écouteurs sur les boutons "Ajouter au panier"
    document.querySelectorAll('.add-to-cart').forEach((button) => {
        button.addEventListener('click', (ev) => {
            // micro-feedback visuel + vibration
            showAddFeedback(button);
            addToCart(button.dataset.name, Number(button.dataset.price));
        });
    });

    // Clics sur l'icône de panier du Header
    cartToggle?.addEventListener('click', () => {
        const isOpen = cartDrawer?.classList.contains('is-open');
        if (isOpen) {
            closeCart();
        } else {
            openCart();
        }
    });

    // Clics sur l'icône de panier de la barre collante mobile
    mobileCartToggle?.addEventListener('click', () => {
        const isOpen = cartDrawer?.classList.contains('is-open');
        if (isOpen) {
            closeCart();
        } else {
            openCart();
        }
    });

    // Clics sur le lien panier du footer
    footerCartToggle?.addEventListener('click', (e) => {
        e.preventDefault();
        const isOpen = cartDrawer?.classList.contains('is-open');
        if (isOpen) {
            closeCart();
        } else {
            openCart();
        }
    });

    drawerClose?.addEventListener('click', closeCart);
    cartOverlay?.addEventListener('click', closeCart);

    // Écoute des événements à l'intérieur du corps du panier (Boutons + / - / Supprimer / Retour)
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
            currentStep = 'cart';
            renderCart();
            return;
        }

        if (target.id === 'back-to-delivery') {
            currentStep = 'delivery';
            renderCart();
            return;
        }

        if (target.id === 'back-to-payment') {
            currentStep = 'payment';
            renderCart();
            return;
        }

        if (target.closest('[data-payment]')) {
            const choice = target.closest('[data-payment]').dataset.payment;
            paymentMethod = choice;

            if (choice === 'orange_money') {
                currentStep = 'orange_money_form';
                renderCart();
            } else {
                // Paiement à la livraison : pas de simulation nécessaire, on confirme directement
                currentStep = 'confirmation';
                renderCart();
                try { saveLastOrder(); } catch (e) {}
                sendWhatsAppOrder();
            }
            return;
        }

        if (target.id === 'restart-order') {
            restartOrder();
        }
    });

    // Gestion de la soumission du formulaire de livraison
    cartBody?.addEventListener('submit', (event) => {
        if (event.target instanceof HTMLFormElement && (event.target.id === 'delivery-form' || event.target.id === 'om-form')) {
            event.preventDefault();
            validateOrder();
        }
    });

    // Écouteur sur le bouton de pied de page du tiroir
    cartValidateButton?.addEventListener('click', () => {
        if (currentStep === 'confirmation') {
            restartOrder();
            return;
        }
        validateOrder();
    });

    // Gestion de l'accordéon FAQ
    const faqTriggers = document.querySelectorAll('.faq-trigger');
    faqTriggers.forEach((trigger) => {
        trigger.addEventListener('click', () => {
            const isExpanded = trigger.getAttribute('aria-expanded') === 'true';
            const answerId = trigger.getAttribute('aria-controls');
            const answerEl = document.getElementById(answerId);

            // Fermer les autres accordéons (optionnel, pour un effet de focus soigné)
            faqTriggers.forEach((otherTrigger) => {
                if (otherTrigger !== trigger) {
                    otherTrigger.setAttribute('aria-expanded', 'false');
                    const otherAnswerId = otherTrigger.getAttribute('aria-controls');
                    const otherAnswerEl = document.getElementById(otherAnswerId);
                    if (otherAnswerEl) {
                        otherAnswerEl.setAttribute('aria-hidden', 'true');
                    }
                }
            });

            // Basculer l'état actuel
            trigger.setAttribute('aria-expanded', !isExpanded ? 'true' : 'false');
            if (answerEl) {
                answerEl.setAttribute('aria-hidden', isExpanded ? 'true' : 'false');
            }
        });
    });

    // Premier rendu du panier au chargement
    renderCart();
});
