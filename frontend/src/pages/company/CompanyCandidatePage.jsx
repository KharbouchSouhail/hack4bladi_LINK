import { Link, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import ApplicationReview from "../../components/editors/ApplicationReview.jsx";
import { QueryBoundary } from "../../components/ui/states.jsx";
import { useQuery } from "../../hooks/useQuery.js";
import * as companyApi from "../../services/companyApi.js";

// Shared by companies and admins; `api` is the role's service module, which enforces access itself.
export default function CompanyCandidatePage({ backTo = "/company/candidates", backLabel = "Candidate pipeline", api = companyApi }) {
  const { appId } = useParams();
  const query = useQuery(() => api.getApplication(appId), [appId]);

  return (
    <div>
      <Link to={backTo} className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-gray-600 hover:text-gray-900">
        <ArrowLeft aria-hidden="true" size={16} /> {backLabel}
      </Link>
      <QueryBoundary query={query} rows={8}>
        {(detail) => <ApplicationReview detail={detail} api={api} />}
      </QueryBoundary>
    </div>
  );
}
