import { faker } from "@faker-js/faker";

function generateJobOrders(count: number) {
  const jobOrders = [];
  const technicianNames = [
    "John Doe",
    "Jane Smith",
    "Emily Johnson",
    "Michael Brown",
    "Jessica Davis",
    "Daniel Miller",
    "Sarah Wilson",
  ];

  for (let i = 0; i < count; i++) {
    const orderNoPrefix = faker.helpers.arrayElement(["01", "02"]);
    const location = orderNoPrefix === "02" ? "Pasig" : "Taytay";
    const orderNo = `${orderNoPrefix}-${String(i + 31).padStart(6, "0")}`;
    const date = faker.date
      .between({
        from: "2023-01-01",
        // to: new Date().toISOString().split("T")[0],
        to: "2024-12-31",
      })
      .toISOString()
      .split("T")[0];
    const technicianName = faker.helpers.arrayElement(technicianNames);

    jobOrders.push({
      orderNo,
      clientName: faker.person.fullName(),
      date,
      machineType: faker.helpers.arrayElement(["Laptop", "Printer"]),
      status: "Completed",
      technicianName,
      price: Number(faker.finance.amount({ min: 500, max: 3000, dec: 0 })),
      location,
    });
  }

  return jobOrders;
}

export const job_orders = generateJobOrders(2500);
