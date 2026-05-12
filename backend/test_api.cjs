const axios = require('axios');

async function test() {
  try {
    // 1. Login as a distributor
    const loginRes = await axios.post('https://nmms-backend.onrender.com/api/login', {
      email: 'abebe@gmail.com', // Assuming this is a valid distributor email, or use another one like 'miki@gmail.com' (distributor)
      password: 'password'      // Update if password differs
    });
    
    const token = loginRes.data.token;
    console.log("Logged in successfully. Token length:", token.length);
    
    // 2. Fetch presentations
    const presRes = await axios.get('https://nmms-backend.onrender.com/api/presentations', {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log("Presentations returned:", JSON.stringify(presRes.data, null, 2));
  } catch (err) {
    console.error("Error:", err.response ? err.response.data : err.message);
  }
}

test();
