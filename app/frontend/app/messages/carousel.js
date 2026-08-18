// carousel.js — everything related to the featured carousel.
// Depends on: createMessageCard (site.js). Load AFTER site.js.

const featuredCarouselState = {
    index: 0,
    items: [],
    autoplayTimer: null,
    isProgrammaticScroll: false,
};

function getFeaturedCarouselElement() {
    return document.getElementById("featured-carousel");
}

function getFeaturedCarouselCounterElement() {
    return document.getElementById("featured-carousel-counter");
}

function getFeaturedCarouselPrevButton() {
    return document.getElementById("featured-carousel-prev");
}

function getFeaturedCarouselNextButton() {
    return document.getElementById("featured-carousel-next");
}

function getFeaturedCarouselLength() {
    return featuredCarouselState.items.length;
}

function clearFeaturedCarousel() {
    const carousel = getFeaturedCarouselElement();
    if (carousel) {
        carousel.innerHTML = "";
    }

    if (featuredCarouselState.autoplayTimer) {
        window.clearInterval(featuredCarouselState.autoplayTimer);
        featuredCarouselState.autoplayTimer = null;
    }

    featuredCarouselState.index = 0;
    featuredCarouselState.items = [];
    featuredCarouselState.isProgrammaticScroll = false;
    updateFeaturedCarouselControls();
}

function updateFeaturedCarouselControls() {
    const counter = getFeaturedCarouselCounterElement();
    const prevButton = getFeaturedCarouselPrevButton();
    const nextButton = getFeaturedCarouselNextButton();
    const total = getFeaturedCarouselLength();

    if (counter) {
        counter.textContent = total > 0 ? `${featuredCarouselState.index + 1} / ${total}` : "0 / 0";
    }

    if (prevButton instanceof HTMLButtonElement) {
        prevButton.disabled = total <= 1;
    }

    if (nextButton instanceof HTMLButtonElement) {
        nextButton.disabled = total <= 1;
    }
}

function getClosestFeaturedCarouselIndex() {
    const carousel = getFeaturedCarouselElement();
    const total = getFeaturedCarouselLength();

    if (!carousel || total === 0) {
        return 0;
    }

    const width = carousel.clientWidth || 1;
    return Math.max(0, Math.min(total - 1, Math.round(carousel.scrollLeft / width)));
}

function setFeaturedCarouselIndex(index, { scroll = true } = {}) {
    const carousel = getFeaturedCarouselElement();
    const total = getFeaturedCarouselLength();

    if (!carousel || total === 0) {
        featuredCarouselState.index = 0;
        updateFeaturedCarouselControls();
        return;
    }

    const previousIndex = featuredCarouselState.index;
    const wrappedIndex = ((index % total) + total) % total;
    const isWrappingForward = previousIndex === total - 1 && wrappedIndex === 0;
    const isWrappingBackward = previousIndex === 0 && wrappedIndex === total - 1;
    const isWrapping = isWrappingForward || isWrappingBackward;

    featuredCarouselState.index = wrappedIndex;

    featuredCarouselState.items.forEach((item, itemIndex) => {
        item.classList.toggle("is-active", itemIndex === wrappedIndex);
    });

    updateFeaturedCarouselControls();

    if (scroll) {
        const targetSlide = featuredCarouselState.items[wrappedIndex];
        if (targetSlide) {
            // Mark this as a self-triggered scroll BEFORE moving, so the
            // scroll listener knows to ignore whatever it sees next.
            featuredCarouselState.isProgrammaticScroll = true;

            if (isWrapping) {
                carousel.style.scrollBehavior = "auto";
                carousel.scrollLeft = targetSlide.offsetLeft;
                requestAnimationFrame(() => {
                    carousel.style.scrollBehavior = "";
                });
            } else {
                carousel.scrollTo({
                    left: targetSlide.offsetLeft,
                    behavior: "smooth",
                });
            }
        }
    }
}

function bindFeaturedCarouselScrollSync(carousel) {
    if (carousel.dataset.scrollBound) return;
    carousel.dataset.scrollBound = "true";

    const syncFromScroll = () => {
        if (featuredCarouselState.isProgrammaticScroll) {
            featuredCarouselState.isProgrammaticScroll = false;
            return;
        }
        setFeaturedCarouselIndex(getClosestFeaturedCarouselIndex(), { scroll: false });
    };

    if ("onscrollend" in window) {
        carousel.addEventListener("scrollend", syncFromScroll, { passive: true });
    } else {
        let scrollTimer = null;
        carousel.addEventListener(
            "scroll",
            () => {
                if (scrollTimer) window.clearTimeout(scrollTimer);
                scrollTimer = window.setTimeout(syncFromScroll, 120);
            },
            { passive: true },
        );
    }
}

