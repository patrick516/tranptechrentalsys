function buildCustomerStatementContent(
  customer,
  balance,
  entries = [],
  payments = [],
) {
  const lines = [
    `Customer: ${customer.code} - ${customer.name}`,
    `Status: ${customer.status}`,
    `Current Balance: MK ${Number(balance || 0).toLocaleString("en-US")}`,
    `Ledger Entries: ${entries.length}`,
    `Confirmed Payments: ${payments.length}`,
  ];
  return lines.join("\n");
}

module.exports = { buildCustomerStatementContent };
