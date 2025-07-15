// notify.js
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const twilio = require('twilio');

// Initialize Supabase
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// Initialize Twilio
const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

// Fetch barbershop data
async function getBarbershopData() {
  const { data, error } = await supabase
    .from('barbershops')
    .select('id, notify_threshold')
    .eq('slug', 'fadelab')
    .single();

  if (error) {
    console.error('Error fetching barbershop:', error);
    return null;
  }
  return data;
}

// Fetch barber data
async function getBarberData(barberId) {
  if (!barberId) return { average_cut_time: 20 }; // Default for "Any Barber"

  const { data, error } = await supabase
    .from('barbers')
    .select('average_cut_time')
    .eq('id', barberId)
    .single();

  if (error) {
    console.error('Error fetching barber:', error);
    return { average_cut_time: 20 };
  }
  return data;
}

// Calculate queue position
async function getQueuePosition(entry, entries) {
  return entries
    .filter(e => e.joined_at < entry.joined_at)
    .filter(e => e.requested_barber_id === entry.requested_barber_id || (!e.requested_barber_id && !entry.requested_barber_id))
    .length + 1;
}

// Send SMS
async function sendSMS(phoneNumber, message) {
  try {
    const response = await twilioClient.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phoneNumber,
    });
    console.log(`SMS sent to ${phoneNumber}: ${response.sid}`);
    return { success: true };
  } catch (error) {
    console.error('Error sending SMS:', error.message);
    return { success: false, error: error.message };
  }
}

// Check queue and send notifications
async function checkQueueAndNotify() {
  try {
    const shop = await getBarbershopData();
    if (!shop) return;

    const { data: entries, error } = await supabase
      .from('queue_entries')
      .select('id, customer_name, phone_number, requested_barber_id, joined_at, notified')
      .eq('shop_id', shop.id)
      .eq('status', 'waiting')
      .order('joined_at', { ascending: true });

    if (error) {
      console.error('Error fetching queue:', error);
      return;
    }

    for (const entry of entries) {
      if (entry.notified) continue; // Skip already notified customers

      const position = await getQueuePosition(entry, entries);
      const barber = await getBarberData(entry.requested_barber_id);
      const avgCutTime = barber.average_cut_time || 20;
      const estimatedWaitTime = position * avgCutTime;

      if (estimatedWaitTime <= shop.notify_threshold) {
        const message = `Hi ${entry.customer_name}, you're ~${estimatedWaitTime} minutes away from your turn at Fadelab!`;
        const smsResult = await sendSMS(entry.phone_number, message);

        if (smsResult.success) {
          // Mark as notified
          await supabase
            .from('queue_entries')
            .update({ notified: true })
            .eq('id', entry.id);
        }
      }
    }
  } catch (error) {
    console.error('Error in checkQueueAndNotify:', error);
  }
}

// Run every 60 seconds
setInterval(checkQueueAndNotify, 60000);

// Run immediately on start
checkQueueAndNotify();