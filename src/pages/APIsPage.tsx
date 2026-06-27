import { APIManager } from "../components/APIManager";
import type { ApiPanel } from "../types/order";

interface APIsPageProps {
  apis: ApiPanel[];
  onAddApi: (api: { name: string; url: string; key: string }) => void;
  onEditApi: (id: string, api: { name: string; url: string; key: string }) => void;
  onDeleteApi: (id: string) => void;
  onToggleStatus: (id: string) => void;
  onFetchServices: (id: string) => void;
  onCheckBalance: (id: string) => void;
  fetchingApiId: string | null;
  checkingBalanceApiId: string | null;
}

export function APIsPage({ apis, onAddApi, onEditApi, onDeleteApi, onToggleStatus, onFetchServices, onCheckBalance, fetchingApiId, checkingBalanceApiId }: APIsPageProps) {
  return (
    <div className="mx-auto max-w-7xl px-6 py-7">
      <APIManager
        apis={apis}
        onAddApi={onAddApi}
        onEditApi={onEditApi}
        onDeleteApi={onDeleteApi}
        onToggleStatus={onToggleStatus}
        onFetchServices={onFetchServices}
        onCheckBalance={onCheckBalance}
        fetchingApiId={fetchingApiId}
        checkingBalanceApiId={checkingBalanceApiId}
      />
    </div>
  );
}
