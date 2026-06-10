const SHEET_URL = "https://script.google.com/macros/s/AKfycbxKgV7bZvpqqifE-A_xJH32ju-_AiNVuq0FAmRLdLUyKGGsHY6mrvr2BIHE5PKYy7es/exec";

const inputs = document.querySelectorAll('.calc-in, #advanced, #weight, #rate');

function checkPassword() {
    const pass = document.getElementById('passInput').value;
    const truck = document.getElementById('loginTruck');
    const passBox = document.getElementById('passBox');
    const overlay = document.getElementById('login-overlay');
    const errorMsg = document.getElementById('errorMsg');

    if (pass === "1234") {
        // Correct Password:
        errorMsg.style.display = "none";
        passBox.style.opacity = "0"; // Form gayab hoga
        passBox.style.transition = "0.5s";
        
        setTimeout(() => {
            truck.parentElement.classList.add('truck-exit'); // Truck aage nikal jayega
        }, 500);

        setTimeout(() => {
            overlay.classList.add('hide-overlay'); // Pura parda hat jayega
        }, 1500);
        
    } else {
        // Wrong Password:
        errorMsg.style.display = "block";
        passBox.style.animation = "shake 0.5s"; // Thoda vibrate hoga (optional)
        setTimeout(() => { passBox.style.animation = ""; }, 500);
    }
}

// Enter key se bhi login ho jaye
document.getElementById('passInput')?.addEventListener('keypress', function (e) {
    if (e.key === 'Enter') {
        checkPassword();
    }
});

window.onload = function() {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('date').value = today;
    fetchLastLR();
};

async function fetchLastLR() {
    try {
        const response = await fetch(SHEET_URL + "?action=getLastLR");
        const lastLR = await response.text();
        if(!isNaN(lastLR) && lastLR !== "") {
            document.getElementById('lrNo').value = parseInt(lastLR) + 1;
        }
    } catch (err) { console.log("LR Fetch Error"); }
}

function calculate() {
    const weight = parseFloat(document.getElementById('weight').value) || 0;
    const rate = parseFloat(document.getElementById('rate').value) || 0;
    
    // NAYA FORMULA: (KG / 1000) * RATE
    if (weight > 0 && rate > 0) {
        let freightCalc = (weight / 1000) * rate;
        document.getElementById('freight').value = freightCalc.toFixed(2);
    }

    const freight = parseFloat(document.getElementById('freight').value) || 0;
    const hamali = parseFloat(document.getElementById('hamali').value) || 0;
    const reward = parseFloat(document.getElementById('reward').value) || 0;
    const bilti = parseFloat(document.getElementById('bilti').value) || 0;
    const advanced = parseFloat(document.getElementById('advanced').value) || 0;

    const total = freight + hamali + reward + bilti;
    const toPay = total - advanced;

    document.getElementById('totalAmount').value = total.toFixed(2);
    const toPayEl = document.getElementById('toPay');
    
    if(toPay > 0) {
        toPayEl.innerText = "₹ " + Math.round(toPay).toLocaleString('en-IN'); // Math.round se .00 hat jayega
    } else {
        toPayEl.innerText = "TBB BILL AT";
    }
}

inputs.forEach(input => input.addEventListener('input', calculate));

// --- PDF Generation Logic ---
// PDF Generation Logic me ye 'opt' replace karein
function downloadPDF() {
    const element = document.querySelector('.landscape-paper');
    const lrNo = document.getElementById('lrNo').value;
    
    // Sabhi textareas ko temporary div mein convert karein jisme wrap hoga
    const textareas = element.querySelectorAll('textarea');
    textareas.forEach(tx => {
        const div = document.createElement('div');
        div.innerHTML = tx.value.replace(/\n/g, '<br>'); // Newlines ko <br> mein badlein
        div.style.whiteSpace = 'pre-wrap'; // Wrap ko support kare
        div.style.wordBreak = 'break-all'; // Long words ko break kare
        div.style.fontSize = '13px'; // Original font size
        div.style.fontWeight = 'bold';
        div.style.lineHeight = '1.4'; // Same line height
        div.style.width = '100%';
        div.style.overflow = 'visible'; // Scrollbar na ho
        
        // Original textarea ko hide karein aur div ko uski jagah rakhein
        tx.style.display = 'none';
        tx.parentNode.insertBefore(div, tx.nextSibling);
    });

    const opt = {
        margin:       0,
        filename:     'LR_' + lrNo + '.pdf',
        image:        { type: 'jpeg', quality: 1 },
        html2canvas:  { 
            scale: 2, 
            useCORS: true, 
            letterRendering: true,
            scrollY: 0,
            // onclone code ko hataya kyunki hum div use kar rahe hain
        },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'landscape' }
    };

    html2pdf().set(opt).from(element).save().then(() => {
        // PDF save hone ke baad temporary divs ko hatayein aur textareas ko wapas dikhayein
        element.querySelectorAll('div[style*="white-space: pre-wrap"]').forEach(div => {
            div.parentNode.removeChild(div);
        });
        textareas.forEach(tx => {
            tx.style.display = 'block'; // Ya original display property jo bhi ho
        });
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
        // 1. Google Sheet me data bhejein
        await fetch(SHEET_URL, {
            method: "POST",
            mode: "no-cors",
            body: JSON.stringify(data)
        });

        // 2. Data save hote hi PDF download karein
        downloadPDF();

    } catch (err) {
        alert("Error saving data!");
        btn.disabled = false;
        btn.innerText = "Save Data to Sheet & Print";
    }
});

// --- Login System Script ---
document.addEventListener('DOMContentLoaded', () => {
    const truck = document.getElementById('truckWrapper');
    const card = document.getElementById('passCard');
    
    // Truck enters after a small delay
    setTimeout(() => {
        truck.classList.add('truck-in');
    }, 500);

    // Password card appears after truck stops
    setTimeout(() => {
        card.classList.add('show');
    }, 1500);
});

function checkPassword() {
    const pass = document.getElementById('passInput').value;
    const card = document.getElementById('passCard');
    const truck = document.getElementById('truckWrapper');
    const overlay = document.getElementById('login-overlay');
    const errorMsg = document.getElementById('errorMsg');

    if (pass === "1234") {
        // SUCCESS
        errorMsg.style.display = "none";
        card.classList.add('card-fade-out');
        
        setTimeout(() => {
            truck.classList.add('truck-exit-fast');
        }, 300);

        setTimeout(() => {
            overlay.classList.add('overlay-hide');
        }, 1000);
        
    } else {
        // WRONG PASSWORD
        errorMsg.style.display = "block";
        card.style.animation = "shake 0.4s";
        document.getElementById('passInput').value = "";
        setTimeout(() => { card.style.animation = ""; }, 400);
    }
}

// Enter Key Support
document.getElementById('passInput')?.addEventListener('keypress', function (e) {
    if (e.key === 'Enter') checkPassword();
});