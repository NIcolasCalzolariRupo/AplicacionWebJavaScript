// app.js — lógica principal del simulador
// Evitar console.log antes de entrega (recomendado: comentar o eliminar)

const DATA_PATH = './js/data.json'; // si subes a GitHub Pages revisa ruta
const IVA_RATE = 0.21;
const SHIPPING = 800;

let products = [];
let cart = loadCartFromStorage(); // array {id, qty}

// Utilidades
function $(sel){ return document.querySelector(sel); }
function $all(sel){ return Array.from(document.querySelectorAll(sel)); }

// Cargar datos (simula endpoint remoto)
async function loadProducts(){
  try{
    const res = await fetch(DATA_PATH);
    if(!res.ok) throw new Error('Error al cargar productos');
    const json = await res.json();
    products = json.products;
    renderProducts();
    renderCart();
  } catch(e){
    // Uso de SweetAlert2 en lugar de alert
    Swal.fire({ icon:'error', title:'No se pudieron cargar los productos', text:e.message });
  }
}

// Render productos en DOM
function renderProducts(){
  const list = $('#product-list');
  list.innerHTML = '';
  products.forEach(p => {
    const card = document.createElement('article');
    card.className = 'card';
    card.innerHTML = `
      <img src="${p.img}" alt="${p.title}" onerror="this.src='https://via.placeholder.com/300x200?text=No+Image'"/>
      <h4>${p.title}</h4>
      <p>${p.desc}</p>
      <div><strong>$${p.price.toLocaleString()}</strong></div>
      <div style="margin-top:8px;">
        <button data-id="${p.id}" class="btn-add">Agregar</button>
      </div>
    `;
    list.appendChild(card);
  });

  // handlers
  $all('.btn-add').forEach(btn => {
    btn.addEventListener('click', (e)=>{
      const id = Number(e.currentTarget.dataset.id);
      addToCart(id);
      // feedback visual con SweetAlert2 toast
      Swal.fire({ toast:true, position:'top-end', icon:'success', title:'Producto agregado', showConfirmButton:false, timer:1000 });
    });
  });
}

// Carrito
function addToCart(id, qty=1){
  const item = cart.find(c => c.id === id);
  if(item) item.qty += qty;
  else cart.push({id, qty});
  saveCartToStorage();
  renderCart();
}

function removeFromCart(id){
  cart = cart.filter(c => c.id !== id);
  saveCartToStorage();
  renderCart();
}

function updateQty(id, qty){
  const item = cart.find(c=>c.id===id);
  if(!item) return;
  item.qty = qty;
  if(item.qty <= 0) removeFromCart(id);
  saveCartToStorage();
  renderCart();
}

function calculateSummary(){
  let subtotal = 0;
  cart.forEach(ci => {
    const p = products.find(x => x.id === ci.id);
    if(p) subtotal += p.price * ci.qty;
  });
  const iva = subtotal * IVA_RATE;
  const total = subtotal + iva + (cart.length ? SHIPPING : 0);
  return {subtotal, iva, shipping: cart.length ? SHIPPING : 0, total};
}

function renderCart(){
  const itemsEl = $('#cart-items');
  const summaryEl = $('#cart-summary');
  const countEl = $('#cart-count');
  itemsEl.innerHTML = '';
  if(cart.length === 0){
    itemsEl.innerHTML = '<p>Carrito vacío</p>';
  } else {
    cart.forEach(ci => {
      const p = products.find(x => x.id === ci.id) || {title:'Producto no encontrado', price:0};
      const row = document.createElement('div');
      row.className = 'cart-row';
      row.innerHTML = `
        <div style="flex:1">
          <strong>${p.title}</strong><div style="font-size:0.9rem;color:#666">$${p.price.toLocaleString()}</div>
        </div>
        <div style="display:flex;align-items:center;gap:6px">
          <input type="number" min="1" value="${ci.qty}" data-id="${ci.id}" style="width:60px"/>
          <button data-id="${ci.id}" class="btn-remove secondary">Eliminar</button>
        </div>
      `;
      itemsEl.appendChild(row);
    });

    // qty handlers
    $all('#cart-items input[type="number"]').forEach(inp=>{
      inp.addEventListener('change', e=>{
        const id = Number(e.currentTarget.dataset.id);
        const qty = Number(e.currentTarget.value) || 1;
        updateQty(id, qty);
      });
    });

    $all('.btn-remove').forEach(b=>{
      b.addEventListener('click', e=>{
        const id = Number(e.currentTarget.dataset.id);
        Swal.fire({
          title:'Eliminar producto?',
          text:'Se quitará del carrito',
          icon:'warning',
          showCancelButton:true,
          confirmButtonText:'Sí, eliminar',
          cancelButtonText:'Cancelar'
        }).then(result=>{
          if(result.isConfirmed) removeFromCart(id);
        });
      });
    });
  }

  const s = calculateSummary();
  summaryEl.innerHTML = `
    <div>Subtotal: $${s.subtotal.toLocaleString()}</div>
    <div>IVA (21%): $${Math.round(s.iva).toLocaleString()}</div>
    <div>Envío: $${s.shipping.toLocaleString()}</div>
    <hr/>
    <div><strong>Total: $${Math.round(s.total).toLocaleString()}</strong></div>
  `;

  countEl.textContent = `Carrito: ${cart.reduce((a,b)=>a+b.qty,0)}`;
}

