import { useMemo, useState } from "react";
import { BookOpen } from "lucide-react";
import { LearningCard } from "../../components/candidate/shared.jsx";
import { LockedCard, UnlockBanner, UpgradeDialog } from "../../components/candidate/locked.jsx";
import Card, { PageHeader } from "../../components/ui/Card.jsx";
import { FilterSelect, SearchInput } from "../../components/ui/form.jsx";
import { EmptyState, QueryBoundary, UpgradeCard } from "../../components/ui/states.jsx";
import { DIFFICULTIES } from "../../domain/constants.js";
import { useQuery } from "../../hooks/useQuery.js";
import { plural } from "../../lib/format.js";
import { listCourses } from "../../services/candidateApi.js";

function CourseGrid({ data }) {
  const [search, setSearch] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [scope, setScope] = useState("relevant");
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  // Filters only narrow the courses the service returned; locked courses were never sent, so they can't be filtered in.
  const courses = useMemo(
    () =>
      data.courses.filter(
        (c) =>
          (scope === "all" || c.relevant) &&
          (!difficulty || c.difficulty === difficulty) &&
          `${c.title} ${c.skillName}`.toLowerCase().includes(search.trim().toLowerCase()),
      ),
    [data.courses, search, difficulty, scope],
  );

  return (
    <div className="space-y-5">
      {data.locked && data.lockedCount === 0 && (
        <Card>
          <UpgradeCard plan="max" compact title="Your starter courses are open — the rest open with Max">
            Max gives you every course, practice activity and progress tracking.
          </UpgradeCard>
        </Card>
      )}
      <div className="flex flex-wrap gap-2">
        <SearchInput label="Search courses" placeholder="Search courses or skills" value={search} onChange={(e) => setSearch(e.target.value)} className="w-full sm:w-64" />
        <FilterSelect label="Scope" value={scope} onChange={(e) => setScope(e.target.value)} options={[{ value: "relevant", label: "For my target role" }, { value: "all", label: "All courses" }]} />
        <FilterSelect label="Difficulty" value={difficulty} onChange={(e) => setDifficulty(e.target.value)} options={[{ value: "", label: "All levels" }, ...DIFFICULTIES.map((d) => ({ value: d, label: d }))]} />
      </div>
      {courses.length === 0 ? (
        <Card>
          <EmptyState icon={BookOpen} title={data.courses.length ? "No courses match these filters" : "No courses available yet"} />
        </Card>
      ) : (
        <div className="stagger grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {courses.map((c) => (
            <LearningCard key={c.id} course={c} />
          ))}
        </div>
      )}

      {data.lockedCount > 0 && (
        <section aria-label="Locked courses">
          <div className="stagger grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: data.lockedCount }, (_, i) => (
              <LockedCard
                key={i}
                title="Locked course"
                hint="Upgrade to unlock"
                label={`Locked course ${i + 1}. Upgrade to unlock.`}
                onClick={() => setUpgradeOpen(true)}
              />
            ))}
          </div>
          <UnlockBanner icon={BookOpen} action="Unlock all courses" onClick={() => setUpgradeOpen(true)}>
            <span className="font-semibold text-gray-900">Unlock all courses with an upgrade.</span> Your plan includes{" "}
            {plural(data.courses.length, "starter course")}; {plural(data.lockedCount, "more course")} {data.lockedCount === 1 ? "is" : "are"} available.
          </UnlockBanner>
        </section>
      )}

      <UpgradeDialog
        open={upgradeOpen}
        onClose={() => setUpgradeOpen(false)}
        title="Unlock all courses"
        description={`${plural(data.lockedCount, "more course")} ${data.lockedCount === 1 ? "is" : "are"} waiting for you.`}
        highlight="max"
        note="Pro lets you browse every course. Max opens all of them, with practice tests and progress tracking."
      />
    </div>
  );
}

export default function CoursesPage() {
  const query = useQuery(listCourses);
  return (
    <div>
      <PageHeader title="Courses" description="Curated lessons, each mapped to a specific competency." />
      <QueryBoundary query={query} rows={6}>
        {(data) => <CourseGrid data={data} />}
      </QueryBoundary>
    </div>
  );
}
