const SHEET_URL = "https://script.google.com/macros/s/AKfycbxKgV7bZvpqqifE-A_xJH32ju-_AiNVuq0FAmRLdLUyKGGsHY6mrvr2BIHE5PKYy7es/exec";

const inputs = document.querySelectorAll('.calc-in, #advanced, #weight, #rate');

// Waits until every <img> inside `element` has finished loading (success or
// error) and web fonts have finished loading. If capture starts before this,
// the logo/QR/sign images or the Roboto web font can still be loading —
// they then pop in a moment later, the browser reflows, and everything below
// that point shifts down, leaving exactly the kind of blank gap seen in the
// PDF. Waiting here guarantees the layout is fully settled before we measure
// anything or hand the page to html2canvas.
function waitForImagesAndFonts(element) {
    const imgPromises = Array.from(element.querySelectorAll('img')).map(img => {
        if (img.complete) return Promise.resolve();
        return new Promise(resolve => {
            img.addEventListener('load', resolve, { once: true });
            img.addEventListener('error', resolve, { once: true }); // don't hang on a broken image
        });
    });
    const fontPromise = (document.fonts && document.fonts.ready) ? document.fonts.ready : Promise.resolve();
    return Promise.all([...imgPromises, fontPromise]);
}

// Generates a single-page PDF whose page height always matches the content's
// real height exactly — so nothing is ever cropped and nothing overflows to page 2.
async function generateFitToPagePDF(element, filename) {
    // The user is usually scrolled down (to reach the button) when this runs.
    // Force the page back to the top first, and wait for every image and web
    // font to finish loading, so the layout is fully settled before anything
    // is measured or captured.
    window.scrollTo(0, 0);
    await waitForImagesAndFonts(element);
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));

    // PDF page width is fixed at 297mm (landscape A4 width).
    // Page height matches the element's actual aspect ratio (height/width).
    const PAGE_WIDTH_MM = 297;
    const heightMM = PAGE_WIDTH_MM * (element.offsetHeight / element.offsetWidth);

    const opt = {
        margin: 0,
        filename: filename,
        image: { type: 'png', quality: 1 },
        html2canvas: {
            scale: 2,
            useCORS: true,
            letterRendering: true,
            allowTaint: true,
            backgroundColor: '#ffffff',
            scrollX: 0,
            scrollY: 0,
            windowWidth: document.documentElement.scrollWidth,
            windowHeight: document.documentElement.scrollHeight
        },
        jsPDF: {
            unit: 'mm',
            format: [PAGE_WIDTH_MM, heightMM],
            orientation: 'landscape',
            compress: true
        }
        // NOTE: no `pagebreak` option here. The 'avoid-all' mode used earlier
        // tries to stop table rows/elements from being split across a page
        // boundary — but it estimates that boundary using its own internal
        // page-height guess, which doesn't know about our custom per-form
        // page height. That mismatch is what was reserving blank space
        // partway down the page. Everything already fits on this one custom
        // page, so there's never a break to avoid, and leaving this option
        // out entirely removes that whole source of the gap.
    };
    const pdf = await html2pdf().set(opt).from(element).toPdf().get('pdf');
    addWebsiteLinkToPDF(pdf, element);
    pdf.save(filename);
}

// Adds a real, clickable hyperlink on top of the website banner & QR box in the PDF,
// so anyone opening the PDF can tap/click straight through to the website.
function addWebsiteLinkToPDF(pdf, paperElement) {
    try {
        const paperRect = paperElement.getBoundingClientRect();
        const mmPerPx = 297 / paperRect.width; // .landscape-paper is fixed at 297mm wide
        ['websiteBanner', 'footerQr'].forEach(id => {
            const el = document.getElementById(id);
            if (!el) return;
            const rect = el.getBoundingClientRect();
            const x = (rect.left - paperRect.left) * mmPerPx;
            const y = (rect.top - paperRect.top) * mmPerPx;
            const w = rect.width * mmPerPx;
            const h = rect.height * mmPerPx;
            pdf.link(x, y, w, h, { url: 'https://atctransport.in' });
        });
    } catch (err) {
        console.log("Could not add clickable link to PDF:", err);
    }
}

// Login Logic
document.addEventListener('DOMContentLoaded', () => {
    const card = document.getElementById('passCard');
    setTimeout(() => { card.classList.add('show'); }, 100);
    document.getElementById('passInput').focus();
});

