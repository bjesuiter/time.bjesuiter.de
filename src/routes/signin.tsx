import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { authClient } from "@/client/auth-client";
import { useState } from "react";
import { Mail, Lock, AlertCircle, Loader2, LogIn } from "lucide-react";

export const Route = createFileRoute("/signin")({
  component: SignInPage,
});

function SignInPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [errors, setErrors] = useState<{
    email?: string;
    password?: string;
    general?: string;
  }>({});
  const [isLoading, setIsLoading] = useState(false);

  const validateForm = () => {
    const newErrors: typeof errors = {};

    // Email validation
    if (!formData.email) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = "Password is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      const result = await authClient.signIn.email({
        email: formData.email,
        password: formData.password,
      });

      if (result.error) {
        // Handle specific error types
        let errorMessage = "Invalid email or password";

        if (result.error.message) {
          errorMessage = result.error.message;
        }

        setErrors({
          general: errorMessage,
        });
      } else {
        // Successfully signed in, redirect to home
        navigate({ to: "/" });
      }
    } catch (error) {
      setErrors({
        general: "An unexpected error occurred. Please try again.",
      });
      console.error("Sign in error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange =
    (field: keyof typeof formData) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setFormData({ ...formData, [field]: e.target.value });
      // Clear error for this field when user starts typing
      if (errors[field]) {
        setErrors({ ...errors, [field]: undefined });
      }
    };

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <LogIn className="w-12 h-12 text-indigo-600" />
          </div>
          <h1
            className="text-3xl font-bold text-gray-900 mb-2"
            data-testid="signin-heading"
          >
            Welcome Back
          </h1>
          <p className="text-gray-600">
            Sign in to your time tracking dashboard
          </p>
        </div>

        {/* Sign In Form Card */}
        <div className="bg-white rounded-lg shadow-xl p-8">
          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            {/* General Error */}
            {errors.general && (
              <div
                className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3"
                data-testid="signin-general-error"
              >
                <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                <p className="text-sm text-red-800">{errors.general}</p>
              </div>
            )}

            {/* Email Field */}
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700 mb-1.5"
              >
                Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange("email")}
                  className={`block w-full pl-10 pr-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-indigo-500 transition-colors ${
                    errors.email
                      ? "border-red-300 focus:border-red-500"
                      : "border-gray-300 focus:border-indigo-500"
                  }`}
                  placeholder="you@example.com"
                  disabled={isLoading}
                  autoComplete="email"
                  required
                  data-testid="signin-email-input"
                />
              </div>
              {errors.email && (
                <p
                  className="mt-1.5 text-sm text-red-600"
                  data-testid="signin-email-error"
                >
                  {errors.email}
                </p>
              )}
            </div>

            {/* Password Field */}
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700 mb-1.5"
              >
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  value={formData.password}
                  onChange={handleInputChange("password")}
                  className={`block w-full pl-10 pr-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-indigo-500 transition-colors ${
                    errors.password
                      ? "border-red-300 focus:border-red-500"
                      : "border-gray-300 focus:border-indigo-500"
                  }`}
                  placeholder="Enter your password"
                  disabled={isLoading}
                  autoComplete="current-password"
                  required
                  data-testid="signin-password-input"
                />
              </div>
              {errors.password && (
                <p
                  className="mt-1.5 text-sm text-red-600"
                  data-testid="signin-password-error"
                >
                  {errors.password}
                </p>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2.5 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              data-testid="signin-submit-button"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Signing in...
                </>
              ) : (
                <>
                  <LogIn className="w-5 h-5" />
                  Sign In
                </>
              )}
            </button>
          </form>

          {/* Sign Up Link */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Don't have an account?{" "}
              <Link
                to="/signup"
                className="text-indigo-600 hover:text-indigo-700 font-medium transition-colors"
              >
                Sign up
              </Link>
            </p>
          </div>
        </div>

        {/* Admin Link */}
        <div className="mt-4 text-center">
          <Link
            to="/registerAdmin"
            className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            Admin Registration →
          </Link>
        </div>
      </div>
    </div>
  );
}
