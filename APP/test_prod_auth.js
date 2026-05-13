const axios = require('axios');

async function testAuth() {
  try {
    // Attempt to log in to the production server with the same credentials
    const loginRes = await axios.post('https://nmms-backend.onrender.com/api/login', {
      email: 'ab@gmail.com',
      password: 'Abebe'
    });
    
    console.log('Login success!', loginRes.data.access_token.substring(0, 10) + '...');
    const token = loginRes.data.access_token;

    // Try hitting wallet
    const walletRes = await axios.get('https://nmms-backend.onrender.com/api/tree', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    console.log('Wallet success!', walletRes.data);
  } catch (err) {
    if (err.response) {
      console.log('Error status:', err.response.status);
      console.log('Error data:', err.response.data);
    } else {
      console.log('Error:', err.message);
    }
  }
}

testAuth();
