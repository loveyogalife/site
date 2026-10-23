const contentPath = 'data/site-content.json';
const contentRepository = 'loveyogalife/site';
const contentUrl = new URL(`./${contentPath}`, document.baseURI);
const announcementForm = document.querySelector('#announcement-form');
const reviewForm = document.querySelector('#review-form');
const eventForm = document.querySelector('#event-form');
const classForm = document.querySelector('#class-form');
const pageContentForm = document.querySelector('#page-content-form');
const serviceForm = document.querySelector('#service-form');
const accessForm = document.querySelector('#access-form');
const accessPassword = document.querySelector('#access-password');
const accessButton = document.querySelector('#access-button');
const editorGate = document.querySelector('#admin-access-gate');
const editorContent = document.querySelector('#editor-content');
const publishBar = document.querySelector('#publish-bar');
const statusNode = document.querySelector('#admin-status');
let siteContent = { page: {}, services: [], announcements: [], reviews: [], events: [], classes: [] };
let publishToken = '';
const pendingUploads = new Map();
const pageFieldGroups = [
    { title: 'Hero banner', fields: [
        ['heroEyebrow', 'Small heading'], ['heroTitle', 'Main heading'], ['heroAccent', 'Highlighted words'],
        ['heroIntro', 'Introduction', 'textarea'], ['heroPrimary', 'Classes button'], ['heroSecondary', 'Telephone link'],
        ['heroCaption', 'Photo caption'], ['heroStamp', 'Photo stamp']
    ] },
    { title: 'What’s coming up', fields: [
        ['eventsEyebrow', 'Small heading'], ['eventsTitle', 'Heading'], ['eventsAccent', 'Highlighted words'],
        ['eventsIntro', 'Introduction', 'textarea'], ['eventsListTitle', 'Upcoming list heading']
    ] },
    { title: 'Classes and pricing', fields: [
        ['classesEyebrow', 'Small heading'], ['classesTitle', 'Heading'], ['classesAccent', 'Highlighted words'],
        ['classesIntro', 'Introduction', 'textarea'], ['classesCaption', 'Photo caption'], ['classesNote', 'Timetable note', 'textarea'],
        ['priceEyebrow', 'Pricing small heading'], ['priceTitle', 'Pricing heading'], ['priceFootnote', 'Pricing note', 'textarea'],
        ['priceDropLabel', 'Drop-in label'], ['priceDropValue', 'Drop-in price'], ['priceFiveLabel', '5-class label'], ['priceFiveValue', '5-class price'],
        ['priceTenLabel', '10-class label'], ['priceTenValue', '10-class price'], ['priceGentleLabel', 'Gentle yoga label'], ['priceGentleValue', 'Gentle yoga price'],
        ['classCta', 'Pricing link'], ['quoteText', 'Quote', 'textarea'], ['quoteName', 'Quote name']
    ] },
    { title: 'Reviews', fields: [
        ['reviewsEyebrow', 'Small heading'], ['reviewsTitle', 'Heading'], ['reviewsAccent', 'Highlighted words'],
        ['reviewsIntro', 'Introduction', 'textarea'], ['reviewsGalleryTitle', 'Review gallery heading'], ['reviewSubmit', 'Submit button']
    ] },
    { title: 'Services', fields: [
        ['servicesEyebrow', 'Small heading'], ['servicesTitle', 'Heading'], ['servicesAccent', 'Highlighted words'],
        ['servicesIntro', 'Introduction', 'textarea']
    ] },
    { title: 'About Maureen', fields: [
        ['aboutEyebrow', 'Small heading'], ['aboutTitle', 'Heading'], ['aboutAccent', 'Highlighted words'],
        ['aboutBody', 'About text', 'textarea'],
        ['aboutSignoff', 'Sign-off'], ['aboutName', 'Name'], ['aboutCta', 'Contact link']
    ] },
    { title: 'Your first class', fields: [
        ['firstEyebrow', 'Small heading'], ['firstTitle', 'Heading'], ['firstAccent', 'Highlighted words'],
        ['firstIntro', 'Introduction', 'textarea'], ['firstOneTitle', 'Tip 1 heading'], ['firstOneBody', 'Tip 1 text', 'textarea'],
        ['firstTwoTitle', 'Tip 2 heading'], ['firstTwoBody', 'Tip 2 text', 'textarea'],
        ['firstThreeTitle', 'Tip 3 heading'], ['firstThreeBody', 'Tip 3 text', 'textarea']
    ] },
    { title: 'Contact and footer', fields: [
        ['contactEyebrow', 'Small heading'], ['contactTitle', 'Heading'], ['contactAccent', 'Highlighted words'],
        ['contactIntro', 'Introduction', 'textarea'], ['contactPhone', 'Telephone button'], ['contactEmail', 'Email link'],
        ['contactPlace', 'Location'], ['contactFormats', 'Ways to join'], ['footerText', 'Footer description', 'textarea']
    ] }
];

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
        accessButton.innerHTML = 'Continue <svg class="ui-icon" viewBox="0 0 12 12" aria-hidden="true" focusable="false"><path d="M2 6h8M6.5 2.5 10 6l-3.5 3.5"></path></svg>';
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

