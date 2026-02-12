import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, User, Clock } from 'lucide-react';
import { Button } from '../components/Button';

export function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md">
        {/* Logo & Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-[#4F46E5] rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Clock className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-semibold text-[#1F2937] mb-2">Digital Time Tracking System</h1>
          <p className="text-[#64748B]">Track work. Understand time.</p>
        </div>

        {/* Login Options */}
        <div className="space-y-4">
          <Button
            fullWidth
            size="lg"
            icon={<Shield className="w-5 h-5" />}
            onClick={() => navigate('/admin/login')}
          >
            Admin Login
          </Button>
          
          <Button
            fullWidth
            size="lg"
            variant="outline"
            icon={<User className="w-5 h-5" />}
            onClick={() => navigate('/user/login')}
          >
            User Login
          </Button>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-sm text-[#64748B]">
            Professional time tracking for modern teams
          </p>
        </div>
      </div>
    </div>
  );
}