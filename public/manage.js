import { supabase } from './supabase.js'

const barberList = document.getElementById('barberList')
const addBarberForm = document.getElementById('addBarberForm')
const barberNameInput = document.getElementById('barberName')
const notifyInput = document.getElementById('notifyThresholdInput')
const updateNotifyBtn = document.getElementById('updateNotifyBtn')

let barbershopId = null

// Get barbershop ID
async function getBarbershopId() {
  const { data, error } = await supabase
    .from("barbershops")
    .select("*")
    .eq("slug", "fadelab")
    .single()

  if (error) return null

  return data
}

// Load barbers
async function loadBarbers() {
  barberList.innerHTML = 'Loading barbers...'

  const { data: barbers, error } = await supabase
    .from('barbers')
    .select('*')
    .eq('shop_id', barbershopId)

  if (error) {
    barberList.innerHTML = 'Failed to load barbers.'
    return
  }

  barberList.innerHTML = ''

  for (const barber of barbers) {
    const container = document.createElement('div')
    container.className = 'barber-block'

    container.innerHTML = `
      <h3>${barber.name}</h3>
      <p>Status: ${barber.status}</p>
      <label>Avg Cut Time:
        <input type="number" class="cutTimeInput" data-id="${barber.id}" value="${barber.average_cut_time || 20}" style="width: 60px;" /> mins
      </label><br>
      <button class="updateCutTime" data-id="${barber.id}">Update Time</button>
      <button class="toggleStatus" data-id="${barber.id}" data-status="${barber.status}">
        ${barber.status === 'active' ? 'Deactivate' : 'Activate'}
      </button>
      <button class="clearBarberQueue" data-id="${barber.id}" style="background-color: red; color: white; margin-top: 10px;">❌ Clear ${barber.name}'s Queue</button>
      <button class="removeBarber" data-id="${barber.id}" style="margin-top: 10px;">❌ Remove</button>
    `
    barberList.appendChild(container)
  }

  attachEventListeners()
}

// Event listeners
function attachEventListeners() {
  document.querySelectorAll('.toggleStatus').forEach(button =>
    button.addEventListener('click', async (e) => {
      e.preventDefault()

      const id = e.target.dataset.id
      const currentStatus = e.target.dataset.status
      const newStatus = currentStatus === 'active' ? 'inactive' : 'active'

      const { error } = await supabase
        .from('barbers')
        .update({ status: newStatus })
        .eq('id', id)

      if (!error) loadBarbers()
      else alert("Failed to update status.")
    })
  )

  document.querySelectorAll('.removeBarber').forEach(button =>
    button.addEventListener('click', async (e) => {
      e.preventDefault()

      const id = e.target.dataset.id
      const confirmed = confirm('Are you sure you want to delete this barber?')
      if (!confirmed) return

      const { error } = await supabase
        .from('barbers')
        .delete()
        .eq('id', id)

      if (!error) loadBarbers()
      else alert("Failed to delete barber.")
    })
  )

  document.querySelectorAll('.updateCutTime').forEach(button =>
    button.addEventListener('click', async (e) => {
      e.preventDefault()

      const id = e.target.dataset.id
      const input = document.querySelector(`.cutTimeInput[data-id="${id}"]`)
      const cutTime = parseInt(input.value)

      if (!cutTime || cutTime < 1) {
        alert("Enter a valid cut time.")
        return
      }

      const { error } = await supabase
        .from('barbers')
        .update({ average_cut_time: cutTime })
        .eq('id', id)

      if (!error) alert('Cut time updated.')
      else alert('Failed to update.')
    })
  )

  document.querySelectorAll('.clearBarberQueue').forEach(button =>
    button.addEventListener('click', async (e) => {
      e.preventDefault()

      const barberId = e.target.dataset.id
      const confirmed = confirm("Clear this barber's queue?")
      if (!confirmed) return

      const { error } = await supabase
        .from('queue_entries')
        .delete()
        .eq('requested_barber_id', barberId)
        .eq('shop_id', barbershopId)

      if (!error) alert("Queue cleared for this barber.")
      else alert('Failed to clear queue.')
    })
  )
}

// Add barber
addBarberForm.addEventListener('submit', async (e) => {
  e.preventDefault()
  const name = barberNameInput.value.trim()
  if (!name) return

  const { error } = await supabase
    .from('barbers')
    .insert([{ name, shop_id: barbershopId, status: 'active', average_cut_time: 20 }])

  if (!error) {
    barberNameInput.value = ''
    loadBarbers()
  } else {
    alert('Failed to add barber.')
  }
})

// Update notify threshold
updateNotifyBtn.addEventListener('click', async () => {
  const newThreshold = parseInt(notifyInput.value)

  if (!newThreshold || newThreshold < 1) {
    alert("Enter a valid number.")
    return
  }

  const { error } = await supabase
    .from('barbershops')
    .update({ notify_threshold: newThreshold })
    .eq('id', barbershopId)

  if (!error) alert("Notify threshold updated.")
  else alert('Failed to update.')
})

// Init
getBarbershopId().then(shop => {
  if (!shop) return
  barbershopId = shop.id
  notifyInput.value = shop.notify_threshold || 10
  loadBarbers()
})