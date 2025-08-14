const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(cors());

const API_URL = 'https://taixiu1.gsum01.com/api/luckydice1/GetSoiCau';

app.get('/api/raw', async (req, res) => {
  try {
    const response = await axios.get(API_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'Accept': 'application/json, text/plain, */*'
      }
    });

    res.json(response.data);

  } catch (error) {
    res.status(error.response?.status || 500).json({
      error: 'Không lấy được dữ liệu từ API gốc',
      details: error.message
    });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`✅ Node JSON server chạy tại http://localhost:${PORT}`);
});