function checkPassword() {
    const pass = document.getElementById('passInput').value;
    const card = document.getElementById('passCard');
    const overlay = document.getElementById('login-overlay');
    const errorMsg = document.getElementById('errorMsg');

    if (pass === "1234") {
        errorMsg.style.display = "none";
        card.style.opacity = "0";
        setTimeout(() => {
            overlay.classList.add('overlay-hide');
            let seenVersion = null;
            try { seenVersion = localStorage.getItem('atc_lr_last_seen_version'); } catch (err) {}
            if (seenVersion !== APP_VERSION) {
                setTimeout(showWhatsNew, 500);
            }
        }, 300);
    } else {
        errorMsg.style.display = "block";
        card.style.animation = "shake 0.4s";
        document.getElementById('passInput').value = "";
        setTimeout(() => { card.style.animation = ""; }, 400);
    }
}

document.getElementById('passInput')?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') checkPassword();
});

// --- What's New / Update Notice ---
// Bump APP_VERSION and add a new entry at the TOP of CHANGELOG whenever you ship an update.
// Each user's browser shows the popup once automatically after login, the first time it
// sees a new version; they can also reopen it anytime with the 🆕 button.
const APP_VERSION = "2.0";
const CHANGELOG = [
    {
        version: "2.0",
        date: "07 Aug 2026",
        changes: [
            "Website (atctransport.in) aur QR Code ab ek naye highlighted banner mein saaf dikhte hain.",
            "PDF mein website banner ab clickable link hai — jisko PDF bhejo, wo link par click karke seedha website khol sakta hai.",
            "Naya button: 'Download Blank LR' — sirf LR No. ke sath khaali form download hota hai, pen se bharne ke liye. Har blank ke baad LR No. khud +1 ho jaata hai (Sheet mein kuch save nahi hota).",
            "Ye 'What's New' popup add hua hai, taaki har update ka pata chalta rahe."
        ]
    }
];

function renderWhatsNew() {
    const body = document.getElementById('whatsNewBody');
    if (!body) return;
    body.innerHTML = CHANGELOG.map(entry => `
        <div class="wn-entry">
            <div class="wn-version">Version ${entry.version} <span class="wn-date">(${entry.date})</span></div>
            <ul>${entry.changes.map(c => `<li>${c}</li>`).join('')}</ul>
        </div>
    `).join('');
}

function showWhatsNew() {
    renderWhatsNew();
    document.getElementById('whatsNewOverlay')?.classList.add('show');
}

function closeWhatsNew() {
    document.getElementById('whatsNewOverlay')?.classList.remove('show');
    try { localStorage.setItem('atc_lr_last_seen_version', APP_VERSION); } catch (err) {}
}

document.getElementById('whatsNewBtn')?.addEventListener('click', showWhatsNew);
document.getElementById('closeWhatsNew')?.addEventListener('click', closeWhatsNew);
document.getElementById('wnOkBtn')?.addEventListener('click', closeWhatsNew);

// Calculations & Fetch
window.onload = function() {
    document.getElementById('date').value = new Date().toISOString().split('T')[0];
    fetchLastLR();
};

async function fetchLastLR() {
    try {
        const response = await fetch(SHEET_URL + "?action=getLastLR");
        const lastLR = await response.text();
        if(!isNaN(lastLR) && lastLR !== "") document.getElementById('lrNo').value = parseInt(lastLR) + 1;
    } catch (err) { console.log("LR Fetch Error"); }
}

function calculate() {
    const weight = parseFloat(document.getElementById('weight').value) || 0;
    const rate = parseFloat(document.getElementById('rate').value) || 0;
    if (weight > 0 && rate > 0) document.getElementById('freight').value = ((weight / 1000) * rate).toFixed(2);

    const freight = parseFloat(document.getElementById('freight').value) || 0;
    const hamali = parseFloat(document.getElementById('hamali').value) || 0;
    const reward = parseFloat(document.getElementById('reward').value) || 0;
    const bilti = parseFloat(document.getElementById('bilti').value) || 0;
    const advanced = parseFloat(document.getElementById('advanced').value) || 0;

    const total = freight + hamali + reward + bilti;
    const toPay = total - advanced;
    document.getElementById('totalAmount').value = total.toFixed(2);
    
    const toPayEl = document.getElementById('toPay');
    toPayEl.innerText = (toPay > 0) ? "₹ " + Math.round(toPay).toLocaleString('en-IN') : "TBB BILL AT";
}

inputs.forEach(input => input.addEventListener('input', calculate));

