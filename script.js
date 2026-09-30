(function () {
    const appState = {
        logoTimers: [],
        nameTimers: [],
        mobileMenuBound: false,
        navHandlersBound: false,
        revealObserver: null,
        isNavigating: false
    };

    function clearTimers(timerList) {
        timerList.forEach((timerId) => clearTimeout(timerId));
        timerList.length = 0;
    }

    function getCurrentPageName() {
        return window.location.pathname.split('/').pop() || 'index.html';
    }

    function getLogoTextByUrl(url) {
        const path = new URL(url, window.location.href).pathname.toLowerCase();
        if (path.includes('projects.html')) return 'Daftar Project';
        if (path.includes('articles.html')) return 'Daftar Artikel';
        return 'Web Development';
    }

    function isInternalPageLink(linkEl) {
        if (!linkEl) return false;

        const href = linkEl.getAttribute('href');
        if (!href || href.startsWith('#')) return false;
        if (/^(mailto:|tel:|javascript:)/i.test(href)) return false;

        const url = new URL(href, window.location.href);
        return url.origin === window.location.origin && /\.(html?)$/i.test(url.pathname);
    }

    function getAjaxWrapper() {
        return document.getElementById('ajax-wrapper') || document.querySelector('main.page-shell') || document.body;
    }

    function initLogoTyping() {
        const logoElement = document.getElementById('logo-text');
        if (!logoElement) return;

        const targetText = getLogoTextByUrl(window.location.href);
        let charIndex = 0;
        let isDeleting = false;

        clearTimers(appState.logoTimers);
        logoElement.textContent = '';

        const typeLoop = () => {
            if (!isDeleting) {
                charIndex += 1;
                logoElement.textContent = targetText.slice(0, charIndex);

                if (charIndex >= targetText.length) {
                    const pauseId = setTimeout(() => {
                        isDeleting = true;
                        typeLoop();
                    }, 1800);
                    appState.logoTimers.push(pauseId);
                    return;
                }
            } else {
                charIndex -= 1;
                logoElement.textContent = targetText.slice(0, charIndex);

                if (charIndex <= 0) {
                    isDeleting = false;
                    const restartId = setTimeout(typeLoop, 180);
                    appState.logoTimers.push(restartId);
                    return;
                }
            }

            const speed = isDeleting ? 55 : 90;
            const timeoutId = setTimeout(typeLoop, speed);
            appState.logoTimers.push(timeoutId);
        };

        typeLoop();
    }

    function initNameTyping() {
        const nameElement = document.querySelector('.typing-name');
        if (!nameElement) return;

        const fullText = (nameElement.dataset.text || nameElement.textContent || '').trim();
        if (!fullText) return;

        clearTimers(appState.nameTimers);
        nameElement.textContent = '';

        let charIndex = 0;
        let isDeleting = false;

        const tick = () => {
            if (!isDeleting) {
                charIndex += 1;
                nameElement.textContent = fullText.slice(0, charIndex);

                if (charIndex >= fullText.length) {
                    const pauseId = setTimeout(() => {
                        isDeleting = true;
                        tick();
                    }, 1400);
                    appState.nameTimers.push(pauseId);
                    return;
                }
            } else {
                charIndex -= 1;
                nameElement.textContent = fullText.slice(0, charIndex);

                if (charIndex <= 0) {
                    isDeleting = false;
                    const restartId = setTimeout(tick, 180);
                    appState.nameTimers.push(restartId);
                    return;
                }
            }

            const speed = isDeleting ? 45 : 95;
            const timeoutId = setTimeout(tick, speed);
            appState.nameTimers.push(timeoutId);
        };

        tick();
    }

    function syncActiveNav() {
        const currentPath = getCurrentPageName();
        const currentHash = window.location.hash || '';

        document.querySelectorAll('#nav-menu a').forEach((link) => {
            const href = (link.getAttribute('href') || '').split('?')[0];
            const normalized = href.split('#')[0];
            const isHomeLink = normalized === 'index.html' && currentPath === 'index.html' && !currentHash;
            const isContactLink = normalized === 'index.html' && currentHash.includes('contact');
            const matchesCurrentPage = normalized === currentPath;
            link.classList.toggle('active', isHomeLink || isContactLink || matchesCurrentPage);
        });
    }

    function setupMobileMenu() {
        const menuToggle = document.getElementById('mobile-menu');
        const navMenu = document.getElementById('nav-menu');

        if (!menuToggle || !navMenu || appState.mobileMenuBound) return;

        menuToggle.addEventListener('click', () => {
            const isOpen = navMenu.classList.toggle('active');
            menuToggle.setAttribute('aria-expanded', String(isOpen));
        });

        document.addEventListener('click', (event) => {
            const target = event.target;
            if (!(target instanceof Node)) return;

            const clickedInsideNav = navMenu.contains(target);
            const clickedMenuButton = menuToggle.contains(target);

            if (navMenu.classList.contains('active') && !clickedInsideNav && !clickedMenuButton) {
                navMenu.classList.remove('active');
                menuToggle.setAttribute('aria-expanded', 'false');
            }
        });

        appState.mobileMenuBound = true;
    }

    function loadPage(url, shouldPushState = true) {
        if (appState.isNavigating) return;

        const targetUrl = new URL(url, window.location.href);
        if (targetUrl.origin !== window.location.origin || !/\.(html?)$/i.test(targetUrl.pathname)) {
            window.location.href = targetUrl.href;
            return;
        }

        const currentWrapper = getAjaxWrapper();
        if (!currentWrapper || currentWrapper === document.body && !document.getElementById('ajax-wrapper')) {
            window.location.href = targetUrl.href;
            return;
        }

        appState.isNavigating = true;
        const mainContent = document.querySelector('main.page-shell');
        if (mainContent) {
            mainContent.classList.add('is-loading');
        }

        fetch(targetUrl.href)
            .then((response) => {
                if (!response.ok) throw new Error('Halaman gagal dimuat');
                return response.text();
            })
            .then((html) => {
                const parser = new DOMParser();
                const newDoc = parser.parseFromString(html, 'text/html');
                const newWrapper = newDoc.getElementById('ajax-wrapper');
                const newTitle = newDoc.title || 'Portfolio';

                if (!newWrapper) {
                    throw new Error('Konten halaman tujuan tidak ditemukan');
                }

                currentWrapper.innerHTML = newWrapper.innerHTML;
                document.title = newTitle;

                if (shouldPushState) {
                    history.pushState({ page: targetUrl.pathname }, '', targetUrl.href);
                }

                initializePage();
            })
            .catch((error) => {
                console.error('[page-load]', error);
                window.location.href = targetUrl.href;
            })
            .finally(() => {
                const mainContentAfter = document.querySelector('main.page-shell');
                if (mainContentAfter) {
                    mainContentAfter.classList.remove('is-loading');
                }
                appState.isNavigating = false;
            });
    }

    function bindPageNavigation() {
        if (appState.navHandlersBound) return;

        document.addEventListener('click', (event) => {
            const target = event.target;
            if (!(target instanceof Element)) return;

            const link = target.closest('a');
            if (!link || !isInternalPageLink(link)) return;

            const targetUrl = new URL(link.href, window.location.href);
            if (targetUrl.href === window.location.href.split('#')[0]) return;

            event.preventDefault();
            loadPage(targetUrl.href, true);
        });

        window.addEventListener('popstate', (event) => {
            const targetPage = event.state && event.state.page ? event.state.page : window.location.pathname;
            loadPage(targetPage, false);
        });

        appState.navHandlersBound = true;
    }

    function setupRevealAnimations() {
        if (appState.revealObserver) {
            appState.revealObserver.disconnect();
            appState.revealObserver = null;
        }

        const animatedElements = document.querySelectorAll('.section, .project-folder, .article-card, .contact-card, .focus-card, .about-copy, .profile-frame');

        const revealNow = () => {
            animatedElements.forEach((element) => {
                if (!element.classList.contains('is-visible')) {
                    element.classList.add('is-visible');
                }
            });
        };

        revealNow();

        if (!('IntersectionObserver' in window)) {
            return;
        }

        appState.revealObserver = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('is-visible');
                    appState.revealObserver.unobserve(entry.target);
                }
            });
        }, { threshold: 0.12 });

        animatedElements.forEach((element) => {
            if (!element.classList.contains('is-visible')) {
                appState.revealObserver.observe(element);
            }
        });
    }

    function initializePage() {
        syncActiveNav();
        initLogoTyping();
        initNameTyping();
        setupMobileMenu();
        bindPageNavigation();
        setupRevealAnimations();

        if (window.AOS) {
            if (typeof window.AOS.refresh === 'function') {
                window.AOS.refresh();
            } else if (typeof window.AOS.refreshHard === 'function') {
                window.AOS.refreshHard();
            }
        }
    }

    document.addEventListener('DOMContentLoaded', initializePage);
    window.addEventListener('pageshow', initializePage);
})();