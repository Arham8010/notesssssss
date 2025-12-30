
export interface TextileRecord {
  id: string;
  doriDetail: string;
  warpinDetail: string;
  bheemDetail: string;
  deliveryDetail: string;
  entryDate: string; // ISO string for the date part (e.g., "2024-10-25")
  createdBy: string; // User unique identifier
  createdAt: number;
  updatedAt: number;
}

export interface InventoryStats {
  totalRecords: number;
  recentActivity: number;
}
