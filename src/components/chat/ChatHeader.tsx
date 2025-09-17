import React from 'react';
import { Link } from 'react-router-dom';
import { ChatSession, User } from '../../types';
import { Bars3Icon, UserCircleIcon, DocumentIcon, ArrowRightOnRectangleIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../../contexts/AuthContext';

interface ChatHeaderProps {
  currentSession: ChatSession | null;
  user: User | null;
  onToggleSidebar: () => void;
  onNewSession: () => void;
}

const ChatHeader: React.FC<ChatHeaderProps> = ({
  currentSession,
  user,
  onToggleSidebar,
  onNewSession,
}) => {
  const { logout } = useAuth();

  const getSessionTitle = () => {
    if (!currentSession) return 'Voosh AI Assistant';
    if (currentSession.title) return currentSession.title;
    
    const date = new Date(currentSession.createdAt);
    return `Chat from ${date.toLocaleDateString()}`;
  };

  return (
    <header className="bg-white border-b border-gray-200 px-4 py-3">
      <div className="flex items-center justify-between">
        {/* Left side */}
        <div className="flex items-center space-x-4">
          <button
            onClick={onToggleSidebar}
            className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100"
          >
            <Bars3Icon className="h-5 w-5" />
          </button>
          
          <div>
            <h1 className="text-lg font-semibold text-gray-900">
              {getSessionTitle()}
            </h1>
            {currentSession && (
              <p className="text-xs text-gray-500">
                Created {new Date(currentSession.createdAt).toLocaleString()}
              </p>
            )}
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center space-x-4">
          {/* User info and logout */}
          <div className="relative group">
            <button className="flex items-center space-x-2 p-2 rounded-md text-gray-700 hover:bg-gray-100">
              <UserCircleIcon className="h-6 w-6" />
              <span className="hidden sm:block text-sm font-medium">
                {user?.name || user?.email}
              </span>
            </button>
            
            {/* Dropdown menu */}
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10">
              <div className="py-1">
                <div className="px-4 py-2 text-sm text-gray-700 border-b border-gray-100">
                  <div className="font-medium">{user?.name || 'User'}</div>
                  <div className="text-gray-500">{user?.email}</div>
                </div>
                <Link
                  to="/content-management"
                  className="group flex w-full items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  <DocumentIcon className="mr-3 h-4 w-4 text-gray-400 group-hover:text-gray-500" />
                  Content Management
                </Link>
                <button
                  onClick={logout}
                  className="group flex w-full items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  <ArrowRightOnRectangleIcon className="mr-3 h-4 w-4 text-gray-400 group-hover:text-gray-500" />
                  Sign out
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default ChatHeader;
