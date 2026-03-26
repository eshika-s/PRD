const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'data.json');

const defaultData = {
  users: [],
  draws: [],
  charities: [
    { id: '1', name: 'Hope for Youth Foundation', description: 'Empowering underprivileged youth through sports and education programs worldwide.', totalRaised: 12450 },
    { id: '2', name: 'Green Earth Initiative', description: 'Committed to reforestation and sustainability projects across communities.', totalRaised: 8700 },
    { id: '3', name: 'Wellness Together', description: 'Providing mental health support and wellness resources to those in need.', totalRaised: 6200 },
    { id: '4', name: 'Community Builders', description: 'Building affordable housing and community spaces for families.', totalRaised: 9300 },
    { id: '5', name: 'Future Leaders Fund', description: 'Scholarships and mentorship for aspiring student athletes.', totalRaised: 5100 }
  ],
  claims: [],
  platformStats: {
    totalPrizePool: 50000,
    totalDonated: 41750,
    totalDraws: 24,
    jackpotPool: 2500
  }
};

function readDB() {
  if (!fs.existsSync(dbPath)) {
    fs.writeFileSync(dbPath, JSON.stringify(defaultData, null, 2));
    return JSON.parse(JSON.stringify(defaultData));
  }
  const data = fs.readFileSync(dbPath, 'utf8');
  return JSON.parse(data);
}

function writeDB(data) {
  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
}

module.exports = { readDB, writeDB };
