import { AlertTriangle, X } from "lucide-react";
import { getPostureTip } from "../ai/riskScoring";

interface AlertBannerProps {
  reasons: string[];
  onDismiss: () => void;
}

export function AlertBanner({ reasons, onDismiss }: AlertBannerProps) {
  return (
    <div className="alert-banner" role="alert">
      <AlertTriangle size={22} aria-hidden="true" />
      <div>
        <strong>Поправьте посадку</strong>
        <p>
          {reasons.length > 0 ? `Обнаружено: ${reasons.join(", ")}. ` : ""}
          {getPostureTip(reasons)}
        </p>
      </div>
      <button className="icon-button ghost" type="button" aria-label="Скрыть предупреждение" onClick={onDismiss}>
        <X size={18} />
      </button>
    </div>
  );
}
