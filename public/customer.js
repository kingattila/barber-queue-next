import { supabase } from './supabase.js';

const nameInput = document.getElementById('nameInput');
const phoneInput = document.getElementById('phoneInput');
const barberList = document.getElementById('barberList');

// Fetch active barbers
async function loadBarbers() {
  barberList.innerHTML = 'Loading barbers...';

  const { data: barbers, error } = await supabase
    .from('barbers')
    .select('*')
    .eq('status', 'active');

  if (error) {
    console.error('Error loading barbers:', error);
    barberList.innerHTML = 'Failed to load barbers.';
    return;
  }

  barberList.innerHTML = '';

  const generalQueueCount = await getQueueCount(null);
  const generalDiv = document.createElement('div');
  generalDiv.className = 'barber-block';
  generalDiv.innerHTML = `
    <h2>🧍 Any Barber</h2>
    <p>Customers ahead: ${generalQueueCount}</p>
    <button onclick="joinQueue(null)">Join</button>
  `;
  barberList.appendChild(generalDiv);

  for (const barber of barbers) {
    const count = await getQueueCount(barber.id);
    const block = document.createElement('div');
    block.className = 'barber-block';
    block.innerHTML = `
      <h2>✂️ ${barber.name}</h2>
      <p>Customers ahead: ${count}</p>
      <button onclick="joinQueue('${barber.id}')">Join ${barber.name}</button>
    `;
    barberList.appendChild(block);
  }
}

async function getQueueCount(barberId) {
  let query = supabase
    .from('queue_entries')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'waiting');

  if (barberId === null) {
    query = query.is('requested_barber_id', null);
  } else {
    query = query.eq('requested_barber_id', barberId);
  }

  const { count, error } = await query;

  if (error) {
    console.error('Error fetching queue count:', error);
    return 0;
  }

  return count;
}

// 🧠 Join queue and send SMS confirmation
window.joinQueue = async function (barberId) {
  const name = nameInput.value.trim();
  const phoneNumber = phoneInput.value.trim();

  if (!name || !phoneNumber) {
    alert('Please enter your name and phone number');
    return;
  }

  if (!/^\+\d{10,15}$/.test(phoneNumber)) {
    alert('Please enter a valid phone number in E.164 format (e.g., +12345678901)');
    return;
  }

  const { data: shop, error: shopError } = await supabase
    .from('barbershops')
    .select('id')
    .eq('slug', 'fadelab')
    .single();

  if (shopError || !shop) {
    console.error('Failed to load shop ID:', shopError);
    alert('Something went wrong. Please try again.');
    return;
  }

  console.log("Joining queue with shop_id:", shop.id);

  const { error } = await supabase.from('queue_entries').insert({
    customer_name: name,
    phone_number: phoneNumber,
    requested_barber_id: barberId,
    status: 'waiting',
    shop_id: shop.id,
    notified: false
  });

  if (error) {
    console.error('Error joining queue:', error);
    alert('Something went wrong joining the queue.');
    return;
  }

  // ✅ Send confirmation SMS (NOTIFY FILE WILL HANDLE "YOU'RE UP NEXT")
  try {
    const smsRes = await fetch('/send-sms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: phoneNumber,
        message: `Hey ${name}, you've joined the queue at Fade Lab. We'll text you again when you're up next!`
      })
    });

    if (!smsRes.ok) throw new Error('SMS confirmation failed');
    console.log('✅ Confirmation SMS sent');
  } catch (err) {
    console.error('❌ Error sending SMS confirmation:', err.message);
    // Not fatal – still joined
  }

  alert('You’ve been added to the queue!');
  location.reload();
};

loadBarbers();