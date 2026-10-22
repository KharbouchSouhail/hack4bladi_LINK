import { Link, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import ApplicationReview from "../../components/editors/ApplicationReview.jsx";
import { QueryBoundary } from "../../components/ui/states.jsx";
import { useQuery } from "../../hooks/useQuery.js";
import { getApplication, updateApplicationStatus } from "../../services/companyApi.js";

export default function CompanyCandidatePage({ backTo = "/company/candidates", backLabel = "Candidate pipeline", fetcher = getApplication, updater = updateApplicationStatus }) {
  const { appId } = useParams();
  const query = useQuery(() => fetcher(appId), [appId]);

  return (
    <div>
      <Link to={backTo} className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-gray-600 hover:text-gray-900">
        <ArrowLeft aria-hidden="true" size={16} /> {backLabel}
      </Link>
      <QueryBoundary query={query} rows={8}>
        {(detail) => <ApplicationReview detail={detail} onStatusChange={updater} />}
      </QueryBoundary>
    </div>
  );
}
