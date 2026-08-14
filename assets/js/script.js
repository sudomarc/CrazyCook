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
    const stepperElement = document.getElementById('checkout-stepper');
    let deliveryInfo = {
        name: '',
        phone: '',
        address: '',
        note: ''
    };
    let previouslyFocusedElement = null; // Élément qui avait le focus avant l'ouverture du panier

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

    // Mise à jour de l'état visuel du stepper de checkout
    const updateStepper = () => {
        if (!stepperElement) return;

        // On cache le stepper si le panier est vide ou si on est en confirmation/chargement
        if (cart.length === 0 || currentStep === 'processing' || currentStep === 'confirmation') {
            stepperElement.hidden = true;
            return;
        }

        stepperElement.hidden = false;

        const steps = ['cart', 'delivery', 'payment'];
        const currentIdx = steps.indexOf(currentStep === 'orange_money_form' ? 'payment' : currentStep);

        const stepItems = stepperElement.querySelectorAll('.step-item');
        const stepLines = stepperElement.querySelectorAll('.step-line');

        stepItems.forEach((item, idx) => {
            const stepName = item.dataset.step;
            item.classList.remove('active', 'completed');
            item.removeAttribute('aria-current');

            if (idx < currentIdx) {
                item.classList.add('completed');
            } else if (idx === currentIdx) {
                item.classList.add('active');
                item.setAttribute('aria-current', 'step');
            }
        });

        stepLines.forEach((line, idx) => {
            line.classList.remove('active', 'completed');
            if (idx < currentIdx) {
                line.classList.add('completed');
            } else if (idx === currentIdx) {
                line.classList.add('active');
            }
        });
    };

    // Formatage des prix en GNF (ex: 16 000 GNF)
    const formatPrice = (value) => `${value.toLocaleString('fr-FR')} GNF`;

    // SÉCURITÉ : échappe le HTML avant d'injecter des données saisies par
    // l'utilisateur (nom, téléphone, adresse, note) dans innerHTML.
    // Sans ça, un input du type "><img src=x onerror=alert(1)> exécute du JS (XSS).
    const escapeHtml = (str) => String(str ?? '').replace(/[&<>"']/g, (ch) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
    }[ch]));

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
        const themeIcon = document.getElementById('theme-icon');
        if (theme === 'dark') {
            document.documentElement.setAttribute('data-theme', 'dark');
            themeToggle?.setAttribute('aria-pressed', 'true');
            themeToggle?.setAttribute('aria-label', 'Basculer le thème clair');
            themeToggle?.setAttribute('title', 'Basculer le thème clair');
            if (themeIcon) {
                themeIcon.setAttribute('d', 'M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z');
                themeIcon.setAttribute('fill', 'currentColor');
            }
        } else {
            document.documentElement.removeAttribute('data-theme');
            themeToggle?.setAttribute('aria-pressed', 'false');
            themeToggle?.setAttribute('aria-label', 'Basculer le thème sombre');
            themeToggle?.setAttribute('title', 'Basculer le thème sombre');
            if (themeIcon) {
                themeIcon.setAttribute('d', 'M12 3v2M12 19v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4M12 6a6 6 0 100 12 6 6 0 000-12z');
                themeIcon.setAttribute('fill', 'none');
            }
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

        // Ajouter la classe de rotation de l'icône de thème
        themeToggle.classList.add('theme-toggle-rotated');
        setTimeout(() => {
            themeToggle.classList.remove('theme-toggle-rotated');
        }, 450);

        applyTheme(isDark ? 'light' : 'dark');
    });

    /* ---------- Image skeleton helper (appelé depuis l'attribut onload/onerror des images) ---------- */
    // Note : imageLoaded et imageFailed sont définis de manière globale et en ligne dans index.html
    // pour éviter toute condition de course (race condition) avec le chargement des images.
    // Utilisation d'un IntersectionObserver pour ne lancer le timeout de sécurité que lorsque l'image commence à s'approcher de la zone visible (lazy loading).
    const imageFallbackObserver = new IntersectionObserver((entries, obs) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                const imgEl = entry.target;
                setTimeout(() => {
                    if (!imgEl.classList.contains('loaded') && typeof window.imageFailed === 'function') {
                        window.imageFailed(imgEl);
                    }
                }, 3500);
                obs.unobserve(imgEl);
            }
        });
    }, { rootMargin: '200px 0px' });

    document.querySelectorAll('.skeleton-img').forEach((imgEl) => {
        imageFallbackObserver.observe(imgEl);
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

        // Synchroniser le stepper
        updateStepper();

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
            cartBody.innerHTML = `
                <div class="empty-state-container">
                    <p class="empty-state-text">Ajoutez un plat pour composer votre commande.</p>
                    <button type="button" class="button button-dark" id="empty-cart-cta">Découvrir le menu</button>
                </div>
            `;
            if (cartTotalPrice) cartTotalPrice.textContent = '0 GNF';
            if (cartValidateButton) {
                cartValidateButton.textContent = 'Valider ma commande';
                cartValidateButton.hidden = true; // Cacher le bouton si vide sans style inline
            }
            return;
        }

        // Afficher le bouton de validation s'il y a des articles
        if (cartValidateButton) {
            cartValidateButton.hidden = false;
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
                                <button type="button" class="cart-remove" data-remove="${item.name}" aria-label="Supprimer ${item.name} du panier">Supprimer</button>
                            </div>
                            <div class="cart-item-card__meta">
                                <div class="cart-stepper">
                                    <button type="button" data-change="-" data-name="${item.name}" aria-label="Diminuer la quantité de ${item.name}">−</button>
                                    <span aria-live="polite" aria-label="Quantité de ${item.name} : ${item.quantity}">${item.quantity}</span>
                                    <button type="button" data-change="+" data-name="${item.name}" aria-label="Augmenter la quantité de ${item.name}">+</button>
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
                    <h4 class="cart-step-title">Informations de livraison</h4>
                    <form class="cart-form" id="delivery-form">
                        <label for="delivery-name">
                            <span>Nom complet <span class="required" aria-hidden="true">*</span></span>
                            <input id="delivery-name" type="text" name="name" value="${escapeHtml(deliveryInfo.name)}" placeholder="Ex: Mamadou Diallo" required>
                        </label>
                        <label for="delivery-phone">
                            <span>Numéro de téléphone <span class="required" aria-hidden="true">*</span></span>
                            <input id="delivery-phone" type="tel" name="phone" value="${escapeHtml(deliveryInfo.phone)}" placeholder="Ex: +224 628 06 94 79" required>
                        </label>
                        <label for="delivery-address">
                            <span>Adresse de livraison (ou lien Google Maps) <span class="required" aria-hidden="true">*</span></span>
                            <input id="delivery-address" type="text" name="address" value="${escapeHtml(deliveryInfo.address)}" placeholder="Ex: Kaloum, Conakry" required>
                        </label>
                        <label for="delivery-note">
                            <span>Note spéciale pour le chef</span>
                            <textarea id="delivery-note" name="note" placeholder="Ex: Épices douces, sans oignons...">${escapeHtml(deliveryInfo.note)}</textarea>
                        </label>
                        <div class="cart-actions cart-actions--delivery">
                            <button type="button" class="button button-light cart-back-btn cart-back-btn--cart" id="back-to-cart">Retour</button>
                        </div>
                    </form>
                </div>
            `;
            if (cartTotalPrice) cartTotalPrice.textContent = formatPrice(getSubtotal());
            if (cartValidateButton) {
                cartValidateButton.textContent = 'Choisir le paiement';
                cartValidateButton.hidden = false;
            }
            return;
        }

        // ÉTAPE 3 : Choix du mode de paiement
        if (currentStep === 'payment') {
            cartBody.innerHTML = `
                <div class="payment-step">
                    <h4 class="cart-step-title">Mode de paiement</h4>
                    <div class="payment-options">
                        <button type="button" class="payment-option" data-payment="orange_money">
                            <span class="payment-option__badge payment-option__badge--om">OM</span>
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
                    <button type="button" class="button button-light cart-back-btn cart-back-btn--delivery" id="back-to-delivery">Retour</button>
                </div>
            `;
            if (cartTotalPrice) cartTotalPrice.textContent = formatPrice(getSubtotal());
            if (cartValidateButton) {
                cartValidateButton.hidden = true;
            }
            return;
        }

        // ÉTAPE 3bis : Simulation du paiement Orange Money
        if (currentStep === 'orange_money_form') {
            cartBody.innerHTML = `
                <div class="om-simulation">
                    <p class="om-disclaimer"><!-- SIMULATION — pas de vrai paiement, prototype de démonstration --> Ceci est une simulation à des fins de démonstration.</p>
                    <h4 class="cart-step-title">Paiement Orange Money</h4>
                    <p class="cart-amount-info">Montant à payer : <strong>${formatPrice(getSubtotal() + 2000)}</strong></p>
                    <form class="cart-form" id="om-form">
                        <label for="om-phone">
                            <span>Numéro Orange Money <span class="required" aria-hidden="true">*</span></span>
                            <input id="om-phone" type="tel" name="omPhone" value="${escapeHtml(deliveryInfo.phone)}" placeholder="Ex: 628 06 94 79" required>
                        </label>
                    </form>
                    <button type="button" class="button button-light cart-back-btn cart-back-btn--payment" id="back-to-payment">Retour</button>
                </div>
            `;
            if (cartValidateButton) {
                cartValidateButton.textContent = 'Confirmer le paiement';
                cartValidateButton.hidden = false;
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
            if (cartValidateButton) {
                cartValidateButton.hidden = true;
            }
            return;
        }

        // ÉTAPE 4 : Confirmation de commande
        if (currentStep === 'confirmation') {
            const deliveryFee = 2000;
            const totalWithDelivery = getSubtotal() + deliveryFee;
            const paymentLabel = paymentMethod === 'orange_money' ? 'Orange Money' : 'Paiement à la livraison';

            cartBody.innerHTML = `
                <div class="cart-confirmation">
                    <h4 class="cart-confirmation-title">
                        ${paymentMethod === 'orange_money' ? 'Paiement confirmé ✅' : 'Commande envoyée !'}
                    </h4>
                    ${paymentMethod === 'orange_money' ? `<p class="cart-ref-text">Référence : <strong>${transactionRef}</strong></p>` : ''}
                    <p class="cart-congrats-text">Votre commande a été générée et vous allez être redirigé vers WhatsApp pour finaliser l'envoi.</p>
                    <p><strong>Client :</strong> ${escapeHtml(deliveryInfo.name)}</p>
                    <p><strong>Téléphone :</strong> ${escapeHtml(deliveryInfo.phone)}</p>
                    <p><strong>Adresse :</strong> ${escapeHtml(deliveryInfo.address)}</p>
                    <p><strong>Paiement :</strong> ${paymentLabel}</p>
                    <div class="cart-summary cart-summary--confirmation">
                        <div class="cart-summary__row"><span>Sous-total</span><strong>${formatPrice(getSubtotal())}</strong></div>
                        <div class="cart-summary__row"><span>Livraison</span><strong>${formatPrice(deliveryFee)}</strong></div>
                        <div class="cart-summary__row"><span>Total</span><strong>${formatPrice(totalWithDelivery)}</strong></div>
                    </div>
                    <button type="button" class="button button-dark full cart-confirmation-btn" id="restart-order">Nouvelle commande</button>
                </div>
            `;
            if (cartTotalPrice) cartTotalPrice.textContent = formatPrice(totalWithDelivery);
            if (cartValidateButton) {
                cartValidateButton.hidden = true; // Cacher le bouton principal car on a le bouton 'restart-order'
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
        // Sauvegarder l'élément actif pour pouvoir lui restituer le focus à la fermeture
        previouslyFocusedElement = document.activeElement;

        cartDrawer.classList.add('is-open');
        cartDrawer.setAttribute('aria-hidden', 'false');
        cartOverlay?.classList.add('is-visible');
        cartToggle?.setAttribute('aria-expanded', 'true');
        mobileCartToggle?.setAttribute('aria-expanded', 'true');

        // Ajouter la classe de blocage du défilement
        document.body.classList.add('cart-open');

        // Mettre le focus sur le bouton de fermeture pour une navigation au clavier fluide
        setTimeout(() => {
            if (drawerClose) {
                drawerClose.focus();
            }
        }, 50);
    };

    // Fermer le tiroir panier
    const closeCart = () => {
        if (!cartDrawer) return;
        cartDrawer.classList.remove('is-open');
        cartDrawer.setAttribute('aria-hidden', 'true');
        cartOverlay?.classList.remove('is-visible');
        cartToggle?.setAttribute('aria-expanded', 'false');
        mobileCartToggle?.setAttribute('aria-expanded', 'false');

        // Retirer la classe de blocage du défilement
        document.body.classList.remove('cart-open');

        // Restituer le focus à l'élément précédemment actif
        if (previouslyFocusedElement && typeof previouslyFocusedElement.focus === 'function') {
            previouslyFocusedElement.focus();
        }
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

    // Synchronisation dynamique des liens de navigation principale avec les sections visibles
    const sectionIds = ['histoire', 'galerie', 'contact', 'menu', 'avis', 'faq'];
    const sectionsToObserve = sectionIds
        .map(id => document.getElementById(id))
        .filter(el => el !== null);

    const navLinks = document.querySelectorAll('.main-nav a[href]');

    const syncNavObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                const id = entry.target.getAttribute('id');
                const matchingLink = Array.from(navLinks).find((link) => link.getAttribute('href') === `#${id}`);

                // BUGFIX : histoire/avis/faq n'ont pas de lien dans la nav.
                // Sans lien correspondant, on ne touche à rien (sinon ça efface
                // l'état actif de tous les liens, y compris "Accueil").
                if (!matchingLink) return;

                navLinks.forEach((link) => {
                    if (link === matchingLink) {
                        link.classList.add('active');
                        link.setAttribute('aria-current', 'page');
                    } else {
                        link.classList.remove('active');
                        link.removeAttribute('aria-current');
                    }
                });
            }
        });
    }, {
        root: null,
        rootMargin: '-40% 0px -55% 0px', // Cibler le centre de l'écran pour la synchronisation précise du menu
        threshold: 0
    });

    sectionsToObserve.forEach((section) => syncNavObserver.observe(section));

    // Gérer l'état de l'accueil spécifique
    const heroSection = document.querySelector('.hero');
    if (heroSection) {
        const heroObserver = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    navLinks.forEach((link) => {
                        const hrefAttr = link.getAttribute('href');
                        if (hrefAttr === 'index.html' || hrefAttr === '#') {
                            link.classList.add('active');
                            link.setAttribute('aria-current', 'page');
                        } else {
                            link.classList.remove('active');
                            link.removeAttribute('aria-current');
                        }
                    });
                }
            });
        }, {
            root: null,
            rootMargin: '-10% 0px -80% 0px',
            threshold: 0
        });
        heroObserver.observe(heroSection);
    }

    // Attribution des écouteurs sur les boutons "Ajouter au panier"
    document.querySelectorAll('.add-to-cart').forEach((button) => {
        button.addEventListener('click', (ev) => {
            // micro-feedback visuel + vibration
            showAddFeedback(button);
            addToCart(button.dataset.name, Number(button.dataset.price));

            // Feedback visuel temporaire sur le bouton
            if (!button.dataset.originalText) {
                button.dataset.originalText = button.textContent;
            }
            button.textContent = 'Ajouté ! ✓';
            button.classList.add('is-added');

            if (button._addedTimeout) {
                clearTimeout(button._addedTimeout);
            }
            button._addedTimeout = setTimeout(() => {
                button.textContent = button.dataset.originalText;
                button.classList.remove('is-added');
            }, 1200);
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

    // Gérer la fermeture du panier avec la touche Échap / Escape & focus trap pour l'accessibilité au clavier
    document.addEventListener('keydown', (e) => {
        const isOpen = cartDrawer?.classList.contains('is-open');
        if (!isOpen) return;

        if (e.key === 'Escape' || e.key === 'Esc') {
            closeCart();
            return;
        }

        if (e.key === 'Tab') {
            // Liste de tous les éléments focalisables à l'intérieur du tiroir panier
            const focusableElements = cartDrawer.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
            if (focusableElements.length === 0) return;

            const firstElement = focusableElements[0];
            const lastElement = focusableElements[focusableElements.length - 1];

            if (e.shiftKey) { // Shift + Tab
                if (document.activeElement === firstElement) {
                    lastElement.focus();
                    e.preventDefault();
                }
            } else { // Tab simple
                if (document.activeElement === lastElement) {
                    firstElement.focus();
                    e.preventDefault();
                }
            }
        }
    });

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
            return;
        }

        if (target.id === 'empty-cart-cta') {
            closeCart();
            const menuSection = document.getElementById('menu');
            if (menuSection) {
                menuSection.scrollIntoView({ behavior: 'smooth' });
            }
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

    // Gestion de la soumission du formulaire de contact avec un micro-feedback et un état de chargement
    const setupContactForm = () => {
        const contactForm = document.getElementById('restaurant-contact-form');
        const contactSubmit = document.getElementById('contact-submit');
        const contactWrapper = document.querySelector('.contact-form-wrapper');

        if (contactForm && contactSubmit && contactWrapper) {
            // Configuration du compteur de caractères en temps réel via délégation d'événements
            // Cela garantit que le compteur fonctionne même après la réinitialisation récursive du formulaire.
            const handleCounterUpdate = (target) => {
                const counterElement = document.getElementById('contact-message-counter');
                if (counterElement) {
                    const len = target.value.length;
                    counterElement.textContent = `${len} / 500`;
                    if (len >= 450) {
                        counterElement.classList.add('warning');
                    } else {
                        counterElement.classList.remove('warning');
                    }
                }
            };

            contactForm.addEventListener('input', (e) => {
                if (e.target && e.target.id === 'contact-message') {
                    handleCounterUpdate(e.target);
                }
            });

            // Initialisation initiale du compteur
            const initialMessageInput = document.getElementById('contact-message');
            if (initialMessageInput) {
                handleCounterUpdate(initialMessageInput);
            }

            contactForm.addEventListener('submit', (e) => {
                e.preventDefault();

                // S'assurer que le formulaire est valide selon HTML5
                if (!contactForm.reportValidity()) return;

                // Extraire le nom de l'utilisateur pour personnaliser le message de succès
                const formData = new FormData(contactForm);
                const userName = formData.get('nom') || '';

                // Mettre le formulaire en état de chargement
                contactSubmit.textContent = 'Envoi en cours...';
                contactSubmit.disabled = true;

                // Désactiver tous les champs de saisie
                const inputs = contactForm.querySelectorAll('input, textarea');
                inputs.forEach(input => input.disabled = true);

                // Simuler l'envoi asynchrone du formulaire (1.2 seconde)
                setTimeout(() => {
                    // Afficher un message de succès personnalisé et élégant
                    contactWrapper.classList.add('fade-out');

                    setTimeout(() => {
                        contactWrapper.innerHTML = `
                            <div class="contact-success-panel">
                                <h4>Merci ${userName} ! ✨</h4>
                                <p>Votre message a bien été reçu. L'équipe de CrazyCook vous répondra dans les plus brefs délais.</p>
                                <button type="button" class="button button-dark" id="contact-reset">Écrire à nouveau</button>
                            </div>
                        `;
                        contactWrapper.classList.remove('fade-out');

                        // Ajouter un écouteur sur le bouton de réinitialisation
                        const resetButton = document.getElementById('contact-reset');
                        if (resetButton) {
                            resetButton.addEventListener('click', () => {
                                contactWrapper.classList.add('fade-out');
                                setTimeout(() => {
                                    // Restaurer le formulaire original avec le compteur
                                    contactWrapper.innerHTML = `
                                        <form class="contact-form" id="restaurant-contact-form" onsubmit="return false;">
                                            <label for="contact-nom">
                                                <span>Nom complet <span class="required" aria-hidden="true" style="color: red;">*</span></span>
                                                <input id="contact-nom" type="text" name="nom" placeholder="Votre nom" aria-label="Votre nom complet" required>
                                            </label>
                                            <label for="contact-telephone">
                                                <span>Numéro de téléphone <span class="required" aria-hidden="true" style="color: red;">*</span></span>
                                                <input id="contact-telephone" type="tel" name="telephone" placeholder="Votre téléphone" aria-label="Votre numéro de téléphone" required>
                                            </label>
                                            <label for="contact-message">
                                                <span>Votre message <span class="required" aria-hidden="true" style="color: red;">*</span></span>
                                                <textarea id="contact-message" name="message" placeholder="Votre message ou question" aria-label="Votre message ou question" rows="4" maxlength="500" aria-describedby="contact-message-counter" required></textarea>
                                                <span id="contact-message-counter" class="contact-counter" aria-live="polite">0 / 500</span>
                                            </label>
                                            <button type="submit" class="button button-dark full" id="contact-submit">Envoyer</button>
                                        </form>
                                    `;
                                    contactWrapper.classList.remove('fade-out');
                                    // Setup contact form events recursively without dispatching DOMContentLoaded
                                    setupContactForm();
                                }, 300);
                            });
                        }
                    }, 300);
                }, 1200);
            });
        }
    };

    setupContactForm();

    // Synchronisation dynamique de la navigation active au scroll avec attributs d'accessibilité (aria-current)
    const setupScrollSync = () => {
        const navLinks = document.querySelectorAll('.main-nav a[href]');
        const sections = [
            { el: document.querySelector('.hero'), linkHref: 'index.html' },
            { el: document.getElementById('histoire'), linkHref: 'index.html' },
            { el: document.getElementById('avis'), linkHref: 'index.html' },
            { el: document.getElementById('menu'), linkHref: '#menu' },
            { el: document.getElementById('galerie'), linkHref: '#galerie' },
            { el: document.getElementById('contact'), linkHref: '#contact' },
            { el: document.getElementById('faq'), linkHref: '#contact' }
        ];

        const observerOptions = {
            root: null,
            rootMargin: '-30% 0px -60% 0px',
            threshold: 0
        };

        const scrollObserver = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    const sectionMap = sections.find(s => s.el === entry.target);
                    if (!sectionMap) return;

                    navLinks.forEach((link) => {
                        const href = link.getAttribute('href');
                        if (href === sectionMap.linkHref) {
                            link.classList.add('active');
                            link.setAttribute('aria-current', 'page');
                        } else {
                            link.classList.remove('active');
                            link.removeAttribute('aria-current');
                        }
                    });
                }
            });
        }, observerOptions);

        sections.forEach((sec) => {
            if (sec.el) scrollObserver.observe(sec.el);
        });
    };

    setupScrollSync();
});
