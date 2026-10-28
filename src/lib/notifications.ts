import { Product, Sale, Expense } from '../types';
import { formatCurrency } from './formatters';

export interface ActionAlert {
  id: string;
  type: 'MULTI_LOW_STOCK' | 'SINGLE_LOW_STOCK' | 'OUT_OF_STOCK' | 'CUSTOMER_DUE' | 'PROFIT_SQUEEZE';
  severity: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
  timestamp: string;
  items?: Array<{
    product: Product;
    deficit: number;
    recommendedOrder: number;
    estimatedCost: number;
  }>;
  totalEstimatedCost?: number;
  actionLabel?: string;
  secondaryActionLabel?: string;
}

export function generateProactiveAlerts(
  products: Product[],
  sales: Sale[],
  currencySymbol = '₹'
): ActionAlert[] {
  const alerts: ActionAlert[] = [];
  const now = new Date().toISOString();

  // 1. Check for Out-of-Stock and Low-Stock products
  const outOfStockProducts = products.filter(p => p.stock_quantity <= 0);
  const lowStockProducts = products.filter(p => p.stock_quantity > 0 && p.stock_quantity <= p.reorder_threshold);
  const allSubThresholdProducts = products.filter(p => p.stock_quantity <= p.reorder_threshold);

  // CRITICAL: Multiple products simultaneously below reorder threshold
  if (allSubThresholdProducts.length >= 2) {
    const items = allSubThresholdProducts.map(p => {
      // Recommend ordering enough to reach 3x threshold or at least 15 units
      const targetStock = Math.max(p.reorder_threshold * 3, 15);
      const recommendedOrder = Math.max(1, Math.round(targetStock - p.stock_quantity));
      const estimatedCost = recommendedOrder * p.purchase_cost;
      const deficit = Math.max(0, p.reorder_threshold - p.stock_quantity);

      return {
        product: p,
        deficit,
        recommendedOrder,
        estimatedCost,
      };
    });

    const totalEstimatedCost = items.reduce((sum, it) => sum + it.estimatedCost, 0);
    const outCount = outOfStockProducts.length;

    alerts.push({
      id: `alert-multi-stock-${allSubThresholdProducts.length}`,
      type: 'MULTI_LOW_STOCK',
      severity: outCount > 0 ? 'critical' : 'warning',
      title: `Stock Depletion Warning: ${allSubThresholdProducts.length} Products Below Reorder Level`,
      description: `${allSubThresholdProducts.length} items have simultaneously dropped below safety stock${
        outCount > 0 ? ` (${outCount} completely out of stock)` : ''
      }. Restocking is urgent to prevent missed sales. Estimated wholesaler budget: ${formatCurrency(totalEstimatedCost, currencySymbol)}.`,
      timestamp: now,
      items,
      totalEstimatedCost,
      actionLabel: 'Restock All Low Items',
      secondaryActionLabel: 'Send Supplier Order (WhatsApp)',
    });
  } else if (allSubThresholdProducts.length === 1) {
    const p = allSubThresholdProducts[0];
    const isOut = p.stock_quantity <= 0;
    const recommendedOrder = Math.max(10, p.reorder_threshold * 2);

    alerts.push({
      id: `alert-single-stock-${p.id}`,
      type: isOut ? 'OUT_OF_STOCK' : 'SINGLE_LOW_STOCK',
      severity: isOut ? 'critical' : 'warning',
      title: isOut ? `Out of Stock: ${p.name}` : `Low Stock: ${p.name}`,
      description: `${p.name} currently has ${p.stock_quantity} ${p.unit} remaining (Reorder threshold: ${p.reorder_threshold} ${p.unit}). Estimated restock cost: ${formatCurrency(recommendedOrder * p.purchase_cost, currencySymbol)}.`,
      timestamp: now,
      items: [
        {
          product: p,
          deficit: p.reorder_threshold - p.stock_quantity,
          recommendedOrder,
          estimatedCost: recommendedOrder * p.purchase_cost,
        },
      ],
      totalEstimatedCost: recommendedOrder * p.purchase_cost,
      actionLabel: `Restock +${recommendedOrder} ${p.unit}`,
    });
  }

  // 2. Check for overdue customer credit receivables
  const unpaidSales = sales.filter(s => s.payment_status !== 'Paid');
  const totalReceivables = unpaidSales.reduce((acc, s) => acc + (s.amount_due || (s.total - s.amount_paid)), 0);

  if (unpaidSales.length >= 3 && totalReceivables > 5000) {
    alerts.push({
      id: `alert-due-receivables-${unpaidSales.length}`,
      type: 'CUSTOMER_DUE',
      severity: 'info',
      title: `Pending Credit Collection: ${unpaidSales.length} Invoices Due`,
      description: `A total of ${formatCurrency(totalReceivables, currencySymbol)} is pending across ${unpaidSales.length} customer sales. Follow up to maintain cashflow.`,
      timestamp: now,
      actionLabel: 'View Due Invoices',
    });
  }

  return alerts;
}

export function generateWholesalePurchaseOrderText(
  businessName: string,
  items: Array<{ product: Product; recommendedOrder: number; estimatedCost: number }>,
  currencySymbol = '₹'
): string {
  const lines: string[] = [
    `*PURCHASE ORDER / RESTOCK REQUEST*`,
    `Store: *${businessName}*`,
    `Date: ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`,
    `----------------------------------------`,
    `Please dispatch the following items:`,
  ];

  let totalEst = 0;
  items.forEach((it, idx) => {
    lines.push(`${idx + 1}. *${it.product.name}* — ${it.recommendedOrder} ${it.product.unit}`);
    totalEst += it.estimatedCost;
  });

  lines.push(`----------------------------------------`);
  lines.push(`Estimated Total: ~${formatCurrency(totalEst, currencySymbol)}`);
  lines.push(`Kindly confirm availability and delivery schedule. Thank you!`);

  return lines.join('\n');
}
