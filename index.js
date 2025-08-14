import express from 'express';
import axios from 'axios';
import cors from 'cors';

const app = express();
app.use(cors());

const API_URL = 'https://taixiu1.gsum01.com/api/luckydice1/GetSoiCau';

function getTaiXiu(sum) {
  return sum >= 11 ? 'Tài' : 'Xỉu';
}

app.get('/api/taixiu/simple-result', async (req, res) => {
  try {
    const response = await axios.get(API_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Accept': 'application/json'
      }
    });

    const data = response.data;
    if (!Array.isArray(data) || data.length === 0) {
      return res.status(500).json({ error: 'Invalid data from source API' });
    }

    const latest = data.sort((a, b) => b.SessionId - a.SessionId)[0];
    const sum = latest.DiceSum || (latest.FirstDice + latest.SecondDice + latest.ThirdDice);

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

const PORT = process.env.PORT || 4002;
app.listen(PORT, () => {
  console.log(`✅ Simple result server running on http://localhost:${PORT}`);
});
