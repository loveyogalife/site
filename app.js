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

async function loadContent() {
    const response = await fetch(`${contentUrl.href}?v=${Date.now()}`, { cache: 'no-store' });
    if (!response.ok) throw new Error(`Content request failed (${response.status})`);
    const content = await response.json();
    renderAnnouncements(Array.isArray(content.announcements) ? content.announcements : []);
    weeklyClasses = Array.isArray(content.classes) ? content.classes : [];
    renderSchedule(weeklyClasses);
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

document.querySelectorAll('[data-open-dialog]').forEach((button) => {
    button.addEventListener('click', () => {
        const dialog = document.getElementById(button.dataset.openDialog);
        if (dialog && typeof dialog.showModal === 'function') dialog.showModal();
    });
});

document.querySelectorAll('.service-dialog').forEach((dialog) => {
    dialog.addEventListener('click', (event) => {
        if (event.target === dialog) dialog.close();
    });
    dialog.querySelectorAll('[data-close-dialog], [data-dialog-contact]').forEach((control) => {
        control.addEventListener('click', () => dialog.close());
    });
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
loadContent().catch((error) => {
    console.error('Unable to load the latest announcements and events.', error);
    renderAnnouncements([]);
    weeklyClasses = [];
    renderSchedule([]);
    visibleEvents = [];
    renderCalendar();
    renderEventList();
});
