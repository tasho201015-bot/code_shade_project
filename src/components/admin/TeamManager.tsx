import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Pencil, Trash2, Copy, Eye, EyeOff, Star, GripVertical, Upload,
  Search, LayoutGrid, List as ListIcon, X, Settings as SettingsIcon,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { slugify, type TeamMember, type TeamSettings, type TeamLayout, type TeamSocials } from "@/lib/team";
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

type Draft = Omit<TeamMember, "id" | "created_at" | "updated_at"> & { id?: string };

const emptyDraft: Draft = {
  name: "", slug: "", role: "", bio: "", quote: "", image_url: "",
  email: "", phone: "", cta_label: "", cta_url: "", socials: {},
  is_featured: false, is_visible: true, sort_order: 0,
};

const SOCIAL_KEYS: (keyof TeamSocials)[] = ["instagram", "twitter", "linkedin", "facebook", "tiktok", "youtube", "behance", "dribbble", "website"];

export function TeamManager() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [settings, setSettings] = useState<TeamSettings | null>(null);
  const [editing, setEditing] = useState<Draft | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [view, setView] = useState<"grid" | "list">("list");
  const [uploading, setUploading] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const refresh = async () => {
    const [m, s] = await Promise.all([
      supabase.from("team_members").select("*").order("sort_order"),
      supabase.from("team_settings").select("*").limit(1).maybeSingle(),
    ]);
    setMembers((m.data ?? []) as unknown as TeamMember[]);
    setSettings((s.data as unknown as TeamSettings) ?? null);
  };

  useEffect(() => { refresh(); }, []);

  const roles = useMemo(() => {
    const set = new Set(members.map((m) => m.role).filter(Boolean));
    return ["all", ...Array.from(set)];
  }, [members]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return members.filter((m) => {
      if (roleFilter !== "all" && m.role !== roleFilter) return false;
      if (!q) return true;
      return m.name.toLowerCase().includes(q) || m.role.toLowerCase().includes(q);
    });
  }, [members, search, roleFilter]);

  const uploadImage = async (file: File) => {
    if (!file.type.startsWith("image/")) return toast.error("Please choose an image.");
    if (file.size > 5 * 1024 * 1024) return toast.error("Image must be under 5MB.");
    setUploading(true);
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `team/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("product-images").upload(path, file, { contentType: file.type });
    if (error) { setUploading(false); return toast.error(error.message); }
    const { data: pub } = supabase.storage.from("product-images").getPublicUrl(path);
    setEditing((cur) => (cur ? { ...cur, image_url: pub.publicUrl } : cur));
    setUploading(false);
    toast.success("Image uploaded");
  };

  const save = async () => {
    if (!editing) return;
    if (!editing.name.trim() || !editing.role.trim()) return toast.error("Name and role are required.");
    const slug = (editing.slug?.trim() || slugify(editing.name));
    const payload = { ...editing, slug, sort_order: editing.sort_order ?? members.length };
    if (editing.is_featured) {
      await supabase.from("team_members").update({ is_featured: false }).neq("id", editing.id ?? "00000000-0000-0000-0000-000000000000");
    }
    const { error } = editing.id
      ? await supabase.from("team_members").update(payload).eq("id", editing.id)
      : await supabase.from("team_members").insert(payload);
    if (error) return toast.error(error.message);
    toast.success("Saved");
    setEditing(null);
    refresh();
  };

  const del = async (id: string) => {
    if (!confirm("Delete this member?")) return;
    const { error } = await supabase.from("team_members").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    refresh();
  };

  const duplicate = async (m: TeamMember) => {
    const copy = { ...m, name: `${m.name} (Copy)`, slug: slugify(`${m.name}-copy-${Date.now()}`), is_featured: false };
    const { id: _id, created_at: _c, updated_at: _u, ...payload } = copy;
    const { error } = await supabase.from("team_members").insert(payload);
    if (error) return toast.error(error.message);
    toast.success("Duplicated");
    refresh();
  };

  const toggleVisible = async (m: TeamMember) => {
    await supabase.from("team_members").update({ is_visible: !m.is_visible }).eq("id", m.id);
    refresh();
  };

  const setFeatured = async (m: TeamMember) => {
    await supabase.from("team_members").update({ is_featured: false }).neq("id", m.id);
    await supabase.from("team_members").update({ is_featured: !m.is_featured }).eq("id", m.id);
    refresh();
  };

  const onDragEnd = async (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIdx = members.findIndex((m) => m.id === active.id);
    const newIdx = members.findIndex((m) => m.id === over.id);
    const next = arrayMove(members, oldIdx, newIdx);
    setMembers(next);
    await Promise.all(next.map((m, i) => supabase.from("team_members").update({ sort_order: i }).eq("id", m.id)));
  };

  const saveSettings = async (patch: Partial<TeamSettings>) => {
    if (!settings) return;
    const { error } = await supabase.from("team_settings").update(patch).eq("id", settings.id);
    if (error) return toast.error(error.message);
    setSettings({ ...settings, ...patch });
    toast.success("Settings updated");
  };

  return (
    <div className="mt-8">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h2 className="font-display text-3xl">Team management</h2>
          <p className="text-muted-foreground mt-2 text-xs">
            <Link to="/team" className="link-underline">View public page →</Link>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setShowSettings(true)} className="inline-flex items-center gap-2 border border-border px-4 py-2 text-xs uppercase tracking-luxe hover:bg-secondary transition-colors">
            <SettingsIcon className="w-4 h-4" /> Settings
          </button>
          <button onClick={() => setEditing({ ...emptyDraft })} className="inline-flex items-center gap-2 bg-noir text-cream px-5 py-2.5 text-xs uppercase tracking-luxe btn-glow">
            <Plus className="w-4 h-4" /> Add member
          </button>
        </div>
      </div>

      <div className="mt-8 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text" placeholder="Search members…" value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-3 py-2 border border-border bg-background text-sm focus:outline-none focus:border-accent"
          />
        </div>
        <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="border border-border bg-background px-3 py-2 text-sm">
          {roles.map((r) => <option key={r} value={r}>{r === "all" ? "All roles" : r}</option>)}
        </select>
        <div className="flex border border-border">
          <button onClick={() => setView("list")} className={`p-2 ${view === "list" ? "bg-noir text-cream" : ""}`} aria-label="List view"><ListIcon className="w-4 h-4" /></button>
          <button onClick={() => setView("grid")} className={`p-2 ${view === "grid" ? "bg-noir text-cream" : ""}`} aria-label="Grid view"><LayoutGrid className="w-4 h-4" /></button>
        </div>
      </div>

      <div className="mt-8">
        {members.length === 0 ? (
          <div className="border border-dashed border-border p-16 text-center">
            <h3 className="font-display text-2xl">No team members yet</h3>
            <p className="text-muted-foreground mt-2 text-sm">Add your first member to get started.</p>
            <button onClick={() => setEditing({ ...emptyDraft })} className="mt-6 inline-flex items-center gap-2 bg-noir text-cream px-5 py-2.5 text-xs uppercase tracking-luxe">
              <Plus className="w-4 h-4" /> Add member
            </button>
          </div>
        ) : view === "list" ? (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext items={filtered.map((m) => m.id)} strategy={verticalListSortingStrategy}>
              <div className="border border-border divide-y divide-border">
                {filtered.map((m) => (
                  <SortableRow
                    key={m.id} member={m}
                    onEdit={() => setEditing(m)}
                    onDelete={() => del(m.id)}
                    onDuplicate={() => duplicate(m)}
                    onToggleVisible={() => toggleVisible(m)}
                    onFeature={() => setFeatured(m)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((m) => (
              <div key={m.id} className="group relative border border-border overflow-hidden">
                <div className="aspect-[3/4] bg-muted">
                  {m.image_url ? <img loading="lazy" decoding="async" src={m.image_url} alt={m.name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center font-display text-5xl text-muted-foreground">{m.name.charAt(0)}</div>}
                </div>
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-[10px] uppercase tracking-luxe text-accent">{m.role}</div>
                      <h3 className="font-display text-lg leading-tight mt-1">{m.name}</h3>
                    </div>
                    {m.is_featured && <Star className="w-4 h-4 text-accent fill-accent" />}
                  </div>
                  <div className="mt-4 flex items-center gap-2">
                    <button onClick={() => setEditing(m)} className="p-2 border border-border hover:bg-secondary" aria-label="Edit"><Pencil className="w-3.5 h-3.5" /></button>
                    <button onClick={() => duplicate(m)} className="p-2 border border-border hover:bg-secondary" aria-label="Duplicate"><Copy className="w-3.5 h-3.5" /></button>
                    <button onClick={() => toggleVisible(m)} className="p-2 border border-border hover:bg-secondary" aria-label="Toggle">{m.is_visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}</button>
                    <button onClick={() => setFeatured(m)} className="p-2 border border-border hover:bg-secondary" aria-label="Feature"><Star className={`w-3.5 h-3.5 ${m.is_featured ? "fill-accent text-accent" : ""}`} /></button>
                    <button onClick={() => del(m.id)} className="p-2 border border-border hover:bg-destructive hover:text-destructive-foreground ml-auto" aria-label="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <AnimatePresence>
        {editing && (
          <MemberDrawer
            draft={editing} uploading={uploading}
            onChange={setEditing} onClose={() => setEditing(null)}
            onSave={save} onUpload={uploadImage}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showSettings && settings && (
          <SettingsDrawer settings={settings} onClose={() => setShowSettings(false)} onSave={saveSettings} />
        )}
      </AnimatePresence>
    </div>
  );
}

function SortableRow({
  member, onEdit, onDelete, onDuplicate, onToggleVisible, onFeature,
}: {
  member: TeamMember;
  onEdit: () => void; onDelete: () => void; onDuplicate: () => void; onToggleVisible: () => void; onFeature: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: member.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };
  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-4 p-4 bg-background">
      <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-1 text-muted-foreground" aria-label="Drag"><GripVertical className="w-4 h-4" /></button>
      <div className="w-14 h-14 bg-muted shrink-0 overflow-hidden">
        {member.image_url ? <img loading="lazy" decoding="async" src={member.image_url} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center font-display text-xl text-muted-foreground">{member.name.charAt(0)}</div>}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="font-display text-lg truncate">{member.name}</h3>
          {member.is_featured && <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-luxe text-accent"><Star className="w-3 h-3 fill-accent" /> Featured</span>}
          {!member.is_visible && <span className="text-[10px] uppercase tracking-luxe text-muted-foreground">Hidden</span>}
        </div>
        <div className="text-xs uppercase tracking-luxe text-muted-foreground mt-1">{member.role}</div>
      </div>
      <div className="flex items-center gap-1">
        <button onClick={onFeature} title="Featured" className="p-2 hover:bg-secondary"><Star className={`w-4 h-4 ${member.is_featured ? "fill-accent text-accent" : ""}`} /></button>
        <button onClick={onToggleVisible} title="Toggle visibility" className="p-2 hover:bg-secondary">{member.is_visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}</button>
        <button onClick={onDuplicate} title="Duplicate" className="p-2 hover:bg-secondary"><Copy className="w-4 h-4" /></button>
        <button onClick={onEdit} title="Edit" className="p-2 hover:bg-secondary"><Pencil className="w-4 h-4" /></button>
        <button onClick={onDelete} title="Delete" className="p-2 hover:bg-destructive hover:text-destructive-foreground"><Trash2 className="w-4 h-4" /></button>
      </div>
    </div>
  );
}

function MemberDrawer({
  draft, uploading, onChange, onClose, onSave, onUpload,
}: {
  draft: Draft; uploading: boolean;
  onChange: (d: Draft) => void; onClose: () => void;
  onSave: () => void; onUpload: (f: File) => void;
}) {
  const update = <K extends keyof Draft>(key: K, value: Draft[K]) => onChange({ ...draft, [key]: value });
  const updateSocial = (key: keyof TeamSocials, value: string) => onChange({ ...draft, socials: { ...draft.socials, [key]: value } });

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 z-50 bg-noir/40 backdrop-blur-sm" />
      <motion.div
        initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
        transition={{ type: "tween", duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="fixed inset-y-0 right-0 z-50 w-full max-w-xl bg-background border-l border-border overflow-y-auto"
      >
        <div className="sticky top-0 bg-background border-b border-border p-6 flex items-center justify-between z-10">
          <h2 className="font-display text-2xl">{draft.id ? "Edit member" : "New member"}</h2>
          <button onClick={onClose} aria-label="Close" className="p-2 hover:bg-secondary"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-6 space-y-5">
          <div>
            <label className="text-[10px] uppercase tracking-luxe text-muted-foreground">Profile image</label>
            <div className="mt-2 flex items-center gap-4">
              <div className="w-24 h-24 bg-muted overflow-hidden">
                {draft.image_url ? <img loading="lazy" decoding="async" src={draft.image_url} className="w-full h-full object-cover" alt="" /> : <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">No image</div>}
              </div>
              <label className="inline-flex items-center gap-2 border border-border px-4 py-2 text-xs uppercase tracking-luxe cursor-pointer hover:bg-secondary">
                <Upload className="w-4 h-4" /> {uploading ? "Uploading…" : "Upload"}
                <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && onUpload(e.target.files[0])} />
              </label>
            </div>
            <input type="url" value={draft.image_url ?? ""} onChange={(e) => update("image_url", e.target.value)} placeholder="…or paste image URL" className="mt-2 w-full border border-border bg-background px-3 py-2 text-sm" />
          </div>

          <Field label="Full name *"><input value={draft.name} onChange={(e) => update("name", e.target.value)} className="w-full border border-border bg-background px-3 py-2 text-sm" /></Field>
          <Field label="Slug (auto if blank)"><input value={draft.slug ?? ""} onChange={(e) => update("slug", e.target.value)} placeholder={slugify(draft.name || "")} className="w-full border border-border bg-background px-3 py-2 text-sm" /></Field>
          <Field label="Role / Position *"><input value={draft.role} onChange={(e) => update("role", e.target.value)} placeholder="e.g. Creative Director" className="w-full border border-border bg-background px-3 py-2 text-sm" /></Field>
          <Field label="Bio"><textarea value={draft.bio ?? ""} onChange={(e) => update("bio", e.target.value)} rows={4} className="w-full border border-border bg-background px-3 py-2 text-sm" /></Field>
          <Field label="Signature quote"><textarea value={draft.quote ?? ""} onChange={(e) => update("quote", e.target.value)} rows={2} className="w-full border border-border bg-background px-3 py-2 text-sm" /></Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Email"><input type="email" value={draft.email ?? ""} onChange={(e) => update("email", e.target.value)} className="w-full border border-border bg-background px-3 py-2 text-sm" /></Field>
            <Field label="Phone"><input type="tel" value={draft.phone ?? ""} onChange={(e) => update("phone", e.target.value)} className="w-full border border-border bg-background px-3 py-2 text-sm" /></Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="CTA label"><input value={draft.cta_label ?? ""} onChange={(e) => update("cta_label", e.target.value)} placeholder="e.g. Book a session" className="w-full border border-border bg-background px-3 py-2 text-sm" /></Field>
            <Field label="CTA URL"><input type="url" value={draft.cta_url ?? ""} onChange={(e) => update("cta_url", e.target.value)} className="w-full border border-border bg-background px-3 py-2 text-sm" /></Field>
          </div>

          <div>
            <label className="text-[10px] uppercase tracking-luxe text-muted-foreground">Social links</label>
            <div className="mt-2 grid grid-cols-1 gap-2">
              {SOCIAL_KEYS.map((key) => (
                <div key={key} className="flex items-center gap-2">
                  <span className="w-24 text-xs uppercase tracking-luxe text-muted-foreground capitalize">{key}</span>
                  <input
                    type="url" value={draft.socials?.[key] ?? ""}
                    onChange={(e) => updateSocial(key, e.target.value)}
                    placeholder={`https://${key}.com/…`}
                    className="flex-1 border border-border bg-background px-3 py-2 text-sm"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-6 pt-4 border-t border-border">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={draft.is_visible} onChange={(e) => update("is_visible", e.target.checked)} /> Visible
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={draft.is_featured} onChange={(e) => update("is_featured", e.target.checked)} /> Featured (founder)
            </label>
          </div>
        </div>
        <div className="sticky bottom-0 bg-background border-t border-border p-6 flex justify-end gap-3">
          <button onClick={onClose} className="px-5 py-2.5 text-xs uppercase tracking-luxe border border-border">Cancel</button>
          <button onClick={onSave} className="px-5 py-2.5 text-xs uppercase tracking-luxe bg-noir text-cream hover:bg-noir/90">Save member</button>
        </div>
      </motion.div>
    </>
  );
}

