"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Trash2,
  Pencil,
  X,
  MessageSquareText,
  FileBarChart,
  BarChart3,
  Eye,
  Target,
  CheckSquare,
  Sparkles,
  TrendingUp,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Flame,
  ArrowRight,
  Filter,
  Layers,
  Calendar,
  Share2,
  ChevronRight,
  HelpCircle,
  Lightbulb,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollableTabsWrapper } from "@/components/ui/scrollable-tabs-wrapper";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DateFilter, dateFilterParams, type DateFilterValue } from "@/components/ui/date-filter";
import { PaginationBar } from "@/components/ui/pagination-bar";
import { AnalyticsFormDialog } from "@/components/analytics/analytics-form-dialog";
import { GoalFormDialog } from "@/components/analytics/goal-form-dialog";
import { TaskFormDialog } from "@/components/analytics/task-form-dialog";
import type { AnalyticsEntry, SocialPlatform, Admin, SmGoal, SmTask, SmTaskStatus, SmTaskCategory, SmTaskPriority } from "@/lib/types";

type Counts = { entries: number; enquiries: number; posts: number; views: number };
const PAGE_SIZE_KEY = "nova-crm:pageSize:analytics";

export function AnalyticsClient({
  initialEntries,
  platforms: initialPlatforms,
  executives,
}: {
  initialEntries: AnalyticsEntry[];
  platforms: SocialPlatform[];
  executives: Admin[];
}) {
  const router = useRouter();
  const [activeTab, setActiveTab] = React.useState("entries");

  // Entries States
  const [entries, setEntries] = React.useState(initialEntries);
  const [platforms, setPlatforms] = React.useState(initialPlatforms);
  const [total, setTotal] = React.useState(0);
  const [counts, setCounts] = React.useState<Counts>({ entries: 0, enquiries: 0, posts: 0, views: 0 });
  const [dateFilter, setDateFilter] = React.useState<DateFilterValue>({ period: "all", value: "" });
  const [platformFilter, setPlatformFilter] = React.useState<string>("all");
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);
  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<AnalyticsEntry | null>(null);
  const [newPlatform, setNewPlatform] = React.useState("");

  // Goals States
  const [goals, setGoals] = React.useState<SmGoal[]>([]);
  const [goalsLoading, setGoalsLoading] = React.useState(false);
  const [goalMonthFilter, setGoalMonthFilter] = React.useState<string>("all");
  const [goalDialogOpen, setGoalDialogOpen] = React.useState(false);
  const [editingGoal, setEditingGoal] = React.useState<SmGoal | null>(null);

  // Tasks States
  const [tasks, setTasks] = React.useState<SmTask[]>([]);
  const [tasksLoading, setTasksLoading] = React.useState(false);
  const [taskStatusFilter, setTaskStatusFilter] = React.useState<string>("all");
  const [taskCategoryFilter, setTaskCategoryFilter] = React.useState<string>("all");
  const [taskExecutiveFilter, setTaskExecutiveFilter] = React.useState<string>("all");
  const [taskDialogOpen, setTaskDialogOpen] = React.useState(false);
  const [editingTask, setEditingTask] = React.useState<SmTask | null>(null);
  const [taskPrefill, setTaskPrefill] = React.useState<Partial<SmTask> | null>(null);

  React.useEffect(() => {
    const saved = typeof window !== "undefined" ? window.localStorage.getItem(PAGE_SIZE_KEY) : null;
    if (saved) setPageSize(Number(saved));
  }, []);

  // Fetch Performance Entries
  const fetchEntries = React.useCallback(async () => {
    const params = new URLSearchParams({
      page: String(page),
      limit: String(pageSize),
      ...(platformFilter !== "all" ? { platform_id: platformFilter } : {}),
      ...dateFilterParams(dateFilter),
    });
    const res = await fetch(`/api/analytics?${params}`);
    if (res.ok) {
      const json = await res.json();
      setEntries(json.data);
      setTotal(json.total);
      setCounts(json.counts);
    }
  }, [page, pageSize, platformFilter, dateFilter]);

  // Fetch Goals
  const fetchGoals = React.useCallback(async () => {
    setGoalsLoading(true);
    try {
      const params = new URLSearchParams({
        ...(goalMonthFilter !== "all" ? { period_month: goalMonthFilter } : {}),
      });
      const res = await fetch(`/api/analytics/goals?${params}`);
      if (res.ok) {
        const json = await res.json();
        setGoals(json.data || []);
      }
    } catch {
      toast.error("Failed to load growth goals.");
    } finally {
      setGoalsLoading(false);
    }
  }, [goalMonthFilter]);

  // Fetch Tasks
  const fetchTasks = React.useCallback(async () => {
    setTasksLoading(true);
    try {
      const params = new URLSearchParams({
        ...(taskStatusFilter !== "all" ? { status: taskStatusFilter } : {}),
        ...(taskCategoryFilter !== "all" ? { category: taskCategoryFilter } : {}),
        ...(taskExecutiveFilter !== "all" ? { executive_id: taskExecutiveFilter } : {}),
      });
      const res = await fetch(`/api/analytics/tasks?${params}`);
      if (res.ok) {
        const json = await res.json();
        setTasks(json.data || []);
      }
    } catch {
      toast.error("Failed to load action tasks.");
    } finally {
      setTasksLoading(false);
    }
  }, [taskStatusFilter, taskCategoryFilter, taskExecutiveFilter]);

  React.useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  React.useEffect(() => {
    if (activeTab === "goals") fetchGoals();
    if (activeTab === "tasks") fetchTasks();
  }, [activeTab, fetchGoals, fetchTasks]);

  function changeDateFilter(next: DateFilterValue) {
    setDateFilter(next);
    setPage(1);
  }

  function changePageSize(size: number) {
    setPageSize(size);
    setPage(1);
    window.localStorage.setItem(PAGE_SIZE_KEY, String(size));
  }

  async function refreshEntries() {
    await fetchEntries();
    router.refresh();
  }

  async function refreshPlatforms() {
    const res = await fetch("/api/platforms");
    if (res.ok) setPlatforms(await res.json());
    router.refresh();
  }

  async function handleDeleteEntry(id: number) {
    const res = await fetch(`/api/analytics/${id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("Could not delete.");
      return;
    }
    toast.success("Entry deleted.");
    refreshEntries();
  }

  async function handleAddPlatform(e: React.FormEvent) {
    e.preventDefault();
    if (!newPlatform.trim()) return;
    const res = await fetch("/api/platforms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ platform_name: newPlatform.trim() }),
    });
    if (!res.ok) {
      toast.error("Could not add platform.");
      return;
    }
    setNewPlatform("");
    toast.success("Platform added.");
    refreshPlatforms();
  }

  async function handleDeletePlatform(id: number) {
    const res = await fetch(`/api/platforms/${id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("Could not delete.");
      return;
    }
    toast.success("Platform deleted.");
    refreshPlatforms();
  }

  async function handleDeleteGoal(id: number) {
    const res = await fetch(`/api/analytics/goals/${id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("Could not delete goal.");
      return;
    }
    toast.success("Goal deleted.");
    fetchGoals();
  }

  async function handleTaskStatusChange(taskId: number, newStatus: SmTaskStatus) {
    try {
      const res = await fetch(`/api/analytics/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error();
      toast.success(`Task moved to ${newStatus.replace("_", " ")}`);
      fetchTasks();
    } catch {
      toast.error("Could not update task status.");
    }
  }

  async function handleDeleteTask(id: number) {
    const res = await fetch(`/api/analytics/tasks/${id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("Could not delete task.");
      return;
    }
    toast.success("Task deleted.");
    fetchTasks();
  }

  function handleOpenStrategyTask(title: string, description: string, category: SmTaskCategory) {
    setEditingTask(null);
    setTaskPrefill({
      title,
      description,
      category,
      priority: "high",
    });
    setTaskDialogOpen(true);
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Top Header - 2 Columns on Mobile */}
      <div className="flex items-start justify-between gap-2.5 sm:items-center">
        {/* Left Column */}
        <div className="flex flex-col min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-lg sm:text-2xl font-bold tracking-tight text-foreground leading-tight">
              SM Analytics &amp; Growth Hub
            </h1>
            <Badge variant="outline" className="hidden sm:inline-flex text-[10px] bg-primary/5 text-primary border-primary/20">
              Strategy &amp; Goals
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 leading-snug line-clamp-2 sm:line-clamp-none">
            Track performance entries, set growth benchmarks, and execute team action tasks.
          </p>
        </div>

        {/* Right Column (Action Button) */}
        <div className="flex items-center shrink-0">
          {activeTab === "entries" && (
            <Button
              size="sm"
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
              disabled={platforms.length === 0}
              className="font-semibold h-9 px-3 text-xs gap-1 shadow-sm whitespace-nowrap"
            >
              <Plus className="size-4" /> Add Post Entry
            </Button>
          )}

          {activeTab === "goals" && (
            <Button
              size="sm"
              onClick={() => {
                setEditingGoal(null);
                setGoalDialogOpen(true);
              }}
              className="font-semibold h-9 px-3 text-xs gap-1 shadow-sm bg-gradient-to-r from-primary to-amber-600 text-white whitespace-nowrap"
            >
              <Target className="size-4" /> Set Goal
            </Button>
          )}

          {activeTab === "tasks" && (
            <Button
              size="sm"
              onClick={() => {
                setEditingTask(null);
                setTaskPrefill(null);
                setTaskDialogOpen(true);
              }}
              className="font-semibold h-9 px-3 text-xs gap-1 shadow-sm bg-primary text-primary-foreground whitespace-nowrap"
            >
              <CheckSquare className="size-4" /> Assign Task
            </Button>
          )}
        </div>
      </div>

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-4">
        {/* Card 1: Entries */}
        <Card className="group relative overflow-hidden rounded-xl border border-border/60 bg-gradient-to-br from-card via-card to-primary/5 p-3.5 sm:p-4 shadow-2xs hover:shadow-md hover:border-primary/30 transition-all duration-300">
          <div className="flex items-center justify-between gap-2">
            <div className="space-y-0.5 min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground truncate">
                Posts Logged
              </p>
              <p className="font-heading text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                {counts.posts}
              </p>
              <p className="text-[10px] sm:text-[11px] font-medium text-muted-foreground truncate">
                {counts.entries} data entries
              </p>
            </div>
            <div className="flex size-9 sm:size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20 group-hover:scale-105 transition-all duration-300 shadow-xs">
              <FileBarChart className="size-4 sm:size-5" />
            </div>
          </div>
        </Card>

        {/* Card 2: Views / Total Reach */}
        <Card className="group relative overflow-hidden rounded-xl border border-border/60 bg-gradient-to-br from-card via-card to-purple-500/5 p-3.5 sm:p-4 shadow-2xs hover:shadow-md hover:border-purple-500/30 transition-all duration-300">
          <div className="flex items-center justify-between gap-2">
            <div className="space-y-0.5 min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground truncate">
                Total Reach / Views
              </p>
              <p className="font-heading text-xl sm:text-2xl font-bold tracking-tight text-purple-600 dark:text-purple-400">
                {counts.views.toLocaleString("en-IN")}
              </p>
              <p className="text-[10px] sm:text-[11px] font-medium text-purple-600/80 dark:text-purple-400/80 truncate">
                Combined video reach
              </p>
            </div>
            <div className="flex size-9 sm:size-11 shrink-0 items-center justify-center rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 group-hover:scale-105 transition-all duration-300 shadow-xs">
              <Eye className="size-4 sm:size-5" />
            </div>
          </div>
        </Card>

        {/* Card 3: Enquiries / Leads */}
        <Card className="group relative overflow-hidden rounded-xl border border-border/60 bg-gradient-to-br from-card via-card to-emerald-500/5 p-3.5 sm:p-4 shadow-2xs hover:shadow-md hover:border-emerald-500/30 transition-all duration-300">
          <div className="flex items-center justify-between gap-2">
            <div className="space-y-0.5 min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground truncate">
                Leads &amp; Inquiries
              </p>
              <p className="font-heading text-xl sm:text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
                {counts.enquiries}
              </p>
              <p className="text-[10px] sm:text-[11px] font-medium text-emerald-600 dark:text-emerald-400 truncate">
                From social traffic
              </p>
            </div>
            <div className="flex size-9 sm:size-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 group-hover:scale-105 transition-all duration-300 shadow-xs">
              <MessageSquareText className="size-4 sm:size-5" />
            </div>
          </div>
        </Card>

        {/* Card 4: Active Action Tasks */}
        <Card className="group relative overflow-hidden rounded-xl border border-border/60 bg-gradient-to-br from-card via-card to-amber-500/5 p-3.5 sm:p-4 shadow-2xs hover:shadow-md hover:border-amber-500/30 transition-all duration-300">
          <div className="flex items-center justify-between gap-2">
            <div className="space-y-0.5 min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground truncate">
                Active Goals
              </p>
              <p className="font-heading text-xl sm:text-2xl font-bold tracking-tight text-amber-600 dark:text-amber-400">
                {goals.length}
              </p>
              <p className="text-[10px] sm:text-[11px] font-medium text-amber-600/80 dark:text-amber-400/80 truncate">
                Growth campaigns
              </p>
            </div>
            <div className="flex size-9 sm:size-11 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 group-hover:scale-105 transition-all duration-300 shadow-xs">
              <Target className="size-4 sm:size-5" />
            </div>
          </div>
        </Card>
      </div>

      {/* Main Multi-Tab Layout with Mobile Scrollable Wrapper */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <ScrollableTabsWrapper>
          <TabsList className="w-max sm:w-fit justify-start h-9 sm:h-10 p-1 gap-1">
            <TabsTrigger value="entries" className="gap-1.5 text-xs sm:text-sm px-3">
              <BarChart3 className="size-3.5" /> Performance Entries ({counts.entries})
            </TabsTrigger>
            <TabsTrigger value="goals" className="gap-1.5 text-xs sm:text-sm px-3">
              <Target className="size-3.5" /> Growth Goals ({goals.length})
            </TabsTrigger>
            <TabsTrigger value="tasks" className="gap-1.5 text-xs sm:text-sm px-3">
              <CheckSquare className="size-3.5" /> Action Tasks ({tasks.filter(t => t.status !== 'completed').length})
            </TabsTrigger>
            <TabsTrigger value="strategy" className="gap-1.5 text-xs sm:text-sm px-3">
              <Sparkles className="size-3.5" /> Strategy Playbook
            </TabsTrigger>
            <TabsTrigger value="platforms" className="gap-1.5 text-xs sm:text-sm px-3">
              <Share2 className="size-3.5" /> Platforms ({platforms.length})
            </TabsTrigger>
          </TabsList>
        </ScrollableTabsWrapper>

        {/* ----------------- TAB 1: ENTRIES ----------------- */}
        <TabsContent value="entries" className="mt-4 flex flex-col gap-4">
          {/* Filters Bar - Full Width on Mobile */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
            <div className="w-full sm:w-auto">
              <Select value={platformFilter} onValueChange={(val) => { setPlatformFilter(val); setPage(1); }}>
                <SelectTrigger className="w-full sm:w-[180px] h-9 text-xs">
                  <SelectValue placeholder="All Platforms" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">🌐 All Platforms</SelectItem>
                  {platforms.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>
                      {p.platform_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="w-full sm:w-auto">
              <DateFilter value={dateFilter} onChange={changeDateFilter} />
            </div>
          </div>

          {entries.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-sm text-muted-foreground">
                No analytics entries yet. Click &quot;Add Post Entry&quot; to start logging your team&apos;s posts.
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Desktop Table View */}
              <Card className="hidden overflow-hidden py-0 md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Executive</TableHead>
                      <TableHead>Platform</TableHead>
                      <TableHead>Post reference</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Enquiries</TableHead>
                      <TableHead>Posts</TableHead>
                      <TableHead>Views</TableHead>
                      <TableHead>Likes</TableHead>
                      <TableHead>Subs</TableHead>
                      <TableHead className="w-20" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {entries.map((e) => (
                      <TableRow key={e.id}>
                        <TableCell className="font-medium">{e.executive_name}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{e.platform_name}</Badge>
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate text-muted-foreground">
                          {e.post_reference || "—"}
                        </TableCell>
                        <TableCell className="text-muted-foreground">{e.analytics_date}</TableCell>
                        <TableCell>
                          <Badge variant={e.enquiries > 0 ? "success" : "secondary"}>{e.enquiries}</Badge>
                        </TableCell>
                        <TableCell className="font-mono">{e.total_posts}</TableCell>
                        <TableCell className="font-mono">{e.total_views.toLocaleString("en-IN")}</TableCell>
                        <TableCell className="font-mono">{e.total_likes.toLocaleString("en-IN")}</TableCell>
                        <TableCell className="font-mono">{e.subscribers_gained}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-8"
                              onClick={() => {
                                setEditing(e);
                                setFormOpen(true);
                              }}
                            >
                              <Pencil className="size-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-8"
                              onClick={() => handleDeleteEntry(e.id)}
                            >
                              <Trash2 className="size-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <PaginationBar
                  page={page}
                  pageSize={pageSize}
                  total={total}
                  onPageChange={setPage}
                  onPageSizeChange={changePageSize}
                />
              </Card>

              {/* Mobile Card View */}
              <div className="flex flex-col gap-3 md:hidden">
                {entries.map((e) => (
                  <Card key={e.id}>
                    <CardContent className="flex flex-col gap-3 py-4">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-medium text-sm text-foreground">{e.executive_name}</p>
                          <div className="mt-1 flex items-center gap-2">
                            <Badge variant="secondary" className="text-[10px] py-0 px-2">
                              {e.platform_name}
                            </Badge>
                            {e.enquiries > 0 && (
                              <Badge variant="success" className="text-[10px] py-0 px-2">
                                {e.enquiries} Enquiries
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 -mr-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8"
                            onClick={() => {
                              setEditing(e);
                              setFormOpen(true);
                            }}
                          >
                            <Pencil className="size-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8"
                            onClick={() => handleDeleteEntry(e.id)}
                          >
                            <Trash2 className="size-4 text-destructive" />
                          </Button>
                        </div>
                      </div>

                      {e.post_reference && (
                        <p className="text-xs text-muted-foreground bg-muted/30 p-2 rounded border border-border/40 truncate">
                          Ref: {e.post_reference}
                        </p>
                      )}

                      <div className="grid grid-cols-4 gap-2 text-center pt-2 border-t border-border/50">
                        <div className="flex flex-col rounded bg-muted/20 p-1.5">
                          <span className="text-[10px] text-muted-foreground">Posts</span>
                          <span className="font-bold text-xs">{e.total_posts}</span>
                        </div>
                        <div className="flex flex-col rounded bg-muted/20 p-1.5">
                          <span className="text-[10px] text-muted-foreground">Views</span>
                          <span className="font-bold text-xs">{e.total_views}</span>
                        </div>
                        <div className="flex flex-col rounded bg-muted/20 p-1.5">
                          <span className="text-[10px] text-muted-foreground">Likes</span>
                          <span className="font-bold text-xs">{e.total_likes}</span>
                        </div>
                        <div className="flex flex-col rounded bg-muted/20 p-1.5">
                          <span className="text-[10px] text-muted-foreground">Subs</span>
                          <span className="font-bold text-xs">{e.subscribers_gained}</span>
                        </div>
                      </div>

                      <div className="flex justify-between items-center text-[11px] text-muted-foreground pt-1 border-t border-border/40">
                        <span>Date: {e.analytics_date}</span>
                        <span>Enquiries: {e.enquiries}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                <PaginationBar
                  page={page}
                  pageSize={pageSize}
                  total={total}
                  onPageChange={setPage}
                  onPageSizeChange={changePageSize}
                />
              </div>
            </>
          )}
        </TabsContent>

        {/* ----------------- TAB 2: GOALS ----------------- */}
        <TabsContent value="goals" className="mt-4 flex flex-col gap-4">
          {/* Goals Header Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-muted/20 p-3 rounded-xl border">
            <div>
              <h3 className="text-sm font-bold text-foreground">Monthly Growth Benchmarks &amp; Targets</h3>
              <p className="text-xs text-muted-foreground">
                Compare target posts, views, and inquiries against real aggregated logs.
              </p>
            </div>

            <Button
              size="sm"
              onClick={() => {
                setEditingGoal(null);
                setGoalDialogOpen(true);
              }}
              className="gap-1.5 text-xs font-semibold h-8"
            >
              <Plus className="size-3.5" /> New Goal
            </Button>
          </div>

          {goalsLoading ? (
            <Card>
              <CardContent className="py-12 text-center text-sm text-muted-foreground">
                Loading growth goals...
              </CardContent>
            </Card>
          ) : goals.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center flex flex-col items-center justify-center gap-3">
                <Target className="size-10 text-muted-foreground/60" />
                <div className="space-y-1">
                  <p className="font-semibold text-foreground text-sm">No growth goals created yet</p>
                  <p className="text-xs text-muted-foreground max-w-sm">
                    Set a monthly target for Views, Posts, and Inquiries to automatically track your team&apos;s progress.
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={() => {
                    setEditingGoal(null);
                    setGoalDialogOpen(true);
                  }}
                  className="gap-1.5 text-xs"
                >
                  <Plus className="size-3.5" /> Set First Goal
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {goals.map((g) => {
                const statusColor =
                  g.status === "achieved"
                    ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                    : g.status === "on_track"
                    ? "bg-blue-500/10 text-blue-600 border-blue-500/30"
                    : g.status === "at_risk"
                    ? "bg-amber-500/10 text-amber-600 border-amber-500/30"
                    : "bg-rose-500/10 text-rose-600 border-rose-500/30";

                const statusLabel =
                  g.status === "achieved"
                    ? "🏆 Achieved"
                    : g.status === "on_track"
                    ? "🟢 On Track"
                    : g.status === "at_risk"
                    ? "🟡 At Risk"
                    : "🔴 Behind Target";

                return (
                  <Card key={g.id} className="overflow-hidden border border-border/70 hover:shadow-md transition-all">
                    <CardHeader className="p-4 pb-2 border-b bg-muted/10 flex flex-row items-start justify-between gap-2">
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-foreground truncate">{g.title}</span>
                          <Badge variant="outline" className={`text-[10px] font-semibold py-0 px-2 ${statusColor}`}>
                            {statusLabel}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>📅 Month: {g.period_month}</span>
                          <span>•</span>
                          <span>🌐 {g.platform_name || "All Platforms"}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7"
                          onClick={() => {
                            setEditingGoal(g);
                            setGoalDialogOpen(true);
                          }}
                        >
                          <Pencil className="size-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7 text-destructive hover:bg-destructive/10"
                          onClick={() => handleDeleteGoal(g.id)}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </CardHeader>

                    <CardContent className="p-4 space-y-4">
                      {/* Overall Progress Bar */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-foreground">Overall Goal Completion</span>
                          <span className="font-bold font-mono text-primary">{g.progress_percent || 0}%</span>
                        </div>
                        <div className="h-2.5 w-full bg-muted rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all duration-500 ${
                              (g.progress_percent || 0) >= 100
                                ? "bg-emerald-500"
                                : (g.progress_percent || 0) >= 60
                                ? "bg-primary"
                                : (g.progress_percent || 0) >= 30
                                ? "bg-amber-500"
                                : "bg-rose-500"
                            }`}
                            style={{ width: `${Math.min(100, g.progress_percent || 0)}%` }}
                          />
                        </div>
                      </div>

                      {/* 4 Metric Targets Grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                        {/* 1. Posts */}
                        <div className="p-2.5 rounded-lg border bg-muted/20 space-y-1">
                          <span className="text-[10px] text-muted-foreground block font-medium">Posts</span>
                          <div className="font-bold text-xs text-foreground font-mono">
                            {g.actual_posts} / {g.target_posts}
                          </div>
                          <span className="text-[10px] text-primary font-semibold">
                            {g.target_posts > 0 ? `${Math.round(((g.actual_posts || 0) / g.target_posts) * 100)}%` : "0%"}
                          </span>
                        </div>

                        {/* 2. Views */}
                        <div className="p-2.5 rounded-lg border bg-muted/20 space-y-1">
                          <span className="text-[10px] text-muted-foreground block font-medium">Views</span>
                          <div className="font-bold text-xs text-foreground font-mono truncate" title={`${g.actual_views} / ${g.target_views}`}>
                            {((g.actual_views || 0) / 1000).toFixed(1)}k / {((g.target_views || 0) / 1000).toFixed(1)}k
                          </div>
                          <span className="text-[10px] text-purple-600 font-semibold">
                            {g.target_views > 0 ? `${Math.round(((g.actual_views || 0) / g.target_views) * 100)}%` : "0%"}
                          </span>
                        </div>

                        {/* 3. Inquiries */}
                        <div className="p-2.5 rounded-lg border bg-emerald-500/5 border-emerald-500/20 space-y-1">
                          <span className="text-[10px] text-emerald-700 dark:text-emerald-400 block font-medium">Inquiries</span>
                          <div className="font-bold text-xs text-emerald-600 dark:text-emerald-400 font-mono">
                            {g.actual_inquiries} / {g.target_inquiries}
                          </div>
                          <span className="text-[10px] text-emerald-600 font-bold">
                            {g.target_inquiries > 0 ? `${Math.round(((g.actual_inquiries || 0) / g.target_inquiries) * 100)}%` : "0%"}
                          </span>
                        </div>

                        {/* 4. Likes */}
                        <div className="p-2.5 rounded-lg border bg-muted/20 space-y-1">
                          <span className="text-[10px] text-muted-foreground block font-medium">Likes</span>
                          <div className="font-bold text-xs text-foreground font-mono">
                            {g.actual_likes} / {g.target_likes}
                          </div>
                          <span className="text-[10px] text-amber-600 font-semibold">
                            {g.target_likes > 0 ? `${Math.round(((g.actual_likes || 0) / g.target_likes) * 100)}%` : "0%"}
                          </span>
                        </div>
                      </div>

                      {/* Notes / Action Hook */}
                      {g.notes && (
                        <p className="text-xs text-muted-foreground bg-muted/30 p-2.5 rounded-lg border italic">
                          &quot;{g.notes}&quot;
                        </p>
                      )}

                      {/* Quick Assign Task for this Goal */}
                      <div className="flex items-center justify-between pt-1 border-t">
                        <span className="text-[11px] text-muted-foreground">Need to bridge the gap?</span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditingTask(null);
                            setTaskPrefill({
                              goal_id: g.id,
                              platform_id: g.platform_id || null,
                              title: `Boost views & leads for ${g.title}`,
                            });
                            setTaskDialogOpen(true);
                          }}
                          className="h-7 text-xs gap-1"
                        >
                          <Plus className="size-3" /> Assign Action Task
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ----------------- TAB 3: TASKS ----------------- */}
        <TabsContent value="tasks" className="mt-4 flex flex-col gap-4">
          {/* Tasks Toolbar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-muted/20 p-3 rounded-xl border">
            <div className="flex flex-wrap items-center gap-2">
              <Select value={taskStatusFilter} onValueChange={setTaskStatusFilter}>
                <SelectTrigger className="w-[130px] h-8 text-xs">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="todo">⏳ To Do</SelectItem>
                  <SelectItem value="in_progress">🚀 In Progress</SelectItem>
                  <SelectItem value="completed">✅ Completed</SelectItem>
                </SelectContent>
              </Select>

              <Select value={taskCategoryFilter} onValueChange={setTaskCategoryFilter}>
                <SelectTrigger className="w-[140px] h-8 text-xs">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="content">🎬 Content</SelectItem>
                  <SelectItem value="seo">🔍 SEO &amp; Tags</SelectItem>
                  <SelectItem value="thumbnail">🎨 Thumbnail</SelectItem>
                  <SelectItem value="engagement">💬 Engagement</SelectItem>
                  <SelectItem value="ads">🚀 Paid Ads</SelectItem>
                </SelectContent>
              </Select>

              <Select value={taskExecutiveFilter} onValueChange={setTaskExecutiveFilter}>
                <SelectTrigger className="w-[150px] h-8 text-xs">
                  <SelectValue placeholder="All Assignees" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Team Members</SelectItem>
                  {executives.map((ex) => (
                    <SelectItem key={ex.id} value={String(ex.id)}>
                      {ex.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              size="sm"
              onClick={() => {
                setEditingTask(null);
                setTaskPrefill(null);
                setTaskDialogOpen(true);
              }}
              className="gap-1.5 text-xs font-semibold h-8 self-start md:self-auto"
            >
              <Plus className="size-3.5" /> Assign Task
            </Button>
          </div>

          {tasksLoading ? (
            <Card>
              <CardContent className="py-12 text-center text-sm text-muted-foreground">
                Loading action tasks...
              </CardContent>
            </Card>
          ) : tasks.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center flex flex-col items-center justify-center gap-3">
                <CheckSquare className="size-10 text-muted-foreground/60" />
                <div className="space-y-1">
                  <p className="font-semibold text-foreground text-sm">No action tasks found</p>
                  <p className="text-xs text-muted-foreground max-w-sm">
                    Assign video creation, SEO optimization, and engagement boost tasks to your team.
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={() => {
                    setEditingTask(null);
                    setTaskPrefill(null);
                    setTaskDialogOpen(true);
                  }}
                  className="gap-1.5 text-xs"
                >
                  <Plus className="size-3.5" /> Assign New Task
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="flex flex-col gap-2.5">
              {tasks.map((t) => {
                const isCompleted = t.status === "completed";
                const priorityBadge =
                  t.priority === "urgent"
                    ? "bg-rose-500/10 text-rose-600 border-rose-500/30"
                    : t.priority === "high"
                    ? "bg-amber-500/10 text-amber-600 border-amber-500/30"
                    : t.priority === "medium"
                    ? "bg-blue-500/10 text-blue-600 border-blue-500/30"
                    : "bg-slate-500/10 text-slate-600 border-slate-500/30";

                const categoryLabel =
                  t.category === "content"
                    ? "🎬 Content"
                    : t.category === "seo"
                    ? "🔍 SEO"
                    : t.category === "thumbnail"
                    ? "🎨 Thumbnail"
                    : t.category === "engagement"
                    ? "💬 Engagement"
                    : t.category === "ads"
                    ? "🚀 Ads"
                    : "📌 Action";

                return (
                  <Card
                    key={t.id}
                    className={`transition-all duration-200 hover:border-primary/40 ${
                      isCompleted ? "opacity-65 bg-muted/20" : "bg-card"
                    }`}
                  >
                    <CardContent className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      {/* Left: Checkbox + Title + Meta */}
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        <button
                          type="button"
                          onClick={() =>
                            handleTaskStatusChange(
                              t.id,
                              t.status === "completed"
                                ? "todo"
                                : t.status === "todo"
                                ? "in_progress"
                                : "completed"
                            )
                          }
                          className="mt-0.5 shrink-0 size-5 rounded-md border flex items-center justify-center transition-colors cursor-pointer hover:border-primary"
                          title={`Click to change status (Currently: ${t.status})`}
                        >
                          {t.status === "completed" ? (
                            <CheckCircle2 className="size-5 text-emerald-600" />
                          ) : t.status === "in_progress" ? (
                            <Clock className="size-4 text-amber-600 animate-spin" />
                          ) : (
                            <div className="size-3 rounded-xs border border-muted-foreground/50" />
                          )}
                        </button>

                        <div className="space-y-1 min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`font-semibold text-sm text-foreground ${
                                isCompleted ? "line-through text-muted-foreground" : ""
                              }`}
                            >
                              {t.title}
                            </span>
                            <Badge variant="outline" className={`text-[10px] font-semibold py-0 px-1.5 ${priorityBadge}`}>
                              {t.priority.toUpperCase()}
                            </Badge>
                            <Badge variant="secondary" className="text-[10px] py-0 px-1.5 font-medium">
                              {categoryLabel}
                            </Badge>
                          </div>

                          {t.description && (
                            <p className="text-xs text-muted-foreground line-clamp-1">{t.description}</p>
                          )}

                          <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground pt-0.5">
                            <span>👤 Assignee: <strong>{t.executive_name || "Unassigned"}</strong></span>
                            {t.platform_name && <span>🌐 {t.platform_name}</span>}
                            {t.due_date && (
                              <span className="font-medium text-foreground">
                                📅 Due: {String(t.due_date).slice(0, 10)}
                              </span>
                            )}
                            {t.goal_title && (
                              <span className="text-primary font-medium">🎯 Goal: {t.goal_title}</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right: Actions */}
                      <div className="flex items-center gap-1 self-end sm:self-center shrink-0">
                        <Select
                          value={t.status}
                          onValueChange={(val: SmTaskStatus) => handleTaskStatusChange(t.id, val)}
                        >
                          <SelectTrigger className="h-7 text-xs w-[110px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="todo">⏳ To Do</SelectItem>
                            <SelectItem value="in_progress">🚀 In Progress</SelectItem>
                            <SelectItem value="completed">✅ Completed</SelectItem>
                          </SelectContent>
                        </Select>

                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7"
                          onClick={() => {
                            setEditingTask(t);
                            setTaskPrefill(null);
                            setTaskDialogOpen(true);
                          }}
                        >
                          <Pencil className="size-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7 text-destructive hover:bg-destructive/10"
                          onClick={() => handleDeleteTask(t.id)}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ----------------- TAB 4: STRATEGY PLAYBOOK ----------------- */}
        <TabsContent value="strategy" className="mt-4 flex flex-col gap-5">
          <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-4 rounded-xl border border-primary/20 space-y-1">
            <h3 className="text-base font-bold text-foreground flex items-center gap-2">
              <Sparkles className="size-5 text-primary" /> Performance Diagnosis &amp; Growth Strategy Playbook
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              When views or comments are lower than expected, follow these proven frameworks and click <strong>&quot;Assign This Task&quot;</strong> to immediately delegate actions to your team.
            </p>
          </div>

          {/* Section 1: Low Views / Reach */}
          <Card className="border-purple-500/30 bg-purple-500/5">
            <CardHeader className="p-4 pb-3">
              <CardTitle className="text-sm font-bold text-purple-900 dark:text-purple-300 flex items-center gap-2">
                <Eye className="size-4 text-purple-600" /> Diagnosis 1: Low Views &amp; Low Reach (Views &lt; Expected)
              </CardTitle>
              <CardDescription className="text-xs">
                Your content is not hooking users in the first 3 seconds or algorithm reach is limited.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 pt-0 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                <div className="p-3 bg-card rounded-xl border space-y-2 flex flex-col justify-between">
                  <div>
                    <span className="font-bold text-foreground block">🎬 1. The 3-Second Hook Rule</span>
                    <p className="text-muted-foreground mt-1 leading-relaxed">
                      Never start videos with intro logos. Start with the finished product output or an urgent question (&quot;Stop making this mistake when buying scrubbers...&quot;).
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      handleOpenStrategyTask(
                        "Create 3 Hook-First Reels with direct product result in 0-3s",
                        "Ensure the video starts directly with output demonstration and high-energy music hook.",
                        "content"
                      )
                    }
                    className="w-full text-xs h-7 gap-1 mt-2 text-purple-700 dark:text-purple-300"
                  >
                    <Plus className="size-3" /> Assign This Task
                  </Button>
                </div>

                <div className="p-3 bg-card rounded-xl border space-y-2 flex flex-col justify-between">
                  <div>
                    <span className="font-bold text-foreground block">🔍 2. High-Intent SEO Keywords</span>
                    <p className="text-muted-foreground mt-1 leading-relaxed">
                      Include specific search queries in titles &amp; descriptions (e.g. &quot;Manual Scrubber Packing Machine Price Nagpur 2026&quot;).
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      handleOpenStrategyTask(
                        "Research and add 10 High-Volume Search Keywords to top 5 YouTube videos",
                        "Update title, tags, and description with exact buyer search phrases.",
                        "seo"
                      )
                    }
                    className="w-full text-xs h-7 gap-1 mt-2 text-purple-700 dark:text-purple-300"
                  >
                    <Plus className="size-3" /> Assign This Task
                  </Button>
                </div>

                <div className="p-3 bg-card rounded-xl border space-y-2 flex flex-col justify-between">
                  <div>
                    <span className="font-bold text-foreground block">⏰ 3. Peak Hour Publishing</span>
                    <p className="text-muted-foreground mt-1 leading-relaxed">
                      Post during business decision-making windows: <strong>1:00 PM – 2:30 PM</strong> and <strong>7:30 PM – 9:30 PM</strong>.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      handleOpenStrategyTask(
                        "Schedule next 5 product posts at peak evening hours (7:30 PM - 9:00 PM)",
                        "Monitor initial 60-minute view velocity and reply to first comments immediately.",
                        "content"
                      )
                    }
                    className="w-full text-xs h-7 gap-1 mt-2 text-purple-700 dark:text-purple-300"
                  >
                    <Plus className="size-3" /> Assign This Task
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Section 2: Low Engagement */}
          <Card className="border-amber-500/30 bg-amber-500/5">
            <CardHeader className="p-4 pb-3">
              <CardTitle className="text-sm font-bold text-amber-900 dark:text-amber-300 flex items-center gap-2">
                <MessageSquareText className="size-4 text-amber-600" /> Diagnosis 2: Low Likes &amp; Comments (Low Engagement)
              </CardTitle>
              <CardDescription className="text-xs">
                Viewers watch but do not interact. You need explicit interactive triggers and Call-To-Actions (CTAs).
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 pt-0 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                <div className="p-3 bg-card rounded-xl border space-y-2 flex flex-col justify-between">
                  <div>
                    <span className="font-bold text-foreground block">💬 1. &quot;Comment for Price&quot; Mechanism</span>
                    <p className="text-muted-foreground mt-1 leading-relaxed">
                      Add on-screen text: <em>&quot;Comment &apos;MACHINE&apos; to get full price &amp; specs sent directly on WhatsApp!&quot;</em>
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      handleOpenStrategyTask(
                        "Add &apos;Comment for PDF Catalogue&apos; CTA sticker to next 4 Reels",
                        "Pin the top comment prompting viewers to comment their city name or keyword for fast reply.",
                        "engagement"
                      )
                    }
                    className="w-full text-xs h-7 gap-1 mt-2 text-amber-700 dark:text-amber-300"
                  >
                    <Plus className="size-3" /> Assign This Task
                  </Button>
                </div>

                <div className="p-3 bg-card rounded-xl border space-y-2 flex flex-col justify-between">
                  <div>
                    <span className="font-bold text-foreground block">📌 2. Pinned Question Trigger</span>
                    <p className="text-muted-foreground mt-1 leading-relaxed">
                      Pin a conversational question as the #1 comment within 5 minutes of posting (e.g. &quot;What size die do you need for your packaging?&quot;).
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      handleOpenStrategyTask(
                        "Pin high-engagement question on all recent posts and reply to all existing comments",
                        "Reply to every comment with a question to double comment count and boost algorithm ranking.",
                        "engagement"
                      )
                    }
                    className="w-full text-xs h-7 gap-1 mt-2 text-amber-700 dark:text-amber-300"
                  >
                    <Plus className="size-3" /> Assign This Task
                  </Button>
                </div>

                <div className="p-3 bg-card rounded-xl border space-y-2 flex flex-col justify-between">
                  <div>
                    <span className="font-bold text-foreground block">🏭 3. Raw Factory Testing Demos</span>
                    <p className="text-muted-foreground mt-1 leading-relaxed">
                      Unpolished, authentic behind-the-scenes machine testing videos generate 3x higher comment engagement than polished advertisements.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      handleOpenStrategyTask(
                        "Record 2 raw live machine testing & packing videos from workshop",
                        "Show authentic sound, speed, and real workers operating the equipment.",
                        "content"
                      )
                    }
                    className="w-full text-xs h-7 gap-1 mt-2 text-amber-700 dark:text-amber-300"
                  >
                    <Plus className="size-3" /> Assign This Task
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Section 3: Low Inquiries / Leads */}
          <Card className="border-emerald-500/30 bg-emerald-500/5">
            <CardHeader className="p-4 pb-3">
              <CardTitle className="text-sm font-bold text-emerald-900 dark:text-emerald-300 flex items-center gap-2">
                <Target className="size-4 text-emerald-600" /> Diagnosis 3: High Views But 0 Leads (Conversion Bottleneck)
              </CardTitle>
              <CardDescription className="text-xs">
                Traffic is coming but viewers don&apos;t know how or why to contact your sales team.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 pt-0 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                <div className="p-3 bg-card rounded-xl border space-y-2 flex flex-col justify-between">
                  <div>
                    <span className="font-bold text-foreground block">📲 1. 1-Click WhatsApp Direct Link</span>
                    <p className="text-muted-foreground mt-1 leading-relaxed">
                      Ensure your bio and post captions have direct <code>https://wa.me/91XXXXXXXXXX?text=Hi_I_need_quotation</code> links.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      handleOpenStrategyTask(
                        "Update Bio & captions with 1-click prefilled WhatsApp quotation link",
                        "Verify that clicking the link opens WhatsApp with product name ready to send.",
                        "other"
                      )
                    }
                    className="w-full text-xs h-7 gap-1 mt-2 text-emerald-700 dark:text-emerald-300"
                  >
                    <Plus className="size-3" /> Assign This Task
                  </Button>
                </div>

                <div className="p-3 bg-card rounded-xl border space-y-2 flex flex-col justify-between">
                  <div>
                    <span className="font-bold text-foreground block">📦 2. Proof of Dispatch Videos</span>
                    <p className="text-muted-foreground mt-1 leading-relaxed">
                      Show customer machines being packed for transport with transport receipts. Proof of delivery creates instant buyer trust.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      handleOpenStrategyTask(
                        "Film customer dispatch & transport loading video with customer location mention",
                        "Highlight city destination (e.g. Dispatched to Pune!) to build nationwide buyer trust.",
                        "content"
                      )
                    }
                    className="w-full text-xs h-7 gap-1 mt-2 text-emerald-700 dark:text-emerald-300"
                  >
                    <Plus className="size-3" /> Assign This Task
                  </Button>
                </div>

                <div className="p-3 bg-card rounded-xl border space-y-2 flex flex-col justify-between">
                  <div>
                    <span className="font-bold text-foreground block">⏳ 3. Time-Limited Offer &amp; Bonus</span>
                    <p className="text-muted-foreground mt-1 leading-relaxed">
                      Add a direct urgency incentive: &quot;Free 500 extra raw material pieces on machine orders booked before Sunday&quot;.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      handleOpenStrategyTask(
                        "Create limited-time festive/weekend bonus offer creative and post on all channels",
                        "Include clear expiration date and limited units available disclaimer.",
                        "ads"
                      )
                    }
                    className="w-full text-xs h-7 gap-1 mt-2 text-emerald-700 dark:text-emerald-300"
                  >
                    <Plus className="size-3" /> Assign This Task
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ----------------- TAB 5: PLATFORMS ----------------- */}
        <TabsContent value="platforms" className="mt-4">
          <Card>
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm font-bold">Social Media Channels</CardTitle>
              <CardDescription className="text-xs">
                Add and manage social platforms tracked by your team.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4 p-4 pt-2">
              <form onSubmit={handleAddPlatform} className="flex gap-2 max-w-md">
                <Input
                  value={newPlatform}
                  onChange={(e) => setNewPlatform(e.target.value)}
                  placeholder="e.g. LinkedIn, TikTok, Twitter"
                  className="text-xs h-9"
                />
                <Button type="submit" size="sm" className="h-9 px-4 text-xs font-semibold">
                  Add Channel
                </Button>
              </form>
              <div className="flex flex-wrap gap-2 pt-2">
                {platforms.map((p) => (
                  <Badge key={p.id} variant="secondary" className="gap-1.5 py-1.5 pl-3 pr-2 text-xs">
                    {p.platform_name}
                    <button
                      onClick={() => handleDeletePlatform(p.id)}
                      className="rounded-full p-0.5 hover:bg-background/80 text-muted-foreground hover:text-destructive cursor-pointer transition-colors"
                      title="Delete platform"
                    >
                      <X className="size-3" />
                    </button>
                  </Badge>
                ))}
                {platforms.length === 0 && (
                  <p className="text-sm text-muted-foreground">No platforms yet. Add one above.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Entry Dialog */}
      <AnalyticsFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        entry={editing}
        executives={executives}
        platforms={platforms}
        onSaved={refreshEntries}
      />

      {/* Goal Dialog */}
      <GoalFormDialog
        open={goalDialogOpen}
        onOpenChange={setGoalDialogOpen}
        goal={editingGoal}
        platforms={platforms}
        onSuccess={fetchGoals}
      />

      {/* Task Dialog */}
      <TaskFormDialog
        open={taskDialogOpen}
        onOpenChange={setTaskDialogOpen}
        task={editingTask}
        initialValues={taskPrefill}
        goals={goals}
        platforms={platforms}
        executives={executives}
        onSuccess={fetchTasks}
      />
    </div>
  );
}
