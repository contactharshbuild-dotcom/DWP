import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config();

const token = jwt.sign(
  {
    userId: 2, // userId! Not id! In auth.controller.js generateToken payload is userId!
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
    const response = await fetch('http://localhost:3000/api/classrooms/1', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    console.log('--- RESPONSE STATUS ---', response.status);
    const data = await response.json();
    console.log('--- DATA ---');
    console.log(data);
  } catch (error) {
    console.error('--- ERROR ---', error.message);
  }
}

testFetch();
