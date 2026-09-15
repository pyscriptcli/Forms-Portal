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
  // Pin state: default to true on initial load
  const [internalPinned, setInternalPinned] = useState<boolean>(true);
  const isPinned = controlledPinned !== undefined ? controlledPinned : internalPinned;

  const [isHovered, setIsHovered] = useState<boolean>(false);
  const collapseTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Effective expanded state
  const isExpanded = isPinned || isHovered;

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

  return (
    <aside
      id="portal-navigation"
      aria-label="Main navigation"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`fixed inset-y-0 left-0 z-40 bg-[#0B2545] text-prime-warm-white border-r border-[#15345B] shadow-xl flex flex-col transition-[width] duration-[280ms] ease-in-out select-none ${
        isExpanded ? "w-64" : "w-[72px]"
      } ${className}`}
    >
      {/* Header: Logo + Pin/Collapse Toggle */}
      <div className="h-14 border-b border-[#15345B] flex items-center justify-between px-3.5 shrink-0 overflow-hidden">
        {isExpanded ? (
          <div className="flex items-center justify-between w-full min-w-0">
            {/* Logo constrained so it never overflows */}
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
            {/* Pin / Unpin button */}
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
        ) : (
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
        )}
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
              className={`group relative flex items-center gap-3.5 rounded-none transition-colors shrink-0 h-11 cursor-pointer ${
                isExpanded ? "px-3 w-full text-left" : "w-11 mx-auto justify-center"
              } ${
                isActive
                  ? "bg-[#0E3863] text-prime-gold border-l-2 border-prime-gold font-semibold"
                  : "border-l-2 border-transparent text-white/80 hover:text-white hover:bg-white/5 font-normal"
              }`}
            >
              {/* Icon */}
              <Icon
                size={20}
                aria-hidden="true"
                className={`shrink-0 transition-colors ${
                  isActive ? "text-prime-gold" : "text-white/80 group-hover:text-white"
                }`}
              />

              {/* Label & Badge (only in expanded mode) */}
              {isExpanded && (
                <div className="flex-1 min-w-0 flex items-center justify-between gap-2 overflow-hidden">
                  <span className="text-xs truncate tracking-wide">{label}</span>
                  {badge !== undefined && badge !== null && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-none bg-prime-gold/20 text-prime-gold border border-prime-gold/40 shrink-0">
                      {badge}
                    </span>
                  )}
                </div>
              )}

              {/* Collapsed Mode Floating Tooltip */}
              {!isExpanded && (
                <span className="pointer-events-none absolute left-full ml-3 px-2.5 py-1 bg-[#05162B] text-white text-[11px] font-medium whitespace-nowrap shadow-xl border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity z-50">
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
      <div className="mt-auto border-t border-[#15345B] flex flex-col shrink-0">
        {/* Settings/Admin Button (Authorized Users Only) */}
        {canAccessSettings && (
          <button
            type="button"
            onClick={() => onSelectView("settings")}
            title={!isExpanded ? "Settings / Admin" : undefined}
            aria-label="Settings / Admin"
            aria-current={currentView === "settings" ? "page" : undefined}
            className={`group relative flex items-center gap-3.5 rounded-none transition-colors shrink-0 h-10 cursor-pointer ${
              isExpanded ? "px-3.5 w-full text-left" : "w-11 mx-auto my-1 justify-center"
            } ${
              currentView === "settings"
                ? "bg-[#0E3863] text-prime-gold border-l-2 border-prime-gold font-semibold"
                : "border-l-2 border-transparent text-white/80 hover:text-white hover:bg-white/5 font-normal"
            }`}
          >
            <Settings
              size={18}
              className={`shrink-0 ${
                currentView === "settings"
                  ? "text-prime-gold"
                  : "text-white/80 group-hover:text-white"
              }`}
            />
            {isExpanded && <span className="text-xs truncate">Settings</span>}
            {!isExpanded && (
              <span className="pointer-events-none absolute left-full ml-3 px-2.5 py-1 bg-[#05162B] text-white text-[11px] font-medium whitespace-nowrap shadow-xl border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity z-50">
                Settings / Admin
              </span>
            )}
          </button>
        )}

        {/* Divider */}
        {canAccessSettings && <div className="border-t border-[#15345B]" />}

        {/* Workspace Indicator */}
        {isExpanded ? (
          <div className="px-3.5 py-2.5 flex items-center justify-between text-[10px] tracking-wider font-bold overflow-hidden">
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
            className="py-2 flex items-center justify-center cursor-default"
            title={`${workspaceName} Workspace`}
          >
            <div className="w-8 h-6 border border-prime-gold/60 text-prime-gold text-[10px] font-bold flex items-center justify-center">
              {workspaceInitials}
            </div>
          </div>
        )}

        {/* Divider */}
        <div className="border-t border-[#15345B]" />

        {/* User Profile & Sign-out */}
        <div className="p-2">
          {isExpanded ? (
            <div className="flex items-center justify-between gap-2 px-1">
              <div className="flex items-center gap-2.5 min-w-0">
                {user?.profilePicture ? (
                  <Image
                    src={user.profilePicture}
                    alt={username}
                    width={32}
                    height={32}
                    className="w-8 h-8 rounded-none border border-white/20 object-cover shrink-0"
                  />
                ) : (
                  <div
                    className="w-8 h-8 rounded-none border border-white/20 bg-[#134575] text-white font-bold text-xs flex items-center justify-center shrink-0"
                    title={username}
                  >
                    {userInitials}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-xs font-bold text-white truncate">{username}</p>
                  <p className="text-[10px] text-white/50 truncate">{userEmail}</p>
                </div>
              </div>
              {onSignOut && (
                <button
                  type="button"
                  onClick={onSignOut}
                  title="Sign out"
                  aria-label={`Sign out (${username})`}
                  className="text-white/60 hover:text-white p-1.5 shrink-0 rounded-none hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <LogOut size={15} />
                </button>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-1.5 py-0.5">
              {user?.profilePicture ? (
                <Image
                  src={user.profilePicture}
                  alt={username}
                  width={32}
                  height={32}
                  className="w-8 h-8 rounded-none border border-white/20 object-cover shrink-0"
                />
              ) : (
                <div
                  className="w-8 h-8 rounded-none border border-white/20 bg-[#134575] text-white font-bold text-[11px] flex items-center justify-center shrink-0"
                  title={`${username} (${userEmail})`}
                >
                  {userInitials}
                </div>
              )}
              {onSignOut && (
                <button
                  type="button"
                  onClick={onSignOut}
                  title={`Sign out (${username})`}
                  aria-label={`Sign out (${username})`}
                  className="text-white/60 hover:text-white p-1 rounded-none hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <LogOut size={14} />
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
