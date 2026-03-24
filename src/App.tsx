/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import AdminDashboard from './pages/AdminDashboard';
import CreateTest from './pages/CreateTest';
import TakeTest from './pages/TakeTest';
import Navbar from './components/Navbar';

import AdminStudents from './pages/AdminStudents';
import AdminTests from './pages/AdminTests';
import EditTest from './pages/EditTest';
import AdminSubmissions from './pages/AdminSubmissions';
import EditStudent from './pages/EditStudent';

function ProtectedRoute({ children, adminOnly = false }: { children: React.ReactNode, adminOnly?: boolean }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  if (!user) return <Navigate to="/login" />;
  if (adminOnly && user.role !== 'admin') return <Navigate to="/" />;
  return <>{children}</>;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
          <Navbar />
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/" element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } />
              <Route path="/tests/:id" element={
                <ProtectedRoute>
                  <TakeTest />
                </ProtectedRoute>
              } />
              <Route path="/admin" element={
                <ProtectedRoute adminOnly>
                  <AdminDashboard />
                </ProtectedRoute>
              } />
              <Route path="/admin/create-test" element={
                <ProtectedRoute adminOnly>
                  <CreateTest />
                </ProtectedRoute>
              } />
              <Route path="/admin/students" element={
                <ProtectedRoute adminOnly>
                  <AdminStudents />
                </ProtectedRoute>
              } />
              <Route path="/admin/tests" element={
                <ProtectedRoute adminOnly>
                  <AdminTests />
                </ProtectedRoute>
              } />
              <Route path="/admin/edit-test/:id" element={
                <ProtectedRoute adminOnly>
                  <EditTest />
                </ProtectedRoute>
              } />
              <Route path="/admin/submissions" element={
                <ProtectedRoute adminOnly>
                  <AdminSubmissions />
                </ProtectedRoute>
              } />
              <Route path="/admin/edit-student/:id" element={
                <ProtectedRoute adminOnly>
                  <EditStudent />
                </ProtectedRoute>
              } />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}
