"use client"

import * as React from "react"
import { Drawer } from "@base-ui/react/drawer"
import { XIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

// Root
function BottomDrawer({ ...props }: Drawer.Root.Props) {
  return <Drawer.Root swipeDirection="down" data-slot="bottom-drawer" {...props} />
}

// Trigger
function BottomDrawerTrigger({ ...props }: Drawer.Trigger.Props) {
  return <Drawer.Trigger data-slot="bottom-drawer-trigger" {...props} />
}

// Close
function BottomDrawerClose({ ...props }: Drawer.Close.Props) {
  return <Drawer.Close data-slot="bottom-drawer-close" {...props} />
}

// Portal
function BottomDrawerPortal({ ...props }: Drawer.Portal.Props) {
  return <Drawer.Portal data-slot="bottom-drawer-portal" {...props} />
}

// Backdrop
function BottomDrawerOverlay({ className, ...props }: Drawer.Backdrop.Props) {
  return (
    <Drawer.Backdrop
      data-slot="bottom-drawer-overlay"
      className={cn(
        "fixed inset-0 z-50 bg-black/50 transition-opacity duration-200",
        "data-starting-style:opacity-0 data-ending-style:opacity-0",
        "supports-backdrop-filter:backdrop-blur-sm",
        className,
      )}
      {...props}
    />
  )
}

// Popup — anchored to the bottom of the screen, height fits content
function BottomDrawerContent({
  className,
  children,
  showCloseButton = true,
  ...props
}: Drawer.Popup.Props & { showCloseButton?: boolean }) {
  return (
    <BottomDrawerPortal>
      <BottomDrawerOverlay />
      <Drawer.Popup
        data-slot="bottom-drawer-content"
        className={cn(
          // Positioning: fixed to the bottom, centered on desktop
          "fixed inset-x-0 bottom-0 z-50",
          "sm:max-w-lg sm:mx-auto",
          // Size: auto height up to 85dvh
          "max-h-[85dvh]",
          // Layout
          "flex flex-col",
          // Appearance
          "rounded-t-2xl border-t border-border bg-popover text-popover-foreground shadow-xl",
          // Animation: slide up on open, slide down on close
          "transition-transform duration-300 ease-out",
          "data-starting-style:translate-y-full data-ending-style:translate-y-full",
          className,
        )}
        {...props}
      >
        {/* Drag handle indicator */}
        <div className="mx-auto mt-3 h-1.5 w-10 shrink-0 rounded-full bg-muted-foreground/30" />
        {children}
        {showCloseButton && (
          <Drawer.Close
            data-slot="bottom-drawer-close"
            render={
              <Button
                variant="ghost"
                className="absolute top-3 right-3"
                size="icon-sm"
              />
            }
          >
            <XIcon />
            <span className="sr-only">Close</span>
          </Drawer.Close>
        )}
      </Drawer.Popup>
    </BottomDrawerPortal>
  )
}

function BottomDrawerHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="bottom-drawer-header"
      className={cn("flex flex-col gap-0.5 px-4 pb-2 pt-3", className)}
      {...props}
    />
  )
}

function BottomDrawerTitle({ className, ...props }: Drawer.Title.Props) {
  return (
    <Drawer.Title
      data-slot="bottom-drawer-title"
      className={cn("font-heading text-base font-medium text-foreground", className)}
      {...props}
    />
  )
}

function BottomDrawerDescription({ className, ...props }: Drawer.Description.Props) {
  return (
    <Drawer.Description
      data-slot="bottom-drawer-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

export {
  BottomDrawer,
  BottomDrawerTrigger,
  BottomDrawerClose,
  BottomDrawerContent,
  BottomDrawerHeader,
  BottomDrawerTitle,
  BottomDrawerDescription,
}
