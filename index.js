const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(cors());

const API_URL = 'https://taixiu1.gsum01.com/api/luckydice1/GetSoiCau';
const PROXY_URLS = [
  'https://api.codetabs.com/v1/proxy/?quest=',
  'https://cors-anywhere.herokuapp.com/'
];

// Hàm xác định Tài / Xỉu
function getTaiXiu(sum) {
  return sum >= 11 ? 'Tài' : 'Xỉu';
}

// Hàm gọi API với nhiều cách khác nhau
async function fetchWithBypass(url) {
  try {
    // Cách 1: Gọi trực tiếp kèm User-Agent giả lập
    return await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115 Safari/537.36',
        'Accept': 'application/json,text/plain,*/*'
      },
      timeout: 5000
    });
  } catch (err) {
    if (err.response && err.response.status === 403) {
      console.warn('⚠️ 403 - thử proxy dự phòng...');
      for (const proxy of PROXY_URLS) {
        try {
          return await axios.get(proxy + url, { timeout: 5000 });
        } catch (e) {
          console.warn(`❌ Proxy ${proxy} thất bại`);
        }
      }
    }
    throw err; // Nếu không có proxy nào thành công
  }
}

// Endpoint đơn giản
app.get('/api/taixiu/simple-result', async (req, res) => {
  try {
    const response = await fetchWithBypass(API_URL);
    const data = response.data;

    if (!Array.isArray(data) || data.length === 0) {
      return res.status(500).json({ error: 'Invalid data from source API' });
    }

    const latest = data.sort((a, b) => b.SessionId - a.SessionId)[0];
    const sum = latest.DiceSum || latest.FirstDice + latest.SecondDice + latest.ThirdDice;

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
});
