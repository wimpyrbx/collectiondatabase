import React from 'react';
import { FiEye, FiEdit2, FiTrash2 } from 'react-icons/fi';
import { tableStyles } from './styles';

interface TableActionsProps {
  onView?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  size?: number;
}

export const TableActions: React.FC<TableActionsProps> = ({
  onView,
  onEdit,
  onDelete,
  size = 14
}) => {
  return (
    <div className="flex items-center justify-end gap-0.5">
      {onView && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onView();
          }}
          className={`${tableStyles.actionButton.base} ${tableStyles.actionButton.view} flex items-center justify-center`}
          title="View details"
        >
          <FiEye size={size} className="stroke-2" />
        </button>
      )}
      
      {onEdit && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
          className={`${tableStyles.actionButton.base} ${tableStyles.actionButton.edit} flex items-center justify-center`}
          title="Edit"
        >
          <FiEdit2 size={size} className="stroke-2" />
        </button>
      )}
      
      {onDelete && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className={`${tableStyles.actionButton.base} ${tableStyles.actionButton.delete} flex items-center justify-center`}
          title="Delete"
        >
          <FiTrash2 size={size} className="stroke-2" />
        </button>
      )}
    </div>
  );
}; 