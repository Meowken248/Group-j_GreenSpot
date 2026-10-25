import React from "react";
import { EventsList } from "../components/EventsList";
import { AUTH_STORAGE_KEYS } from "../../auth/types/auth.types";

interface EventsPageProps {
  onNavigateToLogin?: () => void;
}

export const EventsPage: React.FC<EventsPageProps> = ({ onNavigateToLogin }) => {
  const token = localStorage.getItem(AUTH_STORAGE_KEYS.ACCESS_TOKEN);
  const isLoggedIn = !!token;

  let currentUserId: string | undefined;
  let canApprove = false;
  try {
    const rawUserInfo = localStorage.getItem(AUTH_STORAGE_KEYS.USER_INFO);
    if (rawUserInfo) {
      const parsed = JSON.parse(rawUserInfo);
      currentUserId = parsed.user_id || parsed.id;
      const permissions: string[] = Array.isArray(parsed.permissions) ? parsed.permissions : [];
      canApprove = parsed.role === "ADMIN" || permissions.includes("CAMPAIGNS:UPDATE");
    }
  } catch {
    // ignore
  }

  const handleOpenLogin = () => {
    if (onNavigateToLogin) {
      onNavigateToLogin();
    } else {
      window.location.hash = "#auth";
    }
  };

  return (
    <div className="events-main-page" data-testid="events-page">
      <EventsList
        isLoggedIn={isLoggedIn}
        currentUserId={currentUserId}
        canApprove={canApprove}
        onOpenLogin={handleOpenLogin}
      />
    </div>
  );
};

