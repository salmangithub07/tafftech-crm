"use client";

import * as React from "react";
import { Loader2, CheckSquare, Sparkles, User, Calendar, Tag } from "lucide-react";
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
import { DatePicker } from "@/components/ui/date-picker";
import type { SmTask, SmGoal, SocialPlatform, Admin, SmTaskCategory, SmTaskPriority, SmTaskStatus } from "@/lib/types";

interface TaskFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task?: SmTask | null;
  initialValues?: Partial<SmTask> | null;
  goals: SmGoal[];
  platforms: SocialPlatform[];
  executives: Admin[];
  onSuccess: () => void;
}

export function TaskFormDialog({
  open,
  onOpenChange,
  task,
  initialValues,
  goals,
  platforms,
  executives,
  onSuccess,
}: TaskFormDialogProps) {
  const [loading, setLoading] = React.useState(false);
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [category, setCategory] = React.useState<SmTaskCategory>("content");
  const [priority, setPriority] = React.useState<SmTaskPriority>("medium");
  const [status, setStatus] = React.useState<SmTaskStatus>("todo");
  const [dueDate, setDueDate] = React.useState("");
  const [executiveId, setExecutiveId] = React.useState<string>("none");
  const [goalId, setGoalId] = React.useState<string>("none");
  const [platformId, setPlatformId] = React.useState<string>("none");

  React.useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description || "");
      setCategory(task.category || "content");
      setPriority(task.priority || "medium");
      setStatus(task.status || "todo");
      setDueDate(task.due_date ? String(task.due_date).slice(0, 10) : "");
      setExecutiveId(task.executive_id ? String(task.executive_id) : "none");
      setGoalId(task.goal_id ? String(task.goal_id) : "none");
      setPlatformId(task.platform_id ? String(task.platform_id) : "none");
    } else if (initialValues) {
      setTitle(initialValues.title || "");
      setDescription(initialValues.description || "");
      setCategory(initialValues.category || "content");
      setPriority(initialValues.priority || "high");
      setStatus(initialValues.status || "todo");
      setDueDate(initialValues.due_date ? String(initialValues.due_date).slice(0, 10) : "");
      setExecutiveId(initialValues.executive_id ? String(initialValues.executive_id) : "none");
      setGoalId(initialValues.goal_id ? String(initialValues.goal_id) : "none");
      setPlatformId(initialValues.platform_id ? String(initialValues.platform_id) : "none");
    } else {
      setTitle("");
      setDescription("");
      setCategory("content");
      setPriority("medium");
      setStatus("todo");
      setDueDate("");
      setExecutiveId("none");
      setGoalId("none");
      setPlatformId("none");
    }
  }, [task, initialValues, open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Please enter a task title.");
      return;
    }
    setLoading(true);
    try {
      const payload = {
        title: title.trim(),
        description: description.trim(),
        category,
        priority,
        status,
        due_date: dueDate ? dueDate : null,
        executive_id: executiveId === "none" ? null : Number(executiveId),
        goal_id: goalId === "none" ? null : Number(goalId),
        platform_id: platformId === "none" ? null : Number(platformId),
      };

      const url = task ? `/api/analytics/tasks/${task.id}` : `/api/analytics/tasks`;
      const method = task ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save task.");
      }

      toast.success(task ? "Task updated successfully!" : "New Action Task assigned!");
      onOpenChange(false);
      onSuccess();
    } catch (err: any) {
      toast.error(err.message || "Failed to save task.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckSquare className="size-5 text-primary" />
            {task ? "Edit Action Task" : "Assign New Action Task"}
          </DialogTitle>
          <DialogDescription className="text-xs">
            Assign growth tasks to team members to improve views, engagement, and inquiries.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3.5 py-1">
          <div className="space-y-1">
            <Label htmlFor="task_title" className="text-xs font-semibold">
              Task Title <span className="text-destructive">*</span>
            </Label>
            <Input
              id="task_title"
              placeholder="e.g. Create 3 Hook-based Reels on Customer Testimonials"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="text-xs h-9"
              required
            />
          </div>

          {/* Row 1: Category & Priority */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1 min-w-0">
              <Label className="text-xs font-semibold">Category</Label>
              <Select value={category} onValueChange={(val: SmTaskCategory) => setCategory(val)}>
                <SelectTrigger className="w-full min-w-0 text-xs h-9 [&>span]:truncate">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="content">🎬 Content &amp; Video</SelectItem>
                  <SelectItem value="seo">🔍 SEO, Title &amp; Tags</SelectItem>
                  <SelectItem value="thumbnail">🎨 Graphic &amp; Thumbnail</SelectItem>
                  <SelectItem value="engagement">💬 Engagement &amp; Comments</SelectItem>
                  <SelectItem value="ads">🚀 Paid Ads &amp; Boost</SelectItem>
                  <SelectItem value="other">📌 Other Action</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1 min-w-0">
              <Label className="text-xs font-semibold">Priority</Label>
              <Select value={priority} onValueChange={(val: SmTaskPriority) => setPriority(val)}>
                <SelectTrigger className="w-full min-w-0 text-xs h-9 [&>span]:truncate">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="urgent">🔴 Urgent</SelectItem>
                  <SelectItem value="high">🟠 High Priority</SelectItem>
                  <SelectItem value="medium">🟡 Medium Priority</SelectItem>
                  <SelectItem value="low">⚪ Low Priority</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Row 2: Assign Executive & Due Date */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1 min-w-0">
              <Label className="text-xs font-semibold">Assign Executive</Label>
              <Select value={executiveId} onValueChange={setExecutiveId}>
                <SelectTrigger className="w-full min-w-0 text-xs h-9 [&>span]:truncate">
                  <SelectValue placeholder="Unassigned" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Unassigned</SelectItem>
                  {executives.map((ex) => (
                    <SelectItem key={ex.id} value={String(ex.id)}>
                      {ex.name} {ex.role ? `(${ex.role})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1 min-w-0">
              <Label className="text-xs font-semibold flex items-center gap-1">
                <Calendar className="size-3.5 text-muted-foreground" /> Due Date
              </Label>
              <DatePicker
                value={dueDate}
                onChange={setDueDate}
                placeholder="Select deadline"
                className="w-full h-9 text-xs"
              />
            </div>
          </div>

          {/* Row 3: Platform & Status */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1 min-w-0">
              <Label className="text-xs font-semibold">Platform</Label>
              <Select value={platformId} onValueChange={setPlatformId}>
                <SelectTrigger className="w-full min-w-0 text-xs h-9 [&>span]:truncate">
                  <SelectValue placeholder="All / General" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">🌐 General / All</SelectItem>
                  {platforms.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>
                      {p.platform_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1 min-w-0">
              <Label className="text-xs font-semibold">Status</Label>
              <Select value={status} onValueChange={(val: SmTaskStatus) => setStatus(val)}>
                <SelectTrigger className="w-full min-w-0 text-xs h-9 [&>span]:truncate">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todo">⏳ To Do</SelectItem>
                  <SelectItem value="in_progress">🚀 In Progress</SelectItem>
                  <SelectItem value="completed">✅ Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Row 4: Link to Goal */}
          <div className="space-y-1 min-w-0">
            <Label className="text-xs font-semibold">Link to Goal (Optional)</Label>
            <Select value={goalId} onValueChange={setGoalId}>
              <SelectTrigger className="w-full min-w-0 text-xs h-9 [&>span]:truncate">
                <SelectValue placeholder="No Linked Goal" />
              </SelectTrigger>
              <SelectContent className="max-h-56">
                <SelectItem value="none">None (Independent Task)</SelectItem>
                {goals.map((g) => (
                  <SelectItem key={g.id} value={String(g.id)} className="text-xs">
                    🎯 {g.title} ({g.period_month})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Row 5: Action Plan */}
          <div className="space-y-1">
            <Label htmlFor="task_desc" className="text-xs font-semibold">
              Action Plan / Description (Optional)
            </Label>
            <Textarea
              id="task_desc"
              rows={2}
              placeholder="e.g. Highlight the machine output speed and WhatsApp contact in first 5 seconds..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="text-xs resize-none"
            />
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={loading} className="gap-1.5">
              {loading && <Loader2 className="size-3.5 animate-spin" />}
              {task ? "Update Task" : "Assign Task"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
