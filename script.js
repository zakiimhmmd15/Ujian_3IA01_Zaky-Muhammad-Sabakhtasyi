
const $ = id => document.getElementById(id);


const USERS_KEY = 'exp_users_v1';
const LAST_USER = 'exp_last_user_v1';


let currentUser = null;
let expenses = []; 


let isEditMode = false;
let editId = null;


window.addEventListener('load', ()=>{
  ensureLogin();
  setupForm();
  renderAll();
});


function ensureLogin(){
  const last = localStorage.getItem(LAST_USER);
  if(last){ loginAs(last); return; }
  showLoginModal();
}

function showLoginModal(){
  const overlay = document.createElement('div'); overlay.className='modal-overlay'; overlay.id='loginOverlay';
  overlay.innerHTML = `
    <div class="modal">
      <h3>Login / Register</h3>
      <input id="u_name" placeholder="Username" />
      <input id="u_pass" type="password" placeholder="Password" />
      <div style="display:flex;gap:8px;margin-top:8px">
        <button id="loginBtn">Login</button>
        <button id="regBtn">Register</button>
      </div>
      <div class="small" style="margin-top:8px">Data disimpan lokal.</div>
    </div>`;
  document.body.appendChild(overlay);
  document.getElementById('loginBtn').addEventListener('click', doLogin);
  document.getElementById('regBtn').addEventListener('click', doRegister);
}

function closeLoginModal(){ const el = $('loginOverlay'); if(el) el.remove(); }
function loadUsers(){ try{ return JSON.parse(localStorage.getItem(USERS_KEY)||'{}'); }catch(e){return{}} }
function saveUsers(u){ localStorage.setItem(USERS_KEY, JSON.stringify(u)); }

function doRegister(){
  const user = $('u_name').value.trim();
  const pass = $('u_pass').value.trim();
  if(!user||!pass){ alert('Isi username & password'); return; }
  const users = loadUsers();
  if(users[user]){ alert('Username sudah ada'); return; }
  users[user] = {pass}; saveUsers(users); alert('Registrasi sukses, silakan login');
}

function doLogin(){
  const user = $('u_name').value.trim();
  const pass = $('u_pass').value.trim();
  if(!user||!pass){ alert('Isi username & password'); return; }
  const users = loadUsers();
  if(!users[user] || users[user].pass !== pass){ alert('Login gagal'); return; }
  loginAs(user);
  localStorage.setItem(LAST_USER, user);
  closeLoginModal();
}

function loginAs(user){ currentUser = user; expenses = loadExpenses(user); renderAll(); }


function expensesKey(user){ return 'expenses_' + user; }
function loadExpenses(user){ try{ return JSON.parse(localStorage.getItem(expensesKey(user))||'[]'); }catch(e){return[];} }
function saveExpenses(){ if(!currentUser) return; localStorage.setItem(expensesKey(currentUser), JSON.stringify(expenses)); }


function setupForm(){
  const d = new Date().toISOString().slice(0,10);
  if($('date')) $('date').value = d;
}


function saveData(){
  if(!currentUser){ alert('Silakan login'); showLoginModal(); return; }
  
  const item = $('item').value.trim();
  const qty = parseInt($('qty').value||'0',10);
  const price = parseInt($('price').value||'0',10);
  const date = $('date').value;
  const method = $('method').value;
  const category = $('category').value;

  if(!item || qty<=0 || price<=0 || !date){ alert('Isi semua form dengan benar'); return; }

  const total = qty * price;

  if(isEditMode && editId){
    
    const index = expenses.findIndex(e => e.id === editId);
    if(index !== -1){
      expenses[index] = { id: editId, item, qty, price, total, date, method, category };
      alert('Data berhasil diperbarui!');
    }
    cancelEdit(); 
  } else {
    
    const entry = { id: Date.now().toString(), item, qty, price, total, date, method, category };
    expenses.unshift(entry);
  }

  saveExpenses();
  renderAll();
  if(!isEditMode) clearForm(); 
}


function deleteItem(id){
  if(confirm('Yakin ingin menghapus data ini?')){
    expenses = expenses.filter(e => e.id !== id);
    saveExpenses();
    renderAll();
    if(isEditMode && editId === id) cancelEdit(); 
  }
}



function editItem(id){
  const target = expenses.find(e => e.id === id);
  if(!target) return;

  $('item').value = target.item;
  $('qty').value = target.qty;
  $('price').value = target.price;
  $('date').value = target.date;
  $('method').value = target.method;
  $('category').value = target.category;

  isEditMode = true;
  editId = id;
  $('form-title').innerText = 'Edit Pengeluaran';
  $('saveBtn').innerText = 'Update';
  $('cancelBtn').style.display = 'block';
  
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function cancelEdit(){
  isEditMode = false;
  editId = null;
  clearForm();
  $('form-title').innerText = 'Tambah Pengeluaran';
  $('saveBtn').innerText = 'Tambah';
  $('cancelBtn').style.display = 'none';
}

function clearForm(){ 
  ['item','qty','price'].forEach(id=>{ if($(id)) $(id).value=''; }); 
  $('date').value = new Date().toISOString().slice(0,10);
}


function renderAll(){ renderTable(); renderSummary(); }

function renderTable(){
  const tbody = $('list'); if(!tbody) return;
  tbody.innerHTML = '';
  
  if(expenses.length===0){ 
    tbody.innerHTML = '<tr><td colspan="8" style="color:var(--text-muted);text-align:center;padding:30px;">Belum ada data transaksi.<br>Silakan tambah pengeluaran baru.</td></tr>'; 
    return; 
  }
  
  const frag = document.createDocumentFragment();
  expenses.forEach(e=>{
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${escapeHtml(e.item)}</td>
      <td>${e.qty}</td>
      <td>${formatRp(e.price)}</td>
      <td>${formatRp(e.total)}</td>
      <td>${e.date}</td>
      <td>${e.method}</td>
      <td>${e.category}</td>
      <td>
        <div class="action-wrapper">
          <button class="btn-action btn-edit" onclick="editItem('${e.id}')">Edit</button>
          <button class="btn-action btn-delete" onclick="deleteItem('${e.id}')">Hapus</button>
        </div>
      </td>
    `;
    frag.appendChild(tr);
  });
  tbody.appendChild(frag);
}

function renderSummary(){ 
  const sum = expenses.reduce((s,e)=>s+e.total,0); 
  const el = $('summary'); 
  if(el) el.textContent = 'Total Pengeluaran: ' + formatRp(sum); 
}

function formatRp(n){ return 'Rp ' + (n||0).toString().replace(/\B(?=(\d{3})+(?!\d))/g,'.'); }
function escapeHtml(s){ return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }