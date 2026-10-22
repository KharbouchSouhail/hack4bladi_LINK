import { Link } from "react-router-dom";
import { SearchX } from "lucide-react";
import { buttonClasses } from "../components/Button.jsx";
import Card from "../components/ui/Card.jsx";
import { EmptyState } from "../components/ui/states.jsx";

export default function NotFoundPage({ home }) {
  return (
    <Card>
      <EmptyState icon={SearchX} title="This page doesn't exist" action={<Link to={home} className={buttonClasses("solid", "", "sm")}>Back to dashboard</Link>}>
        The link may be out of date, or the page belongs to another area of Link.
      </EmptyState>
    </Card>
  );
}
