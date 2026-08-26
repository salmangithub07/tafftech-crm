"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
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
import { DatePicker } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Admin, AnalyticsEntry, SocialPlatform } from "@/lib/types";

const formSchema = z.object({
  executive_id: z.string().min(1, "Select a team member"),
  platform_id: z.string().min(1, "Select a platform"),
  analytics_date: z.string().min(1, "Date is required"),
  post_reference: z.string().optional().or(z.literal("")),
  enquiries: z.number().int().min(0),
  total_posts: z.number().int().min(0),
  total_views: z.number().int().min(0),
  total_likes: z.number().int().min(0),
  total_comments: z.number().int().min(0),
  watch_time: z.number().min(0),
  subscribers_gained: z.number().int().min(0),
  notes: z.string().optional().or(z.literal("")),
});
type FormValues = z.infer<typeof formSchema>;

const empty: FormValues = {
  executive_id: "",
  platform_id: "",
  analytics_date: new Date().toISOString().slice(0, 10),
  post_reference: "",
  enquiries: 0,
  total_posts: 0,
  total_views: 0,
  total_likes: 0,
  total_comments: 0,
  watch_time: 0,
  subscribers_gained: 0,
  notes: "",
};

export function AnalyticsFormDialog({
  open,
  onOpenChange,
  entry,
  executives,
  platforms,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry?: AnalyticsEntry | null;
  executives: Admin[];
  platforms: SocialPlatform[];
  onSaved: () => void;
}) {
  const isEdit = !!entry;
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(formSchema), defaultValues: empty });

  React.useEffect(() => {
    if (!open) return;
    if (entry) {
      reset({
        executive_id: String(entry.executive_id),
        platform_id: String(entry.platform_id),
        analytics_date: entry.analytics_date,
        post_reference: entry.post_reference ?? "",
        enquiries: entry.enquiries ?? 0,
        total_posts: entry.total_posts,
        total_views: entry.total_views,
        total_likes: entry.total_likes,
        total_comments: entry.total_comments,
        watch_time: Number(entry.watch_time),
        subscribers_gained: entry.subscribers_gained,
        notes: entry.notes ?? "",
      });
    } else {
      reset(empty);
    }
  }, [open, entry, reset]);

  async function onSubmit(values: FormValues) {
    try {
      const res = await fetch(isEdit ? `/api/analytics/${entry!.id}` : "/api/analytics", {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      toast.success(isEdit ? "Analytics entry updated." : "Analytics entry added.");
      onOpenChange(false);
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Analytics Entry" : "Add Analytics Entry"}</DialogTitle>
          <DialogDescription>
            Log a team member&apos;s social media performance, including how many enquiries a post generated.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="flex flex-col gap-1.5">
              <Label>Executive *</Label>
              <Select value={watch("executive_id")} onValueChange={(v) => setValue("executive_id", v)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  {executives.map((e) => (
                    <SelectItem key={e.id} value={String(e.id)}>
                      {e.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.executive_id && <p className="text-xs text-destructive">{errors.executive_id.message}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Platform *</Label>
              <Select value={watch("platform_id")} onValueChange={(v) => setValue("platform_id", v)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  {platforms.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>
                      {p.platform_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.platform_id && <p className="text-xs text-destructive">{errors.platform_id.message}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="analytics_date">Date *</Label>
              <DatePicker
                value={watch("analytics_date")}
                onChange={(val) => setValue("analytics_date", val, { shouldValidate: true })}
              />
              {errors.analytics_date && <p className="text-xs text-destructive">{errors.analytics_date.message}</p>}
            </div>

            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <Label htmlFor="post_reference">Post reference</Label>
              <Input
                id="post_reference"
                {...register("post_reference")}
                placeholder="e.g. Reel about scrubber machine, July 18"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="enquiries">Enquiries generated</Label>
              <Input id="enquiries" type="number" min={0} {...register("enquiries", { valueAsNumber: true })} />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="total_posts">Posts</Label>
              <Input id="total_posts" type="number" min={0} {...register("total_posts", { valueAsNumber: true })} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="total_views">Views</Label>
              <Input id="total_views" type="number" min={0} {...register("total_views", { valueAsNumber: true })} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="total_likes">Likes</Label>
              <Input id="total_likes" type="number" min={0} {...register("total_likes", { valueAsNumber: true })} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="total_comments">Comments</Label>
              <Input id="total_comments" type="number" min={0} {...register("total_comments", { valueAsNumber: true })} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="watch_time">Watch time (hrs)</Label>
              <Input id="watch_time" type="number" step="0.01" min={0} {...register("watch_time", { valueAsNumber: true })} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="subscribers_gained">Subscribers gained</Label>
              <Input id="subscribers_gained" type="number" min={0} {...register("subscribers_gained", { valueAsNumber: true })} />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" {...register("notes")} placeholder="Optional" />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="size-4 animate-spin" />}
              {isEdit ? "Save changes" : "Save entry"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
