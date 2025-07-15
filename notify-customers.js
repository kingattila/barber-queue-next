require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const twilio = require('twilio');

// Supabase setup
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

// Twilio setup
const client = twilio(process.env.TWILIO_SID, process.env.TWILIO_AUTH_TOKEN);

// === CONFIG ===
const NOTIFY_THRESHOLD = 3;  // Notify when customer is 3rd or less in line
const DEFAULT_AVG_CUT_TIME = 15;  // Default 15 minutes, if not set per barber

// Send SMS Reminder to Customer
async function sendReminderSMS(toPhone, shopName, barberName = null) {
  try {
    const barberMessage = barberName ? ` with ${barberName}` : '';
    const msg = await client.messages.create({
      body: `You're almost up at ${shopName}${barberMessage}! Please be ready.`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: toPhone,
    });
    console.log(`✅ SMS sent to ${toPhone}. SID: ${msg.sid}`);
  } catch (err) {
    console.error(`❌ Failed to send to ${toPhone}:`, err.message);
  }
}

// Main function to check queue and send notifications
async function checkAndNotifyQueue() {
  const { data: queueEntries, error } = await supabase
    .from('queue_entries')
    .select('*')
    .eq('notified', false)
    .order('joined_at', { ascending: true });

  if (error) {
    console.error('❌ Error fetching queue:', error.message);
    return;
  }

  for (let i = 0; i < queueEntries.length; i++) {
    const person = queueEntries[i];
    const position = i + 1;

    // Notify when customer is within the threshold or next in line
    if (position <= NOTIFY_THRESHOLD) {
      // Get barber's name if selected
      const barberName = person.requested_barber_id ? await getBarberName(person.requested_barber_id) : null;
      
      await sendReminderSMS(person.phone_number, 'Your Barbershop', barberName);

      // Mark as notified
      await supabase
        .from('queue_entries')
        .update({ notified: true })
        .eq('id', person.id);
    }
  }
}

// Get Barber Name by Barber ID
async function getBarberName(barberId) {
  const { data, error } = await supabase
    .from('barbers')
    .select('name')
    .eq('id', barberId)
    .single();
  
  if (error) {
    console.error('❌ Error fetching barber name:', error.message);
    return null;
  }
  return data ? data.name : null;
}

// Set this to run every 2 to 5 minutes (e.g., via cron job or Supabase Edge Function)
checkAndNotifyQueue();