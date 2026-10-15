const contentUrl = new URL('./data/site-content.json', document.baseURI);
const today = new Date();
const todayKey = formatDateKey(today);
const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const monthFormatter = new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric' });
const eventDateFormatter = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' });
let allEvents = [];
let visibleEvents = [];
let weeklyClasses = [];
let calendarDate = new Date(today.getFullYear(), today.getMonth(), 1);
let selectedDate = '';
let testimonialResizeObserver;
const retreatGalleriesTemplate = document.querySelector('.retreat-galleries')?.cloneNode(true);
const fallbackReviews = [
    {
        id: 'review-sam',
        name: 'Sam',
        quote: 'Maureen is the most wonderful Yoga teacher. I was immediately bowled over by her calm, patience, good humour, grace and expertise.',
        featured: true,
        highlight: 'Maureen is the most wonderful Yoga teacher. I was immediately bowled over by her calm, patience, good humour, grace and expertise.'
    },
    {
        id: 'review-kate',
        name: 'Kate',
        quote: 'For anyone wanting to try Yoga, Maureen provides an excellent class and I am constantly learning new things about Yoga.',
        featured: true,
        highlight: 'For anyone wanting to try Yoga, Maureen provides an excellent class and I am constantly learning new things about Yoga.'
    },
    {
        id: 'review-amber',
        name: 'Amber',
        quote: 'Her approach is open, honest, warm and friendly and she is a gem in the yoga world!',
        featured: true,
        highlight: 'Her approach is open, honest, warm and friendly and she is a gem in the yoga world!'
    }
];

function formatDateKey(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function parseDateKey(dateKey) {
    const [year, month, day] = dateKey.split('-').map(Number);
    return new Date(year, month - 1, day);
}

function makeElement(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text) element.textContent = text;
    return element;
}

function makeUiIcon(pathData) {
    const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    icon.setAttribute('class', 'ui-icon');
    icon.setAttribute('viewBox', '0 0 12 12');
    icon.setAttribute('aria-hidden', 'true');
    icon.setAttribute('focusable', 'false');
    path.setAttribute('d', pathData);
    icon.append(path);
    return icon;
}