// Storage
function saveCartToStorage(){
  localStorage.setItem('sim_cart_v1', JSON.stringify(cart));
}
function loadCartFromStorage(){
  try{
    const raw = localStorage.getItem('sim_cart_v1');
    return raw ? JSON.parse(raw) : [];
  } catch(e){
    return [];
  }
}

// Checkout modal + prefill
function openCheckout(){
  if(cart.length === 0){
    Swal.fire({ icon:'info', title:'Carrito vacío', text:'Agrega productos antes de pagar.' });
    return;
  }
  // prefill simple (simulación de datos remotos)
  const defaultData = { name:'Juan Pérez', email:'juan.perez@example.com', address:'Córdoba 123' };
  $('#customer-name').value = defaultData.name;
  $('#customer-email').value = defaultData.email;
  $('#customer-address').value = defaultData.address;
  $('#checkout-modal').classList.remove('hidden');
}

function closeCheckout(){
  $('#checkout-modal').classList.add('hidden');
}

// finalizar compra (simulación)
async function finalizePurchase(formData){
  // simulamos proceso de negocio: validaciones, cálculo, "pago"
  const summary = calculateSummary();
  // construir objeto orden
  const order = {
    id: 'ORD-' + Date.now(),
    customer: formData,
    items: cart.map(ci=>{
      const p = products.find(x=>x.id===ci.id);
      return {id:ci.id, title:p?.title ?? '', qty:ci.qty, unitPrice:p?.price ?? 0};
    }),
    summary,
    createdAt: new Date().toISOString()
  };

  // simulación async (podrías enviar a server)
  await new Promise(res => setTimeout(res, 700));

  // feedback y limpieza
  Swal.fire({
    icon:'success',
    title:'Compra realizada',
    html:`<p>Orden <strong>${order.id}</strong> registrada.<br/>Total: $${Math.round(summary.total).toLocaleString()}</p>`
  });

  // registro local de la "orden" (opcional: guardar en localStorage)
  const orders = JSON.parse(localStorage.getItem('sim_orders_v1') || '[]');
  orders.push(order);
  localStorage.setItem('sim_orders_v1', JSON.stringify(orders));

  cart = [];
  saveCartToStorage();
  renderCart();
  closeCheckout();
}

// Eventos UI
document.addEventListener('DOMContentLoaded', ()=> {
  loadProducts();

  $('#btn-checkout').addEventListener('click', openCheckout);
  $('#btn-clear').addEventListener('click', ()=>{
    Swal.fire({
      icon:'warning',
      title:'Vaciar carrito?',
      showCancelButton:true,
      confirmButtonText:'Sí, vaciar',
      cancelButtonText:'No'
    }).then(r => { if(r.isConfirmed){ cart=[]; saveCartToStorage(); renderCart(); }});
  });

  $('#btn-cancel').addEventListener('click', closeCheckout);
  $('#checkout-form').addEventListener('submit', (e)=>{
    e.preventDefault();
    const formData = {
      name: $('#customer-name').value.trim(),
      email: $('#customer-email').value.trim(),
      address: $('#customer-address').value.trim()
    };
    // validación simple
    if(!formData.name || !formData.email || !formData.address){
      Swal.fire({ icon:'error', title:'Faltan datos', text:'Completa todos los campos.' });
      return;
    }
    finalizePurchase(formData);
  });
});
