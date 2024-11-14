import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const LoginPage: React.FC = () => {
  const [userName, setUserName] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      // Store the username in local storage
      localStorage.setItem('userName', userName);

      // Check if the username is a PMM
      const response = await axios.get('/api/pmm');
      const pmmList = response.data;

      const isPMM = pmmList.some((pmm: { name: string }) => pmm.name === userName);
      localStorage.setItem('isPMM', isPMM.toString());
      localStorage.setItem('pmmName', isPMM ? userName : '');

      // Navigate to events page after login
      navigate('/events');
    } catch (error) {
      console.error("Error logging in:", error);
      alert("An error occurred while trying to log in. Please try again.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-r from-blue-500 to-purple-600">
      <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full transform transition duration-500 hover:scale-105">
        <h2 className="text-3xl font-bold mb-6 text-center text-gray-800">
          Welcome to BC Cancer's Donor Invitation Management System!
        </h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <label className="block text-gray-700 text-sm font-semibold mb-2" htmlFor="username">
              Username
            </label>
            <input
              type="text"
              id="username"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="Enter your username"
              required
            />
          </div>
          <div className="flex items-center justify-center">
            <button
              type="submit"
              className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 transition duration-300 ease-in-out"
            >
              Sign In
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
