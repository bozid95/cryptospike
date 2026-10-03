import { useState, useMemo } from "react";
import {
  MegaphoneIcon,
  PlusIcon,
  PencilIcon,
  Trash2Icon,
  ExternalLinkIcon,
  AlertTriangleIcon,
  RocketIcon,
  LightbulbIcon,
  InfoIcon,
  ShieldCheckIcon,
  SparklesIcon,
  RefreshCwIcon,
} from "lucide-react";
import { useCryptoSpike } from "@/context/trading-context";
import { type AnnouncementItem } from "@/types/trading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TablePagination } from "@/components/ui/table-pagination";
import { TableToolbar } from "@/components/ui/table-toolbar";

// Icon mapping helper
export function getAnnouncementIcon(iconName?: string | null) {
  switch (iconName?.toLowerCase()) {
    case "alerttriangle":
    case "warning":
    case "alert":
      return <AlertTriangleIcon className="size-4 shrink-0 text-amber-500" />;
    case "rocket":
      return <RocketIcon className="size-4 shrink-0 text-blue-500" />;
    case "lightbulb":
      return <LightbulbIcon className="size-4 shrink-0 text-amber-400" />;
    case "info":
      return <InfoIcon className="size-4 shrink-0 text-sky-500" />;
    case "shieldcheck":
    case "security":
      return <ShieldCheckIcon className="size-4 shrink-0 text-emerald-500" />;
    case "megaphone":
    default:
      return <MegaphoneIcon className="size-4 shrink-0 text-primary" />;
  }
}

