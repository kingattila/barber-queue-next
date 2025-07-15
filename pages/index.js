import { useEffect, useState } from 'react';

export default function Home() {
  const [barbers, setBarbers] = useState([]);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchBarbers();
  }, []);

  async function fetchBarbers() {
    setLoading(true);
    const res = await fetch('/api/barbers');
    const data = await res.json();
    setBarbers(data.barbers || []);
    setLoading(false);
  }

  async function joinQueue(barberId) {
    if (!name || !phone) return alert('Please fill in all fields.');
    if (!/^\+\d{10,15}$/.test(phone)) return alert('Invalid phone number format.');

    const shopRes = await fetch('/api/shop');
    const { shop_id } = await shopRes.json();

    const insertRes = await fetch('/api/queue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer_name: name,
        phone_number: phone,
        requested_barber_id: barberId,
        shop_id
      }),
    });

    if (!insertRes.ok) return alert('Failed to join the queue.');

    await fetch('/api/send-sms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: phone,
        message: `Hey ${name}, you've joined the queue at Fade Lab. We'll text you again when you're up next!`
      }),
    });

    alert('You’ve been added to the queue!');
    setName('');
    setPhone('');
  }

  return (
    <div style={{ maxWidth: 500, margin: 'auto', padding: 20 }}>
      <h1>💈 Join the Queue</h1>
      <p>Select who you'd like to cut your hair, or choose the next available barber.</p>

      <input
        type="text"
        placeholder="Your name"
        value={name}
        onChange={e => setName(e.target.value)}
        style={{ display: 'block', width: '100%', marginBottom: 10 }}
      />
      <input
        type="text"
        placeholder="Your phone number (e.g. +614...)"
        value={phone}
        onChange={e => setPhone(e.target.value)}
        style={{ display: 'block', width: '100%', marginBottom: 20 }}
      />

      {loading ? (
        <p>Loading barbers...</p>
      ) : (
        <>
          <button onClick={() => joinQueue(null)} style={{ marginBottom: 20 }}>Join Any Barber</button>
          {barbers.map(barber => (
            <div key={barber.id} style={{ marginBottom: 10 }}>
              <strong>✂️ {barber.name}</strong>
              <button onClick={() => joinQueue(barber.id)} style={{ marginLeft: 10 }}>
                Join {barber.name}
              </button>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
