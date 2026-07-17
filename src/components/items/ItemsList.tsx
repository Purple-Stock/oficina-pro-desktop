import { Edit, MapPin, Trash2 } from "lucide-react";
import { useState } from "react";
import { DeleteConfirmModal } from "@/components/DeleteConfirmModal";
import { QRCodeDisplay } from "@/components/QRCodeDisplay";
import { formatPrice } from "@/lib/formatPrice";
import type { Language } from "@/lib/i18n";
import type { ItemDto } from "@/services/types";

type ItemsListLabels = {
  qrCode: string;
  item: string;
  sku: string;
  type: string;
  typeFallback: string;
  stock: string;
  price: string;
  unnamedItem: string;
  deleteConfirm: string;
  actions: string;
  edit: string;
  delete: string;
  cancel: string;
  noCode: string;
};

interface ItemsListProps {
  items: ItemDto[];
  language: Language;
  labels: ItemsListLabels;
  onEdit: (item: ItemDto) => void;
  onDelete: (itemId: number) => void;
}

export function ItemsList({
  items,
  language,
  labels,
  onEdit,
  onDelete,
}: ItemsListProps) {
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<ItemDto | null>(null);

  const handleDeleteClick = (item: ItemDto) => {
    setItemToDelete(item);
    setDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!itemToDelete) return;
    setDeletingId(itemToDelete.id);
    await onDelete(itemToDelete.id);
    setDeletingId(null);
    setDeleteModalOpen(false);
    setItemToDelete(null);
  };

  if (items.length === 0) return null;

  return (
    <>
    <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg overflow-hidden border border-gray-100">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-200">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                {labels.qrCode}
              </th>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                {labels.item}
              </th>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                {labels.sku}
              </th>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                {labels.type}
              </th>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                {labels.stock}
              </th>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                {labels.price}
              </th>
              <th className="px-6 py-4 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">
                {labels.actions}
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {items.map((item) => (
              <tr
                key={item.id}
                className="hover:bg-blue-50/50 transition-colors"
              >
                <td className="px-6 py-5 whitespace-nowrap">
                  <QRCodeDisplay
                    value={item.barcode ?? ""}
                    size={64}
                    emptyLabel={labels.noCode}
                  />
                </td>
                <td className="px-6 py-5">
                  <div>
                    <span className="text-sm font-bold text-gray-900 mb-1 block">
                      {item.name || labels.unnamedItem}
                    </span>
                    {item.barcode && (
                      <div className="text-xs text-gray-500 font-mono bg-gray-50 px-2 py-1 rounded inline-block">
                        {item.barcode}
                      </div>
                    )}
                    {item.locationName && (
                      <div className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {item.locationName}
                      </div>
                    )}
                  </div>
                </td>
                <td className="px-6 py-5 whitespace-nowrap">
                  <span className="text-sm font-medium text-gray-900">
                    {item.sku || (
                      <span className="text-gray-400 italic">-</span>
                    )}
                  </span>
                </td>
                <td className="px-6 py-5 whitespace-nowrap">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                    {item.itemType || labels.typeFallback}
                  </span>
                </td>
                <td className="px-6 py-5 whitespace-nowrap">
                  <span
                    className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-bold ${
                      item.currentStock === 0
                        ? "bg-red-100 text-red-700"
                        : item.currentStock < 10
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-green-100 text-green-700"
                    }`}
                  >
                    {item.currentStock}
                  </span>
                </td>
                <td className="px-6 py-5 whitespace-nowrap">
                  <span className="text-sm font-bold text-gray-900">
                    {formatPrice(item.price, language)}
                  </span>
                </td>
                <td className="px-6 py-5 whitespace-nowrap text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      type="button"
                      onClick={() => onEdit(item)}
                      className="p-2.5 text-gray-500 hover:text-[#1D4ED8] hover:bg-blue-50 rounded-lg transition-all"
                      aria-label={labels.edit}
                      title={labels.edit}
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteClick(item)}
                      disabled={deletingId === item.id}
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
        setItemToDelete(null);
      }}
      onConfirm={() => void handleDeleteConfirm()}
      title={labels.delete}
      description={labels.deleteConfirm}
      itemName={
        itemToDelete ? itemToDelete.name || labels.unnamedItem : undefined
      }
      isDeleting={deletingId !== null}
      confirmLabel={labels.delete}
    />
    </>
  );
}
