document.addEventListener('DOMContentLoaded', () => {
    const goodsTableBody = document.getElementById('goodsTableBody');
    const addRowBtn = document.getElementById('addGoodsRowBtn');

    // --- 1. INDIAN CURRENCY FORMATTING LOGIC ---
    const formatIndianNumber = (num) => {
        if (num === null || num === undefined || isNaN(num)) return "0.00";
        return parseFloat(num).toLocaleString('en-IN', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    };

    const getRawNumber = (val) => {
        if (!val) return 0;
        return parseFloat(val.toString().replace(/,/g, '')) || 0;
    };

    const applyFormatting = (el) => {
        el.addEventListener('blur', (e) => {
            let raw = getRawNumber(e.target.value);
            e.target.value = formatIndianNumber(raw);
        });
        el.addEventListener('focus', (e) => {
            let raw = getRawNumber(e.target.value);
            e.target.value = raw !== 0 ? raw : "";
        });
    };

    // --- 2. CALCULATION LOGIC ---
    window.calculate = () => {
        let autoFreight = 0;
        const rows = goodsTableBody.querySelectorAll('tr');
        
        rows.forEach(row => {
            const weight = getRawNumber(row.querySelector('.weight-input')?.value);
            const rate = getRawNumber(row.querySelector('.rate-input')?.value);
            if (weight > 0 && rate > 0) {
                autoFreight += (weight / 1000) * rate;
            }
        });

        if (autoFreight > 0) {
            document.getElementById('freightRate').value = formatIndianNumber(autoFreight);
        }

        const freight = getRawNumber(document.getElementById('freightRate').value);
        const hamali = getRawNumber(document.getElementById('hamali').value);
        const reward = getRawNumber(document.getElementById('reward').value);
        const bilti = getRawNumber(document.getElementById('biltiChares').value);
        const advance = getRawNumber(document.getElementById('advanced').value);

        const total = freight + hamali + reward + bilti;
        const toPay = total - advance;

        document.getElementById('totalAmount').value = formatIndianNumber(total);

       // --- TBB SECURITY LOGIC FOR TO PAY ---
    const toPayField = document.getElementById('toPay');

    if (toPay <= 0) {
        toPayField.value = "TBB BILL AT"; 
        toPayField.style.color = "red";   
        toPayField.style.fontWeight = "900"; 
        
        // NAYA BADLAV: Text ke liye class aur style adjust karein
        toPayField.classList.add('tbb-text-active');
    } else {
        toPayField.value = formatIndianNumber(toPay); 
        toPayField.style.color = "black"; 
        toPayField.style.fontWeight = "bold";
        
        // NAYA BADLAV: Number ke liye normal style
        toPayField.classList.remove('tbb-text-active');
    }
    };

    // --- 3. PAGE INITIALIZATION & LR GENERATION ---
    const setDate = () => {
        document.getElementById('date').valueAsDate = new Date();
    };

    // Yahan window attach kiya hai taaki clear logic mein work kare
    window.generateLR = () => {
        let counter = localStorage.getItem('atc_lr_counter');
        if (!counter) {
            counter = 500;
            localStorage.setItem('atc_lr_counter', counter);
        }
        document.getElementById('lrNo').value = counter;
    };

    window.addRow = () => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><textarea placeholder="Material Name..."></textarea></td>
            <td><input type="number" placeholder="0" class="cell-input"></td>
            <td><input type="text" placeholder="0" class="cell-input weight-input"></td>
            <td><input type="text" placeholder="0" class="cell-input rate-input"></td>
            <td><textarea class="remark-textarea" placeholder="Remark/Notes..."></textarea></td>
        `;
        goodsTableBody.appendChild(tr);

        const wInp = tr.querySelector('.weight-input');
        const rInp = tr.querySelector('.rate-input');

        [wInp, rInp].forEach(inp => {
            inp.addEventListener('input', calculate);
            applyFormatting(inp);
        });
    };

    // --- 4. VALIDATION & PDF GENERATION ---
    window.handlePrint = () => {
        const lrNoVal = document.getElementById('lrNo').value;
        const truckNoInp = document.getElementById('truckNo');
        const truckNoVal = truckNoInp.value.trim();
        const fromLoc = document.getElementById('fromLoc');
        const toLoc = document.getElementById('toLoc');
        const consignor = document.getElementById('consignor');
        const consignee = document.getElementById('consignee');

        const fields = [
            { el: truckNoInp, name: "Truck Number" },
            { el: fromLoc, name: "Origin (From)" },
            { el: toLoc, name: "Destination (To)" },
            { el: consignor, name: "Consignor" },
            { el: consignee, name: "Consignee" }
        ];

        let isValid = true;
        fields.forEach(f => {
            if (!f.el.value.trim()) {
                f.el.style.border = "2px solid red";
                isValid = false;
            } else {
                f.el.style.border = "";
            }
        });

        if (!isValid) {
            alert("Kripya sabhi fields bharein!");
            return;
        }

        // PDF Generation
        const element = document.getElementById('bookingSlip');
        const fileName = `LR_${lrNoVal}_${truckNoVal}.pdf`;

        const opt = {
            margin: [5, 5, 5, 5],
            filename: fileName,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' }
        };

        // Saving PDF and updating values
        html2pdf().from(element).set(opt).save().then(() => {
            // 1. Increment Counter in LocalStorage
            let currentCounter = parseInt(localStorage.getItem('atc_lr_counter')) || 500;
            localStorage.setItem('atc_lr_counter', currentCounter + 1);

            // 2. Success Message
            alert("Booking slip generated successfully!");

            // 3. Clear fields and update LR UI
            setTimeout(() => {
                truckNoInp.value = '';
                fromLoc.value = '';
                toLoc.value = '';
                consignor.value = '';
                consignee.value = '';

                ['freightRate', 'hamali', 'reward', 'biltiChares', 'advanced'].forEach(id => {
                    document.getElementById(id).value = "0.00";
                });
                
                document.getElementById('totalAmount').value = "0.00";
                
                const toPayField = document.getElementById('toPay');
                toPayField.value = "TBB BILL AT";
                toPayField.style.color = "red";

                goodsTableBody.innerHTML = '';
                window.addRow(); // Add one fresh row
                window.generateLR(); // Ab LR number refresh ho jayega
                setDate(); // Date reset
            }, 500);
        });
    };

    // --- 5. EVENT LISTENERS ---
    setDate();
    window.generateLR();
    window.addRow();

    ['freightRate', 'hamali', 'reward', 'biltiChares', 'advanced'].forEach(id => {
        const el = document.getElementById(id);
        el.addEventListener('input', calculate);
        applyFormatting(el);
    });

    addRowBtn.addEventListener('click', addRow);

    document.getElementById('truckNo').addEventListener('input', (e) => {
        let val = e.target.value.toUpperCase().replace(/\s/g, '');
        if (val.length > 2) val = val.slice(0, 2) + ' ' + val.slice(2);
        if (val.length > 5) val = val.slice(0, 5) + ' ' + val.slice(5);
        if (val.length > 8) val = val.slice(0, 8) + ' ' + val.slice(8);
        e.target.value = val.slice(0, 13);
    });
});