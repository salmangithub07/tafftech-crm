"use client";
import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { cn } from "@/lib/utils";

function Tabs({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return <TabsPrimitive.Root data-slot="tabs" className={cn("flex flex-col gap-2", className)} {...props} />;
}
function TabsList({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn(
        "bg-muted/70 dark:bg-muted/50 border border-border/50 text-muted-foreground inline-flex h-10 w-fit items-center justify-center rounded-xl p-1 shadow-2xs",
        className
      )}
      {...props}
    />
  );
}
function TabsTrigger({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        "data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:font-semibold data-[state=active]:shadow-xs text-muted-foreground hover:text-foreground inline-flex h-[calc(100%-2px)] flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-transparent px-3 py-1.5 text-xs sm:text-sm font-medium whitespace-nowrap transition-all duration-200 disabled:pointer-events-none disabled:opacity-50",
        className
      )}
      {...props}
    />
  );
}
function TabsContent({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return <TabsPrimitive.Content data-slot="tabs-content" className={cn("flex-1 outline-none", className)} {...props} />;
}
export { Tabs, TabsList, TabsTrigger, TabsContent };
