(function() {
  const style = document.createElement("style");
  style.textContent = `
    .alert {
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.6);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 1000;
    }
    .alert.hidden { display: none; }
    .alert-content {
      background: #111;
      color: #eee;
      border-radius: 10px;
      padding: 20px 30px;
      width: 250px;
      text-align: center;
      box-shadow: 0 0 10px #000;
      font-family: monospace;
      border: 1px solid #333;
      animation: fadeIn 0.3s ease;
    }
    .alert.success .alert-content {
      border-color: #1f8b4c;
      color: #adffb4;
    }
    .alert.error .alert-content {
      border-color: #c0392b;
      color: #ffb3b3;
    }
    .alert-content button {
      margin-top: 15px;
      background: #333;
      color: #fff;
      border: none;
      padding: 6px 12px;
      border-radius: 6px;
      cursor: pointer;
      transition: background 0.2s;
    }
    .alert-content button:hover {
      background: #555;
    }
    @keyframes fadeIn {
      from { transform: scale(0.9); opacity: 0; }
      to { transform: scale(1); opacity: 1; }
    }
  `;
  document.head.appendChild(style);
  
  const alertBox = document.createElement("div");
  alertBox.id = "alertBox";
  alertBox.className = "alert hidden";
  alertBox.innerHTML = `
    <div class="alert-content">
      <p id="alertMessage"></p>
      <button id="alertOk">OK</button>
    </div>
  `;
  document.body.appendChild(alertBox);
    window.showAlert = function(message, type = "success", duration = 4000) {
    const box = document.getElementById("alertBox");
    const msg = document.getElementById("alertMessage");
    const ok = document.getElementById("alertOk");
    
    msg.textContent = message;
    box.classList.remove("hidden", "success", "error");
    box.classList.add(type);
    
    ok.onclick = () => box.classList.add("hidden");
    
    clearTimeout(box._timeout);
    box._timeout = setTimeout(() => box.classList.add("hidden"), duration);
  };
})();