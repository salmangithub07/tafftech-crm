"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Pencil, X, MessageSquareText, FileBarChart } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DateFilter, dateFilterParams, type DateFilterValue } from "@/components/ui/date-filter";
import { PaginationBar } from "@/components/ui/pagination-bar";
import { AnalyticsFormDialog } from "@/components/analytics/analytics-form-dialog";
import type { AnalyticsEntry, SocialPlatform, Admin } from "@/lib/types";

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
  const [entries, setEntries] = React.useState(initialEntries);
  const [platforms, setPlatforms] = React.useState(initialPlatforms);
  const [total, setTotal] = React.useState(0);
  const [counts, setCounts] = React.useState<Counts>({ entries: 0, enquiries: 0, posts: 0, views: 0 });
  const [dateFilter, setDateFilter] = React.useState<DateFilterValue>({ period: "all", value: "" });
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);
  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<AnalyticsEntry | null>(null);
  const [newPlatform, setNewPlatform] = React.useState("");

  React.useEffect(() => {
    const saved = typeof window !== "undefined" ? window.localStorage.getItem(PAGE_SIZE_KEY) : null;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time restore of the saved page-size preference
    if (saved) setPageSize(Number(saved));
  }, []);

  const fetchEntries = React.useCallback(async () => {
    const params = new URLSearchParams({
      page: String(page),
      limit: String(pageSize),
      ...dateFilterParams(dateFilter),
    });
    const res = await fetch(`/api/analytics?${params}`);
    if (res.ok) {
      const json = await res.json();
      setEntries(json.data);
      setTotal(json.total);
      setCounts(json.counts);
    }
  }, [page, pageSize, dateFilter]);

  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- refetches whenever any filter/pagination input changes
    fetchEntries();
  }, [fetchEntries]);

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

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>
          <p className="text-sm text-muted-foreground">Track your team&apos;s social media performance.</p>
        </div>
        <Button
          size="sm"
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
          disabled={platforms.length === 0}
        >
          <Plus className="size-4" /> Add Entry
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="py-4">
            <p className="text-xs text-muted-foreground">Entries</p>
            <p className="text-2xl font-bold">{counts.entries}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              <MessageSquareText className="size-3" /> Enquiries
            </p>
            <p className="text-2xl font-bold">{counts.enquiries}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              <FileBarChart className="size-3" /> Posts
            </p>
            <p className="text-2xl font-bold">{counts.posts}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-xs text-muted-foreground">Views</p>
            <p className="text-2xl font-bold">{counts.views}</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="entries">
        <TabsList>
          <TabsTrigger value="entries">Entries</TabsTrigger>
          <TabsTrigger value="platforms">Platforms</TabsTrigger>
        </TabsList>

        <TabsContent value="entries" className="mt-4 flex flex-col gap-4">
          <div className="flex justify-end">
            <DateFilter value={dateFilter} onChange={changeDateFilter} />
          </div>

          {entries.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-sm text-muted-foreground">
                No analytics entries yet.
              </CardContent>
            </Card>
          ) : (
            <Card className="overflow-hidden py-0">
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
                      <TableCell>{e.total_posts}</TableCell>
                      <TableCell>{e.total_views}</TableCell>
                      <TableCell>{e.total_likes}</TableCell>
                      <TableCell>{e.subscribers_gained}</TableCell>
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
          )}
        </TabsContent>

        <TabsContent value="platforms" className="mt-4">
          <Card>
            <CardContent className="flex flex-col gap-4 py-4">
              <form onSubmit={handleAddPlatform} className="flex gap-2">
                <Input
                  value={newPlatform}
                  onChange={(e) => setNewPlatform(e.target.value)}
                  placeholder="e.g. LinkedIn"
                />
                <Button type="submit">Add</Button>
              </form>
              <div className="flex flex-wrap gap-2">
                {platforms.map((p) => (
                  <Badge key={p.id} variant="secondary" className="gap-1.5 py-1.5 pl-3 pr-2">
                    {p.platform_name}
                    <button onClick={() => handleDeletePlatform(p.id)} className="rounded-full hover:bg-background/50">
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

      <AnalyticsFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        entry={editing}
        executives={executives}
        platforms={platforms}
        onSaved={refreshEntries}
      />
    </div>
  );
}