// PDF Generation logic
function downloadPDF() {
    const element = document.querySelector('.landscape-paper');
    const lrNo = document.getElementById('lrNo').value;
    const truckNo = document.getElementById('truckNo').value || "NoTruck";
    const btn = document.getElementById('submitBtn');

    if(btn) btn.style.display = 'none'; // Hide button before capture

    const textareas = element.querySelectorAll('textarea');
    textareas.forEach(tx => {
        const div = document.createElement('div');
        div.innerHTML = tx.value.replace(/\n/g, '<br>');
        div.style.cssText = "white-space:pre-wrap; word-break:break-all; font-size:13px; font-weight:bold; line-height:1.4; width:100%; overflow:visible;";
        tx.style.display = 'none';
        tx.parentNode.insertBefore(div, tx.nextSibling);
    });

    const filename = 'LR_' + lrNo + '_' + truckNo + '.pdf';

    generateFitToPagePDF(element, filename).then(() => {
        if(btn) btn.style.display = 'block';
        element.querySelectorAll('div[style*="white-space"]').forEach(div => div.remove());
        textareas.forEach(tx => tx.style.display = 'block');
        setTimeout(() => { location.reload(); }, 1500);
    }).catch((err) => {
        console.log("PDF Error:", err);
        if(btn) btn.style.display = 'block';
        alert("Error generating PDF!\n\n" + (err && err.message ? err.message : err));
    });
}

// Blank PDF for manual pen filling — keeps only LR No, clears everything else,
// doesn't save to sheet, and auto-increments LR No for the next blank print
async function downloadBlankPDF() {
    const blankBtn = document.getElementById('blankPdfBtn');
    const submitBtn = document.getElementById('submitBtn');
    const lrNoEl = document.getElementById('lrNo');
    const element = document.querySelector('.landscape-paper');

    const currentLrNo = lrNoEl.value || 'NA';

    if (blankBtn) { blankBtn.disabled = true; blankBtn.innerText = "Generating..."; }
    if (submitBtn) submitBtn.style.display = 'none';

    // Fields to clear (LR No is kept so the printed paper is still numbered)
    const blankFieldIds = ['date', 'truckNo', 'bookingAt', 'from', 'to', 'consignor', 'consignee',
        'goods', 'pkg', 'weight', 'rate', 'remark', 'freight', 'hamali', 'reward', 'bilti', 'advanced'];
    blankFieldIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
    document.getElementById('totalAmount').value = '0.00';
    document.getElementById('toPay').innerText = 'TBB BILL AT';

    // Same textarea-to-div swap trick used in downloadPDF, so empty boxes print clean
    const textareas = element.querySelectorAll('textarea');
    textareas.forEach(tx => {
        const div = document.createElement('div');
        div.innerHTML = '';
        div.style.cssText = "white-space:pre-wrap; word-break:break-all; font-size:13px; font-weight:bold; line-height:1.4; width:100%; min-height:20px; overflow:visible;";
        tx.style.display = 'none';
        tx.parentNode.insertBefore(div, tx.nextSibling);
    });

    const opt = { filename: 'Blank_LR_' + currentLrNo + '.pdf' };

    try {
        await generateFitToPagePDF(element, opt.filename);
    } catch (err) {
        alert("Error generating blank PDF!");
    } finally {
        // Restore textareas
        element.querySelectorAll('div[style*="white-space"]').forEach(div => div.remove());
        textareas.forEach(tx => tx.style.display = 'block');

        // Auto-increment LR No for the next blank form
        const nextLr = parseInt(currentLrNo);
        if (!isNaN(nextLr)) lrNoEl.value = nextLr + 1;

        // Reset date field to today for whenever this form gets used next
        document.getElementById('date').value = new Date().toISOString().split('T')[0];

        if (submitBtn) submitBtn.style.display = 'block';
        if (blankBtn) { blankBtn.disabled = false; blankBtn.innerText = "Download Blank LR (For Manual Fill)"; }
    }
}

document.getElementById('lrForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    const btn = document.getElementById('submitBtn');
    btn.innerText = "Saving & Generating PDF...";
    btn.disabled = true;

    const data = {
        lrNo: document.getElementById('lrNo').value,
        date: document.getElementById('date').value,
        truckNo: document.getElementById('truckNo').value,
        from: document.getElementById('from').value,
        to: document.getElementById('to').value,
        consignor: document.getElementById('consignor').value,
        consignee: document.getElementById('consignee').value,
        goods: document.getElementById('goods').value,
        pkg: document.getElementById('pkg').value,
        weight: document.getElementById('weight').value,
        rate: document.getElementById('rate').value,
        remark: document.getElementById('remark').value,
        freight: document.getElementById('freight').value,
        hamali: document.getElementById('hamali').value,
        reward: document.getElementById('reward').value,
        bilti: document.getElementById('bilti').value,
        total: document.getElementById('totalAmount').value,
        advanced: document.getElementById('advanced').value,
        toPay: document.getElementById('toPay').innerText
    };

    try {
        await fetch(SHEET_URL, { method: "POST", mode: "no-cors", body: JSON.stringify(data) });
        downloadPDF();
    } catch (err) {
        alert("Error saving data!");
        btn.disabled = false;
        btn.innerText = "Save Data to Sheet & Print";
    }
});