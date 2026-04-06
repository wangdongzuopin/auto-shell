import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useChatStore } from '../stores/chatStore';
import { QuickActions } from '../components/Chat/QuickActions';
import './Home.css';

export const Home: React.FC = () => {
  const navigate = useNavigate();
  const createThread = useChatStore((state) => state.createThread);

  const handleNewChat = () => {
    const thread = createThread();
    navigate(`/chat/${thread.id}`);
  };

  return (
    <div className="home-page">
      <div className="home-content">
        <h1 className="home-title">你好，jelly</h1>
        <p className="home-subtitle">有什么可以帮助你的吗？</p>
        <QuickActions />
      </div>
    </div>
  );
};
