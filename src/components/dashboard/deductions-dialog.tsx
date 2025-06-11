import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogTrigger } from "../ui/dialog";
import { JobOrderData, MaterialItem, Expenses } from "../../lib/types";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Separator } from "../ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import {
  TrendingDown,
  DollarSign,
  PieChart,
  Calculator,
  Package,
  Receipt,
  ArrowDown,
  TrendingUp,
  Banknote,
  Eye,
  BarChart3,
} from "lucide-react";
import { cn } from "../../lib/utils";

interface DeductionsDialogProps {
  orders: JobOrderData[];
  expenses: Expenses[];
  dateRange?: { from: Date; to: Date };
}

interface GrossToNetBreakdownItem {
  jobOrderNo: string;
  grandTotal: number;
  netSales: number;
  difference: number;
  description: string;
}

interface DeductionItem {
  jobOrderNo: string;
  description: string;
  amount: number;
  type: string;
  date: string | Date;
}

// Separate dialog for pricing structure breakdown
const PricingBreakdownDialog = ({
  breakdown,
  totalDifference,
  open,
  onOpenChange,
}: {
  breakdown: GrossToNetBreakdownItem[];
  totalDifference: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      minimumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-[900px]">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">
              Pricing Structure Analysis
            </h2>
            <Badge variant="outline" className="flex items-center gap-1.5">
              <Calculator className="size-3" />
              {formatCurrency(totalDifference)} Total Difference
            </Badge>
          </div>

          <div className="rounded-lg border">
            <div className="max-h-[500px] overflow-y-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-gray-50">
                  <TableRow>
                    <TableHead className="w-[120px]">Job Order #</TableHead>
                    <TableHead className="text-right">Grand Total</TableHead>
                    <TableHead className="text-right">Net Sales</TableHead>
                    <TableHead className="text-right">Difference</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {breakdown.map((item, index) => (
                    <TableRow
                      key={index}
                      className={cn(
                        index % 2 === 0 ? "bg-white" : "bg-gray-50/30"
                      )}
                    >
                      <TableCell className="font-medium">
                        {item.jobOrderNo}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(item.grandTotal)}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(item.netSales)}
                      </TableCell>
                      <TableCell className="text-right font-mono font-semibold">
                        <span
                          className={cn(
                            item.difference > 0
                              ? "text-red-600"
                              : "text-green-600"
                          )}
                        >
                          {item.difference > 0 ? "-" : "+"}
                          {formatCurrency(Math.abs(item.difference))}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-muted/50 border-t-2 font-semibold">
                    <TableCell className="font-bold">TOTAL</TableCell>
                    <TableCell></TableCell>
                    <TableCell></TableCell>
                    <TableCell className="text-right font-bold text-blue-600">
                      -{formatCurrency(totalDifference)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Separate dialog for detailed deductions
const DetailedDeductionsDialog = ({
  deductions,
  materialsCount,
  expensesCount,
  open,
  onOpenChange,
}: {
  deductions: DeductionItem[];
  materialsCount: number;
  expensesCount: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      minimumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-[1000px]">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Detailed Deductions</h2>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="flex items-center gap-1.5">
                <Package className="size-3" />
                {materialsCount} Materials
              </Badge>
              <Badge variant="outline" className="flex items-center gap-1.5">
                <Receipt className="size-3" />
                {expensesCount} Expenses
              </Badge>
            </div>
          </div>

          <div className="rounded-lg border">
            <div className="max-h-[500px] overflow-y-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-gray-50">
                  <TableRow>
                    <TableHead className="w-[100px]">Job Order #</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="w-[120px]">Type</TableHead>
                    <TableHead className="w-[100px]">Date</TableHead>
                    <TableHead className="w-[120px] text-right">
                      Amount
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {deductions.map((deduction, index) => (
                    <TableRow
                      key={index}
                      className={cn(
                        index % 2 === 0 ? "bg-white" : "bg-gray-50/30"
                      )}
                    >
                      <TableCell className="font-medium">
                        {deduction.jobOrderNo}
                      </TableCell>
                      <TableCell
                        className="max-w-[200px] truncate"
                        title={deduction.description}
                      >
                        {deduction.description}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-xs",
                            deduction.type === "Used Material"
                              ? "bg-blue-50 text-blue-700 border-blue-200"
                              : "bg-orange-50 text-orange-700 border-orange-200"
                          )}
                        >
                          {deduction.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(deduction.date).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right font-mono font-semibold">
                        {formatCurrency(deduction.amount)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default function DeductionsDialog({
  orders,
  expenses,
  dateRange,
}: DeductionsDialogProps) {
  const [pricingBreakdownOpen, setPricingBreakdownOpen] = useState(false);
  const [detailedDeductionsOpen, setDetailedDeductionsOpen] = useState(false);

  // Filter expenses based on date range
  const filteredExpenses = useMemo(() => {
    if (!dateRange?.from || !dateRange?.to) return expenses;

    return expenses.filter((expense) => {
      const expenseDate = new Date(expense.created_at);
      return expenseDate >= dateRange.from && expenseDate <= dateRange.to;
    });
  }, [expenses, dateRange]);

  // Calculate financial breakdown using the EXACT same logic as calculateMetrics
  const financialBreakdown = useMemo(() => {
    const completedOrders = orders.filter(
      (order) =>
        order.status === "Completed" ||
        order.status.toLowerCase() === "pull out"
    );

    const ordersWithDownpayment = orders.filter(
      (order) => order.downpayment && order.downpayment > 0
    );

    // Calculate total gross (grand_total - used_materials + downpayments)
    const totalRevenueIncludingDownpayments =
      completedOrders.reduce((sum, order) => {
        let adjustedGrandTotal = order.grand_total ?? 0;

        if (order.materials) {
          const usedMaterialsTotal = order.materials.reduce(
            (total, material) => {
              if (material.used) {
                return total + material.quantity * material.unit_price;
              }
              return total;
            },
            0
          );

          adjustedGrandTotal -= usedMaterialsTotal;
        }

        return sum + adjustedGrandTotal;
      }, 0) +
      ordersWithDownpayment.reduce(
        (sum, order) => sum + (order.downpayment ?? 0),
        0
      );

    // Calculate total net (net_sales - used_materials + downpayments)
    const totalNetIncludingDownpayments =
      completedOrders.reduce((sum, order) => {
        let adjustedNetSales =
          typeof order.net_sales === "number" ? order.net_sales : 0;

        if (order.materials) {
          const usedMaterialsTotal = order.materials.reduce(
            (total, material) => {
              if (material.used) {
                return total + material.quantity * material.unit_price;
              }
              return total;
            },
            0
          );

          adjustedNetSales -= usedMaterialsTotal;
        }

        return sum + adjustedNetSales;
      }, 0) +
      ordersWithDownpayment.reduce(
        (sum, order) => sum + (order.downpayment ?? 0),
        0
      );

    // Calculate total expenses
    const totalExpenses = filteredExpenses.reduce(
      (sum, expense) => sum + (expense.amount ?? 0),
      0
    );

    // Calculate total profit
    const totalProfit = totalNetIncludingDownpayments - totalExpenses;

    // Calculate component breakdowns for display
    const rawGrandTotalSum = completedOrders.reduce(
      (sum, order) => sum + (order.grand_total ?? 0),
      0
    );
    const rawNetSalesSum = completedOrders.reduce(
      (sum, order) =>
        sum + (typeof order.net_sales === "number" ? order.net_sales : 0),
      0
    );
    const totalUsedMaterials = completedOrders.reduce((sum, order) => {
      if (!order.materials) return sum;
      return (
        sum +
        order.materials.reduce((total, material) => {
          if (material.used) {
            return total + material.quantity * material.unit_price;
          }
          return total;
        }, 0)
      );
    }, 0);
    const totalDownpayments = ordersWithDownpayment.reduce(
      (sum, order) => sum + (order.downpayment ?? 0),
      0
    );

    // The ACTUAL difference between gross and net is simply: rawGrandTotalSum - rawNetSalesSum
    const actualGrossNetDifference = rawGrandTotalSum - rawNetSalesSum;

    return {
      totalGross: totalRevenueIncludingDownpayments,
      totalNet: totalNetIncludingDownpayments,
      totalProfit: totalProfit,
      totalExpenses: totalExpenses,
      rawGrandTotalSum,
      rawNetSalesSum,
      totalUsedMaterials,
      totalDownpayments,
      actualGrossNetDifference,
    };
  }, [orders, filteredExpenses]);

  // Get detailed breakdown of gross-to-net difference
  const grossToNetBreakdown = useMemo(() => {
    const completedOrders = orders.filter(
      (order) =>
        order.status === "Completed" ||
        order.status.toLowerCase() === "pull out"
    );

    return completedOrders
      .map((order): GrossToNetBreakdownItem | null => {
        const grandTotal = order.grand_total ?? 0;
        const netSales =
          typeof order.net_sales === "number" ? order.net_sales : 0;
        const difference = grandTotal - netSales;

        if (difference !== 0) {
          return {
            jobOrderNo: order.order_no,
            grandTotal,
            netSales,
            difference,
            description:
              difference > 0
                ? "Grand Total > Net Sales"
                : "Net Sales > Grand Total",
          };
        }
        return null;
      })
      .filter((item): item is GrossToNetBreakdownItem => item !== null)
      .sort((a, b) => Math.abs(b.difference) - Math.abs(a.difference));
  }, [orders]);

  // Get detailed materials deductions from job orders
  const materialsDeductions = useMemo(() => {
    return orders
      .filter((order) => order.materials && order.materials.length > 0)
      .flatMap((order) => {
        return (order.materials || [])
          .filter((material: MaterialItem) => material.used)
          .map((material: MaterialItem) => ({
            jobOrderNo: order.order_no,
            description: material.material_description,
            amount: material.quantity * material.unit_price,
            type: "Used Material",
            date: order.completed_at || order.created_at,
          }));
      });
  }, [orders]);

  // Get expense deductions
  const expensesDeductions = useMemo(() => {
    return filteredExpenses.map((expense) => ({
      jobOrderNo: "-",
      description: expense.bill_name || "Expense",
      amount: expense.amount || 0,
      type: "Expense",
      date: expense.created_at,
    }));
  }, [filteredExpenses]);

  // Combine all deductions
  const allDeductions = useMemo(() => {
    return [...materialsDeductions, ...expensesDeductions].sort(
      (a, b) => b.amount - a.amount
    );
  }, [materialsDeductions, expensesDeductions]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      minimumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <>
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="gap-1.5">
            <BarChart3 className="size-4" />
            Financial Analysis
          </Button>
        </DialogTrigger>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[1000px]">
          <div className="space-y-6">
            {/* Header */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>Dashboard</span>
                  <span>/</span>
                  <span>Financial Reports</span>
                  <span>/</span>
                  <span className="font-medium text-foreground">
                    Revenue Flow Analysis
                  </span>
                </div>
                <Badge
                  variant="outline"
                  className="flex items-center gap-1.5 border-blue-200 bg-blue-50 text-blue-700"
                >
                  <Calculator className="size-3" />
                  Financial Analytics
                </Badge>
              </div>

              <div className="space-y-4">
                <h1 className="text-2xl font-bold leading-tight pr-8">
                  Financial Flow Analysis
                </h1>

                <div className="flex flex-wrap items-center gap-2">
                  <Badge
                    variant="outline"
                    className="flex items-center gap-1.5"
                  >
                    <DollarSign className="size-3" />
                    {formatCurrency(financialBreakdown.totalGross)} Gross
                  </Badge>
                  <Badge
                    variant="outline"
                    className="flex items-center gap-1.5"
                  >
                    <TrendingDown className="size-3" />-
                    {formatCurrency(
                      financialBreakdown.actualGrossNetDifference
                    )}{" "}
                    Deductions
                  </Badge>
                  <Badge
                    variant="outline"
                    className="flex items-center gap-1.5 bg-green-50 text-green-700 border-green-200"
                  >
                    <TrendingUp className="size-3" />
                    {formatCurrency(financialBreakdown.totalProfit)} Final
                    Profit
                  </Badge>
                </div>
              </div>
            </div>

            <Separator />

            {/* Two Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column - Revenue Flow */}
              <div className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Banknote className="size-4 text-muted-foreground" />
                    <h3 className="text-lg font-semibold">Revenue Flow</h3>
                  </div>

                  <div className="space-y-4">
                    {/* Step 1: Gross Revenue */}
                    <div className="space-y-3">
                      <div className="flex justify-between items-center pb-2 border-b">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center">
                            <span className="text-xs font-bold text-blue-700">
                              1
                            </span>
                          </div>
                          <span className="font-semibold">Gross Revenue</span>
                        </div>
                        <span className="text-xl font-bold">
                          {formatCurrency(financialBreakdown.totalGross)}
                        </span>
                      </div>

                      <div className="ml-8 space-y-1 text-sm text-muted-foreground">
                        <div className="flex justify-between">
                          <span>Raw Grand Total</span>
                          <span>
                            {formatCurrency(
                              financialBreakdown.rawGrandTotalSum
                            )}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Less: Used Materials</span>
                          <span>
                            -
                            {formatCurrency(
                              financialBreakdown.totalUsedMaterials
                            )}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Add: Downpayments</span>
                          <span>
                            +
                            {formatCurrency(
                              financialBreakdown.totalDownpayments
                            )}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Arrow */}
                    <div className="flex justify-center">
                      <ArrowDown className="size-4 text-muted-foreground" />
                    </div>

                    {/* Step 2: Net Revenue */}
                    <div className="space-y-3">
                      <div className="flex justify-between items-center pb-2 border-b">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center">
                            <span className="text-xs font-bold text-green-700">
                              2
                            </span>
                          </div>
                          <span className="font-semibold">Net Revenue</span>
                        </div>
                        <span className="text-xl font-bold">
                          {formatCurrency(financialBreakdown.totalNet)}
                        </span>
                      </div>

                      <div className="ml-8 space-y-1 text-sm text-muted-foreground">
                        <div className="flex justify-between">
                          <span>Raw Net Sales</span>
                          <span>
                            {formatCurrency(financialBreakdown.rawNetSalesSum)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Less: Used Materials</span>
                          <span>
                            -
                            {formatCurrency(
                              financialBreakdown.totalUsedMaterials
                            )}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Add: Downpayments</span>
                          <span>
                            +
                            {formatCurrency(
                              financialBreakdown.totalDownpayments
                            )}
                          </span>
                        </div>
                        <div className="flex justify-between font-medium pt-1 border-t">
                          <span>Pricing Difference:</span>
                          <span>
                            -
                            {formatCurrency(
                              financialBreakdown.actualGrossNetDifference
                            )}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Arrow */}
                    <div className="flex justify-center">
                      <ArrowDown className="size-4 text-muted-foreground" />
                    </div>

                    {/* Step 3: Final Profit */}
                    <div className="space-y-3">
                      <div className="flex justify-between items-center pb-2 border-b">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center">
                            <span className="text-xs font-bold text-purple-700">
                              3
                            </span>
                          </div>
                          <span className="font-semibold">Final Profit</span>
                        </div>
                        <span className="text-2xl font-bold">
                          {formatCurrency(financialBreakdown.totalProfit)}
                        </span>
                      </div>

                      <div className="ml-8 space-y-1 text-sm text-muted-foreground">
                        <div className="flex justify-between">
                          <span>Net Revenue</span>
                          <span>
                            {formatCurrency(financialBreakdown.totalNet)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Less: Business Expenses</span>
                          <span>
                            -{formatCurrency(financialBreakdown.totalExpenses)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column - Analysis & Actions */}
              <div className="space-y-6">
                {/* Financial Summary */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <PieChart className="size-4 text-muted-foreground" />
                    <h3 className="font-semibold">Financial Summary</h3>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <div className="font-medium">Gross Revenue</div>
                        <div className="text-sm text-muted-foreground">
                          Before deductions
                        </div>
                      </div>
                      <div className="text-lg font-bold">
                        {formatCurrency(financialBreakdown.totalGross)}
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <div className="font-medium">Net Revenue</div>
                        <div className="text-sm text-muted-foreground">
                          After pricing adjustments
                        </div>
                      </div>
                      <div className="text-lg font-bold">
                        {formatCurrency(financialBreakdown.totalNet)}
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-3 border rounded-lg bg-green-50/30">
                      <div>
                        <div className="font-medium">Final Profit</div>
                        <div className="text-sm text-muted-foreground">
                          After all expenses
                        </div>
                      </div>
                      <div className="text-xl font-bold text-green-700">
                        {formatCurrency(financialBreakdown.totalProfit)}
                      </div>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Deductions Summary */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Receipt className="size-4 text-muted-foreground" />
                    <h3 className="font-semibold">Deductions Summary</h3>
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between items-center p-3 border rounded-lg">
                      <div>
                        <div className="font-medium">Pricing Structure</div>
                        <div className="text-sm text-muted-foreground">
                          Grand Total vs Net Sales
                        </div>
                      </div>
                      <div className="font-bold">
                        {formatCurrency(
                          financialBreakdown.actualGrossNetDifference
                        )}
                      </div>
                    </div>

                    <div className="flex justify-between items-center p-3 border rounded-lg">
                      <div>
                        <div className="font-medium">Used Materials</div>
                        <div className="text-sm text-muted-foreground">
                          {materialsDeductions.length} items
                        </div>
                      </div>
                      <div className="font-bold">
                        {formatCurrency(financialBreakdown.totalUsedMaterials)}
                      </div>
                    </div>

                    <div className="flex justify-between items-center p-3 border rounded-lg">
                      <div>
                        <div className="font-medium">Business Expenses</div>
                        <div className="text-sm text-muted-foreground">
                          {expensesDeductions.length} items
                        </div>
                      </div>
                      <div className="font-bold">
                        {formatCurrency(financialBreakdown.totalExpenses)}
                      </div>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Analysis Actions */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Eye className="size-4 text-muted-foreground" />
                    <h3 className="font-semibold">Detailed Analysis</h3>
                  </div>

                  <div className="space-y-3">
                    {grossToNetBreakdown.length > 0 && (
                      <Button
                        variant="outline"
                        onClick={() => setPricingBreakdownOpen(true)}
                        className="w-full justify-between"
                      >
                        <span>View Pricing Structure Breakdown</span>
                        <Badge variant="secondary">
                          {grossToNetBreakdown.length} orders
                        </Badge>
                      </Button>
                    )}

                    {allDeductions.length > 0 && (
                      <Button
                        variant="outline"
                        onClick={() => setDetailedDeductionsOpen(true)}
                        className="w-full justify-between"
                      >
                        <span>View Detailed Deductions</span>
                        <Badge variant="secondary">
                          {allDeductions.length} items
                        </Badge>
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Separate dialogs for detailed views */}
      <PricingBreakdownDialog
        breakdown={grossToNetBreakdown}
        totalDifference={financialBreakdown.actualGrossNetDifference}
        open={pricingBreakdownOpen}
        onOpenChange={setPricingBreakdownOpen}
      />

      <DetailedDeductionsDialog
        deductions={allDeductions}
        materialsCount={materialsDeductions.length}
        expensesCount={expensesDeductions.length}
        open={detailedDeductionsOpen}
        onOpenChange={setDetailedDeductionsOpen}
      />
    </>
  );
}
