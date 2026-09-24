"use client";

import Link from "next/link";
import { useId, useState, useTransition } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { reorderContentAction } from "@/app/actions/admin-content";

export type SortableRow = {
  id: string;
  title: string;
  meta: string;
  flags: string[];
  href: string;
};

type Status = { kind: "idle" } | { kind: "saved" } | { kind: "error"; message: string };

/**
 * Drag and drop (mouse, touch, keyboard) plus explicit up/down buttons, so reordering
 * works for everyone. Each change is saved right away.
 */
export function SortableList({ resourceKey, rows }: { resourceKey: string; rows: SortableRow[] }) {
  const [items, setItems] = useState(rows);
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [pending, startTransition] = useTransition();
  // A stable id keeps dnd-kit's generated aria attributes identical on server and client.
  const dndId = useId();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function save(next: SortableRow[]) {
    const previous = items;
    setItems(next);
    setStatus({ kind: "idle" });
    startTransition(async () => {
      const result = await reorderContentAction(
        resourceKey,
        next.map((r) => r.id),
      );
      if (result.ok) setStatus({ kind: "saved" });
      else {
        setItems(previous);
        setStatus({
          kind: "error",
          message: result.error ?? "Ordinea nu a putut fi salvată. Încearcă din nou.",
        });
      }
    });
  }

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const from = items.findIndex((r) => r.id === active.id);
    const to = items.findIndex((r) => r.id === over.id);
    if (from < 0 || to < 0) return;
    save(arrayMove(items, from, to));
  }

  function move(index: number, delta: number) {
    const target = index + delta;
    if (target < 0 || target >= items.length) return;
    save(arrayMove(items, index, target));
  }

  return (
    <div>
      <p className="mb-2 min-h-6 text-note" role="status" aria-live="polite">
        {pending ? "Se salvează ordinea…" : status.kind === "saved" ? "Ordinea e salvată." : ""}
      </p>
      {status.kind === "error" ? (
        <p role="alert" className="admin-warning mb-3">
          {status.message}
        </p>
      ) : null}
      <DndContext
        id={dndId}
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={onDragEnd}
        accessibility={{
          screenReaderInstructions: {
            draggable:
              "Apasă spațiu ca să ridici elementul, săgețile ca să-l muți, spațiu ca să-l lași, Escape ca să renunți.",
          },
          announcements: {
            onDragStart: ({ active }) => `Ai ridicat ${labelOf(items, active.id)}.`,
            onDragOver: ({ active, over }) =>
              over
                ? `${labelOf(items, active.id)} este deasupra lui ${labelOf(items, over.id)}.`
                : "",
            onDragEnd: ({ active, over }) =>
              over ? `${labelOf(items, active.id)} a fost mutat.` : "Mutare anulată.",
            onDragCancel: () => "Mutare anulată.",
          },
        }}
      >
        <SortableContext items={items.map((r) => r.id)} strategy={verticalListSortingStrategy}>
          <ol className="border-t border-linie">
            {items.map((row, index) => (
              <SortableItem
                key={row.id}
                row={row}
                index={index}
                count={items.length}
                onMove={move}
                disabled={pending}
              />
            ))}
          </ol>
        </SortableContext>
      </DndContext>
    </div>
  );
}

function labelOf(items: SortableRow[], id: string | number): string {
  return items.find((r) => r.id === id)?.title ?? "elementul";
}

function SortableItem(props: {
  row: SortableRow;
  index: number;
  count: number;
  onMove: (index: number, delta: number) => void;
  disabled: boolean;
}) {
  const { row, index, count, onMove, disabled } = props;
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: row.id });
  return (
    <li
      ref={setNodeRef}
      className="sortable-item"
      data-dragging={isDragging ? "true" : undefined}
      style={{ transform: CSS.Transform.toString(transform), transition }}
    >
      <button
        type="button"
        ref={setActivatorNodeRef}
        className="drag-handle"
        aria-label={`Trage ca să muți: ${row.title}`}
        {...attributes}
        {...listeners}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" fill="currentColor">
          <circle cx="5" cy="3" r="1.4" />
          <circle cx="11" cy="3" r="1.4" />
          <circle cx="5" cy="8" r="1.4" />
          <circle cx="11" cy="8" r="1.4" />
          <circle cx="5" cy="13" r="1.4" />
          <circle cx="11" cy="13" r="1.4" />
        </svg>
      </button>
      <Link href={row.href} className="min-w-0 no-underline">
        <span className="admin-row-title block truncate">{row.title}</span>
        <span className="admin-row-meta block truncate">{row.meta}</span>
        {row.flags.length > 0 ? (
          <span className="mt-1 flex flex-wrap gap-1">
            {row.flags.map((flag) => (
              <span key={flag} className="status">
                {flag}
              </span>
            ))}
          </span>
        ) : null}
      </Link>
      <span className="move-buttons">
        <button
          type="button"
          onClick={() => onMove(index, -1)}
          disabled={disabled || index === 0}
          aria-label={`Mută mai sus: ${row.title}`}
        >
          ↑
        </button>
        <button
          type="button"
          onClick={() => onMove(index, 1)}
          disabled={disabled || index === count - 1}
          aria-label={`Mută mai jos: ${row.title}`}
        >
          ↓
        </button>
      </span>
    </li>
  );
}
