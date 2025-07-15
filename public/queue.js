import { supabase } from './supabase.js'

const queueList = document.getElementById('queueList')
let barbershopId = null

// Fetch shop ID
async function getShopId() {
  const { data, error } = await supabase
    .from("barbershops")
    .select("*")
    .eq("slug", "fadelab")
    .single()

  if (error) {
    console.error('Error loading barbershop:', error)
    queueList.textContent = 'Failed to load barbershop.'
    return
  }

  barbershopId = data.id
  loadQueue()
}

// Load all waiting queue entries
async function loadQueue() {
  queueList.innerHTML = 'Loading queue...'

  const { data: entries, error } = await supabase
    .from('queue_entries')
    .select('id, customer_name, requested_barber_id, joined_at')
    .eq('shop_id', barbershopId)
    .eq('status', 'waiting')
    .order('joined_at', { ascending: true })

  if (error) {
    console.error('Error loading queue:', error)
    queueList.textContent = 'Error loading queue.'
    return
  }

  if (entries.length === 0) {
    queueList.textContent = 'No one is currently in the queue.'
    return
  }

  let html = ''
  for (const entry of entries) {
    const barberName = await getBarberName(entry.requested_barber_id)
    const timeWaiting = getTimeSince(entry.joined_at)

    html += `
      <div class="barber-block">
        <strong>${entry.customer_name}</strong><br>
        Barber: ${barberName}<br>
        Waiting: ${timeWaiting}<br>
        <button onclick="removeEntry('${entry.id}')">❌ Remove</button>
      </div>
    `
  }

  queueList.innerHTML = html
}

// Calculate "time since" in minutes
function getTimeSince(joinedAt) {
  const now = new Date()
  const joined = new Date(joinedAt)
  const diffMs = now - joined
  const diffMin = Math.floor(diffMs / 60000)

  if (diffMin < 1) return 'just now'
  if (diffMin === 1) return '1 minute'
  return `${diffMin} minutes`
}

// Safe: avoids .single() and 406 errors
async function getBarberName(barberId) {
  if (!barberId) return 'Any Barber'

  try {
    const { data, error } = await supabase
      .from('barbers')
      .select('name')
      .eq('id', barberId)
      .limit(1)

    if (error) {
      console.error('Barber fetch error:', error)
      return 'Unknown'
    }

    return data.length > 0 ? data[0].name : 'Unknown'
  } catch (err) {
    console.error('Unexpected barber fetch error:', err)
    return 'Unknown'
  }
}

// Remove person from queue
window.removeEntry = async function (id) {
  const confirmed = confirm("Are you sure you want to remove this customer?")
  if (!confirmed) return

  const { error } = await supabase
    .from('queue_entries')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Failed to remove:', error)
    alert('Error removing entry.')
    return
  }

  loadQueue()
}

getShopId()