function bindFeaturedCarouselControls() {
    const prevButton = getFeaturedCarouselPrevButton();
    const nextButton = getFeaturedCarouselNextButton();

    if (prevButton instanceof HTMLButtonElement && !prevButton.dataset.bound) {
        prevButton.dataset.bound = "true";
        prevButton.addEventListener("click", () => {
            setFeaturedCarouselIndex(featuredCarouselState.index - 1);
        });
    }

    if (nextButton instanceof HTMLButtonElement && !nextButton.dataset.bound) {
        nextButton.dataset.bound = "true";
        nextButton.addEventListener("click", () => {
            setFeaturedCarouselIndex(featuredCarouselState.index + 1);
        });
    }
}

function startFeaturedCarouselAutoplay(intervalMs = 4000) {
    if (featuredCarouselState.autoplayTimer) {
        window.clearInterval(featuredCarouselState.autoplayTimer);
    }

    featuredCarouselState.autoplayTimer = window.setInterval(() => {
        const nextIndex = (featuredCarouselState.index + 1) % featuredCarouselState.items.length;
        setFeaturedCarouselIndex(nextIndex, { scroll: true });
    }, intervalMs);
}

function renderFeaturedCarousel(messages) {
    const carousel = getFeaturedCarouselElement();
    if (!carousel) return;

    if (!Array.isArray(messages) || messages.length === 0) {
        carousel.innerHTML = "";
        featuredCarouselState.items = [];
        featuredCarouselState.index = 0;

        if (featuredCarouselState.autoplayTimer) {
            window.clearInterval(featuredCarouselState.autoplayTimer);
            featuredCarouselState.autoplayTimer = null;
        }

        const empty = document.createElement("div");
        empty.className = "featured-carousel-empty";
        empty.textContent = "Approved messages will appear here as a featured carousel.";
        carousel.appendChild(empty);
        updateFeaturedCarouselControls();
        return;
    }

    const sortedMessages = [...messages].sort(
        (a, b) => new Date(a.created_at) - new Date(b.created_at)
    );

    // Remove the "empty" placeholder if it's still there from a previous empty state
    const emptyPlaceholder = carousel.querySelector(".featured-carousel-empty");
    if (emptyPlaceholder) {
        emptyPlaceholder.remove();
    }

    const existingSlideById = new Map();
    for (const slide of featuredCarouselState.items) {
        existingSlideById.set(slide.dataset.messageId, slide);
    }

    const newItems = [];

    sortedMessages.forEach((message, index) => {
        const messageId = String(message.id);
        let slide = existingSlideById.get(messageId);

        if (slide) {
            const lastRenderedAt = slide.dataset.updatedAt;
            const currentUpdatedAt = String(message.updated_at || message.created_at || "");

            if (lastRenderedAt !== currentUpdatedAt) {
                const oldCard = slide.querySelector(".featured-message-card");
                const newCard = createMessageCard(message, index, { includeAttachments: false });
                newCard.classList.add("featured-message-card");

                if (oldCard) {
                    slide.replaceChild(newCard, oldCard);
                } else {
                    slide.appendChild(newCard);
                }

                slide.dataset.updatedAt = currentUpdatedAt;
            }

            existingSlideById.delete(messageId);
        } else {
            slide = document.createElement("div");
            slide.className = "featured-slide";
            slide.dataset.messageId = messageId;

            const card = createMessageCard(message, index, { includeAttachments: false });
            card.classList.add("featured-message-card");
            slide.appendChild(card);
            slide.dataset.updatedAt = String(message.updated_at || message.created_at || "");
        }

        newItems.push(slide);
    });

    // Remove slides for messages that no longer exist
    for (const staleSlide of existingSlideById.values()) {
        staleSlide.remove();
    }

    // Re-append in correct order (moves existing nodes without recreating them)
    newItems.forEach((slide) => carousel.appendChild(slide));

    featuredCarouselState.items = newItems;

    bindFeaturedCarouselControls();
    updateFeaturedCarouselControls();

    const preservedIndex = Math.min(featuredCarouselState.index, newItems.length - 1);
    setFeaturedCarouselIndex(preservedIndex, { scroll: false });

    if (featuredCarouselState.autoplayTimer) {
        window.clearInterval(featuredCarouselState.autoplayTimer);
        featuredCarouselState.autoplayTimer = null;
    }

    if (newItems.length > 1) {
        startFeaturedCarouselAutoplay();
    }

    bindFeaturedCarouselScrollSync(carousel);
}

import { createMessageCard } from "./messages.js";