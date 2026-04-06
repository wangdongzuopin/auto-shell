import React from 'react';
import { useUserStore } from '../../stores/userStore';
import './UserProfile.css';

export const UserProfile: React.FC = () => {
  const user = useUserStore((state) => state.user);

  const getInitial = (name: string) => {
    return name.charAt(0).toUpperCase();
  };

  return (
    <div className="user-profile">
      <div className="user-avatar">
        {user.avatar ? (
          <img src={user.avatar} alt={user.name} />
        ) : (
          <span className="avatar-initial">{getInitial(user.name)}</span>
        )}
      </div>
      <div className="user-info">
        <span className="user-name">{user.name}</span>
      </div>
    </div>
  );
};
