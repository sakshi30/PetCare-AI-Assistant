import React, { useState } from "react";
import { User, Lock, UserPlus, LogIn, Mic, Heart } from "lucide-react";

const AuthSystem = ({ onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});

    // Basic validation
    if (!formData.email || !formData.password) {
      setErrors({ general: "email and password are required" });
      setLoading(false);
      return;
    }

    if (!isLogin && formData.password !== formData.confirmPassword) {
      setErrors({ password: "Passwords do not match" });
      setLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      setErrors({ password: "Password must be at least 6 characters" });
      setLoading(false);
      return;
    }

    try {
      // Replace this with your actual API calls
      const endpoint = isLogin ? "/api/auth/login" : "/api/auth/register";
      const response = await fetch(`http://localhost:9000${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
        }),
      });

      const data = await response.json();
      if (response.ok) {
        // Successful authentication

        const userData = {
          id: data.user_id,
          email: formData.email,
        };
        // Call the onLogin prop to update parent state and redirect
        onLogin(userData, data.token);

        // Clear form
        setFormData({ email: "", password: "", confirmPassword: "" });
      } else {
        // Handle API errors
        setErrors({ general: data.message || "Authentication failed" });
      }
    } catch (error) {
      console.error("Auth error:", error);
      setErrors({ general: "Network error. Please try again." });
    }

    setLoading(false);
  };

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    // Clear errors when user starts typing
    if (errors.general || errors.password) {
      setErrors({});
    }
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setErrors({});
    setFormData({ email: "", password: "", confirmPassword: "" });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white flex items-center justify-center p-4">
      <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 max-w-md w-full border border-white/20 shadow-2xl">
        <div className="text-center mb-8">
          <div className="bg-blue-500 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4">
            <Heart className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold mb-2">
            {isLogin ? "Welcome Back" : "Create Account"}
          </h1>
          <p className="text-blue-200">
            {isLogin
              ? "Sign in to manage your pets"
              : "Join our pet care community"}
          </p>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2">Email</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-blue-300 w-5 h-5" />
              <input
                type="text"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className="w-full bg-white/10 border border-white/20 rounded-lg pl-12 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent placeholder-blue-300 text-white"
                placeholder="Enter your email"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-blue-300 w-5 h-5" />
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                className="w-full bg-white/10 border border-white/20 rounded-lg pl-12 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent placeholder-blue-300 text-white"
                placeholder="Enter your password"
                required
              />
            </div>
          </div>

          {!isLogin && (
            <div>
              <label className="block text-sm font-medium mb-2">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-blue-300 w-5 h-5" />
                <input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  className="w-full bg-white/10 border border-white/20 rounded-lg pl-12 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent placeholder-blue-300 text-white"
                  placeholder="Confirm your password"
                  required
                />
              </div>
            </div>
          )}

          {errors.general && (
            <div className="bg-red-500/20 border border-red-400/30 rounded-lg p-3 text-red-200 text-sm">
              {errors.general}
            </div>
          )}

          {errors.password && (
            <div className="bg-red-500/20 border border-red-400/30 rounded-lg p-3 text-red-200 text-sm">
              {errors.password}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-blue-500/50 text-white py-3 rounded-lg transition-all duration-200 flex items-center justify-center space-x-2 font-medium shadow-lg"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            ) : (
              <>
                {isLogin ? (
                  <LogIn className="w-5 h-5" />
                ) : (
                  <UserPlus className="w-5 h-5" />
                )}
                <span>{isLogin ? "Sign In" : "Create Account"}</span>
              </>
            )}
          </button>
        </div>

        <div className="mt-6 text-center">
          <p className="text-blue-200">
            {isLogin ? "Don't have an account?" : "Already have an account?"}
          </p>
          <button
            onClick={toggleMode}
            className="text-blue-400 hover:text-blue-300 font-medium mt-1 transition-colors"
          >
            {isLogin ? "Create Account" : "Sign In"}
          </button>
        </div>

        <div className="mt-8 pt-6 border-t border-white/10">
          <div className="flex items-center justify-center space-x-2 text-blue-200 text-sm">
            <Mic className="w-4 h-4" />
            <span>Voice-Powered Pet Care System</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthSystem;
