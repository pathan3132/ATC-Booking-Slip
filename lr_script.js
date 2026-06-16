const SHEET_URL = "https://script.google.com/macros/s/AKfycbxKgV7bZvpqqifE-A_xJH32ju-_AiNVuq0FAmRLdLUyKGGsHY6mrvr2BIHE5PKYy7es/exec";

const inputs = document.querySelectorAll('.calc-in, #advanced, #weight, #rate');

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
        setTimeout(() => { overlay.classList.add('overlay-hide'); }, 300);
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

    const opt = {
        margin: 0,
        filename: 'LR_' + lrNo + '_' + truckNo + '.pdf',
        image: { type: 'jpeg', quality: 1 },
        html2canvas: { scale: 2, useCORS: true, letterRendering: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' }
    };

    html2pdf().set(opt).from(element).save().then(() => {
        if(btn) btn.style.display = 'block';
        element.querySelectorAll('div[style*="white-space"]').forEach(div => div.remove());
        textareas.forEach(tx => tx.style.display = 'block');
        setTimeout(() => { location.reload(); }, 1500);
    });
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