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

    // Gestion de l'état simple (Panier & Étape de commande)
    let cart = [];
    let currentStep = 'cart'; // 'cart' | 'delivery' | 'confirmation'
    let deliveryInfo = {
        name: '',
        phone: '',
        address: '',
        note: ''
    };

    // Gestion du défilement pour l'effet de transparence du header
    const toggleHeader = () => {
        if (!header) return;
        header.classList.toggle('scrolled', window.scrollY > 24);
    };

    // Formatage des prix en GNF (ex: 16 000 GNF)
    const formatPrice = (value) => `${value.toLocaleString('fr-FR')} GNF`;

    // Calcul du sous-total du panier
    const getSubtotal = () => cart.reduce((total, item) => total + item.quantity * item.price, 0);

    // Déclenchement de l'animation CSS (bump/pulse) sur le badge du panier
    const bumpBadge = () => {
        if (!cartCountBadge) return;
        cartCountBadge.classList.remove('bump');
        // Force un reflow pour relancer l'animation CSS
        void cartCountBadge.offsetWidth;
        cartCountBadge.classList.add('bump');
    };

    // Rendu dynamique du tiroir panier selon l'étape actuelle
    const renderCart = () => {
        if (!cartBody) return;

        // Mise à jour du badge dans le header
        const itemCount = cart.reduce((total, item) => total + item.quantity, 0);
        if (cartCountBadge) {
            cartCountBadge.textContent = itemCount;
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
                            <input type="tel" name="phone" value="${deliveryInfo.phone}" placeholder="Ex: +224 620 12 34 56" required>
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
            if (cartValidateButton) cartValidateButton.textContent = 'Commander via WhatsApp';
            return;
        }

        // ÉTAPE 3 : Confirmation de commande
        if (currentStep === 'confirmation') {
            const deliveryFee = 2000;
            const totalWithDelivery = getSubtotal() + deliveryFee;

            cartBody.innerHTML = `
                <div class="cart-confirmation">
                    <h4 style="font-family: 'Cormorant Garamond', serif; font-size: 1.3rem; color: var(--forest-green); margin-bottom: 0.5rem;">Commande envoyée !</h4>
                    <p style="font-size: 0.9rem; margin-bottom: 1rem;">Votre commande a été générée et vous allez être redirigé vers WhatsApp pour finaliser l'envoi.</p>
                    <p><strong>Client :</strong> ${deliveryInfo.name}</p>
                    <p><strong>Téléphone :</strong> ${deliveryInfo.phone}</p>
                    <p><strong>Adresse :</strong> ${deliveryInfo.address}</p>
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

    // Ouvrir le tiroir panier
    const openCart = () => {
        if (!cartDrawer) return;
        cartDrawer.classList.add('is-open');
        cartDrawer.setAttribute('aria-hidden', 'false');
        cartOverlay?.classList.add('is-visible');
        cartToggle?.setAttribute('aria-expanded', 'true');
    };

    // Fermer le tiroir panier
    const closeCart = () => {
        if (!cartDrawer) return;
        cartDrawer.classList.remove('is-open');
        cartDrawer.setAttribute('aria-hidden', 'true');
        cartOverlay?.classList.remove('is-visible');
        cartToggle?.setAttribute('aria-expanded', 'false');
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
        openCart();
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
        const subtotal = getSubtotal();
        const deliveryFee = 2000;
        const total = subtotal + deliveryFee;

        // Génération de la liste des plats commandés
        const itemsList = cart
            .map(item => `• *${item.quantity}x* ${item.name} (${formatPrice(item.price)}/u) -> *${formatPrice(item.quantity * item.price)}*`)
            .join('\n');

        // Formatage final premium et soigné du message
        const message = `Bonjour CrazyCook 🍳 !

Voici une nouvelle commande :

${itemsList}

----------------------------------------
*Sous-total* : ${formatPrice(subtotal)}
*Frais de livraison* : ${formatPrice(deliveryFee)}
*Total à payer* : ${formatPrice(total)}

----------------------------------------
*Informations de livraison* :
• *Nom* : ${deliveryInfo.name}
• *Téléphone* : ${deliveryInfo.phone}
• *Adresse* : ${deliveryInfo.address}
${deliveryInfo.note ? `• *Note pour le chef* : ${deliveryInfo.note}` : ''}

Merci et à très bientôt chez CrazyCook ! ✨`;

        // Encodage complet de l'URL WhatsApp
        const encodedMessage = encodeURIComponent(message);
        const phoneNumber = '224620123456'; // Restaurant localisé à Conakry, Guinée (+224)
        const whatsAppUrl = `https://wa.me/${phoneNumber}?text=${encodedMessage}`;

        // Redirige ou ouvre la discussion WhatsApp dans une nouvelle fenêtre
        window.open(whatsAppUrl, '_blank');

        // Passage à l'état de confirmation
        currentStep = 'confirmation';
        renderCart();
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

            sendWhatsAppOrder();
        }
    };

    // Réinitialisation complète du panier pour une nouvelle commande
    const restartOrder = () => {
        cart = [];
        currentStep = 'cart';
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
        button.addEventListener('click', () => {
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

        if (target.id === 'restart-order') {
            restartOrder();
        }
    });

    // Gestion de la soumission du formulaire de livraison
    cartBody?.addEventListener('submit', (event) => {
        if (event.target instanceof HTMLFormElement && event.target.id === 'delivery-form') {
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

    // Premier rendu du panier au chargement
    renderCart();
});
