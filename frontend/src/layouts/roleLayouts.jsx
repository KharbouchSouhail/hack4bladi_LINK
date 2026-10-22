import { Link } from "react-router-dom";
import {
  BarChart3,
  BookOpen,
  Briefcase,
  Building2,
  CalendarClock,
  ClipboardCheck,
  CreditCard,
  FileSearch,
  FileText,
  GraduationCap,
  Handshake,
  KanbanSquare,
  LayoutDashboard,
  Library,
  ListChecks,
  Route,
  Settings,
  Sparkles,
  Tags,
  Target,
  UserCog,
  Users,
} from "lucide-react";
import Badge from "../components/ui/Badge.jsx";
import { PLANS } from "../domain/permissions.js";
import { useQuery } from "../hooks/useQuery.js";
import { getMe } from "../services/candidateApi.js";
import DashboardLayout from "./DashboardLayout.jsx";

const CANDIDATE_NAV = [
  { items: [{ to: "/candidate/dashboard", label: "Overview", icon: LayoutDashboard }] },
  {
    label: "Readiness",
    items: [
      { to: "/candidate/assessments", label: "My Assessments", icon: FileSearch },
      { to: "/candidate/skill-gaps", label: "Skill Gaps", icon: Target },
    ],
  },
  {
    label: "Learning",
    items: [
      { to: "/candidate/learning", label: "Learning Paths", icon: Route },
      { to: "/candidate/courses", label: "Courses", icon: BookOpen },
      { to: "/candidate/tests", label: "Skill Tests", icon: ClipboardCheck },
    ],
  },
  {
    label: "Career",
    items: [
      { to: "/candidate/jobs", label: "Job Opportunities", icon: Briefcase },
      { to: "/candidate/applications", label: "My Applications", icon: FileText },
    ],
  },
  {
    label: "Account",
    items: [
      { to: "/candidate/subscription", label: "Subscription", icon: CreditCard },
      { to: "/candidate/settings", label: "Profile and Settings", icon: Settings },
    ],
  },
];

const COMPANY_NAV = [
  { items: [{ to: "/company/dashboard", label: "Overview", icon: LayoutDashboard }] },
  {
    label: "Hiring",
    items: [
      { to: "/company/job-profiles", label: "Job Profiles", icon: ListChecks },
      { to: "/company/jobs", label: "Job Listings", icon: Briefcase },
      { to: "/company/candidates", label: "Candidate Pipeline", icon: Users },
      { to: "/company/applications", label: "Applications", icon: KanbanSquare },
      { to: "/company/interviews", label: "Interviews", icon: CalendarClock },
      { to: "/company/analytics", label: "Analytics", icon: BarChart3 },
    ],
  },
  {
    label: "Company",
    items: [
      { to: "/company/profile", label: "Company Profile", icon: Building2 },
      { to: "/company/settings", label: "Settings", icon: Settings },
    ],
  },
];

const ADMIN_NAV = [
  { items: [{ to: "/admin/dashboard", label: "Overview", icon: LayoutDashboard }] },
  {
    label: "People",
    items: [
      { to: "/admin/companies", label: "Companies", icon: Building2 },
      { to: "/admin/candidates", label: "Candidates", icon: Users },
      { to: "/admin/subscriptions", label: "Subscriptions", icon: CreditCard },
    ],
  },
  {
    label: "Catalog",
    items: [
      { to: "/admin/job-profiles", label: "Job Profiles", icon: ListChecks },
      { to: "/admin/skills", label: "Skills", icon: Tags },
      { to: "/admin/courses", label: "Courses", icon: Library },
      { to: "/admin/assessments", label: "Assessments and Tests", icon: GraduationCap },
    ],
  },
  {
    label: "Recruitment",
    items: [
      { to: "/admin/jobs", label: "Job Listings", icon: Briefcase },
      { to: "/admin/applications", label: "Applications", icon: FileText },
      { to: "/admin/interviews", label: "Interviews", icon: CalendarClock },
      { to: "/admin/placements", label: "Placements", icon: Handshake },
    ],
  },
  { label: "System", items: [{ to: "/admin/settings", label: "Settings", icon: UserCog }] },
];

function PlanBadge() {
  const { data } = useQuery(getMe);
  if (!data) return null;
  return (
    <Link to="/candidate/subscription" aria-label={`Current plan: ${PLANS[data.plan].label}. Manage subscription`} className="rounded-[6px] focus-visible:outline-2 focus-visible:outline-accent-600">
      <Badge tone={{ free: "neutral", pro: "accent", max: "cyan" }[data.plan]} icon={data.plan === "free" ? undefined : Sparkles}>
        {PLANS[data.plan].label} plan
      </Badge>
    </Link>
  );
}

export function CandidateLayout() {
  return <DashboardLayout sections={CANDIDATE_NAV} roleLabel="Candidate" settingsPath="/candidate/settings" notificationsPath="/candidate/notifications" topbarExtra={<PlanBadge />} />;
}

export function CompanyLayout() {
  return <DashboardLayout sections={COMPANY_NAV} roleLabel="Company" settingsPath="/company/settings" notificationsPath="/company/notifications" />;
}

export function AdminLayout() {
  return <DashboardLayout sections={ADMIN_NAV} roleLabel="Admin" settingsPath="/admin/settings" notificationsPath="/admin/notifications" />;
}
