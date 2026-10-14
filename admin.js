const contentPath = 'data/site-content.json';
const contentRepository = 'loveyogalife/site';
const contentUrl = new URL(`./${contentPath}`, document.baseURI);
const announcementForm = document.querySelector('#announcement-form');
const reviewForm = document.querySelector('#review-form');
const eventForm = document.querySelector('#event-form');
const classForm = document.querySelector('#class-form');
const accessForm = document.querySelector('#access-form');
const accessPassword = document.querySelector('#access-password');
const accessButton = document.querySelector('#access-button');
const editorGate = document.querySelector('#admin-access-gate');
const editorContent = document.querySelector('#editor-content');
const publishBar = document.querySelector('#publish-bar');
const statusNode = document.querySelector('#admin-status');
let siteContent = { announcements: [], reviews: [], events: [], classes: [] };
let publishToken = '';

function createId(prefix) {
    if (window.crypto && typeof window.crypto.randomUUID === 'function') return `${prefix}-${window.crypto.randomUUID()}`;
    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function setStatus(message, kind = '') {
    statusNode.textContent = message;
    statusNode.className = `admin-status${kind ? ` is-${kind}` : ''}`;
    statusNode.hidden = !message;
}

function relockEditor(message = '') {
    publishToken = '';
    accessPassword.value = '';
    editorContent.hidden = true;
    publishBar.hidden = true;
    editorGate.hidden = false;
    setStatus(message, message ? 'error' : '');
}

async function unlockEditor(event) {
    event.preventDefault();
    const password = accessPassword.value.trim();
    if (!password) {
        setStatus('Enter your password to continue.', 'error');
        accessPassword.focus();
        return;
    }

    accessButton.disabled = true;
    accessButton.textContent = 'Checking…';
    setStatus('Checking access…');

    try {
        const response = await fetch(`https://api.github.com/repos/${contentRepository}`, {
            headers: {
                Accept: 'application/vnd.github+json',
                Authorization: `Bearer ${password}`,
                'X-GitHub-Api-Version': '2022-11-28'
            }
        });
        const repository = response.ok ? await response.json() : null;
        if (!repository?.permissions?.push) {
            throw new Error('That password could not unlock the editor. Check it and try again.');
        }

        publishToken = password;
        accessPassword.value = '';
        editorGate.hidden = true;
        editorContent.hidden = false;
        publishBar.hidden = false;
        setStatus('Editor unlocked for this tab.', 'success');
    } catch (error) {
        setStatus(error.message || 'Could not check access. Check your connection and try again.', 'error');
        accessPassword.focus();
    } finally {
        accessButton.disabled = false;
        accessButton.innerHTML = 'Continue <span aria-hidden="true">→</span>';
    }
}

function buildRecordCard(title, detail, onEdit, onDelete) {
    const card = document.createElement('article');
    card.className = 'admin-record';
    const copy = document.createElement('div');
    const heading = document.createElement('h3');
    heading.textContent = title;
    const paragraph = document.createElement('p');
    paragraph.textContent = detail;
    const actions = document.createElement('div');
    actions.className = 'admin-record-actions';
    const edit = document.createElement('button');
    edit.type = 'button';
    edit.className = 'admin-small-button';
    edit.textContent = 'Edit';
    edit.addEventListener('click', onEdit);
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'admin-small-button is-remove';
    remove.textContent = 'Remove';
    remove.addEventListener('click', onDelete);
    copy.append(heading, paragraph);
    actions.append(edit, remove);
    card.append(copy, actions);
    return card;
}

function renderAnnouncements() {
    const container = document.querySelector('#announcement-records');
    container.replaceChildren();
    document.querySelector('#announcement-count').textContent = String(siteContent.announcements.length);
    siteContent.announcements.forEach((announcement) => {
        const state = announcement.active ? 'Shown on homepage' : 'Hidden from homepage';
        container.append(buildRecordCard(announcement.title || 'Untitled announcement', `${state} · ${announcement.message || ''}`, () => editAnnouncement(announcement.id), () => {
            siteContent.announcements = siteContent.announcements.filter((item) => item.id !== announcement.id);
            renderAnnouncements();
            setStatus('Announcement removed from this draft. Publish to update the website.');
        }));
    });
    if (!siteContent.announcements.length) container.append(emptyRecord('No announcements yet. Add one below.'));
}

function renderReviews() {
    const container = document.querySelector('#review-records');
    container.replaceChildren();
    document.querySelector('#review-count-admin').textContent = String(siteContent.reviews.length);
    siteContent.reviews.forEach((review) => {
        container.append(buildRecordCard(review.name || 'Anonymous reviewer', review.quote || '', () => editReview(review.id), () => {
            siteContent.reviews = siteContent.reviews.filter((item) => item.id !== review.id);
            renderReviews();
            setStatus('Review removed from this draft. Publish to update the website.');
        }));
    });
    if (!siteContent.reviews.length) container.append(emptyRecord('No reviews yet. Add one below.'));
}

function renderEvents() {
    const container = document.querySelector('#event-records');
    container.replaceChildren();
    document.querySelector('#event-count-admin').textContent = String(siteContent.events.length);
    const events = [...siteContent.events].sort((first, second) => first.date.localeCompare(second.date));
    events.forEach((event) => {
        const detail = `${event.date} · ${event.time || 'Time to be confirmed'} · ${event.location || 'Venue to be confirmed'}`;
        container.append(buildRecordCard(event.title || 'Untitled event', detail, () => editEvent(event.id), () => {
            siteContent.events = siteContent.events.filter((item) => item.id !== event.id);
            renderEvents();
            setStatus('Event removed from this draft. Publish to update the website.');
        }));
    });
    if (!siteContent.events.length) container.append(emptyRecord('No events yet. Add one below.'));
}

function renderClasses() {
    const container = document.querySelector('#class-records');
    container.replaceChildren();
    document.querySelector('#class-count-admin').textContent = String(siteContent.classes.length);
    siteContent.classes.forEach((session) => {
        const detail = `${session.day} · ${session.time} · ${session.place}`;
        container.append(buildRecordCard(session.title, detail, () => editClass(session.id), () => {
            siteContent.classes = siteContent.classes.filter((item) => item.id !== session.id);
            renderClasses();
            setStatus('Weekly class removed from this draft. Publish to update the website.');
        }));
    });
    if (!siteContent.classes.length) container.append(emptyRecord('No weekly classes yet. Add one below.'));
}

function emptyRecord(text) {
    const paragraph = document.createElement('p');
    paragraph.className = 'admin-empty';
    paragraph.textContent = text;
    return paragraph;
}

function resetForm(form, title, cancelSelector) {
    form.reset();
    form.elements.id.value = '';
    const defaultTitles = {
        '#announcement-form-title': 'Add an announcement',
        '#review-form-title': 'Add a review',
        '#event-form-title': 'Add an event',
        '#class-form-title': 'Add a weekly class'
    };
    document.querySelector(title).textContent = defaultTitles[title];
    document.querySelector(`[data-cancel="${cancelSelector}"]`).hidden = true;
}

function editReview(id) {
    const review = siteContent.reviews.find((item) => item.id === id);
    if (!review) return;
    reviewForm.elements.id.value = review.id;
    reviewForm.elements.name.value = review.name || '';
    reviewForm.elements.quote.value = review.quote || '';
    document.querySelector('#review-form-title').textContent = 'Edit review';
    document.querySelector('[data-cancel="review"]').hidden = false;
    reviewForm.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function editAnnouncement(id) {
    const announcement = siteContent.announcements.find((item) => item.id === id);
    if (!announcement) return;
    announcementForm.elements.id.value = announcement.id;
    announcementForm.elements.title.value = announcement.title || '';
    announcementForm.elements.message.value = announcement.message || '';
    announcementForm.elements.linkText.value = announcement.linkText || '';
    announcementForm.elements.link.value = announcement.link || '';
    announcementForm.elements.active.checked = Boolean(announcement.active);
    document.querySelector('#announcement-form-title').textContent = 'Edit announcement';
    document.querySelector('[data-cancel="announcement"]').hidden = false;
    announcementForm.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function editEvent(id) {
    const event = siteContent.events.find((item) => item.id === id);
    if (!event) return;
    Object.entries(event).forEach(([key, value]) => {
        if (eventForm.elements[key]) eventForm.elements[key].value = value || '';
    });
    document.querySelector('#event-form-title').textContent = 'Edit event';
    document.querySelector('[data-cancel="event"]').hidden = false;
    eventForm.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function editClass(id) {
    const session = siteContent.classes.find((item) => item.id === id);
    if (!session) return;
    Object.entries(session).forEach(([key, value]) => {
        if (classForm.elements[key]) classForm.elements[key].value = value || '';
    });
    document.querySelector('#class-form-title').textContent = 'Edit weekly class';
    document.querySelector('[data-cancel="class"]').hidden = false;
    classForm.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

announcementForm.addEventListener('submit', (formEvent) => {
    formEvent.preventDefault();
    const values = new FormData(announcementForm);
    const link = values.get('link').trim();
    if (link && !/^(https?:\/\/|mailto:|tel:|#)/i.test(link)) {
        setStatus('Links must begin with https://, http://, mailto:, tel:, or #.', 'error');
        announcementForm.elements.link.focus();
        return;
    }
    const id = values.get('id') || createId('announcement');
    const announcement = {
        id,
        title: values.get('title').trim(),
        message: values.get('message').trim(),
        linkText: values.get('linkText').trim(),
        link,
        active: values.get('active') === 'on'
    };
    const index = siteContent.announcements.findIndex((item) => item.id === id);
    if (index < 0) siteContent.announcements.push(announcement);
    else siteContent.announcements[index] = announcement;
    resetForm(announcementForm, '#announcement-form-title', 'announcement');
    renderAnnouncements();
    setStatus('Announcement saved in this draft. Publish changes to show it on the website.');
});

reviewForm.addEventListener('submit', (formEvent) => {
    formEvent.preventDefault();
    const values = new FormData(reviewForm);
    const id = values.get('id') || createId('review');
    const review = {
        id,
        name: values.get('name').trim(),
        quote: values.get('quote').trim()
    };
    const index = siteContent.reviews.findIndex((item) => item.id === id);
    if (index < 0) siteContent.reviews.push(review);
    else siteContent.reviews[index] = review;
    resetForm(reviewForm, '#review-form-title', 'review');
    renderReviews();
    setStatus('Review saved in this draft. Publish changes to show it on the website.');
});

eventForm.addEventListener('submit', (formEvent) => {
    formEvent.preventDefault();
    const values = new FormData(eventForm);
    const id = values.get('id') || createId('event');
    const event = {
        id,
        title: values.get('title').trim(),
        date: values.get('date'),
        time: values.get('time').trim(),
        location: values.get('location').trim(),
        description: values.get('description').trim(),
        price: values.get('price').trim()
    };
    const index = siteContent.events.findIndex((item) => item.id === id);
    if (index < 0) siteContent.events.push(event);
    else siteContent.events[index] = event;
    resetForm(eventForm, '#event-form-title', 'event');
    renderEvents();
    setStatus('Event saved in this draft. Publish changes to show it on the website.');
});

classForm.addEventListener('submit', (formEvent) => {
    formEvent.preventDefault();
    const values = new FormData(classForm);
    const id = values.get('id') || createId('class');
    const session = {
        id,
        day: values.get('day'),
        time: values.get('time').trim(),
        title: values.get('title').trim(),
        place: values.get('place').trim()
    };
    const index = siteContent.classes.findIndex((item) => item.id === id);
    if (index < 0) siteContent.classes.push(session);
    else siteContent.classes[index] = session;
    resetForm(classForm, '#class-form-title', 'class');
    renderClasses();
    setStatus('Weekly class saved in this draft. Publish changes to show it on the website.');
});

document.querySelectorAll('[data-cancel]').forEach((button) => {
    button.addEventListener('click', () => {
        if (button.dataset.cancel === 'announcement') resetForm(announcementForm, '#announcement-form-title', 'announcement');
        if (button.dataset.cancel === 'review') resetForm(reviewForm, '#review-form-title', 'review');
        if (button.dataset.cancel === 'event') resetForm(eventForm, '#event-form-title', 'event');
        if (button.dataset.cancel === 'class') resetForm(classForm, '#class-form-title', 'class');
    });
});

async function loadSiteContent() {
    try {
        const response = await fetch(`${contentUrl.href}?v=${Date.now()}`, { cache: 'no-store' });
        if (!response.ok) throw new Error(`Content file request failed (${response.status})`);
        const content = await response.json();
        siteContent = {
            announcements: Array.isArray(content.announcements) ? content.announcements : [],
            reviews: Array.isArray(content.reviews) ? content.reviews : [],
            events: Array.isArray(content.events) ? content.events : [],
            classes: Array.isArray(content.classes) ? content.classes : []
        };
        renderAnnouncements();
        renderReviews();
        renderEvents();
        renderClasses();
    } catch (error) {
        setStatus('Could not load the website content. Open this editor from the deployed website or run it on a local web server.', 'error');
        renderAnnouncements();
        renderReviews();
        renderEvents();
        renderClasses();
    }
}

async function publishChanges() {
    if (!publishToken) {
        relockEditor('Access expired. Enter your password to unlock the editor again.');
        accessPassword.focus();
        return;
    }

    const button = document.querySelector('#publish-button');
    button.disabled = true;
    setStatus('Publishing your changes…');
    const endpoint = `https://api.github.com/repos/${contentRepository}/contents/${contentPath}`;
    const headers = {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${publishToken}`,
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json'
    };

    try {
        const currentResponse = await fetch(endpoint, { headers });
        let sha;
        if (currentResponse.ok) sha = (await currentResponse.json()).sha;
        else if (currentResponse.status === 401 || currentResponse.status === 403) {
            relockEditor('Access expired. Enter your password to unlock the editor again.');
            return;
        } else if (currentResponse.status !== 404) throw new Error('Could not prepare your update. Please try again.');

        const text = `${JSON.stringify(siteContent, null, 2)}\n`;
        const bytes = new TextEncoder().encode(text);
        let binary = '';
        bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
        const payload = {
            message: 'Update website content from site editor',
            content: btoa(binary)
        };
        if (sha) payload.sha = sha;
        const saveResponse = await fetch(endpoint, { method: 'PUT', headers, body: JSON.stringify(payload) });
        if (!saveResponse.ok) {
            if (saveResponse.status === 401 || saveResponse.status === 403) {
                relockEditor('Access expired. Enter your password to unlock the editor again.');
                return;
            }
            throw new Error('Could not publish changes. Please try again.');
        }
        setStatus('Published. Changes should appear on the website shortly.', 'success');
    } catch (error) {
        setStatus(error.message || 'Could not publish changes. Check your connection and try again.', 'error');
    } finally {
        button.disabled = false;
    }
}

accessForm.addEventListener('submit', unlockEditor);
document.querySelector('#publish-button').addEventListener('click', publishChanges);
renderAnnouncements();
renderReviews();
renderEvents();
renderClasses();
loadSiteContent();
