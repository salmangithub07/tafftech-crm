"use client";

import * as React from "react";
import { Loader2, Target, Calendar, BarChart3 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { SmGoal, SocialPlatform } from "@/lib/types";

interface GoalFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goal?: SmGoal | null;
  platforms: SocialPlatform[];
  onSuccess: () => void;
}

export function GoalFormDialog({
  open,
  onOpenChange,
  goal,
  platforms,
  onSuccess,
}: GoalFormDialogProps) {
  const [loading, setLoading] = React.useState(false);
  const [title, setTitle] = React.useState("");
  const [platformId, setPlatformId] = React.useState<string>("all");
  const [periodMonth, setPeriodMonth] = React.useState(
    new Date().toISOString().slice(0, 7) // e.g. "2026-08"
  );
  const [targetPosts, setTargetPosts] = React.useState("10");
  const [targetViews, setTargetViews] = React.useState("50000");
  const [targetInquiries, setTargetInquiries] = React.useState("20");
  const [targetLikes, setTargetLikes] = React.useState("1000");
  const [notes, setNotes] = React.useState("");

  React.useEffect(() => {
    if (goal) {
      setTitle(goal.title);
      setPlatformId(goal.platform_id ? String(goal.platform_id) : "all");
      setPeriodMonth(goal.period_month || new Date().toISOString().slice(0, 7));
      setTargetPosts(String(goal.target_posts || 0));
      setTargetViews(String(goal.target_views || 0));
      setTargetInquiries(String(goal.target_inquiries || 0));
      setTargetLikes(String(goal.target_likes || 0));
      setNotes(goal.notes || "");
    } else {
      setTitle("");
      setPlatformId("all");
      setPeriodMonth(new Date().toISOString().slice(0, 7));
      setTargetPosts("10");
      setTargetViews("50000");
      setTargetInquiries("20");
      setTargetLikes("1000");
      setNotes("");
    }
  }, [goal, open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Please enter a goal title.");
      return;
    }
    setLoading(true);
    try {
      const payload = {
        title: title.trim(),
        platform_id: platformId === "all" ? null : Number(platformId),
        period_month: periodMonth,
        target_posts: Number(targetPosts) || 0,
        target_views: Number(targetViews) || 0,
        target_inquiries: Number(targetInquiries) || 0,
        target_likes: Number(targetLikes) || 0,
        notes: notes.trim(),
      };

      const url = goal ? `/api/analytics/goals/${goal.id}` : `/api/analytics/goals`;
      const method = goal ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save goal.");
      }

      toast.success(goal ? "Growth Goal updated successfully!" : "New Growth Goal created!");
      onOpenChange(false);
      onSuccess();
    } catch (err: any) {
      toast.error(err.message || "Failed to save goal.");
    } finally {
      setLoading(false);
    }
  }

  // Generate a list of months (6 past months + current + 12 future months)
  const monthOptions = React.useMemo(() => {
    const options: { value: string; label: string; isCurrent?: boolean }[] = [];
    const now = new Date();
    const currentYm = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    for (let offset = -6; offset <= 12; offset++) {
      const d = new Date(now.getFullYear(), now.getMonth() + offset, 1);
      const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const monthName = d.toLocaleString("en-US", { month: "long", year: "numeric" });
      const isCurrent = ym === currentYm;
      options.push({
        value: ym,
        label: isCurrent ? `${monthName} (Current)` : monthName,
        isCurrent,
      });
    }

    // Ensure currently selected periodMonth is present if outside range
    if (periodMonth && !options.some((o) => o.value === periodMonth)) {
      options.unshift({
        value: periodMonth,
        label: periodMonth,
      });
    }

    return options;
  }, [periodMonth]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="size-5 text-primary" />
            {goal ? "Edit Growth Goal" : "Set New Growth Goal"}
          </DialogTitle>
          <DialogDescription className="text-xs">
            Set benchmark targets for posts, views, and inquiries to track progress.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-1">
          <div className="space-y-1.5">
            <Label htmlFor="goal_title" className="text-xs font-semibold">
              Goal Title <span className="text-destructive">*</span>
            </Label>
            <Input
              id="goal_title"
              placeholder="e.g., August 50K Views & 20 Leads Campaign"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="text-xs"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold flex items-center gap-1.5">
                <Calendar className="size-3.5 text-muted-foreground" /> Target Month <span className="text-destructive">*</span>
              </Label>
              <Select value={periodMonth} onValueChange={setPeriodMonth}>
                <SelectTrigger className="text-xs">
                  <SelectValue placeholder="Select month" />
                </SelectTrigger>
                <SelectContent className="max-h-56">
                  {monthOptions.map((m) => (
                    <SelectItem key={m.value} value={m.value} className="text-xs">
                      {m.isCurrent ? "⭐ " : "📅 "}
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Target Platform</Label>
              <Select value={platformId} onValueChange={setPlatformId}>
                <SelectTrigger className="text-xs">
                  <SelectValue placeholder="All Platforms" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">🌐 All Platforms (Combined)</SelectItem>
                  {platforms.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>
                      {p.platform_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 p-3 bg-muted/30 rounded-xl border">
            <div className="space-y-1">
              <Label htmlFor="target_posts" className="text-[11px] font-semibold text-foreground">
                Target Posts
              </Label>
              <Input
                id="target_posts"
                type="number"
                min="0"
                value={targetPosts}
                onChange={(e) => setTargetPosts(e.target.value)}
                className="text-xs font-mono"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="target_views" className="text-[11px] font-semibold text-foreground">
                Target Views / Reach
              </Label>
              <Input
                id="target_views"
                type="number"
                min="0"
                value={targetViews}
                onChange={(e) => setTargetViews(e.target.value)}
                className="text-xs font-mono"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="target_inquiries" className="text-[11px] font-semibold text-foreground">
                Target Inquiries (Leads)
              </Label>
              <Input
                id="target_inquiries"
                type="number"
                min="0"
                value={targetInquiries}
                onChange={(e) => setTargetInquiries(e.target.value)}
                className="text-xs font-mono font-bold text-primary"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="target_likes" className="text-[11px] font-semibold text-foreground">
                Target Likes
              </Label>
              <Input
                id="target_likes"
                type="number"
                min="0"
                value={targetLikes}
                onChange={(e) => setTargetLikes(e.target.value)}
                className="text-xs font-mono"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="goal_notes" className="text-xs font-semibold">
              Strategy &amp; Focus Notes (Optional)
            </Label>
            <Textarea
              id="goal_notes"
              rows={2}
              placeholder="e.g. Focus on customer demo videos and high-intent keyword tags..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="text-xs"
            />
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={loading} className="gap-1.5">
              {loading && <Loader2 className="size-3.5 animate-spin" />}
              {goal ? "Update Goal" : "Create Goal"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
