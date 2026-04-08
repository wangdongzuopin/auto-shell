import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Messages } from '../../components/Messages/Messages';
import { useChatStore } from '../stores/chatStore';

export const ChatPage: React.FC = () => {
  const { threadId } = useParams<{ threadId: string }>();
  const setCurrentThread = useChatStore((state) => state.setCurrentThread);

  useEffect(() => {
    if (threadId) {
      setCurrentThread(threadId);
    }
  }, [threadId, setCurrentThread]);

  return <Messages />;
};
