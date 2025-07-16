// pages/api/barbers.js
export default function handler(req, res) {
  res.status(200).json({
    barbers: [
      { id: 1, name: 'Fade God' },
      { id: 2, name: 'Scissorhands' },
      { id: 3, name: 'Clip King' }
    ]
  });
}