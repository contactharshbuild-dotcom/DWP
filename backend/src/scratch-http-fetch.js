import jwt from 'jsonwebtoken';
import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const token = jwt.sign(
  {
    id: 2,
    role: 'admin',
    organizationId: 1,
    email: 'harshkumbhare7@gmail.com',
    name: 'Harsh Chandrakant kumbhare'
  },
  process.env.JWT_SECRET || 'lms_super_secret_key_123',
  { expiresIn: '1h' }
);

async function testFetch() {
  try {
    console.log('Sending request with Token:', token);
    const response = await axios.get('http://localhost:3000/api/classrooms/1', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    console.log('--- RESPONSE SUCCESS ---');
    console.log(response.status);
    console.log(response.data);
  } catch (error) {
    console.log('--- RESPONSE ERROR ---');
    if (error.response) {
      console.log('Status:', error.response.status);
      console.log('Data:', error.response.data);
    } else {
      console.error(error.message);
    }
  }
}

testFetch();