export function AnnouncementsCrud() {
  const {
    announcements,
    activeAnnouncements,
    isLoadingAnnouncements,
    fetchAnnouncements,
    createAnnouncement,
    updateAnnouncement,
    deleteAnnouncement,
  } = useCryptoSpike();

  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  // Dialog State
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<AnnouncementItem | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    title: "",
    message: "",
    icon: "AlertTriangle",
    linkText: "",
    linkUrl: "",
    isActive: true,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filtered announcements
  const filteredList = useMemo(() => {
    if (!searchTerm.trim()) return announcements;
    const q = searchTerm.toLowerCase();
    return announcements.filter(
      (a) =>
        (a.title && a.title.toLowerCase().includes(q)) ||
        (a.message && a.message.toLowerCase().includes(q)),
    );
  }, [announcements, searchTerm]);

  // Pagination
  const totalPages = Math.ceil(filteredList.length / pageSize) || 1;
  const paginatedList = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredList.slice(start, start + pageSize);
  }, [filteredList, currentPage, pageSize]);

  const handleOpenCreate = () => {
    setEditingItem(null);
    setFormData({
      title: "",
      message: "",
      icon: "AlertTriangle",
      linkText: "",
      linkUrl: "",
      isActive: true,
    });
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (item: AnnouncementItem) => {
    setEditingItem(item);
    setFormData({
      title: item.title || "",
      message: item.message || "",
      icon: item.icon || "AlertTriangle",
      linkText: item.linkText || "",
      linkUrl: item.linkUrl || "",
      isActive: item.isActive,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.message.trim() && !formData.title.trim()) {
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingItem) {
        await updateAnnouncement(editingItem.id, formData);
      } else {
        await createAnnouncement(formData);
      }
      setIsDialogOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (item: AnnouncementItem) => {
    await updateAnnouncement(item.id, { isActive: !item.isActive });
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this announcement?")) {
      await deleteAnnouncement(id);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header & Live Preview */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <MegaphoneIcon className="size-5 sm:size-6 text-primary" />
            Announcements
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Manage banner announcements and public ticker marquee.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => void fetchAnnouncements()}
            disabled={isLoadingAnnouncements}
            className="gap-1.5 text-xs h-9"
          >
            <RefreshCwIcon
              className={`size-3.5 ${isLoadingAnnouncements ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
          <Button
            size="sm"
            onClick={handleOpenCreate}
            className="gap-1.5 text-xs h-9 bg-primary text-primary-foreground font-semibold shadow-xs"
          >
            <PlusIcon className="size-4" />
            New Announcement
          </Button>
        </div>
      </div>

      {/* 2. Live Marquee Preview Card */}
      <Card className="border border-slate-300 dark:border-zinc-700 bg-card/60 backdrop-blur-xs shadow-xs overflow-hidden">
        <CardHeader className="p-4 pb-2 border-b border-border/40">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <SparklesIcon className="size-3.5 text-amber-500" />
              Live Marquee Ticker Preview (Public View)
            </CardTitle>
            <Badge variant="outline" className="text-[10px] font-mono">
              {activeAnnouncements.length} Active in Ticker
            </Badge>
          </div>
          <CardDescription className="text-[11px]">
            Hover to pause. This ticker displays automatically on the public
            live signals screen.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-3 bg-muted/15">
          {activeAnnouncements.length === 0 ? (
            <div className="py-4 text-center text-xs text-muted-foreground">
              No active announcements. Create or activate one below to display
              on the public ticker.
            </div>
          ) : (
            <div className="relative overflow-hidden w-full bg-amber-500/10 py-2 px-2 [mask-image:linear-gradient(to_right,transparent,black_24px,black_calc(100%-24px),transparent)]">
              {/* Left and Right blur fade gradient fallback */}
              <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-card to-transparent z-10" />
              <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-card to-transparent z-10" />
              <div className="animate-marquee gap-8 items-center cursor-pointer">
                {/* Loop 1 */}
                {activeAnnouncements.map((item) => (
                  <div
                    key={`prev-1-${item.id}`}
                    className="flex items-center gap-2 text-xs font-sans text-amber-700 dark:text-amber-300 shrink-0"
                  >
                    {getAnnouncementIcon(item.icon)}
                    {item.title && (
                      <span className="font-bold tracking-tight uppercase text-[11px] bg-amber-500/20 px-1.5 py-0.5 rounded-sm">
                        {item.title}
                      </span>
                    )}
                    <span className="opacity-95">{item.message}</span>
                    {item.linkUrl && (
                      <a
                        href={item.linkUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] underline font-semibold text-amber-600 dark:text-amber-400 hover:opacity-80"
                      >
                        {item.linkText || "Learn More"}
                        <ExternalLinkIcon className="size-3" />
                      </a>
                    )}
                    <span className="text-muted-foreground/50 mx-2">•</span>
                  </div>
                ))}

                {/* Loop 2 for continuous infinite marquee */}
                {activeAnnouncements.map((item) => (
                  <div
                    key={`prev-2-${item.id}`}
                    className="flex items-center gap-2 text-xs font-sans text-amber-700 dark:text-amber-300 shrink-0"
                  >
                    {getAnnouncementIcon(item.icon)}
                    {item.title && (
                      <span className="font-bold tracking-tight uppercase text-[11px] bg-amber-500/20 px-1.5 py-0.5 rounded-sm">
                        {item.title}
                      </span>
                    )}
                    <span className="opacity-95">{item.message}</span>
                    {item.linkUrl && (
                      <a
                        href={item.linkUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] underline font-semibold text-amber-600 dark:text-amber-400 hover:opacity-80"
                      >
                        {item.linkText || "Learn More"}
                        <ExternalLinkIcon className="size-3" />
                      </a>
                    )}
                    <span className="text-muted-foreground/50 mx-2">•</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 3. CRUD Data Table */}
      <Card className="border border-slate-300 dark:border-zinc-700 shadow-xs">
        <CardHeader className="p-4 sm:p-6 pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base font-semibold">
                Announcement Records ({announcements.length})
              </CardTitle>
              <CardDescription className="text-xs">
                Manage titles, messages, icons, external links, and display
                status.
              </CardDescription>
            </div>
            <div className="w-full sm:w-72">
              <Input
                placeholder="Search announcements..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="text-xs h-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-border/80 bg-muted/40 hover:bg-muted/40">
                  <TableHead className="w-12 text-center text-xs font-semibold">
                    Icon
                  </TableHead>
                  <TableHead className="text-xs font-semibold">Title</TableHead>
                  <TableHead className="text-xs font-semibold">
                    Message
                  </TableHead>
                  <TableHead className="text-xs font-semibold">Link</TableHead>
                  <TableHead className="text-center text-xs font-semibold">
                    Status
                  </TableHead>
                  <TableHead className="text-right text-xs font-semibold pr-6">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedList.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="text-center py-8 text-xs text-muted-foreground"
                    >
                      {searchTerm
                        ? "No announcements matching your search."
                        : "No announcements created yet."}
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedList.map((item) => (
                    <TableRow
                      key={item.id}
                      className="border-b border-border/50 hover:bg-muted/30 transition-colors"
                    >
                      <TableCell className="text-center">
                        <div className="flex justify-center">
                          {getAnnouncementIcon(item.icon)}
                        </div>
                      </TableCell>
                      <TableCell className="font-semibold text-xs text-foreground whitespace-nowrap">
                        {item.title || (
                          <span className="text-muted-foreground italic font-normal">
                            No title
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-md truncate">
                        {item.message}
                      </TableCell>
                      <TableCell className="text-xs whitespace-nowrap">
                        {item.linkUrl ? (
                          <a
                            href={item.linkUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-primary hover:underline font-medium"
                          >
                            {item.linkText || "Link"}
                            <ExternalLinkIcon className="size-3" />
                          </a>
                        ) : (
                          <span className="text-muted-foreground/60">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Switch
                            checked={item.isActive}
                            onCheckedChange={() =>
                              void handleToggleActive(item)
                            }
                          />
                          <span
                            className={`text-[11px] font-mono font-medium ${
                              item.isActive
                                ? "text-emerald-600 dark:text-emerald-400"
                                : "text-muted-foreground"
                            }`}
                          >
                            {item.isActive ? "ACTIVE" : "OFF"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right pr-6 whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8 text-muted-foreground hover:text-foreground"
                            onClick={() => handleOpenEdit(item)}
                            title="Edit Announcement"
                          >
                            <PencilIcon className="size-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8 text-red-500 hover:text-red-600 hover:bg-red-500/10"
                            onClick={() => void handleDelete(item.id)}
                            title="Delete Announcement"
                          >
                            <Trash2Icon className="size-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {filteredList.length > pageSize && (
            <div className="p-4 border-t border-border/60">
              <TablePagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                pageSize={pageSize}
                onPageSizeChange={(sz) => {
                  setPageSize(sz);
                  setCurrentPage(1);
                }}
                totalItems={filteredList.length}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* 4. Create / Edit Dialog Modal */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle className="text-base font-bold flex items-center gap-2">
                <MegaphoneIcon className="size-5 text-primary" />
                {editingItem ? "Edit Announcement" : "Create New Announcement"}
              </DialogTitle>
              <DialogDescription className="text-xs">
                Configure announcement banner and running text ticker
                information.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="grid gap-1.5">
                <Label htmlFor="title" className="text-xs font-semibold">
                  Title (Optional Tag / Header)
                </Label>
                <Input
                  id="title"
                  placeholder="e.g. Development Phase & Testing"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  className="text-xs"
                />
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="message" className="text-xs font-semibold">
                  Announcement Message <span className="text-red-500">*</span>
                </Label>
                <textarea
                  id="message"
                  rows={3}
                  placeholder="Type your public announcement or disclaimer message here..."
                  value={formData.message}
                  onChange={(e) =>
                    setFormData({ ...formData, message: e.target.value })
                  }
                  required
                  className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring font-sans"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <Label htmlFor="icon" className="text-xs font-semibold">
                    Preset Icon
                  </Label>
                  <select
                    id="icon"
                    value={formData.icon}
                    onChange={(e) =>
                      setFormData({ ...formData, icon: e.target.value })
                    }
                    className="h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    <option value="AlertTriangle">
                      ⚠️ Warning / Disclaimer
                    </option>
                    <option value="Megaphone">📢 Megaphone / General</option>
                    <option value="Rocket">🚀 Rocket / New Feature</option>
                    <option value="Lightbulb">💡 Tip / Advisory</option>
                    <option value="Info">ℹ️ Information</option>
                    <option value="ShieldCheck">🛡️ Security / Trust</option>
                  </select>
                </div>

                <div className="grid gap-1.5">
                  <Label htmlFor="linkText" className="text-xs font-semibold">
                    Link Label (Optional)
                  </Label>
                  <Input
                    id="linkText"
                    placeholder="e.g. Read Whitepaper"
                    value={formData.linkText}
                    onChange={(e) =>
                      setFormData({ ...formData, linkText: e.target.value })
                    }
                    className="text-xs"
                  />
                </div>
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="linkUrl" className="text-xs font-semibold">
                  Link Target URL (Optional)
                </Label>
                <Input
                  id="linkUrl"
                  placeholder="e.g. https://t.me/cryptospike or /docs"
                  value={formData.linkUrl}
                  onChange={(e) =>
                    setFormData({ ...formData, linkUrl: e.target.value })
                  }
                  className="text-xs"
                />
              </div>

              <div className="flex items-center justify-between rounded-lg border border-border p-3 bg-muted/20">
                <div className="space-y-0.5">
                  <Label className="text-xs font-semibold">
                    Active on Public Ticker
                  </Label>
                  <p className="text-[11px] text-muted-foreground">
                    When active, this announcement will scroll across the public
                    ticker marquee.
                  </p>
                </div>
                <Switch
                  checked={formData.isActive}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, isActive: checked })
                  }
                />
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsDialogOpen(false)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isSubmitting}
                className="text-xs"
              >
                {isSubmitting
                  ? "Saving..."
                  : editingItem
                    ? "Update Announcement"
                    : "Create Announcement"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