function renderPageFields() {
    const container = document.querySelector('#page-content-fields');
    container.replaceChildren();
    pageFieldGroups.forEach((group) => {
        const section = document.createElement('section');
        section.className = 'page-field-group';
        const heading = document.createElement('h3');
        heading.textContent = group.title;
        section.append(heading);
        group.fields.forEach(([key, labelText, type = 'input']) => {
            const label = document.createElement('label');
            if (type === 'textarea') label.className = 'is-wide';
            label.append(document.createTextNode(labelText));
            const field = document.createElement(type === 'textarea' ? 'textarea' : 'input');
            field.name = key;
            field.maxLength = type === 'textarea' ? 5000 : 240;
            if (type === 'textarea') field.rows = key === 'aboutBody' ? 14 : 4;
            if (key === 'aboutBody') field.placeholder = 'Use a blank line between paragraphs';
            field.value = siteContent.page?.[key] || '';
            label.append(field);
            section.append(label);
        });
        container.append(section);
    });
}

function updateImagePreview(source = '') {
    const preview = document.querySelector('#service-image-preview');
    preview.replaceChildren();
    if (!source) {
        const empty = document.createElement('span');
        empty.textContent = 'No picture selected';
        preview.append(empty);
        return;
    }
    const image = document.createElement('img');
    image.src = source;
    image.alt = '';
    image.style.objectPosition = `${serviceForm.elements.focalX.value}% ${serviceForm.elements.focalY.value}%`;
    preview.append(image);
}

function renderServicesAdmin() {
    const container = document.querySelector('#service-records');
    container.replaceChildren();
    document.querySelector('#service-count-admin').textContent = String(siteContent.services.length);
    siteContent.services.forEach((service, serviceIndex) => {
        const detail = `${service.label || 'Service'} · ${service.summary || ''}`;
        const card = buildRecordCard(service.title || 'Untitled service', detail, () => editService(service.id), () => {
            if (service.special) {
                setStatus('This specialist service can be edited but not removed because it contains a bespoke layout.', 'error');
                return;
            }
            siteContent.services = siteContent.services.filter((item) => item.id !== service.id);
            const uploadPath = (service.image || '').replace(/^\.\//, '');
            pendingUploads.delete(uploadPath);
            renderServicesAdmin();
            setStatus('Service removed from this draft. Publish to update the website.');
        });
        const actions = card.querySelector('.admin-record-actions');
        const moveUp = document.createElement('button');
        moveUp.type = 'button';
        moveUp.className = 'admin-small-button';
        moveUp.textContent = 'Up';
        moveUp.disabled = serviceIndex === 0;
        moveUp.addEventListener('click', () => {
            [siteContent.services[serviceIndex - 1], siteContent.services[serviceIndex]] = [siteContent.services[serviceIndex], siteContent.services[serviceIndex - 1]];
            renderServicesAdmin();
            setStatus('Service order changed in this draft. Publish to update the website.');
        });
        const moveDown = document.createElement('button');
        moveDown.type = 'button';
        moveDown.className = 'admin-small-button';
        moveDown.textContent = 'Down';
        moveDown.disabled = serviceIndex === siteContent.services.length - 1;
        moveDown.addEventListener('click', () => {
            [siteContent.services[serviceIndex], siteContent.services[serviceIndex + 1]] = [siteContent.services[serviceIndex + 1], siteContent.services[serviceIndex]];
            renderServicesAdmin();
            setStatus('Service order changed in this draft. Publish to update the website.');
        });
        actions.prepend(moveUp, moveDown);
        if (service.special) card.querySelector('.is-remove').textContent = 'Protected';
        container.append(card);
    });
    if (!siteContent.services.length) container.append(emptyRecord('No services yet. Add one below.'));
}

function resetServiceForm() {
    serviceForm.reset();
    serviceForm.elements.id.value = '';
    serviceForm.elements.image.value = '';
    serviceForm.elements.special.value = '';
    serviceForm.elements.focalX.value = '50';
    serviceForm.elements.focalY.value = '50';
    serviceForm.elements.ctaLabel.value = 'Ask Maureen for details';
    serviceForm.elements.ctaHref.value = '#contact';
    document.querySelector('#focal-x-output').value = '50%';
    document.querySelector('#focal-y-output').value = '50%';
    document.querySelector('#service-form-title').textContent = 'Add a service';
    document.querySelector('[data-cancel="service"]').hidden = true;
    updateImagePreview();
}

function editService(id) {
    const service = siteContent.services.find((item) => item.id === id);
    if (!service) return;
    Object.entries(service).forEach(([key, value]) => {
        if (!serviceForm.elements[key]) return;
        serviceForm.elements[key].value = typeof value === 'boolean' ? String(value) : value || '';
    });
    serviceForm.elements.special.value = service.special || '';
    document.querySelector('#focal-x-output').value = `${service.focalX ?? 50}%`;
    document.querySelector('#focal-y-output').value = `${service.focalY ?? 50}%`;
    document.querySelector('#service-form-title').textContent = 'Edit service';
    document.querySelector('[data-cancel="service"]').hidden = false;
    const imagePath = (service.image || '').replace(/^\.\//, '');
    const pendingImage = pendingUploads.get(imagePath);
    updateImagePreview(pendingImage ? `data:image/jpeg;base64,${pendingImage}` : service.image || '');
    serviceForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function fileToDataUrl(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('Could not read that picture.'));
        reader.readAsDataURL(blob);
    });
}

