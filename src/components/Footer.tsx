import { Link } from 'react-router-dom';
import { BookOpen, Github, Twitter, Linkedin } from 'lucide-react';

export const Footer = () => {
  return (
    <footer className="bg-gray-900 text-gray-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center space-x-2 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-primary-600 to-secondary-600 rounded-lg flex items-center justify-center">
                <BookOpen className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-display font-bold text-white">Quantum AI</span>
            </div>
            <p className="text-gray-400 max-w-md">
              Learn anything with AI instructors that feel real. Experience the future of education with
              realistic facial animation, perfect lip-sync, and interactive learning.
            </p>
            <div className="flex space-x-4 mt-6">
              <a href="#" className="hover:text-primary-400 transition">
                <Twitter className="w-5 h-5" />
              </a>
              <a href="#" className="hover:text-primary-400 transition">
                <Github className="w-5 h-5" />
              </a>
              <a href="#" className="hover:text-primary-400 transition">
                <Linkedin className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-white font-semibold mb-4">Quick Links</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/courses" className="hover:text-primary-400 transition">
                  Browse Courses
                </Link>
              </li>
              <li>
                <Link to="/dashboard" className="hover:text-primary-400 transition">
                  Dashboard
                </Link>
              </li>
              <li>
                <a href="#" className="hover:text-primary-400 transition">
                  About Us
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-primary-400 transition">
                  Contact
                </a>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="text-white font-semibold mb-4">Legal</h3>
            <ul className="space-y-2">
              <li>
                <a href="#" className="hover:text-primary-400 transition">
                  Privacy Policy
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-primary-400 transition">
                  Terms of Service
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-primary-400 transition">
                  Cookie Policy
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400 text-sm">
          <p>&copy; {new Date().getFullYear()} Quantum AI. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};
