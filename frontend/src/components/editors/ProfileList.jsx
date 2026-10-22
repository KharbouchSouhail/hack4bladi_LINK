import { Archive, Pencil, Send, Trash2, Undo2 } from "lucide-react";
import { IMPORTANCE, LEVELS, PUBLISH_STATUSES } from "../../domain/constants.js";
import Button from "../Button.jsx";
import Badge, { StatusBadge } from "../ui/Badge.jsx";
import Card from "../ui/Card.jsx";

// Cards showing employer-defined profiles; used by companies and admins.
export default function ProfileList({ profiles, onEdit, onStatus, onDelete, showCompany = false }) {
  return (
    <div className="grid gap-5 xl:grid-cols-2">
      {profiles.map((p) => (
        <Card
          key={p.id}
          title={
            <span className="flex flex-wrap items-center gap-2">
              {p.title} <StatusBadge map={PUBLISH_STATUSES} value={p.status} />
            </span>
          }
          description={`${showCompany ? `${p.companyName} · ` : ""}Version ${p.version} · ${p.jobs} job listing${p.jobs === 1 ? "" : "s"}`}
          action={
            <>
              <Button variant="ghost" size="xs" onClick={() => onEdit(p)}>
                <Pencil aria-hidden="true" size={14} /> Edit
              </Button>
              {p.status === "published" ? (
                <Button variant="ghost" size="xs" onClick={() => onStatus(p, "archived")}>
                  <Archive aria-hidden="true" size={14} /> Archive
                </Button>
              ) : (
                <Button variant="secondary" size="xs" onClick={() => onStatus(p, "published")}>
                  {p.status === "archived" ? <Undo2 aria-hidden="true" size={14} /> : <Send aria-hidden="true" size={14} />}
                  {p.status === "archived" ? "Restore & publish" : "Publish"}
                </Button>
              )}
              {onDelete && (
                <Button variant="ghost" size="xs" aria-label={`Delete ${p.title}`} onClick={() => onDelete(p)}>
                  <Trash2 size={14} />
                </Button>
              )}
            </>
          }
          bodyClassName=""
        >
          <div className="px-5 py-4 text-[13px] text-gray-700">
            <p>{p.description}</p>
            <dl className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
              <div>
                <dt className="text-gray-500">Education</dt>
                <dd className="text-gray-800">{p.education || "—"}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Experience</dt>
                <dd className="text-gray-800">{p.experience || "—"}</dd>
              </div>
            </dl>
          </div>
          <div className="overflow-x-auto border-t border-gray-100">
            <table className="w-full min-w-[420px] text-left text-[13px]">
              <caption className="sr-only">Competencies for {p.title}</caption>
              <thead>
                <tr className="bg-gray-50/70 text-[11px] text-gray-500 uppercase">
                  <th scope="col" className="px-5 py-2 font-semibold">Competency</th>
                  <th scope="col" className="px-3 py-2 font-semibold">Importance</th>
                  <th scope="col" className="px-3 py-2 font-semibold">Level</th>
                  <th scope="col" className="px-5 py-2 text-right font-semibold">Weight</th>
                </tr>
              </thead>
              <tbody>
                {p.skills.map((s) => (
                  <tr key={s.skillId} className="border-t border-gray-100">
                    <td className="px-5 py-2 font-medium text-gray-900">{s.name}</td>
                    <td className="px-3 py-2"><StatusBadge map={IMPORTANCE} value={s.importance} /></td>
                    <td className="px-3 py-2 text-gray-700">{LEVELS[s.level]}</td>
                    <td className="px-5 py-2 text-right tabular-nums">
                      <Badge>{s.weight}%</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ))}
    </div>
  );
}