async function resizeImage(file) {
    const objectUrl = URL.createObjectURL(file);
    try {
        const image = new Image();
        image.src = objectUrl;
        await image.decode();
        const scale = Math.min(1, 1800 / Math.max(image.naturalWidth, image.naturalHeight));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
        canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
        const context = canvas.getContext('2d');
        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', .84));
        if (!blob) throw new Error('Could not prepare that picture.');
        return blob;
    } finally {
        URL.revokeObjectURL(objectUrl);
    }
}

async function prepareServiceImage(file) {
    if (!file) return;
    if (!file.type.startsWith('image/')) throw new Error('Please choose a JPG, PNG or WebP picture.');
    if (file.size > 15 * 1024 * 1024) throw new Error('That picture is too large. Please choose one under 15MB.');
    setStatus('Preparing picture…');
    const blob = await resizeImage(file);
    const dataUrl = await fileToDataUrl(blob);
    const cleanName = file.name.replace(/\.[^.]+$/, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 45) || 'service';
    const path = `pics/uploads/${Date.now()}-${cleanName}.jpg`;
    pendingUploads.set(path, dataUrl.split(',')[1]);
    serviceForm.elements.image.value = `./${path}`;
    updateImagePreview(dataUrl);
    setStatus('Picture prepared. Save the service, then publish when you are ready.', 'success');
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

pageContentForm.addEventListener('submit', (formEvent) => {
    formEvent.preventDefault();
    const values = new FormData(pageContentForm);
    const page = {};
    pageFieldGroups.forEach((group) => group.fields.forEach(([key]) => {
        page[key] = String(values.get(key) || '').trim();
    }));
    siteContent.page = page;
    setStatus('Page text saved in this draft. Publish to update the website.', 'success');
});

serviceForm.addEventListener('submit', (formEvent) => {
    formEvent.preventDefault();
    const values = new FormData(serviceForm);
    const link = String(values.get('ctaHref') || '').trim();
    if (link && !/^(https?:\/\/|mailto:|tel:|#)/i.test(link)) {
        setStatus('The service button link must begin with https://, http://, mailto:, tel:, or #.', 'error');
        serviceForm.elements.ctaHref.focus();
        return;
    }
    const id = values.get('id') || createId('service');
    const existing = siteContent.services.find((item) => item.id === id);
    const service = {
        ...(existing || {}),
        id,
        label: String(values.get('label') || '').trim(),
        title: String(values.get('title') || '').trim(),
        summary: String(values.get('summary') || '').trim(),
        price: String(values.get('price') || '').trim(),
        wide: values.get('wide') === 'true',
        modalEyebrow: String(values.get('modalEyebrow') || '').trim(),
        modalTitle: String(values.get('modalTitle') || '').trim(),
        modalBody: String(values.get('modalBody') || '').trim(),
        modalDetails: String(values.get('modalDetails') || '').trim(),
        ctaLabel: String(values.get('ctaLabel') || '').trim(),
        ctaHref: link || '#contact',
        image: String(values.get('image') || '').trim(),
        imageAlt: String(values.get('imageAlt') || '').trim(),
        focalX: Number(values.get('focalX')) || 50,
        focalY: Number(values.get('focalY')) || 50,
        special: String(values.get('special') || existing?.special || '')
    };
    if (service.image && !service.imageAlt) {
        setStatus('Please add a short description for the service picture.', 'error');
        serviceForm.elements.imageAlt.focus();
        return;
    }
    const index = siteContent.services.findIndex((item) => item.id === id);
    if (index < 0) siteContent.services.push(service);
    else siteContent.services[index] = service;
    renderServicesAdmin();
    resetServiceForm();
    setStatus('Service saved in this draft. Publish to update the website.', 'success');
});

serviceForm.elements.imageFile.addEventListener('change', async () => {
    try {
        await prepareServiceImage(serviceForm.elements.imageFile.files[0]);
    } catch (error) {
        setStatus(error.message || 'Could not prepare that picture.', 'error');
    }
});

['focalX', 'focalY'].forEach((name) => {
    serviceForm.elements[name].addEventListener('input', () => {
        document.querySelector(`#${name === 'focalX' ? 'focal-x' : 'focal-y'}-output`).value = `${serviceForm.elements[name].value}%`;
        const image = document.querySelector('#service-image-preview img');
        if (image) image.style.objectPosition = `${serviceForm.elements.focalX.value}% ${serviceForm.elements.focalY.value}%`;
    });
});

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
    const existingReview = siteContent.reviews.find((item) => item.id === id);
    const review = {
        ...(existingReview || {}),
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
        if (button.dataset.cancel === 'service') resetServiceForm();
    });
});

