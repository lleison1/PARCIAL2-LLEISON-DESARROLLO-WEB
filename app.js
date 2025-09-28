const els = {
  clientForm: document.getElementById('client-form'),
  clientMsg: document.getElementById('client-msg'),
  clientsBody: document.getElementById('clients-body'),
  clientSelect: document.getElementById('client-select'),
  orderForm: document.getElementById('order-form'),
  orderMsg: document.getElementById('order-msg'),
  ordersBody: document.getElementById('orders-body'),
  selectedClient: document.getElementById('selected-client')
};

function pill(s){ return `<span class="status-pill status-${s}">${s.replace('_',' ')}</span>` }

async function api(path, { method='GET', body } = {}){
  const res = await fetch(path, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined
  });
  const data = await res.json().catch(()=>({}));
  if (!res.ok) throw data;
  return data;
}

async function loadClients(){
  const clients = await api('/clients');
  els.clientsBody.innerHTML = clients.map(c => `
    <tr>
      <td>${c.id}</td>
      <td>${c.name}</td>
      <td>${c.email}</td>
      <td>${c.phone}</td>
      <td><button data-view="${c.id}" data-name="${c.name}">Ver órdenes</button></td>
    </tr>
  `).join('');
  els.clientSelect.innerHTML = clients.map(c => `<option value="${c.id}">${c.name} (#${c.id})</option>`).join('');
}

async function loadOrders(clientId, clientName){
  const orders = await api(`/orders/${clientId}`);
  els.selectedClient.textContent = `Cliente seleccionado: ${clientName} (#${clientId})`;
  els.ordersBody.innerHTML = orders.map(o => `
    <tr>
      <td>${o.dish_name}</td>
      <td>${o.notes ?? ''}</td>
      <td>${pill(o.status)}</td>
      <td>${new Date(o.created_at).toLocaleString()}</td>
      <td><button data-advance="${o.id}">Avanzar estado</button></td>
    </tr>
  `).join('');
}

els.clientForm.addEventListener('submit', async e => {
  e.preventDefault();
  els.clientMsg.textContent = '';
  const fd = new FormData(els.clientForm);
  try {
    await api('/clients', {
      method:'POST',
      body:{
        name: fd.get('name'),
        email: fd.get('email'),
        phone: fd.get('phone')
      }
    });
    els.clientForm.reset();
    await loadClients();
  } catch(err){
    els.clientMsg.textContent = err.error || 'Error al crear cliente';
  }
});

els.orderForm.addEventListener('submit', async e => {
  e.preventDefault();
  els.orderMsg.textContent = '';
  const fd = new FormData(els.orderForm);
  try {
    await api('/orders', {
      method:'POST',
      body:{
        client_id: parseInt(fd.get('client_id'),10),
        dish_name: fd.get('dish_name'),
        notes: fd.get('notes')
      }
    });
    els.orderForm.reset();
    await loadOrders(els.clientSelect.value, els.clientSelect.selectedOptions[0].textContent);
  } catch(err){
    els.orderMsg.textContent = err.error || 'Error al crear orden';
  }
});

els.clientsBody.addEventListener('click', async e => {
  const btn = e.target.closest('button[data-view]');
  if (!btn) return;
  await loadOrders(btn.dataset.view, btn.dataset.name);
  els.clientSelect.value = btn.dataset.view;
});

els.ordersBody.addEventListener('click', async e => {
  const btn = e.target.closest('button[data-advance]');
  if (!btn) return;
  try{
    await api(`/orders/${btn.dataset.advance}/status`, { method: 'PUT' });
    await loadOrders(els.clientSelect.value, els.clientSelect.selectedOptions[0].textContent);
  }catch(err){
    alert(err.error || 'No se pudo actualizar');
  }
});

loadClients();
