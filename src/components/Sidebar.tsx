"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import Image from "next/image";
import {
  Pin,
  PinOff,
  ChevronLeft,
  ChevronRight,
  Settings,
  LogOut,
} from "lucide-react";

export type NavItem = {
  id: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  badge?: string | number | null;
};

export type SidebarProps = {
  currentView: string;
  onSelectView: (view: string) => void;
  user?: {
    username?: string;
    email?: string;
    initials?: string;
    profilePicture?: string | null;
    workspaceName?: string;
  } | null;
  allowedPages?: string[];
  isAdmin?: boolean;
  onSignOut?: () => void;
  items: NavItem[];
  // Optional controlled or notification props
  isPinned?: boolean;
  onPinChange?: (pinned: boolean) => void;
  onExpandedChange?: (expanded: boolean) => void;
  className?: string;
};

export function Sidebar({
  currentView,
  onSelectView,
  user,
  allowedPages,
  isAdmin = false,
  onSignOut,
  items,
  isPinned: controlledPinned,
  onPinChange,
  onExpandedChange,
  className = "",
}: SidebarProps) {
  // Start collapsed; hover or the expand control reveals the full navigation.
  const [internalPinned, setInternalPinned] = useState<boolean>(false);
  const isPinned = controlledPinned !== undefined ? controlledPinned : internalPinned;

  const [isHovered, setIsHovered] = useState<boolean>(false);
  const collapseTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Effective expanded state
  const isExpanded = isPinned || isHovered;

  // Profile image error handling to guarantee fallback
  const [avatarError, setAvatarError] = useState<boolean>(false);
  useEffect(() => {
    setAvatarError(false);
  }, [user?.profilePicture]);

  // Notify parent of expansion changes so adjacent content margin transitions smoothly
  useEffect(() => {
    onExpandedChange?.(isExpanded);
  }, [isExpanded, onExpandedChange]);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (collapseTimerRef.current) {
        clearTimeout(collapseTimerRef.current);
      }
    };
  }, []);

  const handleMouseEnter = () => {
    // Cancel any pending collapse timer immediately
    if (collapseTimerRef.current) {
      clearTimeout(collapseTimerRef.current);
      collapseTimerRef.current = null;
    }
    if (!isPinned) {
      setIsHovered(true);
    }
  };

  const handleMouseLeave = () => {
    if (!isPinned) {
      // 150ms debounce before collapsing
      collapseTimerRef.current = setTimeout(() => {
        setIsHovered(false);
        collapseTimerRef.current = null;
      }, 150);
    }
  };

  const togglePin = () => {
    const newPinState = !isPinned;
    if (controlledPinned === undefined) {
      setInternalPinned(newPinState);
    }
    onPinChange?.(newPinState);
    if (!newPinState) {
      // Keep hovered while user cursor is over the pin button
      setIsHovered(true);
    }
  };

  // Access control filtering
  const visibleItems = useMemo(() => {
    if (isAdmin || !allowedPages) return items;
    const allowedSet = new Set(allowedPages.map((p) => p.toLowerCase()));
    return items.filter(
      (item) =>
        allowedSet.has(item.id.toLowerCase()) ||
        allowedSet.has(item.label.toLowerCase())
    );
  }, [items, allowedPages, isAdmin]);

  const canAccessSettings =
    isAdmin ||
    Boolean(
      allowedPages &&
        (allowedPages.includes("settings") ||
          allowedPages.includes("admin") ||
          allowedPages.includes("/admin"))
    );

  // User formatting
  const username = user?.username || "Dave Policarpio";
  const userEmail = user?.email || "dave.policarpio@primephilippines.com";
  const workspaceName = user?.workspaceName || "COLLABORATE@PRIME";

  // Derive initials fallback
  const userInitials = useMemo(() => {
    if (user?.initials) return user.initials;
    const parts = username.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return username.slice(0, 2).toUpperCase() || "DP";
  }, [user?.initials, username]);

  // Derive workspace initials
  const workspaceInitials = useMemo(() => {
    const clean = workspaceName.replace(/[^a-zA-Z0-9]/g, " ").trim();
    const parts = clean.split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return workspaceName.slice(0, 2).toUpperCase() || "CP";
  }, [workspaceName]);

  const avatarSrc = !avatarError && user?.profilePicture ? user.profilePicture : "/dave-avatar.png";

  return (
    <aside
      id="portal-navigation"
      aria-label="Main navigation"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`fixed inset-y-0 left-0 z-40 bg-[#003366] text-prime-warm-white border-r border-white/10 shadow-2xl flex flex-col transition-[width] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] select-none ${
        isExpanded ? "w-64" : "w-[72px]"
      } ${className}`}
    >
      {/* Header: Logo + Pin/Collapse Toggle */}
      <div className="h-14 border-b border-white/10 flex items-center px-3.5 shrink-0 overflow-hidden relative">
        {/* Expanded State: Logo & Pin Control */}
        <div
          className={`flex items-center justify-between w-full min-w-0 transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${
            isExpanded ? "opacity-100 translate-x-0 pointer-events-auto" : "opacity-0 -translate-x-4 pointer-events-none absolute"
          }`}
        >
          <div className="flex items-center pl-1 min-w-0 max-w-[170px] overflow-hidden">
            <Image
              src="/prime-white-logo.png"
              alt="PRIME Philippines"
              width={118}
              height={26}
              className="h-6 w-auto object-contain shrink-0"
              priority
            />
          </div>
          <button
            type="button"
            onClick={togglePin}
            title={isPinned ? "Unpin sidebar (auto-collapse on leave)" : "Pin sidebar (keep expanded)"}
            aria-label={isPinned ? "Unpin sidebar" : "Pin sidebar"}
            aria-pressed={isPinned}
            className="w-8 h-8 rounded-none flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer shrink-0"
          >
            {isPinned ? <ChevronLeft size={16} /> : <Pin size={15} />}
          </button>
        </div>

        {/* Collapsed State: Centered Expand Chevron Button */}
        <div
          className={`w-full h-full flex items-center justify-center transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${
            !isExpanded ? "opacity-100 scale-100 pointer-events-auto" : "opacity-0 scale-75 pointer-events-none absolute"
          }`}
        >
          <button
            type="button"
            onClick={togglePin}
            title="Expand and pin sidebar"
            aria-label="Expand and pin sidebar"
            aria-pressed={false}
            className="w-full h-full flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* Navigation Items List */}
      <nav
        className="py-3 px-2 flex-1 overflow-y-auto overflow-x-hidden flex flex-col gap-1.5 justify-start"
        aria-label="Sidebar navigation links"
      >
        {visibleItems.map(({ id, label, icon: Icon, badge }) => {
          const isActive = currentView === id;

          return (
            <button
              key={id}
              type="button"
              onClick={() => onSelectView(id)}
              title={!isExpanded ? label : undefined}
              aria-label={label}
              aria-current={isActive ? "page" : undefined}
              className={`group relative flex items-center rounded-none transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] shrink-0 h-11 cursor-pointer overflow-hidden ${
                isExpanded ? "px-3 w-full text-left gap-3.5" : "w-11 mx-auto justify-center px-0 gap-0"
              } ${
                isActive
                  ? "bg-[#004c99] text-prime-gold border-l-2 border-prime-gold font-semibold"
                  : "border-l-2 border-transparent text-white/85 hover:text-white hover:bg-white/10 font-normal"
              }`}
            >
              {/* Icon */}
              <Icon
                size={20}
                aria-hidden="true"
                className={`shrink-0 transition-colors duration-200 ${
                  isActive ? "text-prime-gold" : "text-white/85 group-hover:text-white"
                }`}
              />

              {/* Label & Badge: Smooth Slide and Fade Animation */}
              <div
                className={`flex-1 min-w-0 flex items-center justify-between gap-2 overflow-hidden whitespace-nowrap transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${
                  isExpanded
                    ? "opacity-100 max-w-[180px] translate-x-0 pointer-events-auto"
                    : "opacity-0 max-w-0 -translate-x-3 pointer-events-none"
                }`}
              >
                <span className="text-xs truncate tracking-wide">{label}</span>
                {badge !== undefined && badge !== null && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-none bg-prime-gold/20 text-prime-gold border border-prime-gold/40 shrink-0">
                    {badge}
                  </span>
                )}
              </div>

              {/* Collapsed Mode Floating Tooltip */}
              {!isExpanded && (
                <span className="pointer-events-none absolute left-full ml-3 px-2.5 py-1 bg-[#00264d] text-white text-[11px] font-medium whitespace-nowrap shadow-2xl border border-white/15 opacity-0 group-hover:opacity-100 transition-opacity z-50">
                  {label}
                  {badge !== undefined && badge !== null && (
                    <span className="ml-1.5 text-[9px] text-prime-gold">({badge})</span>
                  )}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Bottom Section: Visually Separated */}
      <div className="mt-auto border-t border-white/10 flex flex-col shrink-0">
        {/* Settings/Admin Button (Authorized Users Only) */}
        {canAccessSettings && (
          <button
            type="button"
            onClick={() => onSelectView("settings")}
            title={!isExpanded ? "Settings / Admin" : undefined}
            aria-label="Settings / Admin"
            aria-current={currentView === "settings" ? "page" : undefined}
            className={`group relative flex items-center rounded-none transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] shrink-0 h-10 cursor-pointer overflow-hidden ${
              isExpanded ? "px-3.5 w-full text-left gap-3.5" : "w-11 mx-auto my-1 justify-center px-0 gap-0"
            } ${
              currentView === "settings"
                ? "bg-[#004c99] text-prime-gold border-l-2 border-prime-gold font-semibold"
                : "border-l-2 border-transparent text-white/85 hover:text-white hover:bg-white/10 font-normal"
            }`}
          >
            <Settings
              size={18}
              className={`shrink-0 ${
                currentView === "settings"
                  ? "text-prime-gold"
                  : "text-white/85 group-hover:text-white"
              }`}
            />
            <span
              className={`text-xs truncate transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] whitespace-nowrap ${
                isExpanded
                  ? "opacity-100 max-w-[180px] translate-x-0 pointer-events-auto"
                  : "opacity-0 max-w-0 -translate-x-3 pointer-events-none"
              }`}
            >
              Settings
            </span>
            {!isExpanded && (
              <span className="pointer-events-none absolute left-full ml-3 px-2.5 py-1 bg-[#00264d] text-white text-[11px] font-medium whitespace-nowrap shadow-2xl border border-white/15 opacity-0 group-hover:opacity-100 transition-opacity z-50">
                Settings / Admin
              </span>
            )}
          </button>
        )}

        {/* Divider */}
        {canAccessSettings && <div className="border-t border-white/10" />}

        {/* Workspace Indicator */}
        <div className="py-2.5 px-3.5 overflow-hidden">
          {isExpanded ? (
            <div className="flex items-center justify-between text-[10px] tracking-wider font-bold overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]">
              <span className="text-prime-gold flex items-center gap-1.5 truncate">
                <span className="text-xs">■</span>
                <span className="truncate">{workspaceName}</span>
              </span>
              <span className="text-white/40 text-[9px] uppercase shrink-0 font-normal ml-1">
                WORKSPACE
              </span>
            </div>
          ) : (
            <div
              className="flex items-center justify-center cursor-default transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]"
              title={`${workspaceName} Workspace`}
            >
              <div className="w-8 h-6 border border-prime-gold/60 text-prime-gold text-[10px] font-bold flex items-center justify-center">
                {workspaceInitials}
              </div>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="border-t border-white/10" />

        {/* User Profile & Sign-out with Always-Visible Avatar */}
        <div className="p-2 overflow-hidden">
          <div className="flex items-center justify-between gap-2 px-1">
            <div className="flex items-center min-w-0">
              {/* Avatar: loads profile picture with guaranteed initials fallback */}
              <div className="w-8 h-8 shrink-0 relative flex items-center justify-center overflow-hidden border border-white/25 bg-[#004080]">
                {user?.profilePicture && !avatarError ? (
                  <img
                    src={user.profilePicture}
                    alt={username}
                    onError={() => setAvatarError(true)}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-white font-bold text-xs select-none">
                    {userInitials}
                  </span>
                )}
              </div>

              {/* Username & Email (Animated width & opacity) */}
              <div
                className={`min-w-0 flex-1 overflow-hidden whitespace-nowrap transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${
                  isExpanded
                    ? "opacity-100 max-w-[140px] translate-x-0 ml-2.5 pointer-events-auto"
                    : "opacity-0 max-w-0 -translate-x-3 pointer-events-none ml-0"
                }`}
              >
                <p className="text-xs font-bold text-white truncate">{username}</p>
                <p className="text-[10px] text-white/60 truncate">{userEmail}</p>
              </div>
            </div>

            {/* Logout button (Animates in expanded mode, icon button in collapsed) */}
            {onSignOut && (
              <div
                className={`transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${
                  isExpanded
                    ? "opacity-100 scale-100 pointer-events-auto shrink-0"
                    : "opacity-0 scale-75 pointer-events-none max-w-0 overflow-hidden"
                }`}
              >
                <button
                  type="button"
                  onClick={onSignOut}
                  title="Sign out"
                  aria-label={`Sign out (${username})`}
                  className="text-white/70 hover:text-white p-1.5 shrink-0 rounded-none hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <LogOut size={15} />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}
