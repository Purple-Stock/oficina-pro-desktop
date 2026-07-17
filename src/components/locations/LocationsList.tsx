import { Building2, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { DeleteConfirmModal } from "@/components/DeleteConfirmModal";
import { useTranslation } from "@/lib/i18n";

type LocationsListLabels = {
  name: string;
  description: string;
  noDescription: string;
  actions: string;
  edit: string;
  delete: string;
  deleteConfirmPrefix: string;
};

export type LocationRow = {
  id: number;
  name: string;
  description: string | null;
};

interface LocationsListProps {
  locations: LocationRow[];
  labels: LocationsListLabels;
  onEdit: (location: LocationRow) => void;
  onDelete: (locationId: number) => void;
}

export function LocationsList({
  locations,
  labels,
  onEdit,
  onDelete,
}: LocationsListProps) {
  const { t } = useTranslation();
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [locationToDelete, setLocationToDelete] = useState<LocationRow | null>(
    null
  );

  const handleDeleteClick = (location: LocationRow) => {
    setLocationToDelete(location);
    setDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!locationToDelete) return;
    setDeletingId(locationToDelete.id);
    await onDelete(locationToDelete.id);
    setDeletingId(null);
    setDeleteModalOpen(false);
    setLocationToDelete(null);
  };

  if (locations.length === 0) return null;

  return (
    <>
    <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg overflow-hidden border border-gray-100">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-200">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                {labels.name}
              </th>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                {labels.description}
              </th>
              <th className="px-6 py-4 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">
                {labels.actions}
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {locations.map((location) => (
              <tr
                key={location.id}
                className="hover:bg-blue-50/50 transition-colors"
              >
                <td className="px-6 py-5">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl flex items-center justify-center shadow-md flex-shrink-0">
                      <Building2 className="h-6 w-6 text-blue-600" />
                    </div>
                    <span className="text-sm font-bold text-gray-900">
                      {location.name}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-5">
                  <span className="text-sm text-gray-600">
                    {location.description || (
                      <span className="text-gray-400 italic">
                        {labels.noDescription}
                      </span>
                    )}
                  </span>
                </td>
                <td className="px-6 py-5 whitespace-nowrap text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      type="button"
                      onClick={() => onEdit(location)}
                      className="p-2.5 text-gray-500 hover:text-[#1D4ED8] hover:bg-blue-50 rounded-lg transition-all"
                      aria-label={labels.edit}
                      title={labels.edit}
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteClick(location)}
                      disabled={deletingId === location.id}
                      className="p-2.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all disabled:opacity-50"
                      aria-label={labels.delete}
                      title={labels.delete}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>

    <DeleteConfirmModal
      isOpen={deleteModalOpen}
      onClose={() => {
        setDeleteModalOpen(false);
        setLocationToDelete(null);
      }}
      onConfirm={() => void handleDeleteConfirm()}
      title={t.common.delete}
      description={
        locationToDelete
          ? `${labels.deleteConfirmPrefix} "${locationToDelete.name}"?`
          : undefined
      }
      isDeleting={deletingId !== null}
      confirmLabel={labels.delete}
    />
    </>
  );
}