function renderAnnouncements(announcements = []) {
    const active = announcements.filter((announcement) => announcement.active);
    const band = document.querySelector('#announcements');
    const copy = document.querySelector('#announcement-copy');
    copy.replaceChildren();
    band.hidden = active.length === 0;

    active.forEach((announcement) => {
        const item = makeElement('article', 'announcement-item');
        const icon = makeElement('div', 'announcement-icon');
        const iconImage = makeElement('img');
        const content = makeElement('div', 'announcement-item-copy');
        const title = makeElement('h2', '', announcement.title || 'A note from Maureen');
        const message = makeElement('p', '', announcement.message || '');
        icon.setAttribute('aria-hidden', 'true');
        iconImage.src = './pics/lotus.svg';
        iconImage.alt = '';
        icon.append(iconImage);
        content.append(title, message);
        if (announcement.link && announcement.linkText && /^(https?:\/\/|mailto:|tel:|#)/i.test(announcement.link)) {
            const link = makeElement('a', 'text-link', announcement.linkText);
            link.href = announcement.link;
            link.append(makeElement('span', '', '↗'));
            content.append(link);
        }
        item.append(icon, content);
        copy.append(item);
    });
}

function makeEventCard(event, isClass = false) {
    const card = makeElement('article', 'event-card');
    const date = parseDateKey(event.date);
    const dateBadge = makeElement('div', 'event-date');
    dateBadge.append(
        makeElement('strong', '', String(date.getDate()).padStart(2, '0')),
        makeElement('span', '', new Intl.DateTimeFormat('en-GB', { month: 'short' }).format(date))
    );
    const details = makeElement('div');
    if (isClass) details.append(makeElement('span', 'event-type', 'Weekly class'));
    details.append(
        makeElement('h4', '', event.title),
        makeElement('p', '', `${event.time || ''}${event.location ? ` · ${event.location}` : ''}`)
    );
    if (event.description) details.append(makeElement('p', 'event-detail', event.description));
    if (event.price) details.append(makeElement('p', 'event-detail', event.price));
    card.append(dateBadge, details);
    return card;
}

function getClassesOnDate(dateKey) {
    const weekday = new Intl.DateTimeFormat('en-GB', { weekday: 'long' }).format(parseDateKey(dateKey));
    return weeklyClasses
        .filter((session) => session.day.toLowerCase() === weekday.toLowerCase())
        .map((session) => ({
            ...session,
            date: dateKey,
            location: session.place,
            id: `${session.id}-${dateKey}`,
            isClass: true
        }));
}

function renderEventList() {
    const list = document.querySelector('#event-list');
    const count = document.querySelector('#event-count');
    const items = selectedDate
        ? [
            ...visibleEvents.filter((event) => event.date === selectedDate),
            ...getClassesOnDate(selectedDate)
        ]
        : visibleEvents.filter((event) => event.date >= todayKey).slice(0, 4);
    list.replaceChildren();
    count.textContent = selectedDate ? 'Selected day' : `${items.length} ahead`;
    if (selectedDate && items.length === 0) {
        list.append(makeElement('p', 'event-empty', 'No classes or events are scheduled for this day.'));
    } else if (items.length === 0) {
        list.append(makeElement('p', 'event-empty', 'There are no upcoming dates just now. Check back soon or get in touch with Maureen.'));
    } else {
        items.forEach((item) => list.append(makeEventCard(item, item.isClass)));
    }
}

function renderCalendar() {
    const grid = document.querySelector('#calendar-grid');
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysThisMonth = new Date(year, month + 1, 0).getDate();
    const daysPreviousMonth = new Date(year, month, 0).getDate();
    const eventDates = new Set(visibleEvents.map((event) => event.date));
    document.querySelector('#calendar-month').textContent = monthFormatter.format(calendarDate);
    grid.replaceChildren();

    weekdays.forEach((day) => {
        const weekday = makeElement('span', 'calendar-weekday', day);
        weekday.setAttribute('role', 'columnheader');
        grid.append(weekday);
    });

    for (let cellIndex = 0; cellIndex < 42; cellIndex += 1) {
        let dayNumber;
        let cellDate;
        let outside = false;
        if (cellIndex < firstDay) {
            dayNumber = daysPreviousMonth - firstDay + cellIndex + 1;
            cellDate = new Date(year, month - 1, dayNumber);
            outside = true;
        } else if (cellIndex >= firstDay + daysThisMonth) {
            dayNumber = cellIndex - firstDay - daysThisMonth + 1;
            cellDate = new Date(year, month + 1, dayNumber);
            outside = true;
        } else {
            dayNumber = cellIndex - firstDay + 1;
            cellDate = new Date(year, month, dayNumber);
        }
        const dateKey = formatDateKey(cellDate);
        const weekdayName = new Intl.DateTimeFormat('en-GB', { weekday: 'long' }).format(cellDate);
        const hasClass = weeklyClasses.some((session) =>
            session.day.toLowerCase() === weekdayName.toLowerCase()
        );
        const hasEvent = eventDates.has(dateKey);
        const dayButton = makeElement('button', 'calendar-day', String(dayNumber));
        dayButton.type = 'button';
        dayButton.setAttribute('role', 'gridcell');
        const dayKinds = [hasClass ? 'weekly class' : '', hasEvent ? 'event' : ''].filter(Boolean).join(' and ');
        dayButton.setAttribute('aria-label', `${new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(cellDate)}${dayKinds ? `, ${dayKinds}` : ''}`);
        if (outside) dayButton.classList.add('is-outside');
        if (dateKey === todayKey) dayButton.classList.add('is-today');
        if (hasEvent) dayButton.classList.add('has-event');
        if (hasClass) dayButton.classList.add('has-class');
        if (dateKey === selectedDate) dayButton.classList.add('is-selected');
        dayButton.setAttribute('aria-pressed', String(dateKey === selectedDate));
        dayButton.addEventListener('click', () => {
            selectedDate = dateKey;
            if (outside) calendarDate = new Date(cellDate.getFullYear(), cellDate.getMonth(), 1);
            renderCalendar();
            renderEventList();
        });
        grid.append(dayButton);
    }
}

function renderSchedule(classes = []) {
    const schedule = document.querySelector('#schedule-list');
    schedule.replaceChildren();
    classes.forEach((item) => {
        const row = makeElement('article', 'schedule-item');
        row.append(
            makeElement('span', 'schedule-day', item.day),
            makeElement('span', 'schedule-time', item.time),
            makeElement('div', 'schedule-details')
        );
        row.lastElementChild.append(
            makeElement('strong', '', item.title),
            makeElement('span', '', item.place)
        );
        schedule.append(row);
    });
}

function renderReviews(reviews = fallbackReviews) {
    const list = document.querySelector('#testimonial-list');
    const carousel = document.querySelector('#testimonial-carousel');
    const viewport = document.querySelector('#testimonial-carousel-viewport');
    const previous = document.querySelector('#testimonial-previous');
    const next = document.querySelector('#testimonial-next');
    const currentLabel = document.querySelector('#testimonial-current');
    const totalLabel = document.querySelector('#testimonial-total');
    const featured = reviews.filter((review) => review.featured).slice(0, 3);
    const featuredIds = new Set(featured.map((review) => review.id));

    reviews.forEach((review) => {
        if (featured.length < 3 && !featuredIds.has(review.id)) {
            featured.push(review);
            featuredIds.add(review.id);
        }
    });

    const makeReview = (review, quoteText = review.quote) => {
        const item = makeElement('blockquote');
        const quote = makeElement('p', '', `“${quoteText || ''}”`);
        const name = makeElement('footer', '', review.name || 'Yoga student');
        item.append(quote, name);
        return item;
    };

    list.replaceChildren(...featured.map((review) => makeReview(review, review.highlight || review.quote)));
    const remaining = reviews.filter((review) => !featuredIds.has(review.id));
    const pageCount = reviews.length ? remaining.length + 1 : 0;
    carousel.hidden = pageCount === 0;
    if (!pageCount) return;
    previous.hidden = pageCount === 1;
    next.hidden = pageCount === 1;

    let currentPage = 0;
    let pointerStartX = null;
    const showPage = (nextPage) => {
        currentPage = (nextPage + pageCount) % pageCount;
        viewport.replaceChildren(currentPage === 0 ? list : makeReview(remaining[currentPage - 1]));
        viewport.scrollTop = 0;
        currentLabel.textContent = String(currentPage + 1);
        totalLabel.textContent = String(pageCount);
    };
    previous.onclick = () => showPage(currentPage - 1);
    next.onclick = () => showPage(currentPage + 1);
    viewport.onkeydown = (event) => {
        if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
        event.preventDefault();
        showPage(currentPage + (event.key === 'ArrowRight' ? 1 : -1));
    };
    viewport.onpointerdown = (event) => {
        if (event.isPrimary) pointerStartX = event.clientX;
    };
    viewport.onpointerup = (event) => {
        if (pointerStartX === null || !event.isPrimary) return;
        const distance = event.clientX - pointerStartX;
        pointerStartX = null;
        if (Math.abs(distance) >= 45) showPage(currentPage + (distance < 0 ? 1 : -1));
    };
    viewport.onpointercancel = () => { pointerStartX = null; };
    showPage(0);

    const syncHeight = () => {
        const featuredHeight = Math.ceil(list.getBoundingClientRect().height);
        const style = getComputedStyle(viewport);
        const chromeHeight = parseFloat(style.paddingTop) + parseFloat(style.paddingBottom)
            + parseFloat(style.borderTopWidth) + parseFloat(style.borderBottomWidth);
        if (featuredHeight) carousel.style.setProperty('--testimonial-gallery-height', `${Math.ceil(featuredHeight + chromeHeight)}px`);
    };
    testimonialResizeObserver?.disconnect();
    if (typeof ResizeObserver === 'function') {
        testimonialResizeObserver = new ResizeObserver(syncHeight);
        testimonialResizeObserver.observe(list);
    }
    requestAnimationFrame(syncHeight);
}

function applyPageContent(page = {}) {
    document.querySelectorAll('[data-page]').forEach((element) => {
        const value = page[element.dataset.page];
        if (typeof value === 'string' && value.trim()) element.textContent = value;
    });
}

function initSlideshows(root = document) {
    root.querySelectorAll('[data-slideshow]').forEach((slideshow) => {
        if (slideshow.dataset.initialized) return;
        slideshow.dataset.initialized = 'true';
        const slides = Array.from(slideshow.querySelectorAll('.retreat-slide'));
        const currentLabel = slideshow.querySelector('[data-slide-current]');
        let currentIndex = 0;
        let pointerStartX = null;
        const loadSlide = (slide) => {
            if (!slide?.dataset.src || slide.src) return;
            slide.src = slide.dataset.src;
            slide.removeAttribute('data-src');
        };
        const showSlide = (nextIndex) => {
            currentIndex = (nextIndex + slides.length) % slides.length;
            loadSlide(slides[currentIndex]);
            loadSlide(slides[(currentIndex + 1) % slides.length]);
            slides.forEach((slide, index) => { slide.hidden = index !== currentIndex; });
            currentLabel.textContent = String(currentIndex + 1);
        };
        slideshow.addEventListener('slideshow:prepare', () => showSlide(currentIndex));
        slideshow.querySelector('[data-slide-previous]').addEventListener('click', () => showSlide(currentIndex - 1));
        slideshow.querySelector('[data-slide-next]').addEventListener('click', () => showSlide(currentIndex + 1));
        slideshow.addEventListener('keydown', (event) => {
            if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
            event.preventDefault();
            showSlide(currentIndex + (event.key === 'ArrowRight' ? 1 : -1));
        });
        slideshow.addEventListener('pointerdown', (event) => {
            if (event.isPrimary) pointerStartX = event.clientX;
        });
        slideshow.addEventListener('pointerup', (event) => {
            if (pointerStartX === null || !event.isPrimary) return;
            const distance = event.clientX - pointerStartX;
            pointerStartX = null;
            if (Math.abs(distance) >= 45) showSlide(currentIndex + (distance < 0 ? 1 : -1));
        });
        slideshow.addEventListener('pointercancel', () => { pointerStartX = null; });
    });
}

function renderServices(services = []) {
    if (!services.length) return;
    const grid = document.querySelector('#service-grid');
    const aboutSection = document.querySelector('#about');
    const dialogIds = {
        'private-yoga': 'private-yoga-dialog',
        reiki: 'reiki-dialog',
        'singing-bowls': 'bowl-dialog',
        'sound-baths': 'sound-bath-dialog',
        retreats: 'retreat-dialog'
    };
    grid.replaceChildren();
    document.querySelectorAll('.service-dialog').forEach((dialog) => dialog.remove());

    services.forEach((service) => {
        const dialogId = dialogIds[service.id] || `${service.id}-dialog`;
        const card = makeElement('article', `service-card${service.featured ? ' service-card-featured' : ''}${service.wide ? ' service-card-wide' : ''}`);
        card.id = service.id;
        const imageWrap = makeElement('div', service.wide ? 'wide-image' : 'service-photo');
        const image = makeElement('img');
        image.src = service.image || './pics/lotus.svg';
        image.alt = service.imageAlt || '';
        image.loading = 'lazy';
        image.decoding = 'async';
        image.style.objectPosition = `${service.focalX ?? 50}% ${service.focalY ?? 50}%`;
        imageWrap.append(image);
        const body = makeElement('div', 'service-card-body');
        body.append(makeElement('span', 'service-number', service.label || 'SERVICE'));
        body.append(makeElement('h3', '', service.title || 'Untitled service'));
        body.append(makeElement('p', '', service.summary || ''));
        if (service.price) body.append(makeElement('p', 'service-price', service.price));
        const open = makeElement('button', 'text-link service-open', service.openLabel || `More about ${service.title || 'this service'}`);
        open.type = 'button';
        open.dataset.openDialog = dialogId;
        open.append(' ', makeUiIcon('M2 10 10 2M4 2h6v6'));
        body.append(open);
        card.append(imageWrap, body);
        grid.append(card);

        const dialog = makeElement('dialog', 'service-dialog');
        dialog.id = dialogId;
        dialog.setAttribute('aria-labelledby', `${service.id}-title`);
        const layout = makeElement('div', 'service-dialog-layout');
        const dialogImage = makeElement('div', 'service-dialog-image');
        const dialogPicture = image.cloneNode();
        dialogImage.append(dialogPicture);
        const copy = makeElement('div', 'service-dialog-copy');
        const close = makeElement('button', 'dialog-close', '×');
        close.type = 'button';
        close.setAttribute('aria-label', 'Close details');
        close.dataset.closeDialog = '';
        copy.append(close);
        if (service.modalEyebrow) copy.append(makeElement('p', 'eyebrow', service.modalEyebrow));
        const title = makeElement('h2', '', service.modalTitle || service.title || 'Service details');
        title.id = `${service.id}-title`;
        copy.append(title);
        String(service.modalBody || '').split(/\n\s*\n/).filter(Boolean).forEach((paragraph) => {
            const [firstLine, ...remainingLines] = paragraph.split('\n');
            if (service.special === 'retreat' && /^(Poland|Spain)\s+—/.test(firstLine) && remainingLines.length) {
                const option = makeElement('div', 'retreat-option');
                option.append(makeElement('h3', '', firstLine), makeElement('p', '', remainingLines.join(' ')));
                copy.append(option);
            } else copy.append(makeElement('p', '', paragraph.replace(/\n+/g, ' ')));
        });
        if (service.modalDetails) copy.append(makeElement('p', '', service.modalDetails));
        if (service.ctaLabel) {
            const link = makeElement('a', 'button button-dark', service.ctaLabel);
            link.href = /^(https?:\/\/|mailto:|tel:|#)/i.test(service.ctaHref || '') ? service.ctaHref : '#contact';
            link.dataset.dialogContact = '';
            link.append(' ', makeUiIcon('M2 10 10 2M4 2h6v6'));
            copy.append(link);
        }
        layout.append(dialogImage, copy);
        if (service.special === 'retreat' && retreatGalleriesTemplate) layout.append(retreatGalleriesTemplate.cloneNode(true));
        dialog.append(layout);
        aboutSection.before(dialog);
        initSlideshows(dialog);
    });
}

async function loadContent() {
    const response = await fetch(contentUrl.href, { cache: 'no-cache' });
    if (!response.ok) throw new Error(`Content request failed (${response.status})`);
    const content = await response.json();
    applyPageContent(content.page && typeof content.page === 'object' ? content.page : {});
    renderServices(Array.isArray(content.services) ? content.services : []);
    renderAnnouncements(Array.isArray(content.announcements) ? content.announcements : []);
    weeklyClasses = Array.isArray(content.classes) ? content.classes : [];
    renderSchedule(weeklyClasses);
    renderReviews(Array.isArray(content.reviews) ? content.reviews : fallbackReviews);
    allEvents = Array.isArray(content.events) ? content.events : [];
    visibleEvents = allEvents.filter((event) => /^\d{4}-\d{2}-\d{2}$/.test(event.date) && event.date >= todayKey)
        .sort((first, second) => first.date.localeCompare(second.date));
    renderCalendar();
    renderEventList();
}

document.querySelector('#calendar-prev').addEventListener('click', () => {
    calendarDate = new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1, 1);
    selectedDate = '';
    renderCalendar();
    renderEventList();
});
document.querySelector('#calendar-next').addEventListener('click', () => {
    calendarDate = new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 1);
    selectedDate = '';
    renderCalendar();
    renderEventList();
});

