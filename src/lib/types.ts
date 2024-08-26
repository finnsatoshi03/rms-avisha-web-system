/* eslint-disable @typescript-eslint/no-explicit-any */
import { LucideIcon } from "lucide-react";

export type Order = {
  orderNo: string;
  clientName: string;
  date: string;
  machineType: string;
  status: string;
  technicianName: string;
  price: number;
  [key: string]: string | number;
};
export type Data = {
  data: Order[];
};

export type Filter = {
  key: string;
  operator: "is" | "is_not";
  value: string;
};

export type Sort = {
  key: string;
  direction: "asc" | "desc";
};

export interface SortableFields {
  [key: string]: string;
  order_no: string;
  "clients.name": string;
  created_at: string;
  machine_type: string;
  status: string;
  "users.fullname": string;
  grand_total: string;
}

export type Metrics = {
  totalRevenue: number;
  totalGross: number;
  totalNet: number;
  totalExpenses: number | undefined;
  totalProfit: number;
  numberOfClients: number;
  numberOfSales: number;
  averageOrderValue: number;
  metricsThisMonth: any;
  metricsLastMonth: any;
  pcpRevenue: number;
  pcpProfit: number;
  pcpGross: number;
  pcpNet: number;
  pcpExpenses: number;
  pcpSales: number;
  pcpClients: number;
  pcpAverageOrderValue: number;
  monthlyMetrics?: any;
};

export interface AggregatedData {
  monthName: string;
  price: number;
}

export interface OverviewData {
  header: string;
  value: number | string;
  prefix?: string;
  suffix?: string;
  pcp: string;
  icon: LucideIcon | null;
  monthlyMetrics?: any;
  weeklyMetrics?: any;
  nameKey?: string;
}
export interface MonthlyMetric {
  month: number;
  revenue: number;
  gross: number;
  net: number;
  expenses: number;
  profit: number;
  sales: number;
  clients: number;
  averageOrderValue: number;
}

export interface AggregatedMetrics {
  revenue: { [key: number]: { month: number; revenue: number } };
  gross: { [key: number]: { month: number; gross: number } };
  net: { [key: number]: { month: number; net: number } };
  expenses: { [key: number]: { month: number; expenses: number } };
  profit: { [key: number]: { month: number; profit: number } };
  sales: { [key: number]: { month: number; sales: number } };
  clients: { [key: number]: { month: number; clients: number } };
  averageOrderValue: {
    [key: number]: { month: number; averageOrderValue: number };
  };
}

export interface AccessoriesSectionProps {
  selectedAccessories: string[];
  handleAccessorySelection: (accessory: string) => void;
  handleSubOptionSelection: (
    accessory: string,
    subOption: string,
    value: string
  ) => void;
  selectedSubOptions: { [key: string]: any };
  selectedMachineType: string;
}

export interface AccessoryOptionsProps {
  accessory: string;
  handleSubOptionSelection: (
    accessory: string,
    subOption: string,
    value: string
  ) => void;
  selectedSubOptions: { [key: string]: any };
}

export interface StorageOptionsProps extends AccessoryOptionsProps {}

export interface RAMOptionsProps extends AccessoryOptionsProps {}

export interface GraphicsCardOptionsProps extends AccessoryOptionsProps {}

type Branch = {
  id: number;
  location: string;
};

export type Client = {
  contact_number: string;
  created_at: string;
  email: string;
  id: number;
  name: string;
  joborders?: Record<string, JobOrderData> | JobOrderData[];
};

export type MaterialItem = {
  id: number;
  material_description: string;
  quantity: number;
  total_amount: number;
  unit_price: number;
  material_id: number;
  used?: boolean;
};

export type User = {
  avatar: null | string;
  email: string;
  fullname: null | string;
  id: string;
  role: null | string;
};

export type JobOrderData = {
  accessories: null | string[];
  additional_comments: null | string;
  amount: null | number;
  branch_id: number;
  branches: Branch;
  brand_model: null | string;
  client_id: number;
  clients: Client;
  created_at: string;
  date_of_approval: null | string;
  date_released: null | string;
  discount: null | number;
  grand_total: null | number;
  id: number;
  labor_description: null | string;
  labor_total: null | number;
  machine_type: string;
  material_id: number;
  material_total: null | number;
  materials: MaterialItem[];
  order_no: string;
  status: string;
  order_received: string;
  problem_statement: null | string;
  rate: null | number;
  serial_number: null | string;
  sub_total: null | number;
  technician_id: string;
  warranty: null | string;
  users: User;
  is_copy: null | boolean;
  net_sales: null | number;
  adjustedGrandTotal: null | number;
  technical_report: null | string;
  [key: string]:
    | boolean
    | string
    | number
    | null
    | Date
    | string[]
    | Client
    | Branch
    | MaterialItem[]
    | User;
};

export type CreateMaterial = {
  used?: boolean | null;
  material: string;
  material_id: number;
  branch_id?: number;
  quantity: number;
  unitPrice: number;
};

export type CreateJobOrderData = {
  order_no?: string;
  accessories?: string[];
  additional_comments?: string;
  amount?: number;
  branch_id: number;
  brand_model: string;
  contact_number: string;
  date: string | Date;
  discount?: number;
  email?: string;
  materials_expense?: number;
  grand_total: number;
  net_sales?: number; // remove optional when data is reset
  labor_description: string;
  labor_total: number;
  machine_type: string;
  material_total: number;
  materials?: Partial<CreateMaterial>[];
  name: string;
  order_received?: null | string;
  problem_statement: string;
  rate: number;
  serial_number?: string;
  sub_total: number;
  technician_id?: null | string;
  status?: string;
  warranty?: string;
  is_copy?: boolean;
  technical_report?: string;
};

export type MaterialStocks = {
  id: number;
  created_at: string | Date;
  brand: string;
  price: number;
  stocks: number;
  material_name: string;
  last_stocks_added: string | Date;
  sku: string;
  category?: string;
  branches?: Branch;
  [key: string]: undefined | boolean | string | number | null | Date | Branch;
};

export type Expenses = {
  id: number;
  bill_name: string;
  amount: number;
  created_at: string | Date;
  [key: string]: string | number | Date;
};

export interface GrossAndNetData {
  month: string;
  gross: number;
  net: number;
}

export interface FinancialChartProps {
  month: string;
  profit: number;
}

export type TechnicianWithJobOrders = User & {
  joborders: JobOrderData[];
};
