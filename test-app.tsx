import React from 'react';

const TestApp: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-lg">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">CloudDrive Test</h1>
        <p className="text-gray-600">If you can see this, the basic setup is working!</p>
        <div className="mt-4 p-4 bg-blue-50 rounded">
          <p className="text-blue-800">Tailwind CSS is working ✅</p>
        </div>
      </div>
    </div>
  );
};

export default TestApp;