document.querySelector('.menu-toggle').addEventListener('click', (event) => {
    const button = event.currentTarget;
    const isOpen = button.getAttribute('aria-expanded') === 'true';
    button.setAttribute('aria-expanded', String(!isOpen));
    button.setAttribute('aria-label', isOpen ? 'Open menu' : 'Close menu');
    document.querySelector('#main-nav').classList.toggle('is-open', !isOpen);
});
document.querySelectorAll('#main-nav a').forEach((link) => {
    link.addEventListener('click', () => {
        document.querySelector('.menu-toggle').setAttribute('aria-expanded', 'false');
        document.querySelector('.menu-toggle').setAttribute('aria-label', 'Open menu');
        document.querySelector('#main-nav').classList.remove('is-open');
    });
});

initSlideshows();

document.addEventListener('click', (event) => {
    const opener = event.target.closest('[data-open-dialog]');
    if (opener) {
        const dialog = document.getElementById(opener.dataset.openDialog);
        if (dialog && typeof dialog.showModal === 'function') {
            dialog.querySelectorAll('[data-slideshow]').forEach((slideshow) => {
                slideshow.dispatchEvent(new Event('slideshow:prepare'));
            });
            dialog.showModal();
        }
        return;
    }
    const closer = event.target.closest('[data-close-dialog], [data-dialog-contact]');
    if (closer) {
        closer.closest('.service-dialog')?.close();
        return;
    }
    if (event.target.matches('.service-dialog')) event.target.close();
});

document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    const openDialogs = document.querySelectorAll('.service-dialog[open]');
    const topDialog = openDialogs[openDialogs.length - 1];
    if (topDialog) {
        event.preventDefault();
        topDialog.close();
    }
});

document.querySelector('#current-year').textContent = String(today.getFullYear());
renderReviews();
loadContent().catch((error) => {
    console.error('Unable to load the latest announcements and events.', error);
    renderAnnouncements([]);
    weeklyClasses = [];
    renderSchedule([]);
    renderReviews();
    visibleEvents = [];
    renderCalendar();
    renderEventList();
});
