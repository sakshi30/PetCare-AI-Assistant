import React, { useState, useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import "./App.css";
import SpeechProcessingUI from "./components/SpeechProcessingUI";
import AuthSystem from "./components/AuthSystem";
import { ToastContainer } from "react-toastify";

// Protected Route Component
const ProtectedRoute = ({ children, isAuthenticated }) => {
  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

// Public Route Component (redirect if already authenticated)
const PublicRoute = ({ children, isAuthenticated }) => {
  return !isAuthenticated ? children : <Navigate to="/dashboard" replace />;
};

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check if user is already logged in (e.g., from localStorage/sessionStorage)
  useEffect(() => {
    const checkAuthStatus = () => {
      try {
        const savedUser = localStorage.getItem("currentUser");
        const authToken = localStorage.getItem("authToken");

        if (savedUser && authToken) {
          setCurrentUser(JSON.parse(savedUser));
          setIsAuthenticated(true);
        }
      } catch (error) {
        console.error("Error checking auth status:", error);
        // Clear potentially corrupted data
        localStorage.removeItem("currentUser");
        localStorage.removeItem("authToken");
      }
      setLoading(false);
    };

    checkAuthStatus();
  }, []);

  // Login handler
  const handleLogin = (userData, token) => {
    setCurrentUser(userData);
    setIsAuthenticated(true);

    // Store in localStorage for persistence
    localStorage.setItem("currentUser", JSON.stringify(userData));
    localStorage.setItem("authToken", token);
  };

  // Logout handler
  const handleLogout = () => {
    setCurrentUser(null);
    setIsAuthenticated(false);

    // Clear from localStorage
    localStorage.removeItem("currentUser");
    localStorage.removeItem("authToken");
  };

  // Show loading spinner while checking auth status
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-blue-200">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <ToastContainer />
      <Router>
        <Routes>
          {/* Public Routes - Only accessible when not authenticated */}
          <Route
            path="/login"
            element={
              <PublicRoute isAuthenticated={isAuthenticated}>
                <AuthSystem onLogin={handleLogin} currentUser={currentUser} />
              </PublicRoute>
            }
          />

          {/* Protected Routes - Only accessible when authenticated */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute isAuthenticated={isAuthenticated}>
                <SpeechProcessingUI
                  currentUser={currentUser}
                  onLogout={handleLogout}
                />
              </ProtectedRoute>
            }
          />

          {/* Default redirect based on authentication status */}
          <Route
            path="/"
            element={
              isAuthenticated ? (
                <Navigate to="/dashboard" replace />
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />

          {/* Catch all route - redirect to appropriate page */}
          <Route
            path="*"
            element={
              <Navigate
                to={isAuthenticated ? "/dashboard" : "/login"}
                replace
              />
            }
          />
        </Routes>
      </Router>
    </>
  );
}

export default App;
