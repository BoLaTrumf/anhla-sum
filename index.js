const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(cors());

const API_URL = 'https://taixiu1.gsum01.com/api/luckydice1/GetSoiCau';

// Helper function
function getTaiXiu(sum) {
  return sum >= 11 ? 'Tài' : 'Xỉu';
}

// Simplified API endpoint
app.get('/api/taixiu/simple-result', async (req, res) => {
  try {
    // Get data from source API
    const response = await axios.get(API_URL);
    const data = response.data;

    if (!Array.isArray(data) || data.length === 0) {
      return res.status(500).json({ error: 'Invalid data from source API' });
    }

    // Get latest result
    const latest = data.sort((a, b) => b.SessionId - a.SessionId)[0];
    const sum = latest.DiceSum || latest.FirstDice + latest.SecondDice + latest.ThirdDice;
    
    // Return simplified response
    res.json({
      Phien: latest.SessionId,
      Xuc_xac_1: latest.FirstDice,
      Xuc_xac_2: latest.SecondDice,
      Xuc_xac_3: latest.ThirdDice,
      Tong: sum,
      Ket_qua: getTaiXiu(sum)
    });

  } catch (error) {
    console.error('Error:', error.message);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error.message
    });
  }
});

// Start server
const PORT = process.env.PORT || 4002;
app.listen(PORT, () => {
  console.log(`✅ Simple result server running on http://localhost:${PORT}`);
