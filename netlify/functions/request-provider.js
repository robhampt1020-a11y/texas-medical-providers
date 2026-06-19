const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_FIELD_LENGTH = 1200;
const REQUIRED_FIELDS = ['firmName', 'contactName', 'email', 'phone', 'cityOrZip', 'caseType'];

function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store'
    },
    body: JSON.stringify(body)
  };
}

function clean(value, maxLength = MAX_FIELD_LENGTH) {
  return String(value || '')
    .replace(/[<>]/g, '')
    .trim()
    .slice(0, maxLength);
}

function loadRoutingMap() {
  const encoded = process.env.PROVIDER_ROUTING_JSON_BASE64;
  const raw = encoded
    ? Buffer.from(encoded, 'base64').toString('utf8')
    : process.env.PROVIDER_ROUTING_JSON;

  if (!raw) {
    return {};
  }

  const parsed = JSON.parse(raw);
  return parsed && typeof parsed === 'object' ? parsed : {};
}

function requireEmailConfig() {
  const required = ['RESEND_API_KEY', 'FROM_EMAIL', 'TMP_COPY_EMAIL'];
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length) {
    throw new Error(`Email routing is not configured yet. Missing: ${missing.join(', ')}`);
  }
}

function buildTextEmail({ fields, provider, destinationType }) {
  return [
    `TMP Provider Request`,
    ``,
    `Destination: ${destinationType}`,
    `Selected provider: ${provider?.name || fields.providerName || 'General Provider Request'}`,
    `Specialty needed: ${fields.specialtyNeeded || provider?.primarySpecialty || 'Not specified'}`,
    ``,
    `Law firm: ${fields.firmName}`,
    `Contact name: ${fields.contactName}`,
    `Contact email: ${fields.email}`,
    `Contact phone: ${fields.phone}`,
    `City / ZIP: ${fields.cityOrZip}`,
    `Case type: ${fields.caseType}`,
    ``,
    `Notes:`,
    fields.notes || 'No notes provided.',
    ``,
    `Submitted: ${new Date().toISOString()}`
  ].join('\n');
}

function buildHtmlEmail({ fields, provider, destinationType }) {
  const rows = [
    ['Destination', destinationType],
    ['Selected provider', provider?.name || fields.providerName || 'General Provider Request'],
    ['Specialty needed', fields.specialtyNeeded || provider?.primarySpecialty || 'Not specified'],
    ['Law firm', fields.firmName],
    ['Contact name', fields.contactName],
    ['Contact email', fields.email],
    ['Contact phone', fields.phone],
    ['City / ZIP', fields.cityOrZip],
    ['Case type', fields.caseType],
    ['Submitted', new Date().toISOString()]
  ];

  const safe = (value) => String(value || '').replace(/[&<>'"]/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  }[char]));

  return `
    <div style="font-family: Arial, sans-serif; color: #10231f; line-height: 1.5;">
      <h2 style="margin: 0 0 16px;">TMP Provider Request</h2>
      <table cellpadding="8" cellspacing="0" style="border-collapse: collapse; width: 100%; max-width: 720px;">
        ${rows.map(([label, value]) => `
          <tr>
            <td style="border: 1px solid #d7e6e1; font-weight: 700; width: 190px;">${safe(label)}</td>
            <td style="border: 1px solid #d7e6e1;">${safe(value)}</td>
          </tr>
        `).join('')}
      </table>
      <h3 style="margin: 20px 0 8px;">Notes</h3>
      <p style="white-space: pre-wrap;">${safe(fields.notes || 'No notes provided.')}</p>
    </div>
  `;
}

async function sendResendEmail({ to, bcc, subject, text, html, replyTo }) {
  const payload = {
    from: process.env.FROM_EMAIL,
    to: Array.isArray(to) ? to : [to],
    subject,
    text,
    html
  };

  if (bcc && bcc.length) payload.bcc = bcc;
  if (replyTo) payload.reply_to = replyTo;

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Email provider rejected the request: ${body.slice(0, 240)}`);
  }
}

exports.handler = async function handler(event) {
  if (event.httpMethod === 'OPTIONS') {
    return json(204, { ok: true });
  }

  if (event.httpMethod !== 'POST') {
    return json(405, { ok: false, error: 'Method not allowed.' });
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return json(400, { ok: false, error: 'Invalid JSON request.' });
  }

  if (clean(body.companyWebsite, 200)) {
    return json(200, { ok: true });
  }

  const fields = {
    providerSlug: clean(body.providerSlug, 160),
    providerName: clean(body.providerName, 200),
    specialtyNeeded: clean(body.specialtyNeeded, 200),
    firmName: clean(body.firmName, 200),
    contactName: clean(body.contactName, 200),
    email: clean(body.email, 200),
    phone: clean(body.phone, 80),
    cityOrZip: clean(body.cityOrZip, 160),
    caseType: clean(body.caseType, 160),
    notes: clean(body.notes, 1200)
  };

  const missing = REQUIRED_FIELDS.filter((field) => !fields[field]);
  if (missing.length) {
    return json(400, { ok: false, error: `Missing required fields: ${missing.join(', ')}` });
  }

  if (!EMAIL_RE.test(fields.email)) {
    return json(400, { ok: false, error: 'Enter a valid contact email.' });
  }

  if (!body.acknowledgement) {
    return json(400, { ok: false, error: 'The acknowledgement checkbox is required.' });
  }

  let routingMap;
  try {
    routingMap = loadRoutingMap();
  } catch {
    return json(500, { ok: false, error: 'Provider routing data is not valid JSON.' });
  }

  const selectedProvider = fields.providerSlug ? routingMap[fields.providerSlug] : null;
  if (fields.providerSlug && !selectedProvider) {
    return json(400, { ok: false, error: 'Selected provider is not configured for routing yet.' });
  }

  try {
    requireEmailConfig();
  } catch (error) {
    return json(503, { ok: false, error: error.message });
  }

  const destination = selectedProvider?.email || process.env.TMP_COPY_EMAIL;
  if (!EMAIL_RE.test(destination)) {
    return json(500, { ok: false, error: 'Destination email is not configured correctly.' });
  }

  const destinationType = selectedProvider ? 'Selected provider' : 'TMP general request inbox';
  const subjectProvider = selectedProvider?.name || fields.providerName || 'General Provider Request';
  const subject = `TMP Provider Request - ${subjectProvider} - ${fields.cityOrZip}`;
  const text = buildTextEmail({ fields, provider: selectedProvider, destinationType });
  const html = buildHtmlEmail({ fields, provider: selectedProvider, destinationType });

  const tmpCopy = process.env.TMP_COPY_EMAIL;
  const bcc = selectedProvider && tmpCopy && tmpCopy.toLowerCase() !== destination.toLowerCase() ? [tmpCopy] : [];

  try {
    await sendResendEmail({
      to: destination,
      bcc,
      subject,
      text,
      html,
      replyTo: fields.email
    });

    if (String(process.env.SEND_REQUESTER_CONFIRMATION || '').toLowerCase() === 'true') {
      await sendResendEmail({
        to: fields.email,
        subject: 'TMP received your provider request',
        text: 'Texas Medical Providers received your provider request. TMP or the selected provider office may follow up using the contact information submitted.',
        html: '<p>Texas Medical Providers received your provider request. TMP or the selected provider office may follow up using the contact information submitted.</p>'
      });
    }
  } catch (error) {
    return json(502, { ok: false, error: error.message });
  }

  return json(200, { ok: true });
};
