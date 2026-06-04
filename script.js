document.addEventListener('DOMContentLoaded', () => {
    const goodsTableBody = document.getElementById('goodsTableBody');
    const addRowBtn = document.getElementById('addGoodsRowBtn');

    // --- 1. INDIAN CURRENCY FORMATTING LOGIC ---

    // Number ko "30,000.00" format mein badalne ke liye
    const formatIndianNumber = (num) => {
        if (num === null || num === undefined || isNaN(num)) return "0.00";
        return parseFloat(num).toLocaleString('en-IN', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    };

    // Formatted string (30,000.00) se wapas number nikalne ke liye
    const getRawNumber = (val) => {
        if (!val) return 0;
        // String se comma hata kar number mein badle
        return parseFloat(val.toString().replace(/,/g, '')) || 0;
    };

    // Input fields par formatting apply karne ke liye
    const applyFormatting = (el) => {
        el.addEventListener('blur', (e) => {
            let raw = getRawNumber(e.target.value);
            e.target.value = formatIndianNumber(raw);
        });

        el.addEventListener('focus', (e) => {
            let raw = getRawNumber(e.target.value);
            // Type karte waqt comma hata dein
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

    // Total Amount formatting
    document.getElementById('totalAmount').value = formatIndianNumber(total);

    // --- TBB SECURITY LOGIC FOR TO PAY ---
    const toPayField = document.getElementById('toPay');

    if (toPay <= 0) {
        toPayField.value = "TBB BILL AT"; // Text to show
        toPayField.style.color = "red";   // Red color for security
        toPayField.style.fontWeight = "900"; // Extra Bold
    } else {
        toPayField.value = formatIndianNumber(toPay); // Show real value
        toPayField.style.color = "black"; // Normal color
        toPayField.style.fontWeight = "bold";
    }
};

    // --- 3. PAGE INITIALIZATION ---

    const setDate = () => {
        document.getElementById('date').valueAsDate = new Date();
    };

    const generateLR = () => {
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

        // New row ke liye events
        [wInp, rInp].forEach(inp => {
            inp.addEventListener('input', calculate);
            applyFormatting(inp);
        });
    };

    // --- 4. VALIDATION & PRINT LOGIC ---

    window.handlePrint = () => {
        // Fields to validate
        const truckNo = document.getElementById('truckNo');
        const fromLoc = document.getElementById('fromLoc');
        const toLoc = document.getElementById('toLoc');
        const consignor = document.getElementById('consignor');
        const consignee = document.getElementById('consignee');

        const fields = [
            { el: truckNo, name: "Truck Number" },
            { el: fromLoc, name: "Origin (From)" },
            { el: toLoc, name: "Destination (To)" },
            { el: consignor, name: "Consignor Details" },
            { el: consignee, name: "Consignee Details" }
        ];

        let isValid = true;
        let missing = "";

        fields.forEach(f => {
            if (!f.el.value.trim()) {
                f.el.style.border = "2px solid red";
                if (isValid) { missing = f.name; isValid = false; }
            } else {
                f.el.style.border = "";
            }
        });

        if (!isValid) {
            alert("Kripya karke ye jankari bharein: " + missing);
            return;
        }

        // Print page
        window.print();

        // Increment LR Counter
        let currentCounter = parseInt(localStorage.getItem('atc_lr_counter'));
        localStorage.setItem('atc_lr_counter', currentCounter + 1);

        // Clear Fields after print
       // Inside handlePrint -> setTimeout
        setTimeout(() => {
            // ... (other clear logic) ...

            ['freightRate', 'hamali', 'reward', 'biltiChares', 'advanced'].forEach(id => {
                document.getElementById(id).value = "0.00";
            });
            
            document.getElementById('totalAmount').value = "0.00";
            
            // RESET TO PAY TO TBB
            const toPayField = document.getElementById('toPay');
            toPayField.value = "TBB BILL AT";
            toPayField.style.color = "red";

            goodsTableBody.innerHTML = '';
            addRow();
            generateLR();
        }, 1000);
    };

    // --- 5. EVENT LISTENERS ATTACHMENT ---

    // Initial load
    setDate();
    generateLR();
    addRow();

    // Sidebar fields par formatting aur calculation lagayein
    ['freightRate', 'hamali', 'reward', 'biltiChares', 'advanced'].forEach(id => {
        const el = document.getElementById(id);
        el.addEventListener('input', calculate);
        applyFormatting(el);
    });

    addRowBtn.addEventListener('click', addRow);

    // Truck Number formatting (Auto space)
    document.getElementById('truckNo').addEventListener('input', (e) => {
        let val = e.target.value.toUpperCase().replace(/\s/g, '');
        if (val.length > 2) val = val.slice(0, 2) + ' ' + val.slice(2);
        if (val.length > 5) val = val.slice(0, 5) + ' ' + val.slice(5);
        if (val.length > 8) val = val.slice(0, 8) + ' ' + val.slice(8);
        e.target.value = val.slice(0, 13);
    });
});