import { ActionButton } from "@/components/ui/action-button";
import type { Report } from "@/lib/report-types";

interface OfficerActionsProps {
  report: Report;
  isClaimed: boolean;
  onClaim: () => void;
  onPlan: () => void;
  onVerify: () => void;
}

export function OfficerActions({ report, isClaimed, onClaim, onPlan, onVerify }: OfficerActionsProps) {
  if (report.status === "Resolved") {
    return (
      <ActionButton variant="green" disabled>
        Selesai
      </ActionButton>
    );
  }

  if (report.status === "Rejected" || report.isDuplicate) {
    return (
      <ActionButton variant="red" disabled>
        Unavailable
      </ActionButton>
    );
  }

  if (!isClaimed) {
    return <ActionButton onClick={onClaim}>Ambil</ActionButton>;
  }

  if (!report.actionPlan) {
    return <ActionButton onClick={onPlan}>Plan</ActionButton>;
  }

  return (
    <>
      <ActionButton variant="neutral" onClick={onPlan}>
        Ubah Plan
      </ActionButton>
      <ActionButton variant="green" onClick={onVerify}>
        Selesai
      </ActionButton>
    </>
  );
}