document.querySelectorAll('[data-admin-tab]').forEach((button) => {
    button.addEventListener('click', () => {
        document.querySelectorAll('[data-admin-tab]').forEach((tab) => {
            const active = tab === button;
            tab.classList.toggle('is-active', active);
            tab.setAttribute('aria-selected', String(active));
        });
        document.querySelectorAll('[data-admin-panel]').forEach((panel) => {
            panel.hidden = panel.dataset.adminPanel !== button.dataset.adminTab;
        });
    });
});

async function loadSiteContent() {
    try {
        const response = await fetch(`${contentUrl.href}?v=${Date.now()}`, { cache: 'no-store' });
        if (!response.ok) throw new Error(`Content file request failed (${response.status})`);
        const content = await response.json();
        siteContent = {
            page: content.page && typeof content.page === 'object' ? content.page : {},
            services: Array.isArray(content.services) ? content.services : [],
            announcements: Array.isArray(content.announcements) ? content.announcements : [],
            reviews: Array.isArray(content.reviews) ? content.reviews : [],
            events: Array.isArray(content.events) ? content.events : [],
            classes: Array.isArray(content.classes) ? content.classes : []
        };
        renderPageFields();
        renderServicesAdmin();
        renderAnnouncements();
        renderReviews();
        renderEvents();
        renderClasses();
    } catch (error) {
        setStatus('Could not load the website content. Open this editor from the deployed website or run it on a local web server.', 'error');
        renderAnnouncements();
        renderPageFields();
        renderServicesAdmin();
        renderReviews();
        renderEvents();
        renderClasses();
    }
}

async function publishPendingImages(headers) {
    const usedImages = new Set(siteContent.services.map((service) => (service.image || '').replace(/^\.\//, '')));
    const uploads = [...pendingUploads.entries()].filter(([path]) => usedImages.has(path));
    for (let index = 0; index < uploads.length; index += 1) {
        const [path, content] = uploads[index];
        setStatus(`Uploading picture ${index + 1} of ${uploads.length}…`);
        const encodedPath = path.split('/').map(encodeURIComponent).join('/');
        const endpoint = `https://api.github.com/repos/${contentRepository}/contents/${encodedPath}`;
        const currentResponse = await fetch(endpoint, { headers });
        let sha;
        if (currentResponse.ok) sha = (await currentResponse.json()).sha;
        else if (currentResponse.status !== 404) throw new Error('Could not prepare an image upload. Please try again.');
        const payload = { message: 'Upload service image from site editor', content };
        if (sha) payload.sha = sha;
        const response = await fetch(endpoint, { method: 'PUT', headers, body: JSON.stringify(payload) });
        if (!response.ok) throw new Error('A picture could not be uploaded. Please try publishing again.');
        pendingUploads.delete(path);
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
        await publishPendingImages(headers);
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
renderPageFields();
renderServicesAdmin();
resetServiceForm();
loadSiteContent();
