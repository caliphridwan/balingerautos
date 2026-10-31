"use client";

import {
  deleteCategory,
  deleteFaq,
  deleteTeamMember,
  deleteTestimonial,
  saveCategory,
  saveFaq,
  saveTeamMember,
  saveTestimonial,
} from "@/app/admin/actions/content";
import { ActionButton } from "@/components/admin/action-button";
import { AdminForm, aInput, aTextarea, AField } from "@/components/admin/admin-form";
import { ContentImageField } from "@/components/admin/content-image-field";

function Published({ name = "isPublished", checked, label = "Published" }: { name?: string; checked: boolean; label?: string }) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <input type="checkbox" name={name} defaultChecked={checked} className="h-4 w-4 accent-obsidian" />
      {label}
    </label>
  );
}

// ── Testimonials ───────────────────────────────────────────────────

export interface TestimonialRow { id: string; customerName: string; location: string | null; vehicleLabel: string | null; quote: string; rating: number | null; position: number; isPublished: boolean }

export function TestimonialEditor({ item }: { item?: TestimonialRow }) {
  return (
    <div className="flex flex-col gap-3">
      <AdminForm action={(fd) => saveTestimonial(item?.id ?? null, fd)} submitLabel={item ? "Save" : "Add testimonial"} resetOnSuccess={!item}>
        {(e) => (
          <>
            <div className="grid gap-4 sm:grid-cols-3">
              <AField label="Customer name" error={e.customerName}><input name="customerName" defaultValue={item?.customerName} className={aInput} /></AField>
              <AField label="Location" error={e.location}><input name="location" defaultValue={item?.location ?? ""} className={aInput} /></AField>
              <AField label="Vehicle purchased" error={e.vehicleLabel}><input name="vehicleLabel" defaultValue={item?.vehicleLabel ?? ""} className={aInput} /></AField>
            </div>
            <AField label="Quote" error={e.quote} hint="Only publish genuine testimonials you have permission to use."><textarea name="quote" rows={3} defaultValue={item?.quote} className={aTextarea} /></AField>
            <div className="grid items-end gap-4 sm:grid-cols-3">
              <AField label="Rating (1–5, optional)" error={e.rating}><input name="rating" inputMode="numeric" defaultValue={item?.rating ?? ""} className={aInput} /></AField>
              <AField label="Order" error={e.position}><input name="position" inputMode="numeric" defaultValue={item?.position ?? 0} className={aInput} /></AField>
              <Published checked={item?.isPublished ?? false} />
            </div>
          </>
        )}
      </AdminForm>
      {item ? <div><ActionButton action={() => deleteTestimonial(item.id)} variant="danger" confirm="Confirm delete">Delete</ActionButton></div> : null}
    </div>
  );
}

// ── FAQs ───────────────────────────────────────────────────────────

export interface FaqRow { id: string; question: string; answer: string; category: string | null; position: number; isPublished: boolean }

export function FaqEditor({ item }: { item?: FaqRow }) {
  return (
    <div className="flex flex-col gap-3">
      <AdminForm action={(fd) => saveFaq(item?.id ?? null, fd)} submitLabel={item ? "Save" : "Add FAQ"} resetOnSuccess={!item}>
        {(e) => (
          <>
            <AField label="Question" error={e.question}><input name="question" defaultValue={item?.question} className={aInput} /></AField>
            <AField label="Answer" error={e.answer}><textarea name="answer" rows={3} defaultValue={item?.answer} className={aTextarea} /></AField>
            <div className="grid items-end gap-4 sm:grid-cols-3">
              <AField label="Category (optional)" error={e.category}><input name="category" defaultValue={item?.category ?? ""} className={aInput} /></AField>
              <AField label="Order" error={e.position}><input name="position" inputMode="numeric" defaultValue={item?.position ?? 0} className={aInput} /></AField>
              <Published checked={item?.isPublished ?? true} />
            </div>
          </>
        )}
      </AdminForm>
      {item ? <div><ActionButton action={() => deleteFaq(item.id)} variant="danger" confirm="Confirm delete">Delete</ActionButton></div> : null}
    </div>
  );
}

// ── Team ───────────────────────────────────────────────────────────

export interface TeamRow { id: string; name: string; role: string; bio: string | null; photoUrl: string | null; position: number; isPublished: boolean }

export function TeamEditor({ item, uploadsEnabled }: { item?: TeamRow; uploadsEnabled: boolean }) {
  return (
    <div className="flex flex-col gap-3">
      <AdminForm action={(fd) => saveTeamMember(item?.id ?? null, fd)} submitLabel={item ? "Save" : "Add team member"} resetOnSuccess={!item}>
        {(e) => (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <AField label="Name" error={e.name}><input name="name" defaultValue={item?.name} className={aInput} /></AField>
              <AField label="Role" error={e.role}><input name="role" defaultValue={item?.role} className={aInput} /></AField>
            </div>
            <AField label="Short bio" error={e.bio}><textarea name="bio" rows={3} defaultValue={item?.bio ?? ""} className={aTextarea} /></AField>
            <ContentImageField name="photoUrl" label="Photo (portrait)" initialUrl={item?.photoUrl ?? null} uploadsEnabled={uploadsEnabled} error={e.photoUrl} />
            <div className="grid items-end gap-4 sm:grid-cols-2">
              <AField label="Order" error={e.position}><input name="position" inputMode="numeric" defaultValue={item?.position ?? 0} className={aInput} /></AField>
              <Published checked={item?.isPublished ?? true} />
            </div>
          </>
        )}
      </AdminForm>
      {item ? <div><ActionButton action={() => deleteTeamMember(item.id)} variant="danger" confirm="Confirm remove">Remove</ActionButton></div> : null}
    </div>
  );
}

// ── Categories ─────────────────────────────────────────────────────

export interface CategoryRow { id: string; name: string; slug: string; description: string | null; position: number; isVisible: boolean; count: number }

export function CategoryEditor({ item }: { item?: CategoryRow }) {
  return (
    <div className="flex flex-col gap-3">
      <AdminForm action={(fd) => saveCategory(item?.id ?? null, fd)} submitLabel={item ? "Save" : "Add category"} resetOnSuccess={!item}>
        {(e) => (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <AField label="Name" error={e.name}><input name="name" defaultValue={item?.name} className={aInput} /></AField>
              <AField label="URL slug" error={e.slug} hint={item ? `/inventory?category=${item.slug}` : "Generated from the name if empty."}><input name="slug" defaultValue={item?.slug ?? ""} className={aInput} /></AField>
            </div>
            <AField label="Description" error={e.description}><input name="description" defaultValue={item?.description ?? ""} className={aInput} /></AField>
            <div className="grid items-end gap-4 sm:grid-cols-2">
              <AField label="Order" error={e.position}><input name="position" inputMode="numeric" defaultValue={item?.position ?? 0} className={aInput} /></AField>
              <Published name="isVisible" checked={item?.isVisible ?? true} label="Show on homepage" />
            </div>
          </>
        )}
      </AdminForm>
      {item ? (
        <div className="flex items-center gap-3">
          <ActionButton action={() => deleteCategory(item.id)} variant="danger" confirm="Confirm delete">Delete</ActionButton>
          <span className="text-xs text-ink-muted">{item.count} vehicles in this category</span>
        </div>
      ) : null}
    </div>
  );
}