function SettingsDrawer({ settings, onClose, onSave }: { settings: TeamSettings; onClose: () => void; onSave: (p: Partial<TeamSettings>) => void }) {
  const [draft, setDraft] = useState<TeamSettings>(settings);
  const update = <K extends keyof TeamSettings>(k: K, v: TeamSettings[K]) => setDraft({ ...draft, [k]: v });
  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 z-50 bg-noir/40 backdrop-blur-sm" />
      <motion.div
        initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
        transition={{ type: "tween", duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-background border-l border-border overflow-y-auto"
      >
        <div className="sticky top-0 bg-background border-b border-border p-6 flex items-center justify-between z-10">
          <h2 className="font-display text-2xl">Section settings</h2>
          <button onClick={onClose} aria-label="Close" className="p-2 hover:bg-secondary"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-6 space-y-5">
          <Field label="Eyebrow"><input value={draft.eyebrow ?? ""} onChange={(e) => update("eyebrow", e.target.value)} className="w-full border border-border bg-background px-3 py-2 text-sm" /></Field>
          <Field label="Title"><input value={draft.title} onChange={(e) => update("title", e.target.value)} className="w-full border border-border bg-background px-3 py-2 text-sm" /></Field>
          <Field label="Subtitle"><textarea rows={3} value={draft.subtitle ?? ""} onChange={(e) => update("subtitle", e.target.value)} className="w-full border border-border bg-background px-3 py-2 text-sm" /></Field>

          <Field label="Layout">
            <select value={draft.layout} onChange={(e) => update("layout", e.target.value as TeamLayout)} className="w-full border border-border bg-background px-3 py-2 text-sm">
              <option value="grid">Luxury Grid</option>
              <option value="asymmetrical">Editorial Asymmetrical</option>
              <option value="slider">Horizontal Premium Slider</option>
              <option value="masonry">Masonry Fashion</option>
              <option value="featured">Featured Founder</option>
            </select>
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Columns"><input type="number" min={2} max={5} value={draft.columns} onChange={(e) => update("columns", Number(e.target.value))} className="w-full border border-border bg-background px-3 py-2 text-sm" /></Field>
            <Field label="Card radius (px)"><input type="number" min={0} max={32} value={draft.card_radius} onChange={(e) => update("card_radius", Number(e.target.value))} className="w-full border border-border bg-background px-3 py-2 text-sm" /></Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Card spacing (px)"><input type="number" min={0} max={64} value={draft.card_spacing} onChange={(e) => update("card_spacing", Number(e.target.value))} className="w-full border border-border bg-background px-3 py-2 text-sm" /></Field>
            <Field label="Hover effect">
              <select value={draft.hover_effect} onChange={(e) => update("hover_effect", e.target.value as TeamSettings["hover_effect"])} className="w-full border border-border bg-background px-3 py-2 text-sm">
                <option value="zoom">Zoom</option>
                <option value="fade">Fade</option>
                <option value="lift">Lift</option>
                <option value="glow">Glow</option>
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Background color"><input type="text" value={draft.background_color ?? ""} onChange={(e) => update("background_color", e.target.value)} placeholder="#f6f3ec" className="w-full border border-border bg-background px-3 py-2 text-sm" /></Field>
            <Field label="Overlay opacity"><input type="number" step={0.05} min={0} max={1} value={draft.overlay_opacity} onChange={(e) => update("overlay_opacity", Number(e.target.value))} className="w-full border border-border bg-background px-3 py-2 text-sm" /></Field>
          </div>
          <Field label="Background image URL"><input type="url" value={draft.background_image ?? ""} onChange={(e) => update("background_image", e.target.value)} className="w-full border border-border bg-background px-3 py-2 text-sm" /></Field>

          <div className="space-y-3 pt-4 border-t border-border">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={draft.animations_enabled} onChange={(e) => update("animations_enabled", e.target.checked)} /> Enable animations
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={draft.dark_mode} onChange={(e) => update("dark_mode", e.target.checked)} /> Dark mode
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={draft.show_featured_section} onChange={(e) => update("show_featured_section", e.target.checked)} /> Show featured section
            </label>
          </div>
        </div>
        <div className="sticky bottom-0 bg-background border-t border-border p-6 flex justify-end gap-3">
          <button onClick={onClose} className="px-5 py-2.5 text-xs uppercase tracking-luxe border border-border">Cancel</button>
          <button onClick={() => { onSave(draft); onClose(); }} className="px-5 py-2.5 text-xs uppercase tracking-luxe bg-noir text-cream hover:bg-noir/90">Save settings</button>
        </div>
      </motion.div>
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-[10px] uppercase tracking-luxe text-muted-foreground block mb-2">{label}</label>
      {children}
    </div>
  );
}
