export type RequisitionStatus = 'pending' | 'approved' | 'approved_wait' | 'completed' | 'rejected';
export type RequisitionType = 'standard' | 'deviation';
export type Department = 'Education' | 'IT' | 'Marketing and PR' | 'Technical' | 'HR' | 'Finance' | 'CEO';
export type AppRole = 'preparer' | 'hod' | 'finance_manager' | 'technical_director' | 'accountant' | 'ceo' | 'admin' | 'hr';
export type Currency = 'USD' | 'ZWG' | 'GBP' | 'EUR';

export interface Supplier {
  id: string;
  name: string;
  icazNumber: string;
  contactInfo: string;
  status: 'active' | 'inactive';
}

export interface TaxClearance {
  id: string;
  supplierId: string;
  fileName: string;
  validFrom: string;
  validTo: string;
  quarter: string;
  year: string;
}

export interface Requisition {
  id: string;
  title: string;
  department: Department;
  amount: number;
  currency: Currency;
  usdConvertible?: number;
  chosenSupplier: Supplier;
  otherSupplier1?: Supplier;
  otherSupplier2?: Supplier;
  chosenRequisition: string;
  type: RequisitionType;
  deviationReason?: string;
  budgetCode: string;
  description: string;
  status: RequisitionStatus;
  submittedBy: string;
  submittedDate: string;
  taxClearanceAttached?: TaxClearance;
  documents: string[];
  approverComments?: string;
  approvedBy?: string;
  approvedDate?: string;
  paymentProof?: string;
  paymentDate?: string;
}

export interface Payment {
  id: string;
  requisitionId: string;
  popFileName: string;
  paymentDate: string;
  processedBy: string;
  status: 'paid' | 'pending';
}